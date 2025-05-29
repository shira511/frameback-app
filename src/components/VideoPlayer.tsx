import React, { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

const FRAME_DURATION = 1 / 30; // Duration of one frame at 30fps

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onVideoReady: (duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
  timeToSeek?: number | null;
  isPlaying: boolean;
  className?: string;
  isSketchMode?: boolean;
  onVideoInfoChange?: (info: { videoUrl: string; currentTime: number } | null) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onTimeUpdate,
  onVideoReady,
  onPlay,
  onPause,
  timeToSeek,
  isPlaying,
  className,
  isSketchMode = false,
  onVideoInfoChange,
}) => {
  const playerRef = useRef<YT.Player>();
  const rafRef = useRef<number | null>(null);

  const updateLoop = () => {
    if (!playerRef.current) return;
    
    try {
      const currentTime = playerRef.current.getCurrentTime();
      onTimeUpdate(currentTime);
      
      // Update video info for frame capture
      if (onVideoInfoChange) {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        onVideoInfoChange({ videoUrl, currentTime });
      }
    } catch (error) {
      console.error('Error getting current time:', error);
    }
    
    rafRef.current = requestAnimationFrame(updateLoop);
  };

  const handleReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    const dur = event.target.getDuration();
    onVideoReady(dur);
    
    // Start the update loop as soon as the player is ready
    rafRef.current = requestAnimationFrame(updateLoop);
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    // YT.PlayerState values: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 1) {
      onPlay();
    } else if (event.data === 2 || event.data === 0) {
      onPause();
    }
  };

  // Handle seeking to a specific time
  useEffect(() => {
    if (playerRef.current && timeToSeek !== undefined && timeToSeek !== null) {
      playerRef.current.seekTo(timeToSeek, true);
    }
  }, [timeToSeek]);

  // Handle play/pause state changes
  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (onVideoInfoChange) {
        onVideoInfoChange(null);
      }
    };
  }, [onVideoInfoChange]);

  return (
    <YouTube
      videoId={videoId}
      key={isSketchMode ? 'sketch' : 'normal'}
      opts={{
        width: '100%',
        height: '100%',
        playerVars: {
          modestbranding: isSketchMode ? 1 : 0,
          controls: isSketchMode ? 0 : 1,
          showinfo: isSketchMode ? 0 : 1,
          disablekb: isSketchMode ? 1 : 0,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin.replace(/\s+/g, ''),
        },
      }}
      onReady={handleReady}
      onStateChange={handleStateChange}
      className={className}
    />
  );
};

export default VideoPlayer;