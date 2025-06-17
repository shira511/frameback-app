import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback...');
        
        // URLからエラーパラメータをチェック
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(`Authentication failed: ${errorDescription || errorParam}`);
          setIsProcessing(false);
          return;
        }

        // Supabaseセッションを確認
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(`Session error: ${sessionError.message}`);
          setIsProcessing(false);
          return;
        }

        if (session) {
          console.log('Authentication successful:', session.user.email);
          navigate('/dashboard', { replace: true });
        } else {
          console.log('No session found, redirecting to login');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred during authentication');
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <div className="w-full max-w-md p-8 text-center bg-slate-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-error-500 mb-2">Authentication Error</h2>
          <p className="text-slate-300">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!isProcessing) {
    return null; // Error state already handled above
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-semibold text-white mb-2">Signing you in...</h2>
        <p className="text-slate-300">Please wait while we complete the authentication process</p>
      </div>
      <LoadingSpinner size="large" />
    </div>
  );
};

export default AuthCallback;