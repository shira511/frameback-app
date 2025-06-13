import React from 'react';
import FeedbackList from './FeedbackList';

const TestImport: React.FC = () => {
  console.log('FeedbackList imported successfully:', FeedbackList);
  return <div>Test Import Component</div>;
};

export default TestImport;
