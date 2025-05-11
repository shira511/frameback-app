# FrameBack - Video Feedback Application

A collaborative tool for video editing teams to leave timestamped feedback on videos using text and drawings. Similar to Dropbox Replay, but designed to work with embedded videos from platforms like YouTube.

## Features

- **Google OAuth Authentication**: Sign in with Google to access your account
- **Video Embedding**: Support for YouTube embedded videos with synchronized timeline
- **Timestamped Feedback**: Leave comments at specific points in the video
- **Drawing Annotations**: Draw directly on paused video frames
- **Real-time Collaboration**: See feedback and changes in real-time
- **Feedback Management**: Mark feedback as resolved, filter by status
- **Threaded Discussions**: Reply to feedback and use emoji reactions
- **Advanced Playback Controls**: Change speed, frame-by-frame navigation

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime)
- **Video**: YouTube Embedded Player
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 14+
- Supabase account
- Google OAuth credentials (for Supabase Auth)

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and add your Supabase credentials
4. Run the development server:
   ```
   npm run dev
   ```
5. Set up your Supabase project with the migrations in `supabase/migrations/`

### Supabase Setup

1. Create a new Supabase project
2. Enable Google authentication in Supabase Auth settings
3. Run the SQL migration from `supabase/migrations/create_schema.sql`

## Deployment

The application is configured for deployment on Netlify.

## License

MIT