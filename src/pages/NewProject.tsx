import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import AppLayout from '../components/layouts/AppLayout';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

const normalizeYouTubeUrl = (url: string): string => {
  try {
    // Extract video ID from various URL formats
    let videoId: string | null = null;

    // Create URL object (handles relative URLs by prepending protocol if needed)
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(fullUrl);

    // Handle youtu.be URLs
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    }
    // Handle youtube.com URLs
    else if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      // Get video ID from query parameter
      videoId = urlObj.searchParams.get('v');

      // Handle /v/ format
      if (!videoId && urlObj.pathname.startsWith('/v/')) {
        videoId = urlObj.pathname.slice(3);
      }
      // Handle /embed/ format
      else if (!videoId && urlObj.pathname.startsWith('/embed/')) {
        videoId = urlObj.pathname.slice(7);
      }
    }

    // Clean up video ID by removing any remaining query parameters or hash
    if (videoId) {
      videoId = videoId.split(/[#?]/)[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    // Return original URL if no transformation needed
    return url;
  } catch (e) {
    // If URL parsing fails, return original URL
    return url;
  }
};

const NewProject: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const validateForm = (url: string) => {
    console.log("🟡 raw url received in validateForm:", url);
    
    const newErrors: { [key: string]: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!url.trim()) {
      console.log("🔴 URL is blank after trim");
      newErrors.videoUrl = 'Video URL is required';
    } else {
      console.log("🔵 testing URL:", url);
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = youtubeRegex.exec(url);
      console.log("🧪 regex match result:", match);
      
      if (!match || !match[1]) {
        newErrors.videoUrl = 'Please enter a valid YouTube URL';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const extractYouTubeId = (url: string): string | null => {
    const normalizedUrl = normalizeYouTubeUrl(url);
    const match = normalizedUrl.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(videoUrl)) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setGeneralError(null);
      
      if (!user) {
        throw new Error('You must be logged in to create a project');
      }
      
      const normalizedUrl = normalizeYouTubeUrl(videoUrl.trim());
      const youtubeId = extractYouTubeId(normalizedUrl);
      
      if (!youtubeId) {
        setErrors({
          ...errors,
          videoUrl: 'Invalid YouTube URL'
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title,
          description: description || null,
          video_url: normalizedUrl,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Redirect to the new project
      navigate(`/projects/${data.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setGeneralError('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppLayout title="Create New Project">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Dashboard
          </button>
        </div>
        
        <div className="bg-slate-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Create New Project</h1>
          
          {generalError && (
            <div className="bg-error-500 bg-opacity-10 border border-error-500 text-error-500 p-4 rounded-md mb-6">
              {generalError}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">
                Project Title <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full p-2 bg-slate-700 border ${
                  errors.title ? 'border-error-500' : 'border-slate-600'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="Enter project title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-error-500">{errors.title}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter project description"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-300 mb-1">
                YouTube Video URL <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className={`w-full p-2 bg-slate-700 border ${
                  errors.videoUrl ? 'border-error-500' : 'border-slate-600'
                } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              />
              {errors.videoUrl && (
                <p className="mt-1 text-sm text-error-500">{errors.videoUrl}</p>
              )}
              <p className="mt-1 text-sm text-slate-400">
                Supports various YouTube URL formats (youtube.com, youtu.be, embed links)
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Create Project
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default NewProject;