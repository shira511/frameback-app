import React, { useState } from 'react';
import { X, Youtube, Upload } from 'lucide-react';
import Button from './ui/Button';

interface NewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; videoUrl: string; description: string }) => void;
  nextVersionNumber: number;
  isLoading?: boolean;
}

const NewVersionModal: React.FC<NewVersionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nextVersionNumber,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    title: `Version ${nextVersionNumber}`,
    videoUrl: '',
    description: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Version title is required';
    }
    
    if (!formData.videoUrl.trim()) {
      newErrors.videoUrl = 'Video URL is required';
    } else if (!validateYouTubeUrl(formData.videoUrl)) {
      newErrors.videoUrl = 'Please enter a valid YouTube URL';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Create New Version</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-md transition-colors"
            disabled={isLoading}
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Version Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full p-3 bg-slate-700 border ${
                errors.title ? 'border-red-500' : 'border-slate-600'
              } rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
              placeholder="e.g., Version 2.0 - Fixed audio issues"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <div className="flex items-center gap-2">
                <Youtube size={16} />
                YouTube Video URL
              </div>
            </label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => handleInputChange('videoUrl', e.target.value)}
              className={`w-full p-3 bg-slate-700 border ${
                errors.videoUrl ? 'border-red-500' : 'border-slate-600'
              } rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isLoading}
            />
            {errors.videoUrl && (
              <p className="mt-1 text-sm text-red-400">{errors.videoUrl}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Supports YouTube watch, youtu.be, and embed URLs
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Describe what changed in this version..."
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Create Version {nextVersionNumber}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewVersionModal;
