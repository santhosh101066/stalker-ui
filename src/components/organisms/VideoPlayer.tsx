import React from 'react';
import { VideoProvider } from '@/context/video/VideoContext';
import VideoPlayerContent from '@/components/organisms/VideoPlayerContent';
import type { VideoPlayerProps } from '@/types/video';
import { useSocket } from '@/context/useSocket';

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
    const { isReceiver, receivers, castTo, refreshReceivers } = useSocket();

    return (
        <VideoProvider
            {...props}
            isReceiver={isReceiver}
            receivers={receivers}
            castTo={castTo}
            refreshReceivers={refreshReceivers}
        >
            <VideoPlayerContent />
        </VideoProvider>
    );
};

export default VideoPlayer;
