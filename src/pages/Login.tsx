import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import Button from '../components/ui/Button';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { error } = await signInWithGoogle();
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to FrameBack</h1>
          <p className="text-slate-300 mb-8">Collaborative video feedback made simple</p>
        </div>

        {error && (
          <div className="bg-error-500 bg-opacity-10 border border-error-500 text-error-500 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            isLoading={isLoading}
            fullWidth
            leftIcon={<LogIn size={18} />}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            Continue with Google
          </Button>
          
          <div className="text-center text-sm text-slate-400 mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;