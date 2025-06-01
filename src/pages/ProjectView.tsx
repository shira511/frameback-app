import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Project, Feedback, DrawingData, FilterOption } from '../types';
import AppLayout from '../components/layouts/AppLayout';
import VideoPlayer from '../components/VideoPlayer';
import VideoTimeline from '../components/VideoTimeline';
import FeedbackList from '../components/FeedbackList';
import FeedbackForm from '../components/FeedbackForm';
import DrawingCanvas from '../components/DrawingCanvas';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Plus } from 'lucide-react';

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
  
  const [project, setProject] = useState<Project | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video state
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeToSeek, setTimeToSeek] = useState<number | null>(null);
  
  // Feedback form state
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [initialComment, setInitialComment] = useState('');
  const [initialDrawing, setInitialDrawing] = useState<DrawingData | null>(null);
  
  // Drawing canvas state
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Filter state
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  
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
        // Get video player dimensions rather than the container
        const playerElement = playerContainerRef.current.querySelector('.aspect-video');
        if (playerElement) {
          const w = playerElement.clientWidth;
          const h = playerElement.clientHeight;
          console.log('[ProjectView] updating dimensions in handleSketchClick', { w, h });
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
        
        const youtubeId = extractYouTubeId(formattedProject.videoUrl);
        if (youtubeId) {
          setVideoId(youtubeId);
        } else {
          throw new Error('Invalid YouTube URL');
        }
        
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
    };
    
    fetchProjectData();
  }, [projectId, navigate]);

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
  }, [projectId]);

  const fetchFeedback = async () => {
    if (!projectId) return;
    
    try {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: true });
      
      if (feedbackError) throw feedbackError;
      
      if (!feedbackData) {
        setFeedback([]);
        return;
      }
      
      const userIds = Array.from(new Set(feedbackData.map(item => item.user_id)));
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      const userProfiles = profilesData || [];
      
      const feedbackIds = feedbackData.map(item => item.id);
      
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
        ? Array.from(new Set(repliesData.map(reply => reply.user_id)))
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
      
      const formattedFeedback: Feedback[] = feedbackData.map(item => {
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
      
      setFeedback(formattedFeedback);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };  useEffect(() => {
    const updateDimensions = () => {
      if (playerContainerRef.current) {
        // Get video player dimensions rather than the container
        const playerElement = playerContainerRef.current.querySelector('.aspect-video');
        if (playerElement) {
          const w = playerElement.clientWidth;
          const h = playerElement.clientHeight;
          console.log('[ProjectView] updateDimensions on resize', { w, h });
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
        // Get video player dimensions rather than the container
        const playerElement = playerContainerRef.current.querySelector('.aspect-video');
        if (playerElement) {
          const w = playerElement.clientWidth;
          const h = playerElement.clientHeight;
          console.log('[ProjectView] updateDimensions in handleVideoReady', { w, h });
          setContainerWidth(w);
          setContainerHeight(h);
        }
      }
    }, 100); // Give a bit more time for the player to initialize
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowDrawingCanvas(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };
  const handleSeek = (time: number) => {
    setTimeToSeek(time);
    setCurrentTime(time);
  };

  const handleDrawingChange = (drawingData: DrawingData | null) => {
    setCurrentDrawing(drawingData);
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
      } else {
        await supabase
          .from('feedback')
          .insert({
            project_id: projectId,
            user_id: user.id,
            timestamp: currentTime,
            comment,
            drawing_data: drawingData,
            is_checked: false
          });
      }
      
      setShowDrawingCanvas(false);
      setCurrentDrawing(null);
      setIsEditingFeedback(false);
      setEditingFeedbackId(null);
      
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
    setTimeToSeek(Math.max(0, newTime));
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
  }

  return (
    <AppLayout title={project.title}>
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-slate-300 hover:text-white"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Dashboard
        </button>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-slate-800 rounded-lg shadow-lg p-4">
              <h1 className="text-2xl font-bold text-white mb-2">{project.title}</h1>
              {project.description && (
                <p className="text-slate-300 mb-4">{project.description}</p>
              )}              <div ref={playerContainerRef} className="relative">
                <div className="w-full aspect-video bg-black relative">
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
                      })()}                        {/* Drawing canvas overlay */}
                      {showDrawingCanvas && (
                        <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 50, pointerEvents: 'auto' }}>
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
              </div>

              <div className="flex items-center justify-between mt-4">
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
                  Sketch
                </Button>
              </div>

              {videoReady && (
                <VideoTimeline
                  duration={duration}
                  currentTime={currentTime}
                  feedback={feedback}
                  onSeek={handleSeek}
                />
              )}
            </div>

            <div className="lg:hidden bg-slate-800 rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">How to Add Feedback</h3>
              <ol className="list-decimal list-inside text-slate-300 space-y-2">
                <li>Pause the video at the moment you want to comment on</li>
                <li>Click the "Add Feedback" button</li>
                <li>Draw on the video (optional) and write your comment</li>
                <li>Submit your feedback</li>
              </ol>
            </div>
          </div>

          <div className="col-span-1">
            <FeedbackList
              feedback={feedback}
              onFeedbackClick={handleSeek}
              onFeedbackStatusChange={handleFeedbackStatusChange}
              onFeedbackDelete={handleDeleteFeedback}
              onFeedbackEdit={handleEditFeedback}
              onReactionAdd={handleAddReaction}
              onReplyAdd={handleAddReply}
              filterOption={filterOption}
              onFilterChange={setFilterOption}
            />
          </div>
        </div>
      </div>

      {isFeedbackFormOpen && (
        <FeedbackForm
          timestamp={currentTime}
          onSubmit={handleFeedbackSubmit}
          initialComment={initialComment}
          initialDrawing={currentDrawing || initialDrawing}
          isEditing={isEditingFeedback}
        />
      )}
    </AppLayout>
  );
};

export default ProjectView;