import { useState, useEffect, useRef } from 'react';
import type { ProjectVersion } from '../types';

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

export const useVideoPlayer = (currentVersion: ProjectVersion | null, extractYouTubeId: (url: string) => string | null) => {
  // Video state
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeToSeek, setTimeToSeek] = useState<number | null>(null);
  
  // Canvas and drawing state
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  
  // Refs
  const ytPlayerRef = useRef<YT.Player | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef(currentTime);

  // Update current time ref
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Update video ID when version changes
  useEffect(() => {
    if (currentVersion) {
      const youtubeId = extractYouTubeId(currentVersion.videoUrl);
      if (youtubeId) {
        setVideoId(youtubeId);
      }
    }
  }, [currentVersion, extractYouTubeId]);

  // ResizeObserver to watch video container changes
  useEffect(() => {
    if (!playerContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Get the actual video element dimensions
        const videoElement = entry.target.querySelector('iframe') || 
                           entry.target.querySelector('video');
        
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          console.log('[ProjectView] updateDimensions in ResizeObserver', { 
            w: rect.width, 
            h: rect.height, 
            element: videoElement.tagName + (videoElement.id ? '#' + videoElement.id : '')
          });
          setContainerWidth(rect.width);
          setContainerHeight(rect.height);
        }
      }
    });

    resizeObserver.observe(playerContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // YouTube player event handlers
  const handleVideoReady = (player: YT.Player) => {
    ytPlayerRef.current = player;
    setVideoReady(true);
    
    // Update dimensions when video is ready
    const updateDimensions = () => {
      if (playerContainerRef.current) {
        // Get the actual video element dimensions
        const videoElement = playerContainerRef.current.querySelector('iframe');
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          console.log('[ProjectView] updateDimensions in handleVideoReady', { 
            w: rect.width, 
            h: rect.height, 
            element: videoElement.tagName + (videoElement.id ? '#' + videoElement.id : '')
          });
          setContainerWidth(rect.width);
          setContainerHeight(rect.height);
        }
      }
    };

    // Update dimensions immediately and after a short delay
    updateDimensions();
    setTimeout(updateDimensions, 100);
    setTimeout(updateDimensions, 500);
    setTimeout(updateDimensions, 1000);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleDurationChange = (dur: number) => {
    setDuration(dur);
  };

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // Seek to specific time when timeToSeek changes
  useEffect(() => {
    if (timeToSeek !== null && ytPlayerRef.current && videoReady) {
      ytPlayerRef.current.seekTo(timeToSeek, true);
      setCurrentTime(timeToSeek);
      setTimeToSeek(null);
    }
  }, [timeToSeek, videoReady]);

  // Video control functions
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    const newTime = currentTime + 5;
    setTimeToSeek(Math.min(newTime, duration));
  };

  const skipBackward = () => {
    const newTime = currentTime - 5;
    setTimeToSeek(Math.max(newTime, 0));
  };

  const frameForward = () => {
    const newTime = currentTime + 0.1;
    setTimeToSeek(Math.min(newTime, duration));
  };

  const frameBackward = () => {
    const newTime = currentTime - 0.1;
    setTimeToSeek(Math.max(newTime, 0));
  };

  const seekToTime = (time: number) => {
    setTimeToSeek(time);
  };

  // Debug logging
  useEffect(() => {
    console.log('[ProjectView] render check', {
      showDrawingCanvas,
      isPlaying,
      containerWidth,
      containerHeight
    });
  });

  return {
    // State
    videoId,
    videoReady,
    isPlaying,
    currentTime,
    duration,
    timeToSeek,
    containerWidth,
    containerHeight,
    showDrawingCanvas,
    
    // Refs
    ytPlayerRef,
    playerContainerRef,
    currentTimeRef,
    
    // Setters
    setVideoId,
    setVideoReady,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setTimeToSeek,
    setContainerWidth,
    setContainerHeight,
    setShowDrawingCanvas,
    
    // Handlers
    handleVideoReady,
    handleTimeUpdate,
    handleDurationChange,
    handlePlayStateChange,
    
    // Controls
    togglePlayPause,
    skipForward,
    skipBackward,
    frameForward,
    frameBackward,
    seekToTime,
  };
};
