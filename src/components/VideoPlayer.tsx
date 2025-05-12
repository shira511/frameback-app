import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import type { VideoPlayerProps } from '../types';

// Set YouTube Player height based on container width to maintain 16:9 aspect ratio
const calculatePlayerHeight = (containerWidth: number): number => {
  return Math.floor((containerWidth * 9) / 16);
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  onTimeUpdate,
  onVideoReady,
  onPlay,
  onPause,
  timeToSeek,
}) => {
  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerReadyRef = useRef(false);
  const timeUpdateIntervalRef = useRef<number | null>(null);

  // Calculate container width on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // Initial calculation
    updateDimensions();

    // Set up event listener for window resize
    window.addEventListener('resize', updateDimensions);

    // Clean up
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Set up a time update interval when the player is ready
  useEffect(() => {
    if (player && playerReadyRef.current) {
      // Start time update interval
      if (timeUpdateIntervalRef.current === null) {
        timeUpdateIntervalRef.current = window.setInterval(() => {
          const currentTime = player.getCurrentTime();
          onTimeUpdate(currentTime);
        }, 200);
      }

      // Clean up on unmount
      return () => {
        if (timeUpdateIntervalRef.current !== null) {
          clearInterval(timeUpdateIntervalRef.current);
        }
      };
    }
  }, [player, onTimeUpdate]);

  // Handle seeking to a specific time
  useEffect(() => {
    if (player && playerReadyRef.current && timeToSeek !== undefined && timeToSeek !== null) {
      player.seekTo(timeToSeek, true);
    }
  }, [player, timeToSeek]);

  const handleReady = (event: { target: YT.Player }) => {
    setPlayer(event.target);
    playerReadyRef.current = true;
    onVideoReady();
  };

  const handleStateChange = (event: { target: YT.Player; data: number }) => {
    // YT.PlayerState values:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 1) {
      onPlay();
    } else if (event.data === 2) {
      onPause();
    }
  };

  return (
    <div ref={containerRef} className="w-full bg-black rounded-lg overflow-hidden relative">
      {containerWidth > 0 && (
        <YouTube
          videoId={videoId}
          onReady={handleReady}
          onStateChange={handleStateChange}
          opts={{
            height: calculatePlayerHeight(containerWidth),
            width: containerWidth,
            playerVars: {
              // https://developers.google.com/youtube/player_parameters
              modestbranding: 1,
              rel: 0,
            },
          }}
          className="youtube-player"
        />
      )}
    </div>
  );
};

export default VideoPlayer;