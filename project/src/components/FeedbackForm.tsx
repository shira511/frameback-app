import React, { useState, useEffect } from 'react';
import type { DrawingData } from '../types';
import { XCircle } from 'lucide-react';
import Button from './ui/Button';

interface FeedbackFormProps {
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string, drawingData: DrawingData | null) => void;
  initialComment?: string;
  initialDrawing?: DrawingData | null;
  isEditing?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  currentTime,
  isOpen,
  onClose,
  onSubmit,
  initialComment = '',
  initialDrawing = null,
  isEditing = false,
}) => {
  const [comment, setComment] = useState(initialComment);
  const [drawingData, setDrawingData] = useState<DrawingData | null>(initialDrawing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when initialComment or initialDrawing changes
  useEffect(() => {
    if (isOpen) {
      setComment(initialComment);
      setDrawingData(initialDrawing);
    }
  }, [isOpen, initialComment, initialDrawing]);

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onSubmit(comment.trim(), drawingData);
      setComment('');
      setDrawingData(null);
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-lg w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Feedback' : `Add Feedback at ${formatTimestamp(currentTime)}`}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <XCircle size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium text-slate-300 mb-1">
              Comment
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What would you like to say about this frame?"
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              required
              autoFocus
            />
            
            {drawingData && (
              <div className="mt-2 text-sm text-primary-400 flex items-center">
                <span className="mr-1">●</span>
                Drawing annotation included
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || !comment.trim()}
            >
              {isEditing ? 'Update' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;