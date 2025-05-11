import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // After Supabase auth redirect, just navigate to the dashboard
    // AuthContext will handle the session
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

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