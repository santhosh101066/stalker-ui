import React from 'react';
import { FaChromecast } from 'react-icons/fa';
import { useVideoContext } from '../context/useVideoContext';

export const SettingsMenu = React.memo(() => {
    const {
        isSettingsMenuOpen: isOpen,
        activeSettingsMenu: activeMenu,
        setActiveSettingsMenu: onMenuChange,
        videoLevels,
        audioTracks,
        subtitleTracks,
        receivers,
        currentVideoLevel,
        currentAudioTrack,
        currentSubtitleTrack,
        handleVideoLevelChange: onVideoLevelChange,
        handleAudioTrackChange: onAudioTrackChange,
        handleSubtitleTrackChange: onSubtitleTrackChange,
        handleCast: onCast,
        isReceiver,
        settingsMenuRef,
        contentType,
    } = useVideoContext();

    if (!isOpen) return null;

    const isVOD = contentType !== 'tv';

    // Tailwind classes must be complete strings for the compiler
    const containerClasses = isVOD
        ? 'absolute bottom-full right-0 mb-4 w-56 rounded-lg bg-gray-900/95 backdrop-blur shadow-xl border border-gray-700 py-2 text-sm text-white overflow-hidden z-20'
        : 'absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-gray-800 bg-opacity-90 py-1 text-sm text-white';

    const menuItemClasses = isVOD
        ? 'flex items-center w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors'
        : 'block w-full px-4 py-2 text-left hover:bg-gray-700';

    const activeItemClasses = isVOD
        ? 'text-blue-400 font-semibold'
        : 'bg-blue-500';

    return (
        <div
            ref={settingsMenuRef}
            className={containerClasses}
        >
            {activeMenu === 'main' && (
                <>
                    {videoLevels.length > 1 && (
                        <button
                            onClick={() => onMenuChange('quality')}
                            className={menuItemClasses}
                            data-focusable="true"
                        >
                            {isVOD && <span className="flex-1 text-left">Quality</span>}
                            {!isVOD && 'Quality'}
                            {isVOD && (
                                <>
                                    <span className="text-xs text-gray-400">
                                        {currentVideoLevel === -1 ? 'Auto' : `${videoLevels[currentVideoLevel]?.height}p`}
                                    </span>
                                    <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </>
                            )}
                        </button>
                    )}
                    {audioTracks.length > 1 && (
                        <button
                            onClick={() => onMenuChange('audio')}
                            className={menuItemClasses}
                            data-focusable="true"
                        >
                            {isVOD && <span className="flex-1 text-left">Audio</span>}
                            {!isVOD && 'Audio'}
                            {isVOD && (
                                <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            )}
                        </button>
                    )}
                    {subtitleTracks.length > 0 && (
                        <button
                            onClick={() => onMenuChange('subtitles')}
                            className={menuItemClasses}
                            data-focusable="true"
                        >
                            {isVOD && <span className="flex-1 text-left">Subtitles</span>}
                            {!isVOD && 'Subtitles'}
                            {isVOD && (
                                <>
                                    <span className="text-xs text-gray-400">
                                        {currentSubtitleTrack === -1 ? 'Off' : (subtitleTracks[currentSubtitleTrack]?.label || 'On')}
                                    </span>
                                    <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </>
                            )}
                        </button>
                    )}
                    {isVOD && !isReceiver && (
                        <button
                            onClick={() => onMenuChange('cast')}
                            className="flex items-center w-full px-4 py-3 hover:bg-gray-800 transition-colors"
                            data-focusable="true"
                        >
                            <FaChromecast className="mr-3" /> <span className="text-left">Cast to Device</span>
                        </button>
                    )}
                </>
            )}

            {activeMenu === 'cast' && (
                <>
                    <div className="block w-full px-4 py-2 text-left text-gray-400 border-b border-gray-600 mb-1 font-semibold">
                        Cast to Device
                    </div>
                    {receivers.length === 0 ? (
                        <div className="px-4 py-2 text-gray-400 text-xs">No devices found</div>
                    ) : (
                        receivers.map((device) => (
                            <button
                                key={device.id}
                                onClick={() => onCast(device.id)}
                                className="block w-full px-4 py-2 text-left hover:bg-gray-700 truncate"
                                data-focusable="true"
                            >
                                {device.name}
                            </button>
                        ))
                    )}
                </>
            )}

            {activeMenu === 'quality' && (
                <>
                    {isVOD && (
                        <button
                            onClick={() => onMenuChange('main')}
                            className="flex items-center w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border-b border-gray-700 mb-1"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Back
                        </button>
                    )}
                    <button
                        onClick={() => onVideoLevelChange(-1)}
                        className={`block w-full px-4 py-2 text-left hover:bg-gray-${isVOD ? '800' : '700'} ${currentVideoLevel === -1 ? activeItemClasses : ''}`}
                        data-focusable="true"
                    >
                        Auto
                    </button>
                    {videoLevels.map((level, index) => (
                        <button
                            key={String(level.url) + index}
                            onClick={() => onVideoLevelChange(index)}
                            data-focusable="true"
                            className={`block w-full px-4 py-2 text-left hover:bg-gray-${isVOD ? '800' : '700'} ${currentVideoLevel === index ? activeItemClasses : ''}`}
                        >
                            {level.height}p{isVOD ? '' : ` ${level.bitrate > 0 && `(${(level.bitrate / 1000000).toFixed(1)} Mbps)`}`}
                        </button>
                    ))}
                </>
            )}

            {activeMenu === 'audio' && (
                <>
                    {isVOD && (
                        <button
                            onClick={() => onMenuChange('main')}
                            className="flex items-center w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border-b border-gray-700 mb-1"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Back
                        </button>
                    )}
                    {audioTracks.map((track) => (
                        <button
                            key={track.id}
                            data-focusable="true"
                            onClick={() => onAudioTrackChange(track.id)}
                            className={`block w-full px-4 py-2 text-left hover:bg-gray-${isVOD ? '800' : '700'} ${currentAudioTrack === track.id ? activeItemClasses : ''}`}
                        >
                            {track.name} {track.lang && `(${track.lang})`}
                        </button>
                    ))}
                </>
            )}

            {activeMenu === 'subtitles' && (
                <>
                    {isVOD && (
                        <button
                            onClick={() => onMenuChange('main')}
                            className="flex items-center w-full px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border-b border-gray-700 mb-1"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Back
                        </button>
                    )}
                    <button
                        onClick={() => onSubtitleTrackChange(null)}
                        data-focusable="true"
                        className={`block w-full px-4 py-2 text-left hover:bg-gray-${isVOD ? '800' : '700'} ${currentSubtitleTrack === -1 ? activeItemClasses : ''}`}
                    >
                        Off
                    </button>
                    {subtitleTracks.map((track, i) => (
                        <button
                            data-focusable="true"
                            key={i}
                            onClick={() => onSubtitleTrackChange(track)}
                            className={`block w-full px-4 py-2 text-left hover:bg-gray-${isVOD ? '800' : '700'} ${currentSubtitleTrack === i ? activeItemClasses : ''}`}
                        >
                            {track.label || `Subtitle ${i + 1}`} {track.language && `(${track.language})`}
                        </button>
                    ))}
                </>
            )}
        </div>
    );
});

SettingsMenu.displayName = 'SettingsMenu';
