import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, getSession } from '../services/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Check if Supabase is properly configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.warn('AuthProvider: Supabase environment variables not found, skipping auth');
          setIsLoading(false);
          return;
        }
        
        const { session } = await getSession();
        
        if (!session) {
          setIsLoading(false);
          return;
        }
        
        const { user: authUser, error: userError } = await getCurrentUser();
        
        if (userError) {
          throw userError;
        }
        
        if (authUser) {
          // Fetch user profile from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }
          
          // If profile doesn't exist but we have user metadata from OAuth, create it
          if (!profileData && authUser.user_metadata) {
            const { full_name, avatar_url } = authUser.user_metadata;
            
            const newProfile = {
              id: authUser.id,
              full_name: full_name || authUser.email?.split('@')[0] || 'Anonymous User',
              avatar_url: avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name || 'User')}&background=random`,
            };
            
            const { error: insertError } = await supabase
              .from('profiles')
              .insert(newProfile);
              
            if (insertError) {
              throw insertError;
            }
            
            setUser({
              id: authUser.id,
              email: authUser.email,
              fullName: newProfile.full_name,
              avatarUrl: newProfile.avatar_url,
            });
          } else if (profileData) {
            setUser({
              id: authUser.id,
              email: authUser.email,
              fullName: profileData.full_name,
              avatarUrl: profileData.avatar_url,
            });
          }
        }      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('AuthProvider: Error fetching user:', errorMessage);
        setError(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider value={{ user, isLoading, error }}>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
          <h3 className="font-bold">Authentication Error:</h3>
          <p className="text-sm">{error.message}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};