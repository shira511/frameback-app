import React, { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

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
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onTimeUpdate,
  onVideoReady,
  onPlay,
  onPause,
  timeToSeek,
  isPlaying,
  width = '100%',
  height = '100%',
  onPlayerReady
}) => {
  const playerRef = useRef<YT.Player>();
  const rafRef = useRef<number | null>(null);

  const updateLoop = () => {
    if (!playerRef.current) return;
    
    try {
      const currentTime = playerRef.current.getCurrentTime();
      onTimeUpdate(currentTime);
    } catch (error) {
      console.error('Error getting current time:', error);
    }
    
    rafRef.current = requestAnimationFrame(updateLoop);
  };

  const handleReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    onPlayerReady?.(event.target);
    const dur = event.target.getDuration();
    onVideoReady(dur);
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
  }, []);

  return (
    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
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