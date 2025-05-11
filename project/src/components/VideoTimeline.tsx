import React, { useRef, useState, useEffect } from 'react';
import { formatTime } from '../utils/formatTime';
import type { TimelineProps, Feedback } from '../types';

const VideoTimeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  feedback,
  onSeek,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);

  // Convert a time position to a percentage of the timeline
  const timeToPercent = (time: number): number => {
    return (time / duration) * 100;
  };

  // Convert a mouse x position to a time position
  const positionToTime = (position: number): number => {
    if (!timelineRef.current) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const relativePosition = position - rect.left;
    const percentage = relativePosition / rect.width;
    return Math.max(0, Math.min(duration, percentage * duration));
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const time = positionToTime(e.clientX);
    onSeek(time);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const time = positionToTime(e.clientX);
    setHoverTime(time);
    setHoverPosition(e.clientX);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
    setHoverPosition(null);
  };

  // Handle feedback marker hover/active states
  const handleFeedbackMouseEnter = (feedbackId: string) => {
    setActiveFeedback(feedbackId);
  };

  const handleFeedbackMouseLeave = () => {
    setActiveFeedback(null);
  };

  const handleFeedbackClick = (time: number, feedbackId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent timeline click from also triggering
    onSeek(time);
    setActiveFeedback(feedbackId);
  };

  return (
    <div className="mt-4 mb-8">
      <div
        ref={timelineRef}
        className="relative h-10 bg-slate-800 rounded-md cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleTimelineMouseMove}
        onMouseLeave={handleTimelineMouseLeave}
      >
        {/* Progress bar */}
        <div
          className="absolute h-full bg-primary-800 opacity-30 rounded-l-md"
          style={{ width: `${timeToPercent(currentTime)}%` }}
        ></div>
        
        {/* Current position indicator */}
        <div
          className="absolute w-1 h-full bg-primary-500 transform -translate-x-1/2 z-10"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        ></div>
        
        {/* Feedback markers */}
        {feedback.map((item) => (
          <div
            key={item.id}
            className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-transform duration-200 ${
              activeFeedback === item.id ? 'scale-150' : 'scale-100'
            }`}
            style={{
              left: `${timeToPercent(item.timestamp)}%`,
              top: '50%',
              backgroundColor: item.isChecked ? '#22c55e' : '#4F46E5',
              boxShadow: activeFeedback === item.id ? '0 0 0 2px rgba(255, 255, 255, 0.5)' : 'none'
            }}
            onClick={(e) => handleFeedbackClick(item.timestamp, item.id, e)}
            onMouseEnter={() => handleFeedbackMouseEnter(item.id)}
            onMouseLeave={handleFeedbackMouseLeave}
          >
            {item.user && (
              <div
                className={`absolute bottom-full mb-2 transform -translate-x-1/2 ${
                  activeFeedback === item.id ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-200`}
              >
                <img
                  src={item.user.avatarUrl}
                  alt={item.user.fullName}
                  className="w-6 h-6 rounded-full border-2 border-white"
                  title={item.user.fullName}
                />
              </div>
            )}
          </div>
        ))}
        
        {/* Time tooltip on hover */}
        {hoverTime !== null && hoverPosition !== null && (
          <div
            className="absolute bottom-full mb-1 bg-slate-900 text-white text-xs px-2 py-1 rounded transform -translate-x-1/2"
            style={{ left: `${timeToPercent(hoverTime)}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
      
      {/* Timeline labels */}
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration / 4)}</span>
        <span>{formatTime(duration / 2)}</span>
        <span>{formatTime((duration / 4) * 3)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default VideoTimeline;