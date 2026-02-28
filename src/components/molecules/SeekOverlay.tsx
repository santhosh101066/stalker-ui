import React from 'react';
import type { SeekOverlayData } from '@/types';

interface SeekOverlayProps {
    seekOverlay: SeekOverlayData | null;
}

export const SeekOverlay = React.memo<SeekOverlayProps>(({ seekOverlay }) => {
    if (!seekOverlay) return null;

    return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in duration-200">
            <div className="bg-black/80 backdrop-blur-md text-white rounded-full px-6 py-4 flex flex-col items-center shadow-lg">
                <span className="text-3xl font-bold">{seekOverlay.text}</span>
                <span className="text-sm text-gray-300 mt-1">{seekOverlay.time}</span>
            </div>
        </div>
    );
});

SeekOverlay.displayName = 'SeekOverlay';
