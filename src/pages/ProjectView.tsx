import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { DrawingData, FilterOption } from '../types';
import { useProjectView } from '../hooks/useProjectView';
import { useFeedbackSubmission } from '../hooks/useFeedbackSubmission';
import AppLayout from '../components/layouts/AppLayout';
import VideoPlayer from '../components/VideoPlayer';
import VideoTimeline from '../components/VideoTimeline';
import FeedbackList from '../components/FeedbackList';
import FeedbackForm from '../components/FeedbackForm';
import DrawingCanvas from '../components/DrawingCanvas';
import NewVersionModal from '../components/NewVersionModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const navigate = useNavigate();  // Use custom hook for core project data and functionality
  const {
    project,
    versions,
    currentVersion,
    feedback,
    isLoading,
    error,
    canCreateVersion,
    extractYouTubeId,
    fetchProjectData,
    fetchVersions,
    fetchFeedback
  } = useProjectView();  const {
    submitFeedback,
    updateFeedback,
    error: feedbackError,
    clearError: clearFeedbackError
  } = useFeedbackSubmission(() => {
    // Refresh feedback after successful submission
    if (currentVersion) {
      fetchFeedback(currentVersion);
    }
  });
  // Local state for UI and video player
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeToSeek, setTimeToSeek] = useState<number | null>(null);  // Feedback form state - Always visible
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [initialComment, setInitialComment] = useState('');
  const [initialDrawing, setInitialDrawing] = useState<DrawingData | null>(null);    // Drawing canvas state
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
  
  // Selected feedback drawing display
  const [selectedFeedbackDrawing, setSelectedFeedbackDrawing] = useState<DrawingData | null>(null);

  // Filter and highlight state
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);  // Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player>();
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const feedbackListRef = useRef<HTMLDivElement>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const feedbackFormRef = useRef<HTMLDivElement>(null);
  
  // Debug: Monitor feedback data changes
  useEffect(() => {
    console.log('🎯 ProjectView feedback data changed:', {
      feedbackCount: feedback?.length || 0,
      currentVersionId: currentVersion?.id,
      currentVersionNumber: currentVersion?.versionNumber,
      feedbackItems: feedback?.map(f => ({
        id: f.id,
        comment: f.comment?.substring(0, 50) + '...',
        timestamp: f.timestamp,
        versionId: f.versionId
      })) || []
    });
  }, [feedback, currentVersion]);  // Debug: Monitor drawing canvas state changes
  useEffect(() => {
    console.log('[ProjectView] Drawing canvas state changed:', {
      showDrawingCanvas,
      timestamp: new Date().toISOString()
    });
  }, [showDrawingCanvas]);  // Clear selected feedback drawing when highlighted feedback changes to null
  useEffect(() => {
    if (!highlightedFeedbackId) {
      setSelectedFeedbackDrawing(null);
    }
  }, [highlightedFeedbackId]);
  // Clear selected feedback drawing when timeline position changes and no feedback exists at that time
  useEffect(() => {
    // Only check if we have a selected feedback drawing and we're not actively seeking
    if (selectedFeedbackDrawing && feedback && feedback.length > 0) {
      // Find if there's any feedback near the current time (within 1 second tolerance)
      const tolerance = 1.0; // 1 second tolerance
      const feedbackAtCurrentTime = feedback.find(f => 
        Math.abs(f.timestamp - currentTime) <= tolerance
      );
      
      // If no feedback exists at current time and we're not highlighting a specific feedback,
      // clear the selected drawing
      if (!feedbackAtCurrentTime && !highlightedFeedbackId) {
        console.log('[ProjectView] No feedback at current time, clearing selected drawing');
        setSelectedFeedbackDrawing(null);
      }
    }
  }, [currentTime, selectedFeedbackDrawing, feedback, highlightedFeedbackId]);
  // Dynamic height adjustment - sync right column height with left column
  useEffect(() => {
    const adjustHeight = () => {
      if (videoAreaRef.current && feedbackFormRef.current && feedbackListRef.current) {        const videoAreaHeight = videoAreaRef.current.offsetHeight;
        const feedbackFormHeight = feedbackFormRef.current.offsetHeight;
        const marginBetween = 16; // mt-4 = 16px
        
        const totalHeight = videoAreaHeight + marginBetween + feedbackFormHeight;
        
        console.log('[ProjectView] Video area height:', videoAreaHeight);
        console.log('[ProjectView] Feedback form height:', feedbackFormHeight);
        console.log('[ProjectView] Total height for feedback list:', totalHeight);
        
        // Apply the calculated height to the feedback list container
        feedbackListRef.current.style.height = `${totalHeight}px`;
        feedbackListRef.current.style.maxHeight = `${totalHeight}px`;
      }
    };

    // Adjust height on mount and when window resizes
    adjustHeight();
    window.addEventListener('resize', adjustHeight);

    // Also adjust when project data changes (video loads, etc.)
    const timer = setTimeout(adjustHeight, 100);

    return () => {
      window.removeEventListener('resize', adjustHeight);
      clearTimeout(timer);
    };
  }, [project, currentVersion, feedback, showDrawingCanvas, isEditingFeedback]);  const handlePlayerReady = (player: YT.Player) => {
    playerRef.current = player;
    // Trigger height adjustment when player is ready
    setTimeout(() => {
      if (videoAreaRef.current && feedbackFormRef.current && feedbackListRef.current) {
        const videoAreaHeight = videoAreaRef.current.offsetHeight;
        const feedbackFormHeight = feedbackFormRef.current.offsetHeight;
        const marginBetween = 16; // mt-4 = 16px
        const totalHeight = videoAreaHeight + marginBetween + feedbackFormHeight;
        
        feedbackListRef.current.style.height = `${totalHeight}px`;
        feedbackListRef.current.style.maxHeight = `${totalHeight}px`;
      }
    }, 100);
  };

  // Video control handlers
  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    }
  };
  const handleSkipBack = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime();
      const newTime = Math.max(0, currentTime - 10); // 10秒戻る、0秒未満にはならない
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      // Clear highlighted feedback when user skips
      setHighlightedFeedbackId(null);
    }
  };

  const handleSkipForward = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();
      const newTime = Math.min(duration, currentTime + 10); // 10秒進む、動画の長さを超えない
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      // Clear highlighted feedback when user skips
      setHighlightedFeedbackId(null);
    }
  };

  const handleFrameBack = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime();
      const newTime = Math.max(0, currentTime - 0.033); // 約1フレーム戻る (30fps想定)
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      // Clear highlighted feedback when user seeks frame by frame
      setHighlightedFeedbackId(null);
    }
  };

  const handleFrameForward = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();
      const newTime = Math.min(duration, currentTime + 0.033); // 約1フレーム進む (30fps想定)
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      // Clear highlighted feedback when user seeks frame by frame
      setHighlightedFeedbackId(null);
    }
  };

  // Go back to dashboard
  const handleGoBack = () => {
    navigate('/dashboard');
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }  // Main render
  return (
    <AppLayout>
      <div className="max-w-none mx-auto px-6 py-6 h-screen flex flex-col">        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Button onClick={handleGoBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {project?.title || 'Project'}
              </h1>
              <p className="text-sm text-gray-400">
                Version {currentVersion?.versionNumber || 1}
              </p>
            </div>
          </div>
          
          {canCreateVersion && (
            <Button 
              onClick={() => setIsNewVersionModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Version
            </Button>
          )}
        </div>        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">          {/* Left Column - Video Player */}
          <div ref={leftColumnRef} className="xl:col-span-3 flex flex-col">
            <div ref={videoAreaRef} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 flex-shrink-0">              <div ref={playerContainerRef} className="relative">
                {currentVersion?.videoUrl && (
                  <VideoPlayer
                    videoId={extractYouTubeId(currentVersion.videoUrl) || ''}
                    onTimeUpdate={setCurrentTime}
                    onVideoReady={setDuration}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    timeToSeek={timeToSeek}
                    isPlaying={isPlaying}
                    onPlayerReady={handlePlayerReady}
                  />
                )}                
                {/* Drawing Canvas Overlay - for drawing new feedback */}
                {showDrawingCanvas && (
                  <div className="absolute inset-0 z-10 pointer-events-auto">
                    <DrawingCanvas
                      width={playerContainerRef.current?.clientWidth || 800}
                      height={playerContainerRef.current?.clientHeight || 450}
                      onDrawingChange={(drawing) => {
                        setCurrentDrawing(drawing);
                      }}
                      initialDrawing={currentDrawing}
                      autoEnableDrawing={true}
                      className="w-full h-full"
                    />
                  </div>
                )}
                
                {/* Feedback Drawing Display - for viewing selected feedback drawings */}
                {selectedFeedbackDrawing && !showDrawingCanvas && (
                  <div className="absolute inset-0 z-5 pointer-events-none">
                    <DrawingCanvas
                      width={playerContainerRef.current?.clientWidth || 800}
                      height={playerContainerRef.current?.clientHeight || 450}
                      onDrawingChange={() => {}} // Read-only, no changes allowed
                      initialDrawing={selectedFeedbackDrawing}
                      autoEnableDrawing={false} // Disable drawing interaction
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              
              {/* Video Controls */}
              <div className="mt-4 flex flex-col space-y-4">                <VideoTimeline
                  currentTime={currentTime}
                  duration={duration}
                  feedback={feedback}
                  onSeek={(time) => {
                    setTimeToSeek(time);
                    // Clear highlighted feedback when user manually seeks
                    setHighlightedFeedbackId(null);
                  }}
                  onFeedbackClick={(_, feedbackItem) => {
                    if (feedbackItem) {
                      setHighlightedFeedbackId(feedbackItem.id);
                      // Display feedback drawing data if it exists
                      if (feedbackItem.drawingData) {
                        setSelectedFeedbackDrawing(feedbackItem.drawingData);
                        console.log('[ProjectView] Displaying feedback drawing:', feedbackItem.drawingData);
                      } else {
                        setSelectedFeedbackDrawing(null);
                      }
                    }
                  }}
                  highlightedFeedbackId={highlightedFeedbackId}
                />                <div className="flex items-center justify-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleFrameBack} title="1フレーム戻る">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSkipBack} title="10秒戻る">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePlayPause} title={isPlaying ? "一時停止" : "再生"}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSkipForward} title="10秒進む">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFrameForward} title="1フレーム進む">
                    <ChevronRight className="w-4 h-4" />
                  </Button></div>
              </div>            </div>
              {/* Feedback Form - Always visible below video */}
            <div ref={feedbackFormRef} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 flex-shrink-0 mt-4">
              <FeedbackForm
                timestamp={currentTime}
                onSubmit={async (comment, drawing) => {
                  try {
                    clearFeedbackError();
                    
                    if (!projectId || !currentVersion?.id || !user?.id) {
                      throw new Error('必要な情報が不足しています');
                    }

                    if (isEditingFeedback && editingFeedbackId) {
                      // 編集モードの場合は更新
                      await updateFeedback(
                        editingFeedbackId,
                        comment,
                        drawing
                      );
                    } else {
                      // 新規作成の場合は作成
                      await submitFeedback(
                        projectId,
                        currentVersion.id,
                        user.id,
                        comment,
                        currentTime,
                        drawing
                      );
                    }

                    console.log('✅ Feedback submitted successfully');
                    setIsEditingFeedback(false);
                    setEditingFeedbackId(null);
                    setInitialComment('');
                    setInitialDrawing(null);
                    
                    // Clear drawing canvas after successful submission
                    setShowDrawingCanvas(false);
                    setCurrentDrawing(null);
                    
                    // リフレッシュしてフィードバックリストを更新
                    await fetchProjectData();
                    
                  } catch (error) {
                    console.error('❌ Failed to submit feedback:', error);
                    // エラーは useFeedbackSubmission hook で管理されているので、
                    // ここではユーザーにエラーメッセージを表示するだけ
                    alert(error instanceof Error ? error.message : 'フィードバックの送信に失敗しました');
                  }
                }}
                onClose={isEditingFeedback ? () => {
                  setIsEditingFeedback(false);
                  setEditingFeedbackId(null);
                  setInitialComment('');
                  setInitialDrawing(null);
                  // Close drawing canvas when canceling edit
                  setShowDrawingCanvas(false);
                  setCurrentDrawing(null);
                } : undefined}                onDrawingModeToggle={() => {
                  console.log('[ProjectView] Drawing Mode toggled');
                  setShowDrawingCanvas(!showDrawingCanvas);
                  // Clear selected feedback drawing when entering drawing mode
                  if (!showDrawingCanvas) {
                    setSelectedFeedbackDrawing(null);
                    setHighlightedFeedbackId(null);
                  }
                }}
                initialComment={initialComment}
                initialDrawing={isEditingFeedback ? initialDrawing : currentDrawing}
                isEditing={isEditingFeedback}
              />
            </div></div>          {/* Right Column - Feedback */}
          <div ref={rightColumnRef} className="flex flex-col gap-4">{/* Feedback Error Display */}
            {feedbackError && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 text-red-300 flex-shrink-0">
                <div className="flex justify-between items-start">
                  <span>{feedbackError}</span>
                  <button
                    onClick={clearFeedbackError}
                    className="text-red-400 hover:text-red-200 ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}            {/* Feedback List */}
            <div ref={feedbackListRef} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold text-white">Feedback</h3>
                <select
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                  className="text-sm border border-gray-600 bg-gray-700 text-white rounded px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="text">Text Only</option>
                  <option value="drawing">With Drawing</option>
                </select>
              </div>              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                <FeedbackList
                feedback={feedback}onFeedbackClick={(timestamp, feedbackItem) => {
                  setTimeToSeek(timestamp);
                  if (feedbackItem) {
                    setHighlightedFeedbackId(feedbackItem.id);
                    // Display feedback drawing data if it exists
                    if (feedbackItem.drawingData) {
                      setSelectedFeedbackDrawing(feedbackItem.drawingData);
                      console.log('[ProjectView] Displaying feedback drawing from list:', feedbackItem.drawingData);
                    } else {
                      setSelectedFeedbackDrawing(null);
                    }
                  }
                }}                onFeedbackEdit={(feedback) => {
                  setEditingFeedbackId(feedback.id);
                  setInitialComment(feedback.comment);
                  setInitialDrawing(feedback.drawingData);
                  setIsEditingFeedback(true);
                  // Close drawing canvas when starting to edit
                  setShowDrawingCanvas(false);
                  setCurrentDrawing(null);
                  // Clear selected feedback drawing when editing
                  setSelectedFeedbackDrawing(null);
                  setHighlightedFeedbackId(null);
                }}
                onFeedbackDelete={(feedbackId) => {
                  console.log('Delete feedback:', feedbackId);
                  fetchProjectData();
                }}
                onFeedbackStatusChange={(feedbackId, isChecked) => {
                  console.log('Status change:', feedbackId, isChecked);
                }}                onReactionAdd={(feedbackId, emoji) => {
                  console.log('Reaction added:', feedbackId, emoji);
                }}
                onReplyAdd={(feedbackId, comment) => {
                  console.log('Reply added:', feedbackId, comment);
                }}
                highlightedFeedbackId={highlightedFeedbackId}
                filterOption={filterOption}                onFilterChange={setFilterOption}
                />
              </div>
            </div>
          </div>
        </div>{/* New Version Modal */}
        <NewVersionModal
          isOpen={isNewVersionModalOpen}
          onClose={() => setIsNewVersionModalOpen(false)}          onSubmit={async (versionData) => {
            setIsCreatingVersion(true);
            // Handle version creation logic here
            console.log('Creating version:', versionData);
            setIsCreatingVersion(false);
            setIsNewVersionModalOpen(false);
            fetchVersions();
          }}
          nextVersionNumber={versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber)) + 1 : 1}
          isLoading={isCreatingVersion}
        />
      </div>
    </AppLayout>
  );
};

export default ProjectView;
