import { useContext } from 'react';
import { VideoContext } from './VideoContextTypes';

// Custom hook to use the context
export const useVideoContext = () => {
    const context = useContext(VideoContext);
    if (context === undefined) {
        throw new Error('useVideoContext must be used within a VideoProvider');
    }
    return context;
};
