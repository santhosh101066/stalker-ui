import React from 'react';
import { useVideoContext } from '@/context/video';
import { VolumeMutedIcon, VolumeUpIcon } from '@/components/atoms/Icons';

export const VolumeControl = React.memo(() => {
    const { volume, isMuted, handleVolumeChange, toggleMute } = useVideoContext();

    const isActuallyMuted = isMuted || volume === 0;

    return (
        <div className="flex items-center group/volume">
            <button
                data-focusable="true"
                onClick={toggleMute}
                className="text-white transition-colors hover:text-blue-400 focus:outline-none"
                title={isActuallyMuted ? "Unmute" : "Mute"}
            >
                {isActuallyMuted ? (
                    <VolumeMutedIcon className="h-5 w-5 md:h-7 md:w-7" />
                ) : (
                    <VolumeUpIcon className="h-5 w-5 md:h-7 md:w-7" />
                )}
            </button>

            <div className="hidden md:flex h-8 w-0 items-center overflow-hidden transition-all duration-300 ease-in-out group-hover/volume:w-28 ml-2 px-0">
                <input
                    data-focusable="true"
                    data-control="volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isActuallyMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="h-1 w-24 cursor-pointer accent-blue-500" // accent add pannikonga blue round ku
                />
            </div>

        </div>
    );
});

VolumeControl.displayName = 'VolumeControl';