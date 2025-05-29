import { describe, it, expect } from 'vitest';

function generateCacheKey(videoUrl: string, timestamp: string): string {
  return btoa(videoUrl) + '_' + timestamp;
}

describe('Cache key generation', () => {
  it('generates keys matching backend format', () => {
    const videoUrl = 'https://example.com/video.mp4';
    const timestamp = '1234567890';
    const expectedKey = btoa(videoUrl) + '_' + timestamp;
    
    expect(generateCacheKey(videoUrl, timestamp)).toBe(expectedKey);
    expect(expectedKey).toMatch(/^[A-Za-z0-9+/]+=*_\d+$/);
  });
});