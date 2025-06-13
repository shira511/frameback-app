import React from 'react';
import type { Feedback, FilterOption } from '../types';

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

const FeedbackList: React.FC<FeedbackListProps> = ({
  feedback,
  filterOption,
  onFilterChange,
}) => {
  // Calculate counts for each filter option
  const allCount = feedback.length;
  const uncheckedCount = feedback.filter(item => !item.isChecked).length;
  const checkedCount = feedback.filter(item => item.isChecked).length;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">
          Feedback ({feedback.length})
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
        </div>
      </div>
      
      <div className="divide-y divide-slate-700 flex-1 overflow-y-auto overflow-x-hidden">
        {feedback.length > 0 ? (
          <div className="p-4 text-white">
            <p>Feedback items: {feedback.length}</p>
            <p className="text-sm text-slate-400">Full functionality will be restored once the module loading issue is resolved.</p>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <p>No feedback yet</p>
            <p className="text-sm mt-1">
              Add the first feedback by pausing the video and clicking "Add Feedback"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackList;
