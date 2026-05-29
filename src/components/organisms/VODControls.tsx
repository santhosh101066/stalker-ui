import React, { useState, useEffect } from 'react';
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
  ListVideo,
  MoreVertical,
} from 'lucide-react';
import { FaChromecast } from 'react-icons/fa';

import { useVideoContext } from '@/context/video';
import { VolumeControl } from '@/components/molecules/VolumeControl';
import { SettingsMenu } from '../molecules/SettingsMenu';
import { formatTime } from '@/utils/helpers';

export const VODControls = React.memo(() => {
  const isPaused = useMediaState('paused');
  const isFullscreen = useMediaState('fullscreen');
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const currentTime = useMediaState('currentTime');
  const duration = useMediaState('duration') || 0;

  const {
    fitMode,
    isTizen,
    isReceiver,
    cycleFitMode: onCycleFitMode,
    refreshReceivers,
    setActiveSettingsMenu: onActiveSettingsMenuChange,
    handleSkipButtonClick,
    setIsSettingsMenuOpen,
    isSettingsMenuOpen,
    activeSettingsMenu,
    useProxy,
    setUseProxy,
    episodes,
    setShowEpisodeList,
    seekOverlay,
    controlsVisible,
  } = useVideoContext();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!controlsVisible) {
      setIsMoreMenuOpen(false);
    }
  }, [controlsVisible]);

  const showTooltip = (seekOverlay !== null) || isDragging;
  const tooltipText = seekOverlay ? seekOverlay.time : formatTime(dragTime);

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
            onDragStart={() => {
              setIsDragging(true);
              setDragTime(currentTime || 0);
            }}
            onDragEnd={() => setIsDragging(false)}
            onDragValueChange={(val) => setDragTime((val / 100) * duration)}
          >
            <TimeSlider.Track className="absolute h-full w-full rounded-sm bg-white/30" />
            <TimeSlider.Progress
              className="absolute h-full rounded-sm bg-white/50"
              style={{ width: 'var(--slider-progress)' }}
            />
            <TimeSlider.TrackFill
              className="absolute h-full rounded-sm bg-blue-500"
              style={{ width: 'var(--slider-fill)' }}
            />

            {/* Custom seek/drag preview tooltip */}
            {showTooltip && (
              <div
                className="absolute bottom-full mb-3 -translate-x-1/2 rounded bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-md after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-blue-600 pointer-events-none"
                style={{ left: 'var(--slider-fill)' }}
              >
                {tooltipText}
              </div>
            )}

            {/* Added 'group-[.focused]:opacity-100' so the blue thumb appears when your TV remote highlights the timeline! */}
            <TimeSlider.Thumb
              className="absolute top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100 group-[.focused]:scale-125 group-[.focused]:opacity-100"
              style={{ left: 'var(--slider-fill)' }}
            />
          </TimeSlider.Root>
        </div>

        <div className="vod-controls-buttons-row mt-3 flex items-center justify-between text-white md:mt-5">
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
              className="hidden md:block text-white hover:text-blue-400"
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
                  if (isSettingsMenuOpen && activeSettingsMenu === 'cast') {
                    setIsSettingsMenuOpen(false);
                  } else {
                    setIsSettingsMenuOpen(true);
                    onActiveSettingsMenuChange('cast');
                  }
                }}
                className="hidden md:block text-white hover:text-blue-400"
                title="Cast"
              >
                <FaChromecast className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
            {episodes && episodes.length > 0 && (
              <button
                data-focusable="true"
                onClick={() => setShowEpisodeList(true)}
                className="hidden md:block text-white hover:text-blue-400"
                title="Episodes"
              >
                <ListVideo className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
            <div className="relative flex items-center justify-center">
              {
                <button
                  data-focusable="true"
                  onClick={() => {
                    if (isSettingsMenuOpen && activeSettingsMenu === 'main') {
                      setIsSettingsMenuOpen(false);
                    } else {
                      setIsSettingsMenuOpen(true);
                      onActiveSettingsMenuChange('main');
                    }
                  }}
                  className="hidden md:block text-white hover:text-blue-400"
                >
                  <SettingsIcon className="h-4 w-4 md:h-6 md:w-6" />
                </button>
              }
              <SettingsMenu />
            </div>

            <button
              data-focusable="true"
              onClick={onCycleFitMode}
              className="hidden md:block text-white hover:text-blue-400"
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

            {/* Mobile More Options Button */}
            <div className="relative flex items-center justify-center md:hidden">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="text-white hover:text-blue-400 p-1.5 transition-colors"
                title="More Options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {isMoreMenuOpen && (
                <div className="more-options-menu absolute bottom-[calc(100%+12px)] right-0 z-50 flex w-48 origin-bottom-right flex-col rounded-xl border border-gray-600/40 bg-gray-900/95 p-2 text-sm text-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  <button
                    onClick={() => {
                      setUseProxy(!useProxy);
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 rounded px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    {!useProxy ? <ShieldX className="h-4 w-4 text-gray-400" /> : <ShieldCheck className="h-4 w-4 text-green-400" />}
                    <span>Proxy: {useProxy ? 'On' : 'Off'}</span>
                  </button>

                  {!isReceiver && (
                    <button
                      onClick={() => {
                        refreshReceivers();
                        setIsSettingsMenuOpen(true);
                        onActiveSettingsMenuChange('cast');
                        setIsMoreMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 rounded px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <FaChromecast className="h-4 w-4 text-gray-400" />
                      <span>Cast</span>
                    </button>
                  )}

                  {episodes && episodes.length > 0 && (
                    <button
                      onClick={() => {
                        setShowEpisodeList(true);
                        setIsMoreMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 rounded px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <ListVideo className="h-4 w-4 text-gray-400" />
                      <span>Episodes</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(true);
                      onActiveSettingsMenuChange('main');
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 rounded px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    <SettingsIcon className="h-4 w-4 text-gray-400" />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      onCycleFitMode();
                    }}
                    className="flex items-center space-x-3 rounded px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    {fitMode === 'contain' && <Shrink className="h-4 w-4 text-gray-400" />}
                    {fitMode === 'cover' && <SquareDashedBottomCode className="h-4 w-4 text-gray-400" />}
                    {fitMode === 'fill' && <Maximize2 className="h-4 w-4 text-gray-400" />}
                    <span className="capitalize">{fitMode}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Controls.Group>
    </div>
  );
});

VODControls.displayName = 'VODControls';
