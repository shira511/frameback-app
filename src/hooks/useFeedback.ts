import { supabase } from '../services/supabase';
import type { ProjectVersion, Feedback } from '../types';

export const useFeedback = (
  projectId: string | undefined,
  currentVersion: ProjectVersion | null
) => {
  // Helper function to format feedback data
  const formatFeedbackData = (
    feedbackData: any[], 
    profilesData: any[], 
    reactionsData: any[], 
    repliesData: any[], 
    expectedVersion: ProjectVersion | null,
    allowVersionMismatch: boolean = false
  ): Feedback[] => {
    console.log('🔧 === FORMATTING FEEDBACK ===');
    console.log('🔧 Input data count:', feedbackData.length);
    console.log('🔧 Expected version ID:', expectedVersion?.id);
    console.log('🔧 Expected version number:', expectedVersion?.versionNumber);
    console.log('🔧 Allow version mismatch:', allowVersionMismatch);
    
    // Filter out feedback that doesn't match expected version if strict mode
    const validFeedback = allowVersionMismatch ? feedbackData : feedbackData.filter(item => {
      if (item.version_id && expectedVersion && item.version_id !== expectedVersion.id) {
        console.warn('⚠️ Filtering out version mismatch:', {
          feedback_id: item.id,
          feedback_version_id: item.version_id,
          expected_version_id: expectedVersion.id,
          comment: item.comment.substring(0, 30)
        });
        return false;
      }
      return true;
    });
    
    console.log('🔧 Valid feedback after filtering:', validFeedback.length);
    
    return validFeedback.map((item: any) => {
      const userProfile = profilesData.find(profile => profile.id === item.user_id);
      
      const itemReactions = reactionsData
        ? reactionsData.filter(reaction => reaction.feedback_id === item.id)
        : [];
      
      const itemReplies = repliesData
        ? repliesData
            .filter(reply => reply.feedback_id === item.id)
            .map(reply => {
              const replyUserProfile = profilesData.find(
                profile => profile.id === reply.user_id
              );
              
              return {
                id: reply.id,
                feedbackId: reply.feedback_id,
                userId: reply.user_id,
                user: replyUserProfile
                  ? {
                      id: replyUserProfile.id,
                      fullName: replyUserProfile.full_name,
                      avatarUrl: replyUserProfile.avatar_url
                    }
                  : undefined,
                comment: reply.comment,
                createdAt: reply.created_at
              };
            })
        : [];
        
      return {
        id: item.id,
        projectId: item.project_id,
        versionId: item.version_id || currentVersion?.id || '', 
        userId: item.user_id,
        user: userProfile
          ? {
              id: userProfile.id,
              fullName: userProfile.full_name,
              avatarUrl: userProfile.avatar_url
            }
          : undefined,
        timestamp: item.timestamp,
        comment: item.comment,
        drawingData: item.drawing_data,
        isChecked: item.is_checked,
        createdAt: item.created_at,
        reactions: itemReactions.map(reaction => ({
          id: reaction.id,
          feedbackId: reaction.feedback_id,
          userId: reaction.user_id,
          emoji: reaction.emoji,
          createdAt: reaction.created_at
        })),
        replies: itemReplies
      };
    });
  };

  // Fetch feedback data for a specific version
  const fetchFeedback = async (targetVersion?: ProjectVersion | null) => {
    if (!projectId) return [];
    
    // Use provided version or fall back to current version
    const versionToUse = targetVersion || currentVersion;
    if (!versionToUse) {
      console.log('⚠️ No version provided to fetchFeedback');
      return [];
    }

    console.log('🚀 === FEEDBACK FETCH START ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Target Version:', {
      id: versionToUse.id,
      number: versionToUse.versionNumber,
      title: versionToUse.title
    });

    try {
      let formattedCurrentFeedback: Feedback[] = [];
      
      // Fetch current version feedback
      let currentQuery = supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId);
        
      // Filter by current version if available
      if (versionToUse) {
        console.log('🎯 Filtering feedback by current version ID:', versionToUse.id);
        currentQuery = currentQuery.eq('version_id', versionToUse.id);
      }
      
      const { data: currentFeedbackData, error: currentFeedbackError } = await currentQuery
        .order('timestamp', { ascending: true });
        
      console.log('📥 Current version feedback data:', currentFeedbackData?.length || 0, 'items');
      console.log('📊 Current feedback raw data:', currentFeedbackData?.map(f => ({ 
        id: f.id, 
        version_id: f.version_id, 
        comment: f.comment.substring(0, 30),
        timestamp: f.timestamp 
      })) || []);
        
      if (currentFeedbackError) throw currentFeedbackError;

      console.log('🔍 === DATA VERIFICATION ===');
      console.log('🔍 Current feedback count:', currentFeedbackData?.length || 0);
      
      // Verify data integrity
      if (currentFeedbackData && versionToUse) {
        const wrongVersionFeedback = currentFeedbackData.filter(f => f.version_id !== versionToUse.id);
        if (wrongVersionFeedback.length > 0) {
          console.error('🚨 INTEGRITY ERROR: Current feedback contains wrong version IDs:', wrongVersionFeedback);
        }
      }

      // Process feedback data separately to avoid mixing current and previous version data
      // Only process current feedback if it exists
      if (!currentFeedbackData || currentFeedbackData.length === 0) {
        formattedCurrentFeedback = [];
      } else {
        // Process current version feedback separately
        const currentUserIds = Array.from(new Set(currentFeedbackData.map((item: any) => item.user_id)));
        const currentFeedbackIds = currentFeedbackData.map((item: any) => item.id);
        
        const { data: currentProfilesData, error: currentProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', currentUserIds);
        
        if (currentProfilesError) throw currentProfilesError;
        
        const { data: currentReactionsData, error: currentReactionsError } = await supabase
          .from('reactions')
          .select('*')
          .in('feedback_id', currentFeedbackIds);
        
        if (currentReactionsError) throw currentReactionsError;
        
        const { data: currentRepliesData, error: currentRepliesError } = await supabase
          .from('replies')
          .select('*')
          .in('feedback_id', currentFeedbackIds)
          .order('created_at', { ascending: true });
          
        if (currentRepliesError) throw currentRepliesError;
          
        formattedCurrentFeedback = formatFeedbackData(
          currentFeedbackData, 
          currentProfilesData || [], 
          currentReactionsData || [], 
          currentRepliesData || [], 
          versionToUse
        );
            console.log('✅ Current version feedback:', formattedCurrentFeedback.length, 'items');
        console.log('📋 Current feedback final IDs:', formattedCurrentFeedback.map(f => f.id));
      }

      console.log('🏁 === FEEDBACK FETCH END ===');
      return formattedCurrentFeedback;

    } catch (err) {
      console.error('❌ Error fetching feedback:', err);
      return [];
    }
  };

  // Function to fetch previous version feedback (called only when Previous button is clicked)
  const fetchPreviousVersionFeedback = async () => {
    if (!currentVersion || currentVersion.versionNumber <= 1 || !projectId) {
      console.log('🟡 Cannot fetch previous feedback: Version 1 or no current version');
      return [];
    }

    console.log('🔍 === FETCHING PREVIOUS VERSION FEEDBACK ===');
    console.log('🔍 Current version:', currentVersion.versionNumber);
    console.log('🔍 Looking for version number:', currentVersion.versionNumber - 1);

    try {
      // Get the immediately previous version (versionNumber - 1)
      const { data: previousVersion, error: previousVersionError } = await supabase
        .from('project_versions')
        .select('id, version_number, title, created_at')
        .eq('project_id', projectId)
        .eq('version_number', currentVersion.versionNumber - 1)
        .single();

      if (previousVersionError) {
        console.error('❌ Error fetching previous version:', previousVersionError);
        return [];
      }

      if (!previousVersion) {
        console.log('🟡 No previous version found');
        return [];
      }

      console.log('✅ Found previous version:', {
        id: previousVersion.id,
        number: previousVersion.version_number,
        title: previousVersion.title
      });

      // Fetch feedback for the previous version
      const { data: prevFeedback, error: prevFeedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .eq('version_id', previousVersion.id)
        .order('timestamp', { ascending: true });

      if (prevFeedbackError) {
        console.error('❌ Error fetching previous version feedback:', prevFeedbackError);
        return [];
      }

      if (!prevFeedback || prevFeedback.length === 0) {
        console.log('🟡 No feedback found for previous version');
        return [];
      }

      console.log('✅ Previous version feedback:', prevFeedback.length, 'items');

      // Get user profiles, reactions, and replies for previous feedback
      const previousUserIds = Array.from(new Set(prevFeedback.map((item: any) => item.user_id)));
      const previousFeedbackIds = prevFeedback.map((item: any) => item.id);
      
      const { data: previousProfilesData, error: previousProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', previousUserIds);
      
      if (previousProfilesError) {
        console.error('❌ Error fetching previous profiles:', previousProfilesError);
        return [];
      }
      
      const { data: previousReactionsData, error: previousReactionsError } = await supabase
        .from('reactions')
        .select('*')
        .in('feedback_id', previousFeedbackIds);
      
      if (previousReactionsError) {
        console.error('❌ Error fetching previous reactions:', previousReactionsError);
        return [];
      }
      
      const { data: previousRepliesData, error: previousRepliesError } = await supabase
        .from('replies')
        .select('*')
        .in('feedback_id', previousFeedbackIds)
        .order('created_at', { ascending: true });
        
      if (previousRepliesError) {
        console.error('❌ Error fetching previous replies:', previousRepliesError);
        return [];
      }

      // Create previous version object
      const previousVersionObj: ProjectVersion = {
        id: previousVersion.id,
        versionNumber: previousVersion.version_number,
        title: previousVersion.title || '',
        projectId: projectId,
        videoUrl: '',
        description: '',
        userId: '',
        isActive: false,
        createdAt: previousVersion.created_at
      };

      // Format previous feedback
      const formattedPreviousFeedback = formatFeedbackData(
        prevFeedback,
        previousProfilesData || [],
        previousReactionsData || [],
        previousRepliesData || [],
        previousVersionObj
      );

      console.log('✅ Formatted previous feedback:', formattedPreviousFeedback.length, 'items');
      return formattedPreviousFeedback;

    } catch (error) {
      console.error('❌ Error in fetchPreviousVersionFeedback:', error);
      return [];
    }
  };

  return {
    fetchFeedback,
    fetchPreviousVersionFeedback,
    formatFeedbackData
  };
};
