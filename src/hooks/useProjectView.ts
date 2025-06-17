import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Project, ProjectVersion, Feedback } from '../types';
import { versionService } from '../services/versionService';

console.log('🔧 useProjectView.ts loaded');

export const useProjectView = () => {
  console.log('🔧 useProjectView function called');
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [previousVersionsFeedback, setPreviousVersionsFeedback] = useState<Feedback[]>([]);
  const [showPreviousVersionsFeedback, setShowPreviousVersionsFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('📦 Component state:', {
      project: project ? { id: project.id, title: project.title } : null,
      user: user ? { id: user.id, email: user.email } : null,
      versions: versions.length,
      currentVersion: currentVersion ? { id: currentVersion.id, number: currentVersion.versionNumber } : null,
      canCreateVersion: user && project && user.id === project.userId,
      feedback: feedback.length,
      previousVersionsFeedback: previousVersionsFeedback.length,
      showPreviousVersionsFeedback
    });
  }, [project, user, versions, currentVersion, feedback, previousVersionsFeedback, showPreviousVersionsFeedback]);
  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string | undefined | null): string | null => {
    if (!url || typeof url !== 'string') return null;
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Fetch feedback for current version
  const fetchFeedback = useCallback(async (targetVersion?: ProjectVersion | null) => {
    if (!projectId) return;
    
    const versionToUse = targetVersion || currentVersion;
    if (!versionToUse) {
      console.log('⚠️ No version provided to fetchFeedback');
      return;
    }

    console.log('🚀 === FEEDBACK FETCH START ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Target Version:', {
      id: versionToUse.id,
      number: versionToUse.versionNumber,
      title: versionToUse.title
    });    try {
      // Fetch feedback data for the specific version
      console.log('🔍 Querying feedback table with:', {
        project_id: projectId,
        version_id: versionToUse.id
      });
      
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .eq('version_id', versionToUse.id)
        .order('created_at', { ascending: true });

      if (feedbackError) {
        console.error('❌ Feedback query error:', feedbackError);
        throw feedbackError;
      }

      console.log('📊 Raw feedback data from Supabase:', feedbackData);
      console.log('📊 Feedback count:', feedbackData?.length || 0);      // Fetch user profiles for feedback authors
      const userIds = [...new Set(feedbackData?.map(f => f.user_id) || [])];
      console.log('👥 User IDs to fetch profiles for:', userIds);
      
      let profilesData: any[] = [];
      
      // Try to fetch from profiles table
      if (userIds.length > 0) {
        try {
          const { data, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
          
          if (profilesError) {
            console.warn('⚠️ Could not fetch profiles:', profilesError);
            console.warn('⚠️ Error details:', JSON.stringify(profilesError, null, 2));
          } else {
            profilesData = data || [];
            console.log('👥 Fetched profiles data:', profilesData);
            console.log('👥 Profile fields available:', profilesData.length > 0 ? Object.keys(profilesData[0]) : 'No profiles found');
          }
        } catch (err) {
          console.warn('⚠️ Profiles table may not exist:', err);
        }
      }

      // Fetch reactions for feedback (optional table)
      const feedbackIds = feedbackData?.map(f => f.id) || [];
      let reactionsData = [];
      try {
        const { data, error: reactionsError } = await supabase
          .from('feedback_reactions')
          .select('*')
          .in('feedback_id', feedbackIds);

        if (reactionsError) {
          console.warn('⚠️ Could not fetch reactions:', reactionsError);
        } else {
          reactionsData = data || [];
        }
      } catch (err) {
        console.warn('⚠️ feedback_reactions table may not exist:', err);
      }

      // Fetch replies for feedback (optional table)
      let repliesData = [];
      try {
        const { data, error: repliesError } = await supabase
          .from('feedback_replies')
          .select('*')
          .in('feedback_id', feedbackIds);

        if (repliesError) {
          console.warn('⚠️ Could not fetch replies:', repliesError);
        } else {
          repliesData = data || [];
        }
      } catch (err) {
        console.warn('⚠️ feedback_replies table may not exist:', err);
      }      // Format feedback data
      console.log('🔧 Formatting feedback data...');
      const formattedFeedback: Feedback[] = (feedbackData || []).map((item: any) => {        console.log('🔧 Processing feedback item:', {
          id: item.id,
          comment: item.comment?.substring(0, 50) + '...',
          timestamp: item.timestamp,
          user_id: item.user_id,
          version_id: item.version_id
        });        const userProfile = profilesData?.find(profile => profile.id === item.user_id);
        console.log('👤 User profile search for user_id:', item.user_id, 'found profile:', userProfile);
        
        // Try different possible username fields from profile
        let userName = 'Unknown User';
        if (userProfile) {
          userName = userProfile.display_name || 
                   userProfile.full_name || 
                   userProfile.name || 
                   userProfile.username || 
                   userProfile.email || 
                   'Unknown User';
          console.log('👤 Resolved username from profile:', userName);
        } else {
          console.log('👤 No profile found for user_id:', item.user_id, 'using fallback');
        }
        
        const itemReactions = reactionsData
          ? reactionsData.filter(reaction => reaction.feedback_id === item.id)
          : [];
          const itemReplies = repliesData
          ? repliesData
              .filter(reply => reply.feedback_id === item.id)
              .map(reply => {
                const replyUserProfile = profilesData?.find(
                  profile => profile.id === reply.user_id
                );
                const replyUserName = replyUserProfile?.display_name || 
                                     replyUserProfile?.full_name || 
                                     replyUserProfile?.name || 
                                     replyUserProfile?.username || 
                                     replyUserProfile?.email || 
                                     'Unknown User';
                return {
                  id: reply.id,
                  feedbackId: reply.feedback_id,
                  userId: reply.user_id,
                  comment: reply.comment,
                  createdAt: reply.created_at,
                  user: replyUserProfile ? {
                    id: replyUserProfile.id,
                    email: replyUserProfile.email || '',
                    fullName: replyUserName,
                    avatarUrl: replyUserProfile.avatar_url || ''
                  } : undefined
                };
              })
          : [];const formatted = {
          id: item.id,
          projectId: item.project_id,
          versionId: item.version_id,
          userId: item.user_id,
          timestamp: item.timestamp,
          comment: item.comment,
          isChecked: item.is_checked || false,
          drawingData: item.drawing_data ? item.drawing_data : null, // JSONB field, no need to parse
          createdAt: item.created_at,
          user: userProfile ? {
            id: userProfile.id,
            email: userProfile.email || '',
            fullName: userName,
            avatarUrl: userProfile.avatar_url || ''
          } : undefined,
          reactions: itemReactions.map((reaction: any) => ({
            id: reaction.id,
            feedbackId: reaction.feedback_id,
            userId: reaction.user_id,
            emoji: reaction.emoji,
            createdAt: reaction.created_at
          })),
          replies: itemReplies
        };
        
        console.log('✅ Formatted feedback item:', {
          id: formatted.id,
          comment: formatted.comment?.substring(0, 50) + '...',
          timestamp: formatted.timestamp,
          userFullName: formatted.user?.fullName
        });
        
        return formatted;
      });

      console.log('✅ Total formatted feedback items:', formattedFeedback.length);
      console.log('📋 Setting feedback state with:', formattedFeedback);
      setFeedback(formattedFeedback);

    } catch (err) {
      console.error('❌ Error fetching feedback:', err);
    }
  }, [projectId, currentVersion]);

  // Fetch project data and initialize
  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🟡 Fetching project data for ID:', projectId);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          throw new Error('Project not found');
        }
        throw projectError;
      }

      console.log('✅ Project data fetched:', projectData);
      
      // Convert snake_case to camelCase for project
      const convertedProject = {
        id: projectData.id,
        title: projectData.title,
        description: projectData.description,
        videoUrl: projectData.video_url,
        createdAt: projectData.created_at,
        userId: projectData.user_id
      };
      
      setProject(convertedProject);

      // Fetch project versions
      console.log('🔄 Fetching project versions…');
      const { data: versionsData, error: versionsError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (versionsError) throw versionsError;

      // Convert snake_case to camelCase for versions
      const convertedVersions = versionsData?.map(version => ({
        id: version.id,
        projectId: version.project_id,
        userId: version.user_id,
        versionNumber: version.version_number,
        title: version.title,
        videoUrl: version.video_url,
        description: version.description,
        isActive: version.is_active,
        createdAt: version.created_at
      })) || [];

      console.log('✅ Versions fetched:', convertedVersions.length, 'versions');
      setVersions(convertedVersions);

      // Find active version
      const activeVersion = convertedVersions.find(v => v.isActive);
      
      if (!activeVersion && convertedVersions.length === 0) {
        console.log('🔧 No versions found, creating initial version...');
        // Create initial version if none exists
        const initialVersion = await versionService.createVersion(projectId, convertedProject.userId, {
          title: 'Version 1',
          videoUrl: convertedProject.videoUrl,
          description: 'Initial version'
        });
        setVersions([initialVersion]);
        setCurrentVersion(initialVersion);
      } else if (activeVersion) {
        console.log('✅ Active version found:', activeVersion);
        setCurrentVersion(activeVersion);
      }

    } catch (err) {      console.error('❌ Error fetching project:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      if (err instanceof Error && err.message === 'Project not found') {
        navigate('/404');
      }    } finally {
      setIsLoading(false);
    }
  }, [projectId]); // navigate is stable, remove from deps to prevent infinite loop  

  // Initialize project data on mount
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Fetch feedback when current version changes
  useEffect(() => {
    if (currentVersion) {
      console.log('🔄 Current version changed, fetching feedback for version:', currentVersion.versionNumber);
      fetchFeedback(currentVersion);
    }
  }, [currentVersion, fetchFeedback]);

  // Fetch versions when needed
  const fetchVersions = async () => {
    if (!projectId) return;

    try {
      console.log('🔄 Fetching versions…');
      const { data: versionsData, error: versionsError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (versionsError) throw versionsError;

      // Convert snake_case to camelCase for versions
      const convertedVersions = versionsData?.map(version => ({
        id: version.id,
        projectId: version.project_id,
        userId: version.user_id,
        versionNumber: version.version_number,
        title: version.title,
        videoUrl: version.video_url,
        description: version.description,
        isActive: version.is_active,
        createdAt: version.created_at
      })) || [];

      console.log('✅ Versions updated:', convertedVersions.length, 'versions');
      setVersions(convertedVersions);

      // Find active version
      const activeVersion = convertedVersions.find(v => v.isActive);
      
      if (activeVersion) {
        setCurrentVersion(activeVersion);
      }
    } catch (error) {
      console.error('❌ Error fetching versions:', error);
    }
  };

  // Switch to a different version
  const handleVersionSwitch = async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    console.log('🔄 === VERSION SWITCH START ===');
    console.log('🔄 Switching from version:', currentVersion?.versionNumber, 'to version:', version.versionNumber);

    try {      
      // Clear all feedback data immediately to prevent contamination
      setFeedback([]);
      setPreviousVersionsFeedback([]);
      setShowPreviousVersionsFeedback(false);
      
      // Update active version in database
      await versionService.switchToVersion(projectId!, versionId);
      
      // Set current version state
      setCurrentVersion(version);

      console.log('✅ === VERSION SWITCH COMPLETE ===');
      
      return version;
    } catch (error) {
      console.error('❌ Error switching version:', error);
      throw error;
    }  };

  // Compute can create version
  const canCreateVersion = !!(user && project && user.id === project.userId);

  return {
    // State
    projectId,
    project,
    versions,
    currentVersion,
    feedback,
    previousVersionsFeedback,
    showPreviousVersionsFeedback,
    isLoading,
    error,
    canCreateVersion,
    
    // State setters
    setProject,
    setVersions,
    setCurrentVersion,
    setFeedback,
    setPreviousVersionsFeedback,
    setShowPreviousVersionsFeedback,
      // Actions
    fetchProjectData,
    fetchVersions,
    fetchFeedback,
    handleVersionSwitch,
    extractYouTubeId,
  };
};
