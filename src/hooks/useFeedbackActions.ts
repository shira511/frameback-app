import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { ProjectVersion, Feedback, DrawingData, FilterOption } from '../types';

export const useFeedbackActions = (
  projectId: string | undefined,
  currentVersion: ProjectVersion | null,
  user: any,
  fetchFeedback: (targetVersion?: ProjectVersion | null) => Promise<Feedback[]>,
  setFeedback: (feedback: Feedback[]) => void,
  setPreviousVersionsFeedback: (feedback: Feedback[]) => void,
  fetchPreviousVersionFeedback: () => Promise<Feedback[]>,
  showPreviousVersionsFeedback: boolean,
  setShowPreviousVersionsFeedback: (show: boolean) => void
) => {
  // Feedback form state
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);
  const [initialComment, setInitialComment] = useState('');
  const [initialDrawing, setInitialDrawing] = useState<DrawingData | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  
  // Filter and highlight state
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);

  // Set up real-time feedback subscription
  useEffect(() => {
    if (!projectId || !currentVersion) return;

    console.log('🔄 Setting up feedback subscription for version:', currentVersion.id);
    
    const feedbackSubscription = supabase
      .channel(`feedback-${projectId}-${currentVersion.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `project_id=eq.${projectId} AND version_id=eq.${currentVersion.id}`
        },
        (payload) => {
          console.log('🔄 Feedback changed:', payload);
          fetchFeedback(currentVersion);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(feedbackSubscription);
    };
  }, [projectId, currentVersion]);

  // Handle feedback submission
  const handleFeedbackSubmit = async (comment: string, drawingData: DrawingData | null = null, timestamp?: number) => {
    if (!projectId || !currentVersion || !user) return;

    try {
      const feedbackTimestamp = timestamp ?? 0;
      
      if (isEditingFeedback && editingFeedbackId) {
        // Update existing feedback
        await supabase
          .from('feedback')
          .update({
            comment,
            drawing_data: drawingData,
            timestamp: feedbackTimestamp
          })
          .eq('id', editingFeedbackId);
      } else {
        // Create new feedback
        await supabase
          .from('feedback')
          .insert({
            project_id: projectId,
            version_id: currentVersion.id,
            user_id: user.id,
            comment,
            timestamp: feedbackTimestamp,
            drawing_data: drawingData,
            is_checked: false
          });
      }
      
      handleCloseFeedbackForm();
      const updatedFeedback = await fetchFeedback(currentVersion);
      setFeedback(updatedFeedback);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  // Handle feedback deletion
  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);
      
      const updatedFeedback = await fetchFeedback(currentVersion);
      setFeedback(updatedFeedback);
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback. Please try again.');
    }
  };

  // Handle feedback status change
  const handleFeedbackStatusChange = async (feedbackId: string, isChecked: boolean) => {
    try {
      await supabase
        .from('feedback')
        .update({ is_checked: isChecked })
        .eq('id', feedbackId);
      
      const updatedFeedback = await fetchFeedback(currentVersion);
      setFeedback(updatedFeedback);
    } catch (err) {
      console.error('Error updating feedback status:', err);
      alert('Failed to update feedback status. Please try again.');
    }
  };

  // Handle reaction addition
  const handleAddReaction = async (feedbackId: string, emoji: string) => {
    if (!user) return;
    
    try {
      // Check if user already reacted with this emoji
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('feedback_id', feedbackId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existingReaction) {
        // Remove existing reaction
        await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add new reaction
        await supabase
          .from('reactions')
          .insert({
            feedback_id: feedbackId,
            user_id: user.id,
            emoji
          });
      }
      
      const updatedFeedback = await fetchFeedback(currentVersion);
      setFeedback(updatedFeedback);
    } catch (err) {
      console.error('Error adding reaction:', err);
      alert('Failed to add reaction. Please try again.');
    }
  };

  // Handle reply addition
  const handleAddReply = async (feedbackId: string, comment: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('replies')
        .insert({
          feedback_id: feedbackId,
          user_id: user.id,
          comment
        });
      
      const updatedFeedback = await fetchFeedback(currentVersion);
      setFeedback(updatedFeedback);
    } catch (err) {
      console.error('Error adding reply:', err);
      alert('Failed to add reply. Please try again.');
    }
  };

  // Handle feedback editing
  const handleEditFeedback = (feedback: Feedback) => {
    setIsEditingFeedback(true);
    setEditingFeedbackId(feedback.id);
    setInitialComment(feedback.comment);
    setInitialDrawing(feedback.drawingData || null);
    setIsFeedbackFormOpen(true);
  };

  // Handle feedback form close
  const handleCloseFeedbackForm = () => {
    setIsFeedbackFormOpen(false);
    setInitialComment('');
    setInitialDrawing(null);
    setCurrentDrawing(null);
    setIsEditingFeedback(false);
    setEditingFeedbackId(null);
  };  // Handle feedback click with highlight
  const handleFeedbackClickWithHighlight = (_timestamp: number, feedbackItem?: Feedback) => {
    if (feedbackItem) {
      setHighlightedFeedbackId(feedbackItem.id);
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedFeedbackId(null), 3000);
    }
  };

  // Handler for toggling previous versions feedback
  const handleTogglePreviousVersionsFeedback = async () => {
    const newShowState = !showPreviousVersionsFeedback;
    setShowPreviousVersionsFeedback(newShowState);
    
    if (newShowState) {
      // User wants to show previous feedback - fetch it
      console.log('👁️ User clicked Previous - fetching previous version feedback');
      const previousFeedback = await fetchPreviousVersionFeedback();
      setPreviousVersionsFeedback(previousFeedback);
    } else {
      // User wants to hide previous feedback - clear it
      console.log('🙈 User clicked hide Previous - clearing previous version feedback');
      setPreviousVersionsFeedback([]);
    }
  };

  return {
    // State
    isFeedbackFormOpen,
    initialComment,
    initialDrawing,
    currentDrawing,
    isEditingFeedback,
    editingFeedbackId,
    filterOption,
    highlightedFeedbackId,
    
    // Setters
    setIsFeedbackFormOpen,
    setInitialComment,
    setInitialDrawing,
    setCurrentDrawing,
    setFilterOption,
    setHighlightedFeedbackId,
    
    // Actions
    handleFeedbackSubmit,
    handleDeleteFeedback,
    handleFeedbackStatusChange,
    handleAddReaction,
    handleAddReply,
    handleEditFeedback,
    handleCloseFeedbackForm,
    handleFeedbackClickWithHighlight,
    handleTogglePreviousVersionsFeedback,
  };
};
