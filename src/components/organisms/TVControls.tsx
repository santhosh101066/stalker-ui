import React, { useMemo } from 'react';
import { FaChromecast } from 'react-icons/fa';
import {
  Maximize2,
  SettingsIcon,
  ShieldCheck,
  ShieldX,
  Shrink,
  SquareDashedBottomCode,
} from 'lucide-react';

// --- Vidstack Native Hooks ---
import { useMediaState, useMediaRemote } from '@vidstack/react';

import {
  PlayIcon,
  PauseIcon,
  ListIcon,
  HeartSolidIcon,
  HeartOutlineIcon,
  VolumeMutedIcon,
  VolumeUpIcon,
  FullscreenExitIcon,
  FullscreenIcon,
} from '@/components/atoms/Icons';
import { URL_PATHS } from '@/services/api';
import { SettingsMenu } from '@/components/molecules/SettingsMenu';
import { useVideoContext } from '@/context/video';

const formatTimestamp = (timestamp: number): string => {
  if (isNaN(timestamp)) return '...';
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const TVControls = React.memo(() => {
  // 1. App-Specific State (From Context)
  const {
    channelInfo,
    previewChannelInfo,
    currentProgram,
    nextProgram,
    programProgress,
    liveTime,
    isFavorite,
    fitMode,
    isTizen,
    isSettingsMenuOpen,
    activeSettingsMenu,
    isReceiver,
    toggleChannelList: onToggleChannelList,
    cycleFitMode: onCycleFitMode,
    toggleFavorite: onToggleFavorite,
    setActiveSettingsMenu: onActiveSettingsMenuChange,
    setIsSettingsMenuOpen: onSetIsSettingsMenuOpen,
    refreshReceivers,
    useProxy,
    setUseProxy,
  } = useVideoContext();

  // 2. Video-Specific State (From Vidstack Native Hooks)
  const remote = useMediaRemote(); // Used to send commands to the player
  const isPaused = useMediaState('paused');
  const isPlaying = !isPaused;
  const isMuted = useMediaState('muted');
  const volume = useMediaState('volume');
  const isFullscreen = useMediaState('fullscreen');

  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const activeChannel = previewChannelInfo || channelInfo;

  const channelImgSrc = useMemo(() => {
    if (!activeChannel?.screenshot_uri) return null;
    return activeChannel.screenshot_uri.startsWith('http')
      ? activeChannel.screenshot_uri
      : `${baseUrl}/api/images${activeChannel.screenshot_uri}`;
  }, [activeChannel, baseUrl]);

  const currentProgName =
    currentProgram?.name || activeChannel?.name || 'Current Program';
  const currentProgTime = currentProgram
    ? `${formatTimestamp(parseInt(currentProgram.start_timestamp))} - ${formatTimestamp(parseInt(currentProgram.stop_timestamp))}`
    : previewChannelInfo
      ? '...'
      : 'Now';

  const nextProgName =
    nextProgram?.name || (previewChannelInfo ? '...' : 'Next Program');
  const nextProgTime = nextProgram
    ? formatTimestamp(parseInt(nextProgram.start_timestamp))
    : '...';

  return (
    <div className="pointer-events-auto absolute bottom-1 left-1 right-1 p-1 text-white md:bottom-4 md:left-4 md:right-4 md:p-2.5">
      <div className="rounded-lg border border-gray-700/80 bg-gray-800 bg-opacity-60 p-1 shadow-2xl md:p-2.5">
        <div className="mb-0.5 flex items-center justify-between md:mb-2">
          <div className="flex min-w-0 items-center">
            {channelImgSrc && (
              <img
                src={channelImgSrc}
                alt={activeChannel?.name || 'Channel Logo'}
                className="mr-1.5 h-4 w-6 flex-shrink-0 rounded-sm bg-black object-contain p-px md:mr-3 md:h-10 md:w-12"
              />
            )}
            <span className="text-base font-bold md:text-2xl">
              {activeChannel?.number}
            </span>
            <span className="ml-1.5 truncate text-sm font-semibold md:ml-4 md:text-xl">
              {activeChannel?.name}
            </span>
          </div>
          <div className="ml-1.5 flex-shrink-0 text-xs text-gray-200 md:ml-4 md:text-lg">
            {liveTime}
          </div>
        </div>

        <div className="ml-8 md:ml-16">
          <div className="flex items-center justify-between rounded-sm bg-red-700 bg-opacity-80 p-0.5 px-1.5 md:p-1.5 md:px-3">
            <span className="truncate text-[10px] font-semibold md:text-base">
              {currentProgName}
            </span>
            <span className="ml-1.5 flex-shrink-0 text-[8px] md:text-sm">
              {currentProgTime}
            </span>
          </div>

          <div className="flex items-center justify-between p-0.5 px-1.5 md:p-1.5 md:px-3">
            <span className="text-[10px] text-gray-200 md:text-base">
              {nextProgName}
            </span>
            <span className="text-[8px] text-gray-300 md:text-sm">
              {nextProgTime}
            </span>
          </div>
        </div>

        <div className="mt-0.5 h-0.5 w-full rounded-full bg-gray-600 md:mt-2 md:h-1.5">
          <div
            className="h-0.5 rounded-full bg-green-500 md:h-1.5"
            style={{ width: `${programProgress}%` }}
          />
        </div>

        <div className="mt-0.5 flex items-center justify-between px-1 text-sm text-gray-200 md:mt-2">
          <div className="flex items-center gap-1.5 md:gap-4">
            {/* Vidstack Remote actions mapped here */}
            <button
              data-focusable="true"
              data-control="play-pause"
              onClick={() => (isPaused ? remote.play() : remote.pause())}
              className="text-white hover:text-blue-400"
            >
              {isPlaying ? (
                <PauseIcon className="h-4 w-4 md:h-6 md:w-6" />
              ) : (
                <PlayIcon className="h-4 w-4 md:h-6 md:w-6" />
              )}
            </button>
            <button
              data-focusable="true"
              onClick={onToggleChannelList}
              className="text-white hover:text-blue-400"
            >
              <ListIcon className="h-4 w-4 md:h-6 md:w-6" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            <button data-focusable="true" className="text-white hover:text-blue-400" onClick={() => setUseProxy(!useProxy)} title='Proxy'>
              {!useProxy ? <ShieldX /> : <ShieldCheck />}
            </button>
            <button
              data-focusable="true"
              onClick={onCycleFitMode}
              className="text-white hover:text-blue-400"
              title='Video Scale'
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

            <div className="relative flex items-center gap-1.5">
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
                  className="mr-1 text-white hover:text-blue-400 md:mr-2"
                >
                  <FaChromecast className="h-4 w-4 md:h-6 md:w-6" />
                </button>
              )}
              <div className="relative flex items-center justify-center">
                {
                  <button
                    data-focusable="true"
                    onClick={() => onSetIsSettingsMenuOpen((v) => !v)}
                    className="text-white hover:text-blue-400"
                  >
                    <SettingsIcon className="h-4 w-4 md:h-6 md:w-6" />
                  </button>
                }
                {/* 👇 Menu ippo intha relative div-ku ulla irukkirathunala, correct-a button mela ukkarum */}
                <SettingsMenu />
              </div>
            </div>

            <button
              data-focusable="true"
              onClick={() => onToggleFavorite(activeChannel)}
              className="text-white hover:text-yellow-400"
            >
              {isFavorite ? (
                <HeartSolidIcon className="h-4 w-4 text-yellow-400 md:h-6 md:w-6" />
              ) : (
                <HeartOutlineIcon className="h-4 w-4 md:h-6 md:w-6" />
              )}
            </button>

            {!isTizen && (
              <>
                <button
                  data-focusable="true"
                  onClick={() => remote.toggleMuted()}
                  className="text-white hover:text-blue-400"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeMutedIcon className="h-4 w-4 md:h-6 md:w-6" />
                  ) : (
                    <VolumeUpIcon className="h-4 w-4 md:h-6 md:w-6" />
                  )}
                </button>
                <button
                  data-focusable="true"
                  onClick={() => remote.toggleFullscreen()}
                  className="text-white hover:text-blue-400"
                >
                  {isFullscreen ? (
                    <FullscreenExitIcon className="h-4 w-4 md:h-6 md:w-6" />
                  ) : (
                    <FullscreenIcon className="h-4 w-4 md:h-6 md:w-6" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

TVControls.displayName = 'TVControls';
