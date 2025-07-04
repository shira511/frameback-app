import React, { useRef, useLayoutEffect, useState } from 'react';
import { formatTime } from '../utils/formatTime';
import type { TimelineProps } from '../types';

const VideoTimeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  feedback,
  previousVersionsFeedback = [],
  showPreviousVersionsFeedback = false,
  currentVersion,
  onSeek,
  onFeedbackClick,
  highlightedFeedbackId,
  onFeedbackHighlight,
}) => {
  console.log('📺 VideoTimeline rendered with:', {
    feedbackCount: feedback?.length || 0,
    duration,
    currentTime,
    feedback: feedback?.map(f => ({ id: f.id, timestamp: f.timestamp })) || []
  });
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);const playheadRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);

  // Combine current and previous feedback if enabled
  const allFeedback = showPreviousVersionsFeedback 
    ? [...feedback, ...previousVersionsFeedback]
    : feedback;

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

  useLayoutEffect(() => {
    if (!duration || !progressRef.current || !playheadRef.current) return;
    const pct = currentTime / duration;
    progressRef.current.style.transform = `scaleX(${pct})`;
    playheadRef.current.style.left = `${pct * 100}%`;
  }, [currentTime, duration]);
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const time = positionToTime(e.clientX);
      // Check if there's feedback near this time (within 1 second tolerance)
    const nearbyFeedback = allFeedback.find(f => Math.abs(f.timestamp - time) <= 1);
    
    // If no nearby feedback and we have a highlight clearing function, clear the highlight
    if (!nearbyFeedback && onFeedbackHighlight) {
      onFeedbackHighlight(null);
    }
    
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
  };  const handleFeedbackClick = (time: number, feedbackId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent timeline click from also triggering
    
    // Find the feedback item in all feedback
    const feedbackItem = allFeedback.find(f => f.id === feedbackId);
    
    // Set highlight for the clicked feedback item
    if (onFeedbackHighlight) {
      onFeedbackHighlight(feedbackId);
    }
    
    // Use the enhanced feedback click handler if available, otherwise fall back to basic seek
    if (onFeedbackClick && feedbackItem) {
      onFeedbackClick(time, feedbackItem);
    } else {
      onSeek(time);
    }
    
    // Set local active feedback for visual feedback
    setActiveFeedback(feedbackId);
    
    // Clear active feedback after a short delay
    setTimeout(() => {
      setActiveFeedback(null);
    }, 1000);
  };

  return (    <div className="mt-3 mb-6">
      <div
        ref={timelineRef}
        className="relative h-6 bg-slate-800 rounded-sm cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleTimelineMouseMove}
        onMouseLeave={handleTimelineMouseLeave}
      >
        {/* ◀─ baseline ─▶ */}
        <div
          className="absolute inset-y-1/2 h-px w-full bg-gray-300"
          style={{ transform: 'translateY(-50%)' }}
        />
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="absolute top-0 left-0 h-full bg-primary-800 opacity-30 rounded-l-md origin-left will-change-transform backface-visibility-hidden transform-style-preserve-3d transition-transform"
        ></div>
        
        {/* Current position indicator */}
        <div
          ref={playheadRef}
          className="absolute top-0 left-0 h-full w-1 bg-primary-500 will-change-transform backface-visibility-hidden transform-style-preserve-3d transition-transform"
        ></div>          {/* Feedback markers */}        {allFeedback.map((item) => {
          const isHighlighted = highlightedFeedbackId === item.id;
          const isActive = activeFeedback === item.id;
          const isPreviousVersion = currentVersion ? item.versionId !== currentVersion.id : false;
          
          return (
            <div
              key={item.id}
              className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-all duration-200 ${
                isActive || isHighlighted ? 'scale-150' : 'scale-100'
              }`}              style={{
                left: `${timeToPercent(item.timestamp)}%`,
                top: '50%',
                backgroundColor: isPreviousVersion 
                  ? '#f59e0b' // Always yellow for previous versions (regardless of checked status)
                  : (item.isChecked ? '#22c55e' : '#4F46E5'), // Original colors for current version
                boxShadow: isActive || isHighlighted 
                  ? isPreviousVersion
                    ? '0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 8px rgba(245, 158, 11, 0.5)'
                    : '0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.3)'
                  : 'none',
                border: isHighlighted 
                  ? isPreviousVersion
                    ? '2px solid rgba(245, 158, 11, 0.9)'
                    : '2px solid rgba(255, 255, 255, 0.9)'
                  : 'none'
              }}
              onClick={(e) => handleFeedbackClick(item.timestamp, item.id, e)}
              onMouseEnter={() => handleFeedbackMouseEnter(item.id)}
              onMouseLeave={handleFeedbackMouseLeave}
            >
              {item.user && (
                <div
                  className={`absolute bottom-full mb-2 transform -translate-x-1/2 ${
                    isActive || isHighlighted ? 'opacity-100' : 'opacity-0'
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
          );
        })}
        
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