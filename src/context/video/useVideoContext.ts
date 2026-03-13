import { useContext } from 'react';
import { VideoContext } from '@/context/video/VideoContextTypes';

export const useVideoContext = () => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideoContext must be used within a VideoProvider');
  }
  return context;
};
