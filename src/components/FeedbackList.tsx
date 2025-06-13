import React, { useState, useEffect, useRef } from 'react';
import type { Feedback, FilterOption } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Check, MessageSquare, Trash2, Edit2, Smile, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackListProps {
  feedback: Feedback[];
  onFeedbackClick: (timestamp: number, feedbackItem?: Feedback) => void;
  onFeedbackStatusChange: (feedbackId: string, isChecked: boolean) => void;
  onFeedbackDelete: (feedbackId: string) => void;
  onFeedbackEdit: (feedback: Feedback) => void;
  onReactionAdd: (feedbackId: string, emoji: string) => void;
  onReplyAdd: (feedbackId: string, comment: string) => void;
  filterOption: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  highlightedFeedbackId?: string | null;
}

const FeedbackList: React.FC<FeedbackListProps> = (props) => {
  const { 
    feedback, 
    filterOption, 
    onFilterChange, 
    onFeedbackClick, 
    onFeedbackStatusChange,
    onFeedbackDelete,
    onFeedbackEdit,
    onReactionAdd,
    onReplyAdd,
    highlightedFeedbackId 
  } = props;
  const { user } = useAuth();
  
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [showReplyFormIds, setShowReplyFormIds] = useState<string[]>([]);
  const [showReactionsIds, setShowReactionsIds] = useState<string[]>([]);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<string[]>([]);

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const feedbackRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  // Scroll to highlighted feedback when it changes
  useEffect(() => {
    if (highlightedFeedbackId && feedbackRefs.current[highlightedFeedbackId] && scrollContainerRef.current) {
      const feedbackElement = feedbackRefs.current[highlightedFeedbackId];
      
      // Scroll to the highlighted feedback with smooth behavior
      feedbackElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  }, [highlightedFeedbackId]);

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Filter feedback based on current filter option
  const filteredFeedback = feedback.filter((item) => {
    if (filterOption === 'unchecked') {
      return !item.isChecked;
    }
    if (filterOption === 'checked') {
      return item.isChecked;
    }
    if (filterOption === 'mine' && user) {
      return item.userId === user.id;
    }
    return true;
  });

  // Calculate counts for each filter option
  const allCount = feedback.length;
  const uncheckedCount = feedback.filter(item => !item.isChecked).length;
  const checkedCount = feedback.filter(item => item.isChecked).length;
  const mineCount = user ? feedback.filter(item => item.userId === user.id).length : 0;

  // Sort feedback by timestamp (chronological order - earliest first)
  const sortedFeedback = [...filteredFeedback].sort((a, b) => {
    return a.timestamp - b.timestamp;
  });
  
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">
          Feedback ({sortedFeedback.length})
        </h3>
        
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
              filterOption === 'all'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            onClick={() => onFilterChange('all')}
          >
            All ({allCount})
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
              filterOption === 'unchecked'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            onClick={() => onFilterChange('unchecked')}
          >
            Unchecked ({uncheckedCount})
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
              filterOption === 'checked'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            onClick={() => onFilterChange('checked')}
          >
            Checked ({checkedCount})
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
              filterOption === 'mine'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
            onClick={() => onFilterChange('mine')}
          >
            Mine ({mineCount})
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="divide-y divide-slate-700 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {sortedFeedback.map((item) => (          <div 
            key={item.id}
            ref={el => {
              if (el) {
                feedbackRefs.current[item.id] = el;
              }
            }}
            className={`p-4 transition-all duration-300 cursor-pointer ${
              highlightedFeedbackId === item.id 
                ? 'bg-primary-500/20 border-l-4 border-primary-500 shadow-lg ring-2 ring-primary-500/30' 
                : 'hover:bg-slate-750'
            }`}
            onClick={() => onFeedbackClick(item.timestamp, item)}
          >
            {/* Header with user info and timestamp */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {(item.user?.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {item.user?.fullName || 'Unknown User'}
                    </span>
                    {item.isChecked && (
                      <span className="text-xs bg-success-500 bg-opacity-20 text-success-500 px-2 py-0.5 rounded-full flex items-center">
                        <CheckCircle2 size={12} className="mr-1" />
                        Resolved
                      </span>
                    )}
                  </div>                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeedbackClick(item.timestamp, item);
                      }}
                      className="hover:text-primary-400 transition-colors font-mono"
                    >
                      {formatTimestamp(item.timestamp)}
                    </button>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeedbackStatusChange(item.id, !item.isChecked);
                  }}
                  className={`p-1.5 rounded-md transition-colors ${
                    item.isChecked
                      ? 'bg-success-500 bg-opacity-20 text-success-500 hover:bg-opacity-30'
                      : 'bg-slate-600 text-slate-400 hover:text-white hover:bg-slate-500'
                  }`}
                  title={item.isChecked ? 'Mark as unresolved' : 'Mark as resolved'}
                >
                  <Check size={16} />
                </button>
                
                {user && item.userId === user.id && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeedbackEdit(item);
                      }}
                      className="p-1.5 bg-slate-600 text-slate-400 hover:text-white hover:bg-slate-500 rounded-md transition-colors"
                      title="Edit feedback"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeedbackDelete(item.id);
                      }}
                      className="p-1.5 bg-slate-600 text-slate-400 hover:text-red-400 hover:bg-slate-500 rounded-md transition-colors"
                      title="Delete feedback"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>            {/* Feedback comment */}
            <div 
              className="text-white mb-3 leading-relaxed"
            >
              {item.comment}
            </div>

            {/* Reactions */}
            {item.reactions && item.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(
                  item.reactions.reduce((acc: { [key: string]: number }, reaction) => {
                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReactionAdd(item.id, emoji);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-sm transition-colors"
                  >
                    <span>{emoji}</span>
                    <span className="text-slate-300">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action buttons row */}
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newShowIds = showReactionsIds.includes(item.id)
                    ? showReactionsIds.filter(id => id !== item.id)
                    : [...showReactionsIds, item.id];
                  setShowReactionsIds(newShowIds);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <Smile size={16} />
                <span>React</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newShowIds = showReplyFormIds.includes(item.id)
                    ? showReplyFormIds.filter(id => id !== item.id)
                    : [...showReplyFormIds, item.id];
                  setShowReplyFormIds(newShowIds);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <MessageSquare size={16} />
                <span>Reply</span>
              </button>

              {item.replies && item.replies.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExpandedIds = expandedFeedbackIds.includes(item.id)
                      ? expandedFeedbackIds.filter(id => id !== item.id)
                      : [...expandedFeedbackIds, item.id];
                    setExpandedFeedbackIds(newExpandedIds);
                  }}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {expandedFeedbackIds.includes(item.id) ? 'Hide' : 'Show'} {item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {/* Reaction picker */}
            {showReactionsIds.includes(item.id) && (
              <div className="mt-3 p-3 bg-slate-700 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {['👍', '❤️', '😄', '😮', '😢', '😡', '🎉', '🚀'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReactionAdd(item.id, emoji);
                        setShowReactionsIds(showReactionsIds.filter(id => id !== item.id));
                      }}
                      className="text-2xl hover:scale-125 transition-transform p-1 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply form */}
            {showReplyFormIds.includes(item.id) && (
              <div className="mt-3 p-3 bg-slate-700 rounded-lg">
                <textarea
                  value={replyTexts[item.id] || ''}
                  onChange={(e) => {
                    setReplyTexts(prev => ({
                      ...prev,
                      [item.id]: e.target.value
                    }));
                  }}
                  placeholder="Write a reply..."
                  className="w-full p-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReplyFormIds(showReplyFormIds.filter(id => id !== item.id));
                      setReplyTexts(prev => ({ ...prev, [item.id]: '' }));
                    }}
                    className="px-3 py-1 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const replyText = replyTexts[item.id]?.trim();
                      if (replyText) {
                        onReplyAdd(item.id, replyText);
                        setReplyTexts(prev => ({ ...prev, [item.id]: '' }));
                        setShowReplyFormIds(showReplyFormIds.filter(id => id !== item.id));
                      }
                    }}
                    disabled={!replyTexts[item.id]?.trim()}
                    className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reply
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {item.replies && item.replies.length > 0 && expandedFeedbackIds.includes(item.id) && (
              <div className="mt-3 pl-4 border-l-2 border-slate-600 space-y-3">
                {item.replies.map((reply) => (
                  <div key={reply.id} className="bg-slate-750 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {(reply.user?.fullName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm">
                        {reply.user?.fullName || 'Unknown User'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-slate-200 text-sm leading-relaxed">
                      {reply.comment}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {sortedFeedback.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <MessageSquare size={40} className="mx-auto mb-3 text-slate-600" />
            <p>No feedback yet</p>            <p className="text-sm mt-1">
              {filterOption === 'unchecked'
                ? 'No unchecked feedback found'
                : filterOption === 'checked'
                ? 'No checked feedback found'
                : filterOption === 'mine'
                ? 'No feedback from you found'
                : 'Add the first feedback by pausing the video and clicking "Add Feedback"'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackList;