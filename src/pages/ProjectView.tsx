import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Project, ProjectVersion, Feedback, DrawingData, FilterOption } from '../types';
import { versionService } from '../services/versionService';
import AppLayout from '../components/layouts/AppLayout';
import VideoPlayer from '../components/VideoPlayer';
import VideoTimeline from '../components/VideoTimeline';
import FeedbackList from '../components/FeedbackList';
import FeedbackForm from '../components/FeedbackForm';
import DrawingCanvas from '../components/DrawingCanvas';
import NewVersionModal from '../components/NewVersionModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Plus, ChevronDown } from 'lucide-react';

// Define YT namespace for TypeScript
declare namespace YT {
  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getDuration(): number;
    getCurrentTime(): number;
  }
}

const ProjectView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [previousVersionsFeedback, setPreviousVersionsFeedback] = useState<Feedback[]>([]);
  const [showPreviousVersionsFeedback, setShowPreviousVersionsFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Version management state
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  
  // Video state
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeToSeek, setTimeToSeek] = useState<number | null>(null);
    // Feedback form state
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(true);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [initialComment, setInitialComment] = useState('');
  const [initialDrawing, setInitialDrawing] = useState<DrawingData | null>(null);
    // Drawing canvas state
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isDisplayingFeedbackDrawing, setIsDisplayingFeedbackDrawing] = useState(false);  // Filter state
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  
  // Highlight state for feedback synchronization
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);
  // Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player>();

  const handlePlayerReady = (player: YT.Player) => {
    playerRef.current = player;
  };  const handleSketchClick = () => {
    console.log('[ProjectView] before handleSketchClick', { isPlaying, showDrawingCanvas });
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
    
    // First pause the video and update playing state
    setIsPlaying(false);
    
    // Reset feedback form state
    setIsEditingFeedback(false);
    setEditingFeedbackId(null);
    setInitialComment('');
    setInitialDrawing(null);
      // Update container dimensions with a slight delay to ensure the player is properly measured
    setTimeout(() => {
      if (playerContainerRef.current) {
        // Get the actual video element dimensions
        const videoElement = playerContainerRef.current.querySelector('iframe') || 
                            playerContainerRef.current.querySelector('video') || 
                            playerContainerRef.current.querySelector('.aspect-video');
        
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          const w = rect.width;
          const h = rect.height;
          console.log('[ProjectView] updating dimensions in handleSketchClick', { w, h, element: videoElement });
          setContainerWidth(w);
          setContainerHeight(h);
        }
        
        // After updating dimensions, show the drawing canvas and feedback form
        setShowDrawingCanvas(true);
        setIsFeedbackFormOpen(true);
        console.log('[ProjectView] after handleSketchClick', { isPlaying: false, showDrawingCanvas: true });
      }
    }, 50);
  };

  const extractYouTubeId = (url: string): string | null => {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(fullUrl);
      
      let videoId: string | null = null;
      
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
        videoId = urlObj.searchParams.get('v');
        
        if (!videoId && urlObj.pathname.startsWith('/v/')) {
          videoId = urlObj.pathname.slice(3);
        } else if (!videoId && urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.slice(7);
        }
      }
      
      if (videoId) {
        videoId = videoId.split(/[#?]/)[0];
        return videoId.length === 11 ? videoId : null;
      }
      
      return null;
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
      return null;
    }
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
        
        if (projectError) throw projectError;
        
        if (!projectData) {
          throw new Error('Project not found');
        }
        
        const formattedProject: Project = {
          id: projectData.id,
          title: projectData.title,
          description: projectData.description,
          videoUrl: projectData.video_url,
          createdAt: projectData.created_at,
          userId: projectData.user_id
        };
          setProject(formattedProject);
        
        // Fetch versions and set up version management
        await fetchVersions();
        
        await fetchFeedback();
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        if (err instanceof Error && err.message === 'Project not found') {
          navigate('/404');
        }
      } finally {
        setIsLoading(false);
      }
    };    fetchProjectData();  }, [projectId, navigate]);  // Effect to refetch feedback when current version changes
  useEffect(() => {
    if (currentVersion) {
      fetchFeedback();
    }
  }, [currentVersion]);

  // ResizeObserver to watch video container changes
  useEffect(() => {
    if (!playerContainerRef.current) return;    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Get the actual video element dimensions
        const videoElement = entry.target.querySelector('iframe') || 
                            entry.target.querySelector('video') || 
                            entry.target.querySelector('.aspect-video');
        
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          const w = rect.width;
          const h = rect.height;
          console.log('[ProjectView] ResizeObserver updating dimensions', { w, h, element: videoElement });
          setContainerWidth(w);
          setContainerHeight(h);
        }
      }
    });

    resizeObserver.observe(playerContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [playerContainerRef.current]);  // Helper function to update video container dimensions
  const updateVideoContainerDimensions = () => {
    if (playerContainerRef.current) {
      // Get the actual video element within the container
      const videoElement = playerContainerRef.current.querySelector('iframe') || 
                          playerContainerRef.current.querySelector('video') || 
                          playerContainerRef.current.querySelector('.aspect-video');
      
      if (videoElement) {
        const rect = videoElement.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        console.log('[ProjectView] updating video dimensions', { w, h, element: videoElement });
        setContainerWidth(w);
        setContainerHeight(h);
      }
    }
  };

  // Effect to update dimensions when video is ready
  useEffect(() => {
    if (videoReady && playerContainerRef.current) {
      // Wait a bit for the video to fully render
      setTimeout(updateVideoContainerDimensions, 100);
    }
  }, [videoReady]);
  useEffect(() => {
    if (!projectId) return;
    
    const feedbackSubscription = supabase
      .channel(`project-${projectId}-feedback`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchFeedback();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(feedbackSubscription);
    };
  }, [projectId, currentVersion]);
  const fetchFeedback = async () => {
    if (!projectId) return;
      try {
      // Fetch current version feedback
      let currentQuery = supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId);
      
      // Filter by current version if available
      if (currentVersion) {
        currentQuery = currentQuery.eq('version_id', currentVersion.id);
      }
      
      const { data: currentFeedbackData, error: currentFeedbackError } = await currentQuery
        .order('timestamp', { ascending: true });
      
      if (currentFeedbackError) throw currentFeedbackError;      // Fetch previous version feedback (only the immediately previous version)
      let previousFeedbackData: any[] = [];
      if (currentVersion && currentVersion.versionNumber > 1) {
        // Get the immediately previous version (versionNumber - 1)
        const { data: previousVersion, error: previousVersionError } = await supabase
          .from('project_versions')
          .select('id')
          .eq('project_id', projectId)
          .eq('version_number', currentVersion.versionNumber - 1)
          .single();

        if (previousVersionError) {
          console.error('Error fetching previous version:', previousVersionError);
        } else if (previousVersion) {
          // Fetch feedback for the immediately previous version only
          const { data: prevFeedback, error: prevFeedbackError } = await supabase
            .from('feedback')
            .select('*')
            .eq('project_id', projectId)
            .eq('version_id', previousVersion.id)
            .order('timestamp', { ascending: true });
          
          if (prevFeedbackError) {
            console.error('Error fetching previous version feedback:', prevFeedbackError);
          } else {
            previousFeedbackData = prevFeedback || [];
          }
        }
      }

      // Always include previous feedback for processing, but display control is handled in UI
      const allFeedbackData = [...(currentFeedbackData || []), ...previousFeedbackData];
      
      if (!allFeedbackData || allFeedbackData.length === 0) {
        setFeedback([]);
        setPreviousVersionsFeedback([]);
        return;
      }
        const userIds = Array.from(new Set(allFeedbackData.map((item: any) => item.user_id)));
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      const userProfiles = profilesData || [];
      
      const feedbackIds = allFeedbackData.map((item: any) => item.id);
      
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('reactions')
        .select('*')
        .in('feedback_id', feedbackIds);
      
      if (reactionsError) throw reactionsError;
      
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('*')
        .in('feedback_id', feedbackIds)
        .order('created_at', { ascending: true });
      
      if (repliesError) throw repliesError;
      
      const replyUserIds = repliesData 
        ? Array.from(new Set(repliesData.map((reply: any) => reply.user_id)))
        : [];
      
      let replyUserProfiles: any[] = [];
      
      if (replyUserIds.length > 0) {
        const { data: replyProfilesData, error: replyProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', replyUserIds);
        
        if (replyProfilesError) throw replyProfilesError;
        
        replyUserProfiles = replyProfilesData || [];
      }
      
      const formattedFeedback: Feedback[] = allFeedbackData.map((item: any) => {
        const userProfile = userProfiles.find(profile => profile.id === item.user_id);
        
        const itemReactions = reactionsData
          ? reactionsData.filter(reaction => reaction.feedback_id === item.id)
          : [];
        
        const itemReplies = repliesData
          ? repliesData
              .filter(reply => reply.feedback_id === item.id)
              .map(reply => {
                const replyUserProfile = replyUserProfiles.find(
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
          replies: itemReplies        };
      });
      
      // Separate current version feedback from previous versions feedback
      const currentVersionFeedback = formattedFeedback.filter(f => 
        currentVersion && f.versionId === currentVersion.id
      );
      
      const previousVersionsFeedbackList = formattedFeedback.filter(f => 
        currentVersion && f.versionId !== currentVersion.id
      );      setFeedback(currentVersionFeedback);
      setPreviousVersionsFeedback(previousVersionsFeedbackList);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };  useEffect(() => {
    const updateDimensions = () => {
      if (playerContainerRef.current) {
        // Get the actual video element dimensions
        const videoElement = playerContainerRef.current.querySelector('iframe') || 
                            playerContainerRef.current.querySelector('video') || 
                            playerContainerRef.current.querySelector('.aspect-video');
        
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          const w = rect.width;
          const h = rect.height;
          console.log('[ProjectView] updateDimensions on resize', { w, h, element: videoElement });
          setContainerWidth(w);
          setContainerHeight(h);
        }
      }
    };
    
    // Initial dimensions
    updateDimensions();
    
    // Update dimensions when window resizes
    window.addEventListener('resize', updateDimensions);
    
    // Also check dimensions periodically for the first few seconds
    // to handle cases where the player loads with a delay
    const dimensionIntervals = [100, 500, 1000, 2000];
    const timeoutIds = dimensionIntervals.map(delay => 
      setTimeout(updateDimensions, delay)
    );
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []);
  // Video player callbacks
  const handleVideoReady = (dur: number) => {
    setVideoReady(true);
    setDuration(dur);
      // Update container dimensions when video is ready
    setTimeout(() => {
      if (playerContainerRef.current) {
        // Get the actual video element dimensions
        const videoElement = playerContainerRef.current.querySelector('iframe') || 
                            playerContainerRef.current.querySelector('video') || 
                            playerContainerRef.current.querySelector('.aspect-video');
        
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          const w = rect.width;
          const h = rect.height;
          console.log('[ProjectView] updateDimensions in handleVideoReady', { w, h, element: videoElement });
          setContainerWidth(w);
          setContainerHeight(h);
        }
      }
    }, 100); // Give a bit more time for the player to initialize
  };
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    // Clear displayed feedback drawing if user navigates away from the feedback timestamp
    // and is not currently in drawing/editing mode
    if (isDisplayingFeedbackDrawing && !isFeedbackFormOpen) {
      // Check if current time has moved significantly from any feedback timestamp
      const hasMatchingFeedback = feedback.some(f => 
        Math.abs(f.timestamp - time) < 1.0 // Within 1 second tolerance
      );
      
      if (!hasMatchingFeedback) {
        setShowDrawingCanvas(false);
        setInitialDrawing(null);
        setCurrentDrawing(null);
        setIsDisplayingFeedbackDrawing(false);
      }
    }
  };
  const handlePlay = () => {
    setIsPlaying(true);
      // Clear any displayed drawing data when playing unless in drawing mode
    if (!isFeedbackFormOpen) {
      setShowDrawingCanvas(false);
      setInitialDrawing(null);
      setCurrentDrawing(null);
      setIsDisplayingFeedbackDrawing(false);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };  const handleSeek = (time: number) => {
    setTimeToSeek(time);
    setCurrentTime(time);
      // Clear any displayed drawing data when seeking to a different position
    // unless the user is currently in drawing mode (feedback form is open)
    if (!isFeedbackFormOpen) {
      setShowDrawingCanvas(false);
      setInitialDrawing(null);
      setCurrentDrawing(null);
      setIsDisplayingFeedbackDrawing(false);
    }
  };

  // New function to handle feedback clicks that include drawing data
  const handleFeedbackClick = (timestamp: number, feedbackItem?: Feedback) => {
    setTimeToSeek(timestamp);
    setCurrentTime(timestamp);
    
    // If feedback has drawing data, display it on the canvas
    if (feedbackItem?.drawingData) {
      console.log('[ProjectView] displaying drawing for feedback', feedbackItem.id, feedbackItem.drawingData);
        // Ensure dimensions are set
      setTimeout(() => {
        if (playerContainerRef.current) {
          const videoElement = playerContainerRef.current.querySelector('iframe') || 
                              playerContainerRef.current.querySelector('video') || 
                              playerContainerRef.current.querySelector('.aspect-video');
          
          if (videoElement) {
            const rect = videoElement.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            console.log('[ProjectView] updating dimensions for feedback display', { w, h, element: videoElement });
            setContainerWidth(w);
            setContainerHeight(h);
          }
            // Show the drawing canvas with the feedback's drawing data
          setShowDrawingCanvas(true);
          setInitialDrawing(feedbackItem.drawingData);
          setCurrentDrawing(feedbackItem.drawingData);
          setIsDisplayingFeedbackDrawing(true);
          
          // Don't automatically enable drawing mode when viewing existing feedback
          // The drawing will be displayed but the user won't be in edit mode
        }
      }, 50);} else {
      // If no drawing data, hide the drawing canvas
      setShowDrawingCanvas(false);
      setInitialDrawing(null);
      setCurrentDrawing(null);
      setIsDisplayingFeedbackDrawing(false);
    }
  };  // Handle feedback highlighting for synchronization between timeline and list
  const handleFeedbackHighlight = (feedbackId: string | null) => {
    setHighlightedFeedbackId(feedbackId);
    // No auto-clear - let the highlight persist until manually cleared or another item is highlighted
  };

  // Enhanced feedback click handler with highlighting
  const handleFeedbackClickWithHighlight = (timestamp: number, feedbackItem?: Feedback) => {
    // Set highlight for the clicked feedback
    if (feedbackItem) {
      setHighlightedFeedbackId(feedbackItem.id);
    }
    
    // Call the existing feedback click handler
    handleFeedbackClick(timestamp, feedbackItem);
  };

  const handleDrawingChange = (drawingData: DrawingData | null) => {
    setCurrentDrawing(drawingData);
  };
  const handleCloseFeedbackForm = () => {
    setIsFeedbackFormOpen(false);
    setShowDrawingCanvas(false);
    setCurrentDrawing(null);
    setInitialDrawing(null);
    setIsEditingFeedback(false);
    setEditingFeedbackId(null);
    setInitialComment('');
    setIsDisplayingFeedbackDrawing(false);
  };

  const handleFeedbackSubmit = async (comment: string, drawingData: DrawingData | null) => {
    if (!user || !projectId) return;
    
    try {
      if (isEditingFeedback && editingFeedbackId) {
        await supabase
          .from('feedback')
          .update({
            comment,
            drawing_data: drawingData
          })
          .eq('id', editingFeedbackId);
      } else {        await supabase
          .from('feedback')
          .insert({
            project_id: projectId,
            version_id: currentVersion?.id,
            user_id: user.id,
            timestamp: currentTime,
            comment,
            drawing_data: drawingData,
            is_checked: false
          });}
      
      handleCloseFeedbackForm();
      await fetchFeedback();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const handleEditFeedback = (feedbackItem: Feedback) => {
    setIsPlaying(false);
    setTimeToSeek(feedbackItem.timestamp);
    
    if (feedbackItem.drawingData) {
      setShowDrawingCanvas(true);
    }
    
    setIsEditingFeedback(true);
    setEditingFeedbackId(feedbackItem.id);
    setInitialComment(feedbackItem.comment);
    setInitialDrawing(feedbackItem.drawingData);
    setIsFeedbackFormOpen(true);
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }
    
    try {
      await supabase
        .from('reactions')
        .delete()
        .eq('feedback_id', feedbackId);
      
      await supabase
        .from('replies')
        .delete()
        .eq('feedback_id', feedbackId);
      
      await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);
      
      await fetchFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback. Please try again.');
    }
  };

  const handleFeedbackStatusChange = async (feedbackId: string, isChecked: boolean) => {
    try {
      await supabase
        .from('feedback')
        .update({ is_checked: isChecked })
        .eq('id', feedbackId);
      
      await fetchFeedback();
    } catch (err) {
      console.error('Error updating feedback status:', err);
      alert('Failed to update feedback status. Please try again.');
    }
  };

  const handleAddReaction = async (feedbackId: string, emoji: string) => {
    if (!user) return;
    
    try {
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('*')
        .eq('feedback_id', feedbackId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single();
      
      if (existingReaction) {
        await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        await supabase
          .from('reactions')
          .insert({
            feedback_id: feedbackId,
            user_id: user.id,
            emoji
          });
      }
      
      await fetchFeedback();
    } catch (err) {
      console.error('Error adding reaction:', err);
      alert('Failed to add reaction. Please try again.');
    }
  };

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
      
      await fetchFeedback();
    } catch (err) {
      console.error('Error adding reply:', err);
      alert('Failed to add reply. Please try again.');
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    const newTime = currentTime + 5;
    setTimeToSeek(Math.min(newTime, duration));
  };

  const skipBackward = () => {
    const newTime = currentTime - 5;
    setTimeToSeek(Math.max(0, newTime));
  };

  const frameForward = () => {
    const frameStep = 1 / 30;
    const newTime = currentTime + frameStep;
    setTimeToSeek(Math.min(newTime, duration));
  };
  const frameBackward = () => {
    const frameStep = 1 / 30;
    const newTime = currentTime - frameStep;
    setTimeToSeek(Math.max(0, newTime));  };
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      // Skip if user is typing in a form field
      if (isInputFocused) return;

      // 'D' key to activate drawing tools
      if (e.key.toLowerCase() === 'd' && !showDrawingCanvas) {
        e.preventDefault();
        handleSketchClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDrawingCanvas]);

  // Version management functions
  const fetchVersions = async () => {
    if (!projectId) return;

    try {
      const versionsData = await versionService.getProjectVersions(projectId);
      setVersions(versionsData);
      
      // Get active version or create initial version
      let activeVersion = await versionService.getActiveVersion(projectId);
      if (!activeVersion && user && project) {
        // Create initial version using project's video URL
        activeVersion = await versionService.createVersion(projectId, user.id, {
          title: 'Version 1',
          videoUrl: project.videoUrl,
          description: 'Initial version'
        });
        setVersions([activeVersion]);
      }
      
      if (activeVersion) {
        setCurrentVersion(activeVersion);
        // Update video ID when version changes
        const youtubeId = extractYouTubeId(activeVersion.videoUrl);
        if (youtubeId) {
          setVideoId(youtubeId);
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };
  const handleVersionSwitch = async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    try {      // Update active version in database
      await versionService.switchToVersion(projectId!, versionId);
      
      // Update UI state
      setCurrentVersion(version);
      
      // Reset previous versions feedback display to hidden when switching versions
      setShowPreviousVersionsFeedback(false);
      
      // Update video
      const youtubeId = extractYouTubeId(version.videoUrl);
      if (youtubeId) {
        setVideoId(youtubeId);
      }
      
      // Refetch feedback for this version
      await fetchFeedback();
    } catch (error) {
      console.error('Error switching version:', error);
    }
  };

  const handleCreateVersion = async (data: { title: string; videoUrl: string; description?: string }) => {
    if (!user || !projectId) return;

    try {
      setIsCreatingVersion(true);
      const newVersion = await versionService.createVersion(projectId, user.id, data);
      
      // Update versions list
      const updatedVersions = await versionService.getProjectVersions(projectId);
      setVersions(updatedVersions);
      
      // Switch to new version
      await handleVersionSwitch(newVersion.id);
      
      setIsNewVersionModalOpen(false);
    } catch (error) {
      console.error('Error creating version:', error);
    } finally {
      setIsCreatingVersion(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="large" />
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-error-500 mb-2">Error</h2>
          <p className="text-slate-300 mb-6">{error || 'Project not found'}</p>
          <Button
            onClick={() => navigate('/dashboard')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }  return (
    <AppLayout title={project.title}>
      <div className="h-full flex flex-col min-h-0 max-h-screen">
        {/* Navigation */}
        <div className="mb-4 flex-shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Dashboard
          </button>
        </div>        {/* Main content area - flex layout with viewport height consideration */}
        <div className="flex flex-col lg:flex-row w-full gap-4 min-h-0 flex-1 overflow-hidden">{/* Video section - takes remaining space */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="bg-slate-800 rounded-lg shadow-lg p-4 flex-1 min-h-0 flex flex-col overflow-hidden">            <h1 className="text-2xl font-bold text-white mb-2 flex-shrink-0">{project.title}</h1>
            {project.description && (
              <p className="text-slate-300 mb-4 flex-shrink-0">{project.description}</p>
            )}            {/* Version Management - Inline */}
            {versions.length > 0 && currentVersion && (
              <div className="flex items-center gap-3 py-2">
                {/* Version Selector Dropdown */}
                <div className="relative">
                  <select
                    value={currentVersion.id}
                    onChange={(e) => handleVersionSwitch(e.target.value)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white text-sm hover:bg-slate-600 transition-colors appearance-none pr-8"
                  >
                    {versions
                      .sort((a, b) => b.versionNumber - a.versionNumber)
                      .map((version) => (
                        <option key={version.id} value={version.id}>
                          Version {version.versionNumber} - {version.title}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                
                {user?.id === project.userId && (
                  <button
                    onClick={() => setIsNewVersionModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                  >
                    <Plus size={14} />
                    New Version
                  </button>
                )}
              </div>
            )}{/* Video container with constrained height and center alignment */}
            <div ref={playerContainerRef} className="relative flex-shrink-0 flex justify-center">              <div 
                className="bg-black relative lg:max-h-[50vh]"
                style={{                  aspectRatio: '16/9',
                  maxWidth: 'min(90vw, 1200px)', // Prevent video from getting too wide
                  maxHeight: 'min(60vh, calc(90vw * 9/16))', // More reasonable height limit
                  height: 'auto',
                  width: 'min(90vw, 1200px)' // Explicit width for centering
                }}
              >
                {videoId && (
                  <>
                    <VideoPlayer
                      videoId={videoId}
                      onTimeUpdate={handleTimeUpdate}
                      onVideoReady={handleVideoReady}
                      onPlay={handlePlay}
                      onPause={handlePause}
                      timeToSeek={timeToSeek}
                      isPlaying={isPlaying}
                      width={containerWidth}
                      height={containerHeight}
                      onPlayerReady={handlePlayerReady}
                    />
                    
                    {/* Log rendering information */}
                    {(() => {
                      console.log('[ProjectView] render check', { showDrawingCanvas, isPlaying, containerWidth, containerHeight });
                      return null;
                    })()}
                    
                    {/* Drawing canvas overlay */}
                    {showDrawingCanvas && (
                      <div 
                        className="absolute top-0 left-0 w-full h-full" 
                        style={{ 
                          zIndex: 50, 
                          pointerEvents: 'none' // Allow YouTube UI to be clickable by default
                        }}
                      >
                        <DrawingCanvas
                          width={containerWidth || 640}
                          height={containerHeight || 360}
                          className="absolute top-0 left-0 w-full h-full"
                          onDrawingChange={handleDrawingChange}
                          initialDrawing={currentDrawing || initialDrawing}
                          autoEnableDrawing={true}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>            {/* Timeline - directly below video, same width */}
            {videoReady && containerWidth > 0 && (
              <div className="mt-3 flex-shrink-0">                <VideoTimeline
                  duration={duration}
                  currentTime={currentTime}
                  feedback={feedback}
                  previousVersionsFeedback={previousVersionsFeedback}
                  showPreviousVersionsFeedback={showPreviousVersionsFeedback}
                  currentVersion={currentVersion}
                  onSeek={handleSeek}
                  onFeedbackClick={handleFeedbackClickWithHighlight}
                  highlightedFeedbackId={highlightedFeedbackId}
                  onFeedbackHighlight={handleFeedbackHighlight}
                />
              </div>
            )}

            {/* Video Controls - always visible */}
            <div className="flex items-center justify-between mt-4 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={frameBackward}
                  className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 hover:text-white"
                  title="Previous frame"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  onClick={skipBackward}
                  className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 hover:text-white"
                  title="Skip 5s backward"
                >
                  <SkipBack size={20} />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="p-2 bg-primary-600 rounded-md text-white hover:bg-primary-700"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={skipForward}
                  className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 hover:text-white"
                  title="Skip 5s forward"
                >
                  <SkipForward size={20} />
                </button>
                <button
                  onClick={frameForward}
                  className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 hover:text-white"
                  title="Next frame"
                >
                  <SkipForward size={16} />
                </button>
              </div>
              
              <Button
                onClick={handleSketchClick}
                leftIcon={<Plus size={16} />}
                disabled={isPlaying}
                className={isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Add Feedback
              </Button>
            </div>            {/* Feedback Form - directly below controls when open */}
            {isFeedbackFormOpen && (
              <div className="mt-3 flex-shrink-0">
                <FeedbackForm
                  timestamp={currentTime}
                  onSubmit={handleFeedbackSubmit}
                  onClose={handleCloseFeedbackForm}
                  initialComment={initialComment}
                  initialDrawing={currentDrawing || initialDrawing}
                  isEditing={isEditingFeedback}
                />
              </div>
            )}            {/* Instructions for mobile - always visible */}
            <div className="lg:hidden bg-slate-800 rounded-lg shadow-lg p-4 mt-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white mb-2">How to Add Feedback</h3>
              <ol className="list-decimal list-inside text-slate-300 space-y-2 text-sm">
                <li>Pause the video at the moment you want to comment on</li>
                <li>Click the "Add Feedback" button</li>
                <li>Draw on the video (optional) and write your comment</li>
                <li>Submit your feedback</li>
              </ol>
            </div>
          </div>
        </div>        {/* Feedback List - fixed width on the right with constrained height */}        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col min-h-0 max-h-full order-last lg:order-none">          <FeedbackList
            feedback={feedback}
            previousVersionsFeedback={previousVersionsFeedback}
            showPreviousVersionsFeedback={showPreviousVersionsFeedback}
            currentVersion={currentVersion}
            onTogglePreviousVersionsFeedback={() => setShowPreviousVersionsFeedback(!showPreviousVersionsFeedback)}
            onFeedbackClick={handleFeedbackClickWithHighlight}
            onFeedbackStatusChange={handleFeedbackStatusChange}
            onFeedbackDelete={handleDeleteFeedback}
            onFeedbackEdit={handleEditFeedback}
            onReactionAdd={handleAddReaction}
            onReplyAdd={handleAddReply}
            filterOption={filterOption}
            onFilterChange={setFilterOption}
            highlightedFeedbackId={highlightedFeedbackId}          />
        </div></div>
      </div>
        {/* New Version Modal */}
      <NewVersionModal
        isOpen={isNewVersionModalOpen}
        onClose={() => setIsNewVersionModalOpen(false)}
        onSubmit={handleCreateVersion}
        nextVersionNumber={(versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber)) + 1 : 1)}
        isLoading={isCreatingVersion}
      />
    </AppLayout>
  );
};

export default ProjectView;