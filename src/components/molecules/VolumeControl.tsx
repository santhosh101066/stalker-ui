import React from 'react';
import { useVideoContext } from '@/context/video';
import { VolumeMutedIcon, VolumeUpIcon } from '@/components/atoms/Icons';

export const VolumeControl = React.memo(() => {
  const { volume, isMuted, handleVolumeChange, toggleMute } = useVideoContext();

  const isActuallyMuted = isMuted || volume === 0;

  return (
    <div className="group/volume flex items-center">
      <button
        data-focusable="true"
        onClick={toggleMute}
        className="text-white transition-colors hover:text-blue-400 focus:outline-none"
        title={isActuallyMuted ? 'Unmute' : 'Mute'}
      >
        {isActuallyMuted ? (
          <VolumeMutedIcon className="h-5 w-5 md:h-7 md:w-7" />
        ) : (
          <VolumeUpIcon className="h-5 w-5 md:h-7 md:w-7" />
        )}
      </button>

      <div className="ml-2 hidden h-8 w-0 items-center overflow-hidden px-0 transition-all duration-300 ease-in-out group-hover/volume:w-28 md:flex">
        <input
          data-focusable="true"
          data-control="volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isActuallyMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="h-1 w-24 cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';
