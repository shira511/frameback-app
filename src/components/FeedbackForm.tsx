import React, { useState, useEffect, useRef } from 'react';
import type { DrawingData } from '../types';
import Button from './ui/Button';

interface FeedbackFormProps {
  timestamp: number;
  onSubmit: (comment: string, drawingData: DrawingData | null) => void;
  initialComment?: string;
  initialDrawing?: DrawingData | null;
  isEditing?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  timestamp,
  onSubmit,
  initialComment = '',
  initialDrawing = null,
  isEditing = false,
}) => {
  const [comment, setComment] = useState(initialComment);
  const [drawingData, setDrawingData] = useState<DrawingData | null>(initialDrawing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setComment(initialComment);
    setDrawingData(initialDrawing);
  }, [initialComment, initialDrawing]);

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
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 mt-4">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="comment" className="block text-sm font-medium text-slate-300">
              Add Feedback at {formatTimestamp(timestamp)}
            </label>
            {drawingData && (
              <div className="text-sm text-primary-400 flex items-center">
                <span className="mr-1">●</span>
                Drawing annotation included
              </div>
            )}
          </div>
          <textarea
            ref={inputRef}
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What would you like to say about this frame?"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            required
          />
        </div>
        
        <div className="flex justify-end">
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
  );
};

export default FeedbackForm;