import React, { useState } from 'react';
import type { Feedback, User, FilterOption } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Check, MessageSquare, Trash2, Edit2, Smile, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackListProps {
  feedback: Feedback[];
  onFeedbackClick: (timestamp: number) => void;
  onFeedbackStatusChange: (feedbackId: string, isChecked: boolean) => void;
  onFeedbackDelete: (feedbackId: string) => void;
  onFeedbackEdit: (feedback: Feedback) => void;
  onReactionAdd: (feedbackId: string, emoji: string) => void;
  onReplyAdd: (feedbackId: string, comment: string) => void;
  filterOption: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({
  feedback,
  onFeedbackClick,
  onFeedbackStatusChange,
  onFeedbackDelete,
  onFeedbackEdit,
  onReactionAdd,
  onReplyAdd,
  filterOption,
  onFilterChange,
}) => {
  const { user } = useAuth();
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [showReplyFormIds, setShowReplyFormIds] = useState<string[]>([]);
  const [showReactionsIds, setShowReactionsIds] = useState<string[]>([]);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<string[]>([]);

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleReplyForm = (feedbackId: string) => {
    setShowReplyFormIds((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  const toggleReactions = (feedbackId: string) => {
    setShowReactionsIds((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  const toggleExpandedFeedback = (feedbackId: string) => {
    setExpandedFeedbackIds((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  const handleReplyChange = (feedbackId: string, text: string) => {
    setReplyTexts((prev) => ({ ...prev, [feedbackId]: text }));
  };

  const handleReplySubmit = (feedbackId: string) => {
    const replyText = replyTexts[feedbackId];
    if (replyText && replyText.trim()) {
      onReplyAdd(feedbackId, replyText.trim());
      setReplyTexts((prev) => ({ ...prev, [feedbackId]: '' }));
      toggleReplyForm(feedbackId);
    }
  };

  const handleReactionClick = (feedbackId: string, emoji: string) => {
    onReactionAdd(feedbackId, emoji);
    toggleReactions(feedbackId);
  };

  const commonEmojis = ['👍', '❤️', '😊', '🎉', '👀', '🤔'];

  // Filter feedback based on current filter option
  const filteredFeedback = feedback.filter((item) => {
    if (filterOption === 'unchecked') {
      return !item.isChecked;
    }
    if (filterOption === 'mine' && user) {
      return item.userId === user.id;
    }
    return true;
  });

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">
          Feedback ({filteredFeedback.length})
        </h3>
        
        <div className="space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filterOption === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => onFilterChange('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filterOption === 'unchecked'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => onFilterChange('unchecked')}
          >
            Unchecked
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filterOption === 'mine'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => onFilterChange('mine')}
          >
            Mine
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-slate-700 max-h-[calc(100vh-400px)] overflow-y-auto">
        {filteredFeedback.length > 0 ? (
          filteredFeedback.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-700/50 transition-colors">
              <div className="flex gap-3">
                {/* User avatar */}
                <div className="flex-shrink-0">
                  {item.user && (
                    <img
                      src={item.user.avatarUrl}
                      alt={item.user.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {item.user?.fullName || 'Unknown User'}
                        </span>
                        <button
                          onClick={() => onFeedbackClick(item.timestamp)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-slate-300"
                        >
                          {formatTimestamp(item.timestamp)}
                        </button>
                        {item.isChecked && (
                          <span className="text-xs bg-success-500 bg-opacity-20 text-success-500 px-2 py-0.5 rounded-full flex items-center">
                            <CheckCircle2 size={12} className="mr-1" />
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 mt-1">{item.comment}</p>
                    </div>
                    
                    <div className="flex space-x-1">
                      {/* Mark as checked/unchecked button */}
                      <button
                        onClick={() => onFeedbackStatusChange(item.id, !item.isChecked)}
                        className={`p-1.5 rounded-md ${
                          item.isChecked
                            ? 'bg-success-500 bg-opacity-20 text-success-500'
                            : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
                        }`}
                        title={item.isChecked ? 'Mark as unresolved' : 'Mark as resolved'}
                      >
                        <Check size={16} />
                      </button>
                      
                      {/* Edit button (only for own feedback) */}
                      {user && item.userId === user.id && (
                        <button
                          onClick={() => onFeedbackEdit(item)}
                          className="p-1.5 bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600 rounded-md"
                          title="Edit feedback"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      
                      {/* Delete button (only for own feedback) */}
                      {user && item.userId === user.id && (
                        <button
                          onClick={() => onFeedbackDelete(item.id)}
                          className="p-1.5 bg-slate-700 text-slate-400 hover:text-error-500 hover:bg-slate-600 rounded-md"
                          title="Delete feedback"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Timestamp and time ago */}
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(item.createdAt).toLocaleString()} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                  
                  {/* Reactions */}
                  {item.reactions && item.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {/* Group reactions by emoji and count them */}
                      {Object.entries(
                        item.reactions.reduce((acc, reaction) => {
                          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <div
                          key={emoji}
                          className="bg-slate-700 px-2 py-0.5 rounded-full text-white text-xs flex items-center"
                        >
                          <span className="mr-1">{emoji}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Replies */}
                  {item.replies && item.replies.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleExpandedFeedback(item.id)}
                        className="text-sm text-primary-400 hover:text-primary-300 flex items-center"
                      >
                        <MessageSquare size={14} className="mr-1" />
                        {expandedFeedbackIds.includes(item.id)
                          ? 'Hide replies'
                          : `${item.replies.length} ${
                              item.replies.length === 1 ? 'reply' : 'replies'
                            }`}
                      </button>
                      
                      {expandedFeedbackIds.includes(item.id) && (
                        <div className="mt-2 pl-2 border-l-2 border-slate-700 space-y-3">
                          {item.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              {/* Reply user avatar */}
                              {reply.user && (
                                <img
                                  src={reply.user.avatarUrl}
                                  alt={reply.user.fullName}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              )}
                              
                              {/* Reply content */}
                              <div>
                                <div className="flex items-center">
                                  <span className="font-medium text-sm text-white">
                                    {reply.user?.fullName || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    {formatDistanceToNow(
                                      new Date(reply.createdAt),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </div>
                                <p className="text-slate-300 text-sm">{reply.comment}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => toggleReplyForm(item.id)}
                      className="text-xs flex items-center text-slate-300 hover:text-white"
                    >
                      <MessageSquare size={14} className="mr-1" />
                      Reply
                    </button>
                    
                    <button
                      onClick={() => toggleReactions(item.id)}
                      className="text-xs flex items-center text-slate-300 hover:text-white"
                    >
                      <Smile size={14} className="mr-1" />
                      React
                    </button>
                  </div>
                  
                  {/* Reaction picker */}
                  {showReactionsIds.includes(item.id) && (
                    <div className="mt-2 bg-slate-700 p-2 rounded-md flex space-x-2">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          className="text-lg hover:bg-slate-600 p-1 rounded"
                          onClick={() => handleReactionClick(item.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Reply form */}
                  {showReplyFormIds.includes(item.id) && (
                    <div className="mt-2">
                      <textarea
                        value={replyTexts[item.id] || ''}
                        onChange={(e) => handleReplyChange(item.id, e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={2}
                      />
                      <div className="mt-2 flex justify-end space-x-2">
                        <button
                          onClick={() => toggleReplyForm(item.id)}
                          className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplySubmit(item.id)}
                          className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                          disabled={!replyTexts[item.id] || !replyTexts[item.id].trim()}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400">
            <MessageSquare size={40} className="mx-auto mb-3 text-slate-600" />
            <p>No feedback yet</p>
            <p className="text-sm mt-1">
              {filterOption !== 'all'
                ? 'Try changing the filter'
                : 'Add the first feedback by pausing the video and clicking "Add Feedback"'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackList;