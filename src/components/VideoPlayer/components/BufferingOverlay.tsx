import React from 'react';
import { useVideoContext } from '../context';

export const BufferingOverlay = React.memo(() => {
    const { isBuffering } = useVideoContext();

    if (!isBuffering) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="relative h-16 w-16">
                <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></div>
                <div className="relative h-full w-full rounded-full bg-blue-500"></div>
            </div>
        </div>
    );
});

BufferingOverlay.displayName = 'BufferingOverlay';
