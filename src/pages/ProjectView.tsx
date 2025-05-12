import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layouts/AppLayout';
import VideoPlayer from '../components/VideoPlayer';
import VideoTimeline from '../components/VideoTimeline';
import FeedbackList from '../components/FeedbackList';
import FeedbackForm from '../components/FeedbackForm';
import DrawingCanvas from '../components/DrawingCanvas';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Plus } from 'lucide-react';
import type { Project, Feedback, DrawingData, FilterOption } from '../types';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeToSeek, setTimeToSeek] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  
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
  
  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    try {
      // Create URL object (handles relative URLs by prepending protocol if needed)
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(fullUrl);
      
      let videoId: string | null = null;
      
      // Handle youtu.be URLs
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      }
      // Handle youtube.com URLs
      else if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
        // Get video ID from query parameter
        videoId = urlObj.searchParams.get('v');
        
        // Handle /v/ format
        if (!videoId && urlObj.pathname.startsWith('/v/')) {
          videoId = urlObj.pathname.slice(3);
        }
        // Handle /embed/ format
        else if (!videoId && urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.slice(7);
        }
      }
      
      // Clean up video ID by removing any remaining query parameters or hash
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
  
  // Fetch project and initial feedback
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch project
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
        
        // Extract YouTube video ID
        const youtubeId = extractYouTubeId(formattedProject.videoUrl);
        if (youtubeId) {
          setVideoId(youtubeId);
        } else {
          throw new Error('Invalid YouTube URL');
        }
        
        // Fetch initial feedback
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
  
  // Subscribe to feedback updates
  useEffect(() => {
    if (!projectId) return;
    
    // Set up real-time subscription
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
          // Refetch all feedback when any changes occur
          fetchFeedback();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(feedbackSubscription);
    };
  }, [projectId]);
  
  // Fetch feedback data with user profiles, reactions, and replies
  const fetchFeedback = async () => {
    if (!projectId) return;
    
    try {
      // Fetch feedback for the project
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
      
      // Fetch user profiles for all feedback
      const userIds = Array.from(new Set(feedbackData.map(item => item.user_id)));
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      const userProfiles = profilesData || [];
      
      // Fetch reactions for all feedback
      const feedbackIds = feedbackData.map(item => item.id);
      
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('reactions')
        .select('*')
        .in('feedback_id', feedbackIds);
      
      if (reactionsError) throw reactionsError;
      
      // Fetch replies for all feedback
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('*')
        .in('feedback_id', feedbackIds)
        .order('created_at', { ascending: true });
      
      if (repliesError) throw repliesError;
      
      // Fetch user profiles for all replies
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
      
      // Format the feedback data with user profiles, reactions, and replies
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
  };
  
  // Update container dimensions for drawing canvas
  useEffect(() => {
    const updateDimensions = () => {
      if (playerContainerRef.current) {
        setContainerWidth(playerContainerRef.current.offsetWidth);
        setContainerHeight(playerContainerRef.current.offsetHeight);
      }
    };
    
    // Initial calculation
    updateDimensions();
    
    // Listen for resize events
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Callbacks for video player
  const handleVideoReady = () => {
    setVideoReady(true);
    setDuration(600); // Default duration until we can get it from the player
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
  };
  
  // Add feedback
  const handleAddFeedback = () => {
    // Pause the video if it's playing
    setIsPlaying(false);
    
    // Show the drawing canvas
    setShowDrawingCanvas(true);
    
    // Open the feedback form
    setIsFeedbackFormOpen(true);
    setIsEditingFeedback(false);
    setEditingFeedbackId(null);
    setInitialComment('');
    setInitialDrawing(null);
  };
  
  // Handle drawing changes
  const handleDrawingChange = (drawingData: DrawingData | null) => {
    setCurrentDrawing(drawingData);
  };
  
  // Submit feedback
  const handleFeedbackSubmit = async (comment: string, drawingData: DrawingData | null) => {
    if (!user || !projectId) return;
    
    try {
      if (isEditingFeedback && editingFeedbackId) {
        // Update existing feedback
        await supabase
          .from('feedback')
          .update({
            comment,
            drawing_data: drawingData
          })
          .eq('id', editingFeedbackId);
      } else {
        // Create new feedback
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
      
      // Hide the drawing canvas
      setShowDrawingCanvas(false);
      setCurrentDrawing(null);
      
      // Clear form state
      setIsEditingFeedback(false);
      setEditingFeedbackId(null);
      
      // Refresh feedback list
      await fetchFeedback();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    }
  };
  
  // Edit feedback
  const handleEditFeedback = (feedbackItem: Feedback) => {
    // Pause the video and seek to the feedback timestamp
    setIsPlaying(false);
    setTimeToSeek(feedbackItem.timestamp);
    
    // Show the drawing canvas if the feedback has a drawing
    if (feedbackItem.drawingData) {
      setShowDrawingCanvas(true);
    }
    
    // Open the feedback form with existing data
    setIsEditingFeedback(true);
    setEditingFeedbackId(feedbackItem.id);
    setInitialComment(feedbackItem.comment);
    setInitialDrawing(feedbackItem.drawingData);
    setIsFeedbackFormOpen(true);
  };
  
  // Delete feedback
  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }
    
    try {
      // Delete reactions first
      await supabase
        .from('reactions')
        .delete()
        .eq('feedback_id', feedbackId);
      
      // Delete replies
      await supabase
        .from('replies')
        .delete()
        .eq('feedback_id', feedbackId);
      
      // Delete the feedback
      await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);
      
      // Refresh feedback list
      await fetchFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback. Please try again.');
    }
  };
  
  // Change feedback status
  const handleFeedbackStatusChange = async (feedbackId: string, isChecked: boolean) => {
    try {
      await supabase
        .from('feedback')
        .update({ is_checked: isChecked })
        .eq('id', feedbackId);
      
      // Refresh feedback list
      await fetchFeedback();
    } catch (err) {
      console.error('Error updating feedback status:', err);
      alert('Failed to update feedback status. Please try again.');
    }
  };
  
  // Add reaction to feedback
  const handleAddReaction = async (feedbackId: string, emoji: string) => {
    if (!user) return;
    
    try {
      // Check if user already reacted with this emoji
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('*')
        .eq('feedback_id', feedbackId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single();
      
      if (existingReaction) {
        // Remove the reaction if it already exists
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
      
      // Refresh feedback list
      await fetchFeedback();
    } catch (err) {
      console.error('Error adding reaction:', err);
      alert('Failed to add reaction. Please try again.');
    }
  };
  
  // Add reply to feedback
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
      
      // Refresh feedback list
      await fetchFeedback();
    } catch (err) {
      console.error('Error adding reply:', err);
      alert('Failed to add reply. Please try again.');
    }
  };
  
  // Playback controls
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
    // Approximate frame step (assuming 30fps)
    const frameStep = 1 / 30;
    const newTime = currentTime + frameStep;
    setTimeToSeek(Math.min(newTime, duration));
  };
  
  const frameBackward = () => {
    // Approximate frame step (assuming 30fps)
    const frameStep = 1 / 30;
    const newTime = currentTime - frameStep;
    setTimeToSeek(Math.max(0, newTime));
  };
  
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video and Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800 rounded-lg shadow-lg p-4">
            <h1 className="text-2xl font-bold text-white mb-2">{project.title}</h1>
            {project.description && (
              <p className="text-slate-300 mb-4">{project.description}</p>
            )}
            
            {/* Video Player Container */}
            <div ref={playerContainerRef} className="relative">
              {videoId && (
                <VideoPlayer
                  videoId={videoId}
                  onTimeUpdate={handleTimeUpdate}
                  onVideoReady={handleVideoReady}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  timeToSeek={timeToSeek}
                />
              )}
              
              {/* Drawing Canvas (only visible when paused) */}
              {showDrawingCanvas && !isPlaying && (
                <DrawingCanvas
                  containerWidth={containerWidth}
                  containerHeight={containerHeight}
                  isVisible={showDrawingCanvas}
                  initialDrawing={initialDrawing}
                  onDrawingChange={handleDrawingChange}
                />
              )}
            </div>
            
            {/* Video Timeline */}
            {videoReady && (
              <VideoTimeline
                duration={duration}
                currentTime={currentTime}
                feedback={feedback}
                onSeek={handleSeek}
              />
            )}
            
            {/* Video Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
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
              
              <div className="flex items-center">
                <span className="text-sm text-slate-300 mr-2">Speed:</span>
                <div className="flex space-x-1">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-2 py-1 text-xs rounded-md ${
                        playbackRate === rate
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
                
                <div className="border-l border-slate-600 mx-3 h-6"></div>
                
                <Button
                  onClick={handleAddFeedback}
                  leftIcon={<Plus size={16} />}
                  disabled={isPlaying}
                  className={isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Add Feedback
                </Button>
              </div>
            </div>
          </div>
          
          {/* Instructions card (mobile only) */}
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
        
        {/* Feedback List */}
        <div className="lg:col-span-1">
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
      
      {/* Feedback Form Modal */}
      <FeedbackForm
        currentTime={currentTime}
        isOpen={isFeedbackFormOpen}
        onClose={() => {
          setIsFeedbackFormOpen(false);
          setShowDrawingCanvas(false);
          setCurrentDrawing(null);
          setIsEditingFeedback(false);
          setEditingFeedbackId(null);
        }}
        onSubmit={handleFeedbackSubmit}
        initialComment={initialComment}
        initialDrawing={currentDrawing || initialDrawing}
        isEditing={isEditingFeedback}
      />
    </AppLayout>
  );
};

export default ProjectView;