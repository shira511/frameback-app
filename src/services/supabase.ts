import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a Supabase client
let supabase: ReturnType<typeof createClient<Database>>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Creating fallback client.');
  // Create a fallback client that will fail gracefully
  supabase = createClient<Database>('http://localhost:3000', 'dummy-key');
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Authentication helper functions
export const signInWithGoogle = async () => {
  try {
    // 環境に応じたリダイレクトURL設定
    const baseUrl = window.location.origin;
    const callbackUrl = `${baseUrl}/auth/callback`;

    console.log('OAuth redirect URL:', callbackUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    
    if (error) {
      console.error('OAuth sign-in error:', error);
    }
    
    return { data, error };
  } catch (err) {
    console.error('signInWithGoogle error:', err);
    return { data: null, error: err };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    console.error('signOut error:', err);
    return { error: err };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return { user: null, error: err };
  }
};

export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (err) {
    console.error('getSession error:', err);
    return { session: null, error: err };
  }
};