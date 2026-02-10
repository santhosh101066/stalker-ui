import React from 'react';
import { FaChromecast } from 'react-icons/fa';
import { formatTime } from '../../../utils/helpers';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';
import { SettingsMenu } from './SettingsMenu';
import { useVideoContext } from '../context/useVideoContext';

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
    } = useVideoContext();

    return (
        <div
            className="pointer-events-auto absolute bottom-0 left-0 right-0 p-4"
            style={{
                background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0) 100%)',
            }}
        >
            {/* YouTube-style Seek Bar */}
            <SeekBar />


            {/* Button Row */}
            <div className="mt-2 flex items-center justify-between text-white px-2">
                {/* Left Controls: Play, Volume, Time */}
                <div className="flex items-center space-x-4">
                    <button
                        data-focusable="true"
                        data-control="play-pause"
                        onClick={onTogglePlayPause}
                        className="text-white hover:text-blue-400 transition-colors"
                    >
                        {isPlaying ? (
                            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                ></path>
                            </svg>
                        ) : (
                            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                    clipRule="evenodd"
                                ></path>
                            </svg>
                        )}
                    </button>

                    <div className="flex items-center space-x-2">
                        <button
                            data-focusable="true"
                            onClick={() => onSkipButtonClick(-10)}
                            className="text-white hover:text-blue-400"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                                ></path>
                            </svg>
                        </button>
                        <button
                            data-focusable="true"
                            onClick={() => onSkipButtonClick(10)}
                            className="text-white hover:text-blue-400"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M11.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                                ></path>
                            </svg>
                        </button>
                    </div>

                    {!isTizen && (
                        <VolumeControl />
                    )}

                    <span className="font-mono text-sm text-gray-300">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>

                {/* Right Controls: Cast, Settings, Fit, Fullscreen */}
                <div className="flex items-center space-x-4">
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
                            className="text-white hover:text-blue-400"
                            title="Cast"
                        >
                            <FaChromecast className="h-5 w-5" />
                        </button>
                    )}

                    <div className="relative">
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
                                title="Settings"
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
                        onClick={onCycleFitMode}
                        className="w-12 text-center text-xs font-bold uppercase text-gray-300 hover:text-white"
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
                    )}
                </div>
            </div>
        </div>
    );
});

VODControls.displayName = 'VODControls';
