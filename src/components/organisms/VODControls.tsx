import React from 'react';
import {
  Controls,
  PlayButton,
  TimeSlider,
  Time,
  FullscreenButton,
  useMediaState,
} from '@vidstack/react';
import {
  PauseIcon,
  PlayIcon,
  FastForwardIcon,
  RewindIcon,
  MaximizeIcon,
  MinimizeIcon,
  Shrink,
  SquareDashedBottomCode,
  Maximize2,
  SettingsIcon,
  ShieldX,
  ShieldCheck,
} from 'lucide-react';
import { FaChromecast } from 'react-icons/fa';

import { useVideoContext } from '@/context/video';
import { VolumeControl } from '@/components/molecules/VolumeControl';
import { SettingsMenu } from '../molecules/SettingsMenu';

export const VODControls = React.memo(() => {
  const isPaused = useMediaState('paused');
  const isFullscreen = useMediaState('fullscreen');

  const {
    fitMode,
    isTizen,
    isReceiver,
    cycleFitMode: onCycleFitMode,
    refreshReceivers,
    setActiveSettingsMenu: onActiveSettingsMenuChange,
    handleSkipButtonClick,
    setIsSettingsMenuOpen,
    useProxy,
    setUseProxy,
  } = useVideoContext();

  return (
    <div
      className="pointer-events-auto absolute bottom-0 left-0 right-0 px-4 py-3 md:px-12 md:py-8"
      style={{
        background:
          'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)',
      }}
    >
      <Controls.Group className="w-full">
        {/* Added focusable and seekbar control */}
        <div
          data-focusable="true"
          data-control="seekbar"
          className="group relative flex h-4 w-full cursor-pointer items-center md:h-6"
        >
          <TimeSlider.Root
            className="relative h-1.5 w-full md:h-2"
            tabIndex={-1} // <-- The Magic Wand: This prevents Vidstack from taking native keyboard focus!
          >
            <TimeSlider.Track className="absolute h-full w-full rounded-sm bg-white/30" />
            <TimeSlider.Progress className="absolute h-full w-[var(--slider-progress)] rounded-sm bg-white/50" />
            <TimeSlider.TrackFill className="absolute h-full w-[var(--slider-fill)] rounded-sm bg-blue-500" />

            {/* Added 'group-[.focused]:opacity-100' so the blue thumb appears when your TV remote highlights the timeline! */}
            <TimeSlider.Thumb className="absolute left-[var(--slider-fill)] top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100 group-[.focused]:scale-125 group-[.focused]:opacity-100" />
          </TimeSlider.Root>
        </div>

        <div className="mt-3 flex items-center justify-between text-white md:mt-5">
          <div className="pointer-event-none flex items-center space-x-4 md:space-x-8">
            <PlayButton
              data-focusable="true"
              data-control="play-pause"
              className="text-white transition-colors hover:text-blue-400"
            >
              {isPaused ? (
                <PlayIcon className="h-5 w-5 md:h-7 md:w-7" />
              ) : (
                <PauseIcon className="h-5 w-5 md:h-7 md:w-7" />
              )}
            </PlayButton>

            <div className="flex items-center space-x-3 md:space-x-5">
              <button
                data-focusable="true"
                onClick={() => handleSkipButtonClick(-10)}
                className="flex items-center justify-center text-white transition-transform hover:scale-110 hover:text-blue-400"
              >
                <RewindIcon className="h-5 w-5 md:h-7 md:w-7" />
              </button>

              <button
                data-focusable="true"
                onClick={() => handleSkipButtonClick(10)}
                className="flex items-center justify-center text-white transition-transform hover:scale-110 hover:text-blue-400"
              >
                <FastForwardIcon className="h-5 w-5 md:h-7 md:w-7" />
              </button>
            </div>

            {!isTizen && (
              <div
                // data-focusable="true"
                className="flex items-center space-x-2 [&_svg]:!h-5 [&_svg]:!w-5 md:[&_svg]:!h-7 md:[&_svg]:!w-7"
              >
                {/* Ensure your VolumeControl internally handles its focus if needed */}
                <VolumeControl />
              </div>
            )}

            <div className="flex items-center space-x-1 font-mono text-xs text-gray-300 md:text-sm">
              <Time type="current" />
              <span>/</span>
              <Time type="duration" />
            </div>
          </div>

          <div className="flex items-center gap-5 md:gap-8">
            <button
              data-focusable="true"
              className="text-white hover:text-blue-400"
              onClick={() => setUseProxy(!useProxy)}
              title="Proxy"
            >
              {!useProxy ? <ShieldX /> : <ShieldCheck />}
            </button>
            {!isReceiver && (
              <button
                data-focusable="true"
                onClick={() => {
                  refreshReceivers();
                  onActiveSettingsMenuChange('cast');
                }}
                className="text-white hover:text-blue-400"
                title="Cast"
              >
                <FaChromecast className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
            <div className="relative flex items-center justify-center">
              {
                <button
                  data-focusable="true"
                  onClick={() => setIsSettingsMenuOpen((v) => !v)}
                  className="text-white hover:text-blue-400"
                >
                  <SettingsIcon className="h-4 w-4 md:h-6 md:w-6" />
                </button>
              }
              <SettingsMenu />
            </div>

            <button
              data-focusable="true"
              onClick={onCycleFitMode}
              className="text-white hover:text-blue-400"
              title="Fit Mode"
            >
              {fitMode === 'contain' && (
                <Shrink className="h-5 w-5 md:h-6 md:w-6" />
              )}
              {fitMode === 'cover' && (
                <SquareDashedBottomCode className="h-5 w-5 md:h-6 md:w-6" />
              )}
              {fitMode === 'fill' && (
                <Maximize2 className="h-5 w-5 md:h-6 md:w-6" />
              )}
            </button>

            {!isTizen && (
              <FullscreenButton
                data-focusable="true"
                className="text-white hover:text-blue-400"
                title="Fullscreen"
              >
                {isFullscreen ? (
                  <MinimizeIcon className="h-5 w-5 md:h-6 md:w-6" />
                ) : (
                  <MaximizeIcon className="h-5 w-5 md:h-6 md:w-6" />
                )}
              </FullscreenButton>
            )}
          </div>
        </div>
      </Controls.Group>
    </div>
  );
});

VODControls.displayName = 'VODControls';
