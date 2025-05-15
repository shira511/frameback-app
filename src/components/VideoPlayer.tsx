import React, { useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onVideoReady: () => void;
  onPlay: () => void;
  onPause: () => void;
  timeToSeek?: number | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onTimeUpdate,
  onVideoReady,
  onPlay,
  onPause,
  timeToSeek,
}) => {
  const playerRef = useRef<YT.Player>();
  const timeUpdateIntervalRef = useRef<number | null>(null);

  const handleReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    onVideoReady();

    // Start time update interval
    if (timeUpdateIntervalRef.current === null) {
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const currentTime = event.target.getCurrentTime();
        onTimeUpdate(currentTime);
      }, 200);
    }
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    // YT.PlayerState values:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 1) {
      onPlay();
    } else if (event.data === 2) {
      onPause();
    }
  };

  // Handle seeking to a specific time
  React.useEffect(() => {
    if (playerRef.current && timeToSeek !== undefined && timeToSeek !== null) {
      playerRef.current.seekTo(timeToSeek, true);
    }
  }, [timeToSeek]);

  // Clean up interval on unmount
  React.useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current !== null) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  return (
    <YouTube
      videoId={videoId}
      opts={{
        width: '100%',
        height: '100%',
        playerVars: {
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
      }}
      onReady={handleReady}
      onStateChange={handleStateChange}
      className="youtube-player"
    />
  );
};

export default VideoPlayer;