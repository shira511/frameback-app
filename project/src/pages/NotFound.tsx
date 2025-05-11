import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-slate-300 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button
          onClick={() => navigate('/')}
          leftIcon={<Home size={18} />}
          size="lg"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;