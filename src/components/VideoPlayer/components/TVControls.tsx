import React from 'react';
import { FaChromecast } from 'react-icons/fa';
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
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 p-2.5 text-white">
            <div className="rounded-lg border border-gray-700/80 bg-gray-800 bg-opacity-60 p-2.5 shadow-2xl">
                {/* Top Row: Channel Info */}
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex min-w-0 items-center">
                        {(previewChannelInfo || channelInfo)?.screenshot_uri && (
                            <img
                                src={
                                    (previewChannelInfo || channelInfo)!.screenshot_uri?.startsWith('http')
                                        ? (previewChannelInfo || channelInfo)!.screenshot_uri
                                        : `${URL_PATHS.HOST}/api/images${(previewChannelInfo || channelInfo)!.screenshot_uri}`
                                }
                                alt={(previewChannelInfo || channelInfo)!.name}
                                className="mr-3 h-10 w-12 flex-shrink-0 rounded-sm bg-black object-contain p-0.5"
                            />
                        )}
                        <span className="text-2xl font-bold">
                            {previewChannelInfo ? previewChannelInfo.number : channelInfo?.number}
                        </span>
                        <span className="ml-4 truncate text-xl font-semibold">
                            {previewChannelInfo ? previewChannelInfo.name : channelInfo?.name}
                        </span>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-lg text-gray-200">{liveTime}</div>
                </div>

                {/* Program Info */}
                <div className="ml-16">
                    {/* Current Program */}
                    <div className="flex items-center justify-between rounded-sm bg-red-700 bg-opacity-80 p-1.5 px-3">
                        <span className="truncate font-semibold">
                            {currentProgram
                                ? currentProgram.name
                                : previewChannelInfo
                                    ? previewChannelInfo.name
                                    : channelInfo?.name || 'Current Program'}
                        </span>
                        <span className="ml-2 flex-shrink-0 text-sm">
                            {currentProgram
                                ? `${formatTimestamp(parseInt(currentProgram.start_timestamp))} - ${formatTimestamp(parseInt(currentProgram.stop_timestamp))}`
                                : previewChannelInfo
                                    ? '...'
                                    : 'Now'}
                        </span>
                    </div>
                    {/* Next Program */}
                    <div className="flex items-center justify-between p-1.5 px-3">
                        <span className="text-gray-200">
                            {nextProgram ? nextProgram.name : previewChannelInfo ? '...' : 'Next Program'}
                        </span>
                        <span className="text-sm text-gray-300">
                            {nextProgram ? formatTimestamp(parseInt(nextProgram.start_timestamp)) : '...'}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-600">
                    <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${programProgress}%` }}
                    ></div>
                </div>

                {/* Bottom Bar (Buttons) */}
                <div className="mt-2 flex items-center justify-between px-1 text-sm text-gray-200">
                    {/* Left Side: Play/List */}
                    <div className="flex items-center space-x-4">
                        <button
                            data-focusable="true"
                            data-control="play-pause"
                            onClick={onTogglePlayPause}
                            className="text-white hover:text-blue-400"
                        >
                            {isPlaying ? (
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            )}
                        </button>
                        <button
                            data-focusable="true"
                            onClick={onToggleChannelList}
                            className="text-white hover:text-blue-400"
                        >
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                    clipRule="evenodd"
                                    fillRule="evenodd"
                                ></path>
                            </svg>
                        </button>
                    </div>

                    {/* Right Side: Fit, Mute, Fullscreen */}
                    <div className="flex items-center space-x-4">
                        <button
                            data-focusable="true"
                            onClick={onCycleFitMode}
                            className="w-16 text-center text-xs font-semibold uppercase text-white hover:text-blue-400"
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
                                    className="text-white hover:text-blue-400 mr-2"
                                >
                                    <FaChromecast className="h-6 w-6" />
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
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106A1.532 1.532 0 0111.49 3.17zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
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
                                <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                    ></path>
                                </svg>
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
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            ></path>
                                        </svg>
                                    ) : (
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                                                clipRule="evenodd"
                                            ></path>
                                        </svg>
                                    )}
                                </button>
                                <button
                                    data-focusable="true"
                                    onClick={onToggleFullscreen}
                                    className="text-white hover:text-blue-400"
                                >
                                    {isFullscreen ? (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M10 4H4v6m10 10h6v-6M4 20l6-6m4-4l6-6"
                                            ></path>
                                        </svg>
                                    ) : (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5"
                                            ></path>
                                        </svg>
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
