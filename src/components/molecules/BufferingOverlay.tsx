import React from 'react';
import { useVideoContext } from '@/context/video';

export const BufferingOverlay = React.memo(() => {
    const { isBuffering } = useVideoContext();

    if (!isBuffering ) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex h-full w-full flex-col items-center justify-center bg-transparent text-white z-10">
                {/* Animated Rings Container */}
                <div className="relative mb-8 h-20 w-20">
                    {/* Outer expanding ring for depth */}
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>

                    {/* Inner pulsing glow */}
                    <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/30 blur-md"></div>

                    {/* Multi-colored smooth spinner */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-blue-500 border-r-indigo-500 animate-spin"></div>

                    {/* Center glowing dot */}
                    <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                </div>
            </div>
        </div>
    );
});

BufferingOverlay.displayName = 'BufferingOverlay';
