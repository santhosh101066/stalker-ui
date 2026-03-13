import React from 'react';
import { FaChromecast } from 'react-icons/fa';
import {
  PlayIcon,
  PauseIcon,
  FastRewindIcon,
  FastForwardIcon,
  SettingsIcon,
  FullscreenExitIcon,
  FullscreenIcon,
} from '@/components/atoms/Icons';
import { formatTime } from '@/utils/helpers';
import { SeekBar } from '@/components/molecules/SeekBar';
import { VolumeControl } from '@/components/molecules/VolumeControl';
import { SettingsMenu } from '@/components/molecules/SettingsMenu';
import { useVideoContext } from '@/context/video';

export const VODControls = React.memo(() => {
  const {
    isPlaying,
    currentTime,
    duration,
    fitMode,
    isFullscreen,
    isTizen,
    isSettingsMenuOpen,
    activeSettingsMenu,
    showSettingsButton,
    isReceiver,
    togglePlayPause: onTogglePlayPause,
    handleSkipButtonClick: onSkipButtonClick,
    toggleFullscreen: onToggleFullscreen,
    cycleFitMode: onCycleFitMode,
    toggleSettingsMenu: onToggleSettingsMenu,
    setActiveSettingsMenu: onActiveSettingsMenuChange,
    setIsSettingsMenuOpen: onSetIsSettingsMenuOpen,
    refreshReceivers,
  } = useVideoContext();

  return (
    <div
      className="pointer-events-auto absolute bottom-0 left-0 right-0 px-4 py-3 md:px-12 md:py-8"
      style={{
        background:
          'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)',
      }}
    >
      <div className="w-full">
        {}
        <SeekBar />

        {}
        <div className="mt-3 flex items-center justify-between text-white md:mt-5">
          {}
          <div className="flex items-center space-x-4 md:space-x-8">
            <button
              data-focusable="true"
              data-control="play-pause"
              onClick={onTogglePlayPause}
              className="text-white transition-colors hover:text-blue-400"
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5 md:h-7 md:w-7" />
              ) : (
                <PlayIcon className="h-5 w-5 md:h-7 md:w-7" />
              )}
            </button>

            <div className="flex items-center space-x-3 md:space-x-5">
              <button
                data-focusable="true"
                onClick={() => onSkipButtonClick(-10)}
                className="text-white hover:text-blue-400"
              >
                <FastRewindIcon className="h-5 w-5 md:h-7 md:w-7" />
              </button>
              <button
                data-focusable="true"
                onClick={() => onSkipButtonClick(10)}
                className="text-white hover:text-blue-400"
              >
                <FastForwardIcon className="h-5 w-5 md:h-7 md:w-7" />
              </button>
            </div>

            {!isTizen && (
              <div className="flex items-center [&_svg]:!h-5 [&_svg]:!w-5 md:[&_svg]:!h-7 md:[&_svg]:!w-7">
                <VolumeControl />
              </div>
            )}

            <span className="font-mono text-xs text-gray-300 md:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {}
          <div className="flex items-center space-x-4 md:space-x-8">
            {}
            {!isReceiver && (
              <button
                data-focusable="true"
                onClick={() => {
                  refreshReceivers();
                  if (isSettingsMenuOpen && activeSettingsMenu === 'cast') {
                    onSetIsSettingsMenuOpen(false);
                  } else {
                    onSetIsSettingsMenuOpen(true);
                    onActiveSettingsMenuChange('cast');
                  }
                }}
                className="text-white hover:text-blue-400"
                title="Cast"
              >
                <FaChromecast className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}

            <div className="relative">
              {showSettingsButton && (
                <button
                  data-focusable="true"
                  onClick={() => {
                    if (
                      isSettingsMenuOpen &&
                      activeSettingsMenu !== 'main' &&
                      activeSettingsMenu !== 'cast'
                    ) {
                      onActiveSettingsMenuChange('main');
                    } else {
                      onToggleSettingsMenu();
                    }
                  }}
                  className="text-white hover:text-blue-400"
                  title="Settings"
                >
                  <SettingsIcon className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              )}
              {}
              <SettingsMenu />
            </div>

            <button
              data-focusable="true"
              onClick={onCycleFitMode}
              className="w-10 text-center text-[10px] font-bold uppercase text-gray-300 hover:text-white md:w-14 md:text-sm"
              title="Fit Mode"
            >
              {fitMode === 'contain' && 'Fit'}
              {fitMode === 'cover' && 'Fill'}
              {fitMode === 'fill' && 'Stretch'}
            </button>

            {!isTizen && (
              <button
                data-focusable="true"
                onClick={onToggleFullscreen}
                className="text-white hover:text-blue-400"
                title="Fullscreen"
              >
                {isFullscreen ? (
                  <FullscreenExitIcon className="h-5 w-5 md:h-6 md:w-6" />
                ) : (
                  <FullscreenIcon className="h-5 w-5 md:h-6 md:w-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

VODControls.displayName = 'VODControls';
