import React from 'react';
import { VideoProvider } from './context/VideoContext';
import VideoPlayerContent from './VideoPlayerContent';
import type { VideoPlayerProps } from './types';
import { useSocket } from '../../context/useSocket';

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
    const { isReceiver, receivers, castTo } = useSocket();

    return (
        <VideoProvider
            {...props}
            isReceiver={isReceiver}
            receivers={receivers}
            castTo={castTo}
        >
            <VideoPlayerContent />
        </VideoProvider>
    );
};

export default VideoPlayer;
