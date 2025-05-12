import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import AppLayout from '../components/layouts/AppLayout';
import { Clock, Plus, Film, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          const formattedProjects: Project[] = data.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description,
            videoUrl: project.video_url,
            createdAt: project.created_at,
            userId: project.user_id
          }));
          setProjects(formattedProjects);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(projectId);

      // Delete all feedback first (cascade doesn't work automatically with supabase-js)
      const { error: feedbackError } = await supabase
        .from('feedback')
        .delete()
        .eq('project_id', projectId);

      if (feedbackError) {
        throw feedbackError;
      }

      // Then delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) {
        throw projectError;
      }

      // Update local state
      setProjects(projects.filter(project => project.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AppLayout title="Your Projects">
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-2xl font-bold text-white mb-4 sm:mb-0">Your Projects</h1>
          <Button
            onClick={() => navigate('/projects/new')}
            leftIcon={<Plus size={16} />}
            variant="primary"
          >
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="bg-error-500 bg-opacity-10 border border-error-500 text-error-500 p-4 rounded-md">
            {error}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div 
                key={project.id}
                className="bg-slate-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all"
              >
                <div 
                  className="h-40 bg-slate-700 relative cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film size={48} className="text-slate-500" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 
                    className="text-lg font-semibold text-white mb-2 hover:text-primary-500 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-slate-300 text-sm mb-4 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-slate-400">
                      <Clock size={14} className="mr-1" />
                      <span>
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={isDeleting === project.id}
                      className="p-1.5 text-slate-400 hover:text-error-500 rounded"
                    >
                      {isDeleting === project.id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-slate-800 rounded-lg">
            <Film size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-slate-300 mb-6">Create your first project to start collecting feedback</p>
            <Button
              onClick={() => navigate('/projects/new')}
              leftIcon={<Plus size={16} />}
              variant="primary"
            >
              Create New Project
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;