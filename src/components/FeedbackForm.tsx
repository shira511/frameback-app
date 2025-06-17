import React, { useState, useEffect, useRef } from 'react';
import type { DrawingData } from '../types';
import Button from './ui/Button';

interface FeedbackFormProps {
  timestamp: number;
  onSubmit: (comment: string, drawingData: DrawingData | null) => void;
  onClose?: () => void;
  initialComment?: string;
  initialDrawing?: DrawingData | null;
  isEditing?: boolean;
  onCommentChange?: (comment: string) => void;
  onDrawingChange?: (drawing: DrawingData | null) => void;
  onDrawingModeToggle?: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  timestamp,
  onSubmit,
  onClose,
  initialComment = '',
  initialDrawing = null,
  isEditing = false,
  onCommentChange,
  onDrawingChange,
  onDrawingModeToggle,
}) => {const [comment, setComment] = useState(initialComment);
  const [drawingData, setDrawingData] = useState<DrawingData | null>(initialDrawing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update comment with callback
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
    onCommentChange?.(newComment);
  };

  useEffect(() => {
    // Only update if we're editing or if the form is being opened fresh
    if (isEditing || !comment) {
      setComment(initialComment);
    }
  }, [initialComment, isEditing]);  useEffect(() => {
    // Always update drawing data when initialDrawing changes
    setDrawingData(initialDrawing);
    onDrawingChange?.(initialDrawing);
  }, [initialDrawing, onDrawingChange]);

  // Notify parent when drawing data changes
  useEffect(() => {
    onDrawingChange?.(drawingData);
  }, [drawingData, onDrawingChange]);

  useEffect(() => {
    // Auto-focus the textarea when the form opens
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Allow submission if either comment exists or drawing data exists
    if (!comment.trim() && !drawingData) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Submit feedback - this is now non-blocking on the form
      await onSubmit(comment.trim(), drawingData);
      
      // Clear form after successful submission for new feedback creation
      if (!isEditing) {
        setComment('');
        setDrawingData(null);
        // Focus back to input for easier continuous feedback creation
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Keep form data on error so user doesn't lose their input
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts for submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      // Only submit if comment is not empty and not already submitting
      if (comment.trim() && !isSubmitting) {
        handleSubmit(e as any); // Type assertion since we're passing KeyboardEvent to FormEvent handler
      }
    }
  };  return (
    <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-3 w-full">
      <form onSubmit={handleSubmit}>
        {/* Header with timestamp and drawing indicator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">
            {isEditing ? 'Edit Feedback' : 'Add Feedback'} at {formatTimestamp(timestamp)}
          </span>
          {drawingData && (
            <div className="text-xs text-primary-400 flex items-center bg-primary-500/10 px-2 py-1 rounded">
              <span className="mr-1">●</span>
              Drawing
            </div>
          )}
        </div>          {/* Horizontal layout with textarea and buttons */}
        <div className="flex flex-col sm:flex-row gap-2 items-start">
          {/* Text input - takes most of the space */}
          <div className="flex-1 w-full">            <textarea
              ref={inputRef}
              id="comment"
              value={comment}
              onChange={handleCommentChange}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment to your feedback (optional if you have a drawing)"              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm"              rows={2}
            />
            <div className="mt-1 text-xs text-slate-400">
              <kbd className="px-1 py-0.5 bg-slate-600 rounded text-xs">Ctrl+Enter</kbd> to submit
            </div>
          </div>
            {/* Buttons - responsive layout */}
          <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
            {/* Drawing Mode button */}
            {onDrawingModeToggle && (
              <Button
                type="button"
                variant="outline"
                onClick={onDrawingModeToggle}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm min-w-[120px] flex-1 sm:flex-initial bg-purple-600 hover:bg-purple-700 border-purple-600 text-white"
              >
                {drawingData ? 'Edit Drawing' : 'Drawing Mode'}
              </Button>
            )}
            
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || (!comment.trim() && !drawingData)}
              className="px-4 py-2 text-sm min-w-[80px] flex-1 sm:flex-initial"
            >
              {isEditing ? 'Update' : 'Submit'}
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm min-w-[80px] flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;