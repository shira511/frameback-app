export interface User {
  id: string;
  email?: string;
  fullName: string;
  avatarUrl: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  createdAt: string;
  userId: string;
  currentVersionId?: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  title: string;
  videoUrl: string;
  description: string | null;
  createdAt: string;
  userId: string;
  isActive: boolean;
}

export interface DrawingData {
  lines: Line[];
  strokeWidth: number;
  strokeColor: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface Line {
  points: Point[];
  strokeWidth: number;
  strokeColor: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Feedback {
  id: string;
  projectId: string;
  versionId: string;
  userId: string;
  user?: User;
  timestamp: number;
  comment: string;
  drawingData: DrawingData | null;
  isChecked: boolean;
  createdAt: string;
  reactions: Reaction[];
  replies: Reply[];
}

export interface Reply {
  id: string;
  feedbackId: string;
  userId: string;
  user?: User;
  comment: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  feedbackId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  onVideoReady: () => void;
  onPlay: () => void;
  onPause: () => void;
  timeToSeek?: number | null;
}

export interface TimelineProps {
  duration: number;
  currentTime: number;
  feedback: Feedback[];
  previousVersionsFeedback?: Feedback[];
  showPreviousVersionsFeedback?: boolean;
  currentVersion?: ProjectVersion | null;
  onSeek: (time: number) => void;
  onFeedbackClick?: (timestamp: number, feedbackItem?: Feedback) => void;
  highlightedFeedbackId?: string | null;
  onFeedbackHighlight?: (feedbackId: string | null) => void;
}

export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

export type FilterOption = 'all' | 'unchecked' | 'mine' | 'checked';