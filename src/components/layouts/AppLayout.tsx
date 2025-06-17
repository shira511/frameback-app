import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/supabase';
import { Home, LogOut, Plus, Layout } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 h-screen overflow-hidden">      {/* Header */}
      <header className="bg-slate-800 shadow-md flex-shrink-0">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center text-xl font-bold text-primary-500"
            >
              <Layout className="mr-2" size={24} />
              FrameBack
            </button>
            {title && <span className="hidden md:block text-slate-400 pl-4 ml-4 border-l border-slate-600">{title}</span>}
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/projects/new')}
                className="hidden sm:flex items-center text-sm px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Plus size={18} className="mr-1" />
                New Project
              </button>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{user.fullName}</p>
                </div>
                <div className="relative">
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          )}
        </div>      </header>

      {/* Main content */}
      <main className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-4 overflow-auto min-h-0">
        {children}
      </main>

      {/* Mobile navigation */}
      <div className="sm:hidden block fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 py-2 px-4">
        <div className="flex justify-around">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center p-2 text-slate-400 hover:text-white"
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => navigate('/projects/new')}
            className="flex flex-col items-center p-2 text-slate-400 hover:text-white"
          >
            <Plus size={20} />
            <span className="text-xs mt-1">New</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center p-2 text-slate-400 hover:text-white"
          >
            <LogOut size={20} />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;