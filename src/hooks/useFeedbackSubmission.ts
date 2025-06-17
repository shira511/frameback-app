import { useState } from 'react';
import { supabase } from '../services/supabase';
import type { DrawingData } from '../types';

export const useFeedbackSubmission = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);  const submitFeedback = async (
    projectId: string,
    versionId: string,
    userId: string,
    comment: string,
    timestamp: number,
    drawingData: DrawingData | null = null
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {      console.log('📝 Submitting feedback:', {
        projectId,
        versionId,
        userId,
        comment: comment.substring(0, 50) + '...',
        timestamp,
        hasDrawing: !!drawingData
      });

      // Prepare feedback data according to actual schema
      const feedbackData = {
        project_id: projectId,
        version_id: versionId,
        user_id: userId,
        comment: comment.trim(),
        timestamp: timestamp,
        drawing_data: drawingData, // JSONB field
        is_checked: false,
        created_at: new Date().toISOString()
      };

      // Insert feedback into Supabase
      const { data, error: insertError } = await supabase
        .from('feedback')
        .insert([feedbackData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Feedback submission error:', insertError);
        throw new Error(`フィードバックの保存に失敗しました: ${insertError.message}`);
      }      console.log('✅ Feedback submitted successfully:', data);
      
      // Call success callback if provided
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィードバックの保存中にエラーが発生しました';
      console.error('❌ Feedback submission failed:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };  const updateFeedback = async (
    feedbackId: string,
    comment: string,
    drawingData: DrawingData | null = null
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('📝 Updating feedback:', { feedbackId, comment: comment.substring(0, 50) + '...' });      const updateData = {
        comment: comment.trim(),
        drawing_data: drawingData, // JSONB field
      };

      const { data, error: updateError } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Feedback update error:', updateError);
        throw new Error(`フィードバックの更新に失敗しました: ${updateError.message}`);
      }      console.log('✅ Feedback updated successfully:', data);
      
      // Call success callback if provided
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フィードバックの更新中にエラーが発生しました';
      console.error('❌ Feedback update failed:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFeedback,
    updateFeedback,
    isSubmitting,
    error,
    clearError: () => setError(null)
  };
};
