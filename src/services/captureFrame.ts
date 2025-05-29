import type { DrawingData } from '../types';
import { supabase } from './supabase';
import { FRAME_BUCKET } from '@/config/storage';

interface CaptureResponse {
  url: string;
  error?: string;
}

const API_TIMEOUT = 10000; // 10 seconds

async function getFrameFromStorage(videoUrl: string, timestamp: number): Promise<string | null> {
  try {
    const framePath = `frames/${btoa(videoUrl)}_${timestamp}.jpg`;
    
    const { data } = await supabase.storage
      .from(FRAME_BUCKET)
      .list('', { 
        search: framePath,
        limit: 1 
      });
    
    if (data && data.length > 0 && data[0].name === framePath) {
      const { data: { publicUrl } } = await supabase.storage
        .from(FRAME_BUCKET)
        .getPublicUrl(framePath);
      return publicUrl;
    }
    
    return null; // Cache miss
  } catch (error) {
    console.error('Storage cache check failed:', error);
    return null;
  }
}

async function captureFrameAPI(
  videoUrl: string,
  timestamp: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // First check if we have the frame cached in storage
    const cachedUrl = await getFrameFromStorage(videoUrl, timestamp);
    if (cachedUrl) {
      return cachedUrl;
    }

    // If not in cache, request from API
    const apiUrl = import.meta.env.VITE_CAPTURE_API_URL;
    if (!apiUrl) {
      throw new Error('Capture API URL not configured');
    }

    const response = await fetch(
      `${apiUrl}/capture-frame?path=${encodeURIComponent(videoUrl)}&timestamp=${timestamp}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: CaptureResponse = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.url) {
      throw new Error('Invalid API response: missing URL');
    }

    return data.url;
  } catch (error) {
    if (error instanceof Error) {
      // Log detailed error for debugging
      console.error('Frame capture failed:', {
        error: error.message,
        videoUrl,
        timestamp,
        stack: error.stack
      });
      
      // Throw a user-friendly error
      throw new Error('Failed to capture frame from video. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function captureFrame(
  videoUrl: string,
  timestamp: number
): Promise<string> {
  if (!videoUrl) {
    throw new Error('Video URL is required');
  }

  try {
    return await captureFrameAPI(videoUrl, timestamp);
  } catch (error) {
    console.error('Frame capture failed:', error);
    throw error;
  }
}