import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import AppLayout from '../components/layouts/AppLayout';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

// LOGGING CONFIGURATION
const LOG_PREFIX = {
  NORMALIZE: '▶',
  VALIDATE_RAW: '🟡',
  VALIDATE_NORM: '🔵',
  VALIDATE_ID: '🎥',
  SUBMIT: '🔴'
};

// URL CLEANING
function normalizeYouTubeUrl(url: string): string {
  const raw = url.trim();
  const cleanUrl = raw
    .replace(/([?&])si=[^&]*/, '') // Remove si parameter
    .replace(/([?&])$/, '');       // Clean trailing separators
  
  console.log(`${LOG_PREFIX.NORMALIZE} normalizeYouTubeUrl input=`, raw, ' cleaned=', cleanUrl);
  return cleanUrl;
}

// ID EXTRACTION
function extractYouTubeId(url: string): string | null {
  const normalizedUrl = normalizeYouTubeUrl(url);
  const YOUTUBE_ID_REGEX = new RegExp([
    '^(?:https?://)?(?:www\\.)?',
    '(?:youtube\\.com/(?:(?:watch\\?v=)|(?:embed/)|(?:v/)|(?:shorts/))|youtu\\.be/)',
    '([A-Za-z0-9_-]{11})',
    '(?:[?&#].*)?$'
  ].join(''));
  
  const match = normalizedUrl.match(YOUTUBE_ID_REGEX);
  console.log(`${LOG_PREFIX.NORMALIZE} extractYouTubeId on`, normalizedUrl, '=>', match?.[1] ?? null);
  return match ? match[1] : null;
}

const NewProject: React.FC = () => {
  useEffect(() => {
    console.log('🟢 NewProject component mounted');
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // FORM VALIDATION
  const validateForm = (url: string): boolean => {
    console.log(`${LOG_PREFIX.VALIDATE_RAW} validateForm raw=`, url);
    const newErrors: { [key: string]: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!url.trim()) {
      console.log(`${LOG_PREFIX.VALIDATE_RAW} URL is empty after trim`);
      newErrors.videoUrl = 'Video URL is required';
    } else {
      const normalized = normalizeYouTubeUrl(url);
      console.log(`${LOG_PREFIX.VALIDATE_NORM} validateForm normalized=`, normalized);
      const videoId = extractYouTubeId(normalized);
      console.log(`${LOG_PREFIX.VALIDATE_ID} validateForm videoId=`, videoId);
      
      if (!videoId) {
        newErrors.videoUrl = 'Please enter a valid YouTube URL';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SUBMIT HANDLER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('★ handleSubmit が呼ばれました ★');
    console.log(`${LOG_PREFIX.SUBMIT} handleSubmit fired, videoUrl=`, videoUrl);
    
    if (!validateForm(videoUrl)) {
      console.log(`${LOG_PREFIX.SUBMIT} validateForm returned false, abort submit`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setGeneralError(null);
      
      if (!user) {
        throw new Error('You must be logged in to create a project');
      }
      
      const normalizedUrl = normalizeYouTubeUrl(videoUrl);
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
          <h1 className="text-2xl font-bold text-white mb-6">Create New Project — デバッグ中</h1>
          
          {generalError && (
            <div className="bg-error-500 bg-opacity-10 border border-error-500 text-error-500 p-4 rounded-md mb-6">
              {generalError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            
            <div>
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
            
            <div>
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
            
            <div className="flex justify-end space-y-2">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                onClick={() => { 
                  alert('★ ボタンがクリックされました ★'); 
                  console.log('🔵 Button onClick fired'); 
                }}
              >
                Create Project
              </Button>
              
              <button 
                type="submit" 
                className="px-4 py-2 bg-indigo-600 text-white rounded" 
                onClick={() => { 
                  alert('★ ネイティブボタンがクリックされました ★'); 
                  console.log('⚪ Native button onClick fired'); 
                }}
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default NewProject;