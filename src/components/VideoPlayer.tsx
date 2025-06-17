import React, { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

// Define YT namespace for TypeScript
declare namespace YT {
  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getDuration(): number;
    getCurrentTime(): number;
    getVideoData(): any;
  }
}

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onVideoReady: (duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
  timeToSeek?: number | null;
  isPlaying: boolean;
  width?: string | number;
  height?: string | number;
  onPlayerReady?: (player: YT.Player) => void;
  onVideoLoaded?: (videoInfo: { width: number; height: number; aspectRatio: number }) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onTimeUpdate,
  onVideoReady,
  onPlay,
  onPause,
  timeToSeek,
  isPlaying,
  width: _width = '100%', // Keep for potential future use
  height: _height = '100%', // Keep for potential future use
  onPlayerReady,
  onVideoLoaded
}) => {
  const playerRef = useRef<any>();
  const rafRef = useRef<number | null>(null);
  const [videoInfo, setVideoInfo] = React.useState<{ width: number; height: number; aspectRatio: number } | null>(null);
  // Function to get video metadata from YouTube API
  const fetchVideoMetadata = async (videoId: string) => {
    try {
      // First try to use YouTube Data API for metadata
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (apiKey) {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            const video = data.items[0];
            
            // Detect YouTube Shorts based on various indicators
            const title = video.snippet?.title?.toLowerCase() || '';
            const description = video.snippet?.description?.toLowerCase() || '';
            const tags = video.snippet?.tags || [];
            
            const isShorts = title.includes('#shorts') || 
                           description.includes('#shorts') ||
                           tags.some((tag: string) => tag.toLowerCase().includes('shorts')) ||
                           // Check if video duration is under 60 seconds (typical for Shorts)
                           (video.contentDetails?.duration && 
                            parseDuration(video.contentDetails.duration) <= 60);
            
            if (isShorts) {
              // YouTube Shorts are 9:16 aspect ratio (1080x1920)
              return {
                width: 1080,
                height: 1920,
                aspectRatio: 9/16
              };
            }
          }
        }
      }
      
      // Fallback: Try to detect based on video ID pattern or other heuristics
      // Some Shorts have specific patterns in their video IDs, but this is not reliable
      
    } catch (error) {
      console.error('Error fetching video metadata:', error);
    }
    
    // Default to 16:9 if detection fails
    return { width: 1920, height: 1080, aspectRatio: 16/9 };
  };

  // Helper function to parse YouTube duration format (PT1M30S -> seconds)
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  const updateLoop = () => {
    if (!playerRef.current) return;
    
    try {
      const currentTime = playerRef.current.getCurrentTime();
      onTimeUpdate(currentTime);
    } catch (error) {
      console.error('Error getting current time:', error);
    }
    
    rafRef.current = requestAnimationFrame(updateLoop);
  };  const handleReady: YouTubeProps['onReady'] = async (event) => {
    playerRef.current = event.target;
    onPlayerReady?.(event.target);
    const dur = event.target.getDuration();
    onVideoReady(dur);
    
    // Fetch video metadata for aspect ratio
    let metadata = await fetchVideoMetadata(videoId);
      // Try to get more accurate info from the player itself
    try {
      event.target.getVideoData(); // Just to check if method is available
      const duration = dur;
      
      // Additional heuristic: if video is very short (< 60s), likely a Short
      if (duration < 60 && !metadata.aspectRatio.toString().includes('0.5625')) {
        metadata = {
          width: 1080,
          height: 1920,
          aspectRatio: 9/16
        };
      }
    } catch (error) {
      console.log('Could not get additional video data from player');
    }
    
    setVideoInfo(metadata);
    onVideoLoaded?.(metadata);
    
    rafRef.current = requestAnimationFrame(updateLoop);
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1) {
      onPlay();
    } else if (event.data === 2 || event.data === 0) {
      onPause();
    }
  };

  useEffect(() => {
    if (playerRef.current && timeToSeek !== undefined && timeToSeek !== null) {
      playerRef.current.seekTo(timeToSeek, true);
    }
  }, [timeToSeek]);

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);  // Calculate dynamic padding based on aspect ratio
  const aspectRatio = videoInfo?.aspectRatio || (16/9); // Default to 16:9
  const paddingTop = `${(1 / aspectRatio) * 100}%`;

  return (
    <div className="relative w-full" style={{ paddingTop }}>
      <div className="absolute top-0 left-0 w-full h-full">
        <YouTube
          videoId={videoId}
          opts={{
            width: '100%',
            height: '100%',
            playerVars: {
              modestbranding: 1,
              controls: 1,
              showinfo: 1,
              rel: 0,
              enablejsapi: 1,
              origin: window.location.origin
            },
          }}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="absolute top-0 left-0 w-full h-full"
          style={{ zIndex: 1 }}
        />
      </div>
    </div>
  );
};

export default VideoPlayer