import React from 'react';
import { FaChromecast } from 'react-icons/fa';
import {
    PlayIcon, PauseIcon, ListIcon, SettingsIcon,
    HeartSolidIcon, HeartOutlineIcon, VolumeMutedIcon,
    VolumeUpIcon, FullscreenExitIcon, FullscreenIcon
} from './Icons';
import { URL_PATHS } from '../../../api/api';
import { SettingsMenu } from './SettingsMenu';
import { useVideoContext } from '../context/useVideoContext';

const formatTimestamp = (timestamp: number): string => {
    if (isNaN(timestamp)) return '...';
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

export const TVControls = React.memo(() => {
    const {
        channelInfo,
        previewChannelInfo,
        currentProgram,
        nextProgram,
        programProgress,
        liveTime,
        isFavorite,
        isPlaying,
        fitMode,
        isTizen,
        isSettingsMenuOpen,
        activeSettingsMenu,
        showSettingsButton,
        isReceiver,
        togglePlayPause: onTogglePlayPause,
        toggleChannelList: onToggleChannelList,
        cycleFitMode: onCycleFitMode,
        toggleFavorite: onToggleFavorite,
        toggleMute: onToggleMute,
        toggleFullscreen: onToggleFullscreen,
        toggleSettingsMenu: onToggleSettingsMenu,
        setActiveSettingsMenu: onActiveSettingsMenuChange,
        setIsSettingsMenuOpen: onSetIsSettingsMenuOpen,
        isMuted,
        volume,
        isFullscreen,
    } = useVideoContext();

    return (
        <div className="pointer-events-auto absolute bottom-1 left-1 right-1 p-1 text-white md:bottom-4 md:left-4 md:right-4 md:p-2.5">
            <div className="rounded-lg border border-gray-700/80 bg-gray-800 bg-opacity-60 p-1 shadow-2xl md:p-2.5">
                {/* Top Row: Channel Info */}
                <div className="mb-0.5 flex items-center justify-between md:mb-2">
                    <div className="flex min-w-0 items-center">
                        {(previewChannelInfo || channelInfo)?.screenshot_uri && (
                            <img
                                src={
                                    (previewChannelInfo || channelInfo)!.screenshot_uri?.startsWith('http')
                                        ? (previewChannelInfo || channelInfo)!.screenshot_uri
                                        : `${URL_PATHS.HOST}/api/images${(previewChannelInfo || channelInfo)!.screenshot_uri}`
                                }
                                alt={(previewChannelInfo || channelInfo)!.name}
                                className="mr-1.5 h-4 w-6 flex-shrink-0 rounded-sm bg-black object-contain p-px md:mr-3 md:h-10 md:w-12"
                            />
                        )}
                        <span className="text-base font-bold md:text-2xl">
                            {previewChannelInfo ? previewChannelInfo.number : channelInfo?.number}
                        </span>
                        <span className="ml-1.5 truncate text-sm font-semibold md:ml-4 md:text-xl">
                            {previewChannelInfo ? previewChannelInfo.name : channelInfo?.name}
                        </span>
                    </div>
                    <div className="ml-1.5 flex-shrink-0 text-xs text-gray-200 md:ml-4 md:text-lg">{liveTime}</div>
                </div>

                {/* Program Info */}
                <div className="ml-8 md:ml-16">
                    {/* Current Program */}
                    <div className="flex items-center justify-between rounded-sm bg-red-700 bg-opacity-80 p-0.5 px-1.5 md:p-1.5 md:px-3">
                        <span className="truncate text-[10px] font-semibold md:text-base">
                            {currentProgram
                                ? currentProgram.name
                                : previewChannelInfo
                                    ? previewChannelInfo.name
                                    : channelInfo?.name || 'Current Program'}
                        </span>
                        <span className="ml-1.5 flex-shrink-0 text-[8px] md:text-sm">
                            {currentProgram
                                ? `${formatTimestamp(parseInt(currentProgram.start_timestamp))} - ${formatTimestamp(parseInt(currentProgram.stop_timestamp))}`
                                : previewChannelInfo
                                    ? '...'
                                    : 'Now'}
                        </span>
                    </div>
                    {/* Next Program */}
                    <div className="flex items-center justify-between p-0.5 px-1.5 md:p-1.5 md:px-3">
                        <span className="text-[10px] text-gray-200 md:text-base">
                            {nextProgram ? nextProgram.name : previewChannelInfo ? '...' : 'Next Program'}
                        </span>
                        <span className="text-[8px] text-gray-300 md:text-sm">
                            {nextProgram ? formatTimestamp(parseInt(nextProgram.start_timestamp)) : '...'}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-0.5 h-0.5 w-full rounded-full bg-gray-600 md:mt-2 md:h-1.5">
                    <div
                        className="h-0.5 rounded-full bg-green-500 md:h-1.5"
                        style={{ width: `${programProgress}%` }}
                    ></div>
                </div>

                {/* Bottom Bar (Buttons) */}
                <div className="mt-0.5 flex items-center justify-between px-1 text-sm text-gray-200 md:mt-2">
                    {/* Left Side: Play/List */}
                    <div className="flex items-center space-x-1.5 md:space-x-4">
                        <button
                            data-focusable="true"
                            data-control="play-pause"
                            onClick={onTogglePlayPause}
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

                    {/* Right Side: Fit, Mute, Fullscreen */}
                    <div className="flex items-center space-x-1.5 md:space-x-4">
                        <button
                            data-focusable="true"
                            onClick={onCycleFitMode}
                            className="w-10 text-center text-[8px] font-semibold uppercase text-white hover:text-blue-400 md:w-16 md:text-xs"
                        >
                            {fitMode === 'contain' && 'Fit'}
                            {fitMode === 'cover' && 'Fill'}
                            {fitMode === 'fill' && 'Stretch'}
                        </button>
                        <div className="relative">
                            {/* Cast Button */}
                            {!isReceiver && (
                                <button
                                    data-focusable="true"
                                    onClick={() => {
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
                            {showSettingsButton && (
                                <button
                                    data-focusable="true"
                                    onClick={() => {
                                        if (isSettingsMenuOpen && activeSettingsMenu !== 'main' && activeSettingsMenu !== 'cast') {
                                            onActiveSettingsMenuChange('main');
                                        } else {
                                            onToggleSettingsMenu();
                                        }
                                    }}
                                    className="text-white hover:text-blue-400"
                                >
                                    <SettingsIcon className="h-4 w-4 md:h-6 md:w-6" />
                                </button>
                            )}
                            {/* Settings Menu */}
                            <SettingsMenu />
                        </div>
                        <button
                            data-focusable="true"
                            onClick={() => onToggleFavorite(previewChannelInfo || channelInfo)}
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
                                    onClick={onToggleMute}
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
                                    onClick={onToggleFullscreen}
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