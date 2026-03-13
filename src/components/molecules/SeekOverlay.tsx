import React from 'react';
import type { SeekOverlayData } from '@/types';

interface SeekOverlayProps {
  seekOverlay: SeekOverlayData | null;
}

export const SeekOverlay = React.memo<SeekOverlayProps>(({ seekOverlay }) => {
  if (!seekOverlay) return null;

  return (
    <div className="animate-in fade-in zoom-in pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center duration-200">
      <div className="flex flex-col items-center rounded-full bg-black/80 px-6 py-4 text-white shadow-lg backdrop-blur-md">
        <span className="text-3xl font-bold">{seekOverlay.text}</span>
        <span className="mt-1 text-sm text-gray-300">{seekOverlay.time}</span>
      </div>
    </div>
  );
});

SeekOverlay.displayName = 'SeekOverlay';
