/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';

import TvChannelList, { type TvChannelListRef } from '@/components/organisms/TvChannelList';
import '@/components/organisms/VideoPlayerContent.css';

// Import components
import { BufferingOverlay } from '@/components/molecules/BufferingOverlay';
import { SeekOverlay } from '@/components/molecules/SeekOverlay';
import { TopBar } from '@/components/organisms/TopBar';
import { TVControls } from '@/components/organisms/TVControls';
import { VODControls } from '@/components/organisms/VODControls';
import { useVideoContext } from '@/context/video/useVideoContext';

const VideoPlayerContent: React.FC = () => {
    const {
        // Refs
        playerRef,
        playerContainerRef,
        settingsMenuRef,

        // State
        controlsVisible,
        cursorVisible,
        isBuffering,
        focusedIndex,
        showChannelList,
        seekOverlay,
        fitMode,
        isSettingsMenuOpen,
        activeSettingsMenu,

        // Data
        streamUrl,
        rawStreamUrl,
        contentType,
        itemId,
        item,
        seriesItem,
        channels,
        previewChannelInfo,
        channelInfo,
        channelGroups,
        retryCount,
        reloadTrigger,
        isRecovering,

        // Actions
        togglePlayPause,
        handlePlay,
        handlePause,
        toggleFavorite,
        toggleFullscreen,

        // Player handlers
        onProviderChange,
        handleCanPlay,
        handleTimeUpdate,
        handleDurationChange,
        handlePlayerVolumeChange,
        handleWaiting,
        handlePlaying,
        handleError,
        handleVideoClick,
        handleMouseMove,
        toggleChannelList,

        // UI Actions
        setControlsVisible,
        setCursorVisible,
        setIsTooltipVisible,
        setFocusedIndex,
        setShowChannelList,
        showControlsAndCursor,

        // Seek Actions
        handleSkipButtonClick,

        // Navigation Actions
        onPrevChannel,
        onNextChannel,
        onChannelSelect,
        onBack,

    } = useVideoContext();

    const cursorTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const tvChannelListRef = React.useRef<TvChannelListRef>(null);

    // Keyboard navigation
    useEffect(() => {
        const handlePlayerControlsKeyDown = (e: KeyboardEvent) => {
            const focusable = Array.from(
                playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') || []
            ) as HTMLElement[];
            if (focusable.length === 0) return;

            const currentIndex = focusedIndex === null ? 0 : focusedIndex;
            const focusedElement = focusable[currentIndex];

            switch (e.keyCode) {
                case 37: // LEFT
                    e.preventDefault();
                    if (
                        contentType === 'tv' &&
                        focusedElement &&
                        focusedElement.getAttribute('data-control') !== 'seekbar'
                    ) {
                        onPrevChannel?.();
                        showControlsAndCursor();
                    } else if (
                        focusedElement &&
                        focusedElement.getAttribute('data-control') === 'seekbar'
                    ) {
                        handleSkipButtonClick(-10);
                    } else if (currentIndex > 0) {
                        setFocusedIndex(currentIndex - 1);
                    }
                    break;
                case 39: // RIGHT
                    e.preventDefault();
                    if (
                        contentType === 'tv' &&
                        focusedElement &&
                        focusedElement.getAttribute('data-control') !== 'seekbar'
                    ) {
                        onNextChannel?.();
                        showControlsAndCursor();
                    } else if (
                        focusedElement &&
                        focusedElement.getAttribute('data-control') === 'seekbar'
                    ) {
                        handleSkipButtonClick(10);
                    } else if (currentIndex < focusable.length - 1) {
                        setFocusedIndex(currentIndex + 1);
                    }
                    break;
                case 38: // UP
                    e.preventDefault();
                    if (currentIndex > 0) {
                        setFocusedIndex(currentIndex - 1);
                    }
                    break;
                case 40: // DOWN
                    e.preventDefault();
                    if (currentIndex < focusable.length - 1) {
                        setFocusedIndex(currentIndex + 1);
                    }
                    break;
                case 13: // ENTER
                    e.preventDefault();
                    if (focusedElement) {
                        focusedElement.click();
                    }
                    break;
                case 415: // PLAY
                case 19: // PAUSE
                case 10252: // PLAY/PAUSE (Tizen)
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 412: // PREVIOUS
                    e.preventDefault();
                    if (contentType === 'tv') {
                        onPrevChannel?.();
                    } else {
                        handleSkipButtonClick(-30);
                    }
                    break;
                case 417: // NEXT
                    e.preventDefault();
                    if (contentType === 'tv') {
                        onNextChannel?.();
                    } else {
                        handleSkipButtonClick(30);
                    }
                    break;
                case 427: // ChannelUp (Tizen)
                    e.preventDefault();
                    if (contentType === 'tv') {
                        onPrevChannel?.();
                    }
                    break;
                case 428: // ChannelDown (Tizen)
                    e.preventDefault();
                    if (contentType === 'tv') {
                        onNextChannel?.();
                    }
                    break;
                case 405: // ColorF2Yellow
                    e.preventDefault();
                    if (contentType === 'tv' && channelInfo) {
                        toggleFavorite(channelInfo);
                    }
                    break;
                case 10073: // CH_LIST (Tizen)
                    e.preventDefault();
                    if (contentType === 'tv') {
                        toggleChannelList();
                    }
                    break;
                case 0: // BACK on some devices
                case 10009: // RETURN on Tizen
                case 8: // BACK
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        toggleFullscreen();
                    } else {
                        onBack();
                    }
                    break;
                default:
                    break;
            }
        };

        const handleSettingsMenuKeyDown = (e: KeyboardEvent) => {
            const focusable = Array.from(
                settingsMenuRef.current?.querySelectorAll('[data-focusable="true"]') || []
            ) as HTMLElement[];
            if (focusable.length === 0) return;

            let currentIndex = focusedIndex === null ? 0 : focusedIndex;
            if (currentIndex < 0) currentIndex = 0;

            switch (e.keyCode) {
                case 38: // UP
                    e.preventDefault();
                    setFocusedIndex((prev) =>
                        prev !== null && prev > 0 ? prev - 1 : focusable.length - 1
                    );
                    break;
                case 40: // DOWN
                    e.preventDefault();
                    setFocusedIndex((prev) =>
                        prev !== null && prev < focusable.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 13: // ENTER
                    e.preventDefault();
                    if (focusable[currentIndex]) {
                        focusable[currentIndex].click();
                    }
                    break;
                case 0: // BACK on some devices
                case 10009: // RETURN on Tizen
                case 8: // BACK
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        toggleFullscreen();
                    } else {
                        onBack();
                    }
                    break;
                default:
                    break;
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // First pass for Global Color Keys that should ALWAYS work
            if (e.keyCode === 405 && contentType === 'tv' && channelInfo) { // Yellow = Toggle Fav
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(channelInfo);
                return;
            } else if (e.keyCode === 10073) { // CH_LIST
                e.preventDefault();
                e.stopPropagation();
                if (contentType === 'tv') {
                    toggleChannelList();
                }
                return;
            }

            if (showChannelList) {
                // When channel list is open, we stop propagation here UNLESS it's a color key
                // but the critical color keys were already caught above
                e.stopPropagation();
                if (tvChannelListRef.current) {
                    tvChannelListRef.current.handleKeyDown(e);
                }
                return;
            }

            const wereControlsHidden = !controlsVisible;
            showControlsAndCursor();
            e.stopPropagation();
            if (wereControlsHidden) {
                return;
            }
            if (isSettingsMenuOpen) {
                handleSettingsMenuKeyDown(e);
            } else {
                handlePlayerControlsKeyDown(e);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        focusedIndex,
        isSettingsMenuOpen,
        showChannelList,
        togglePlayPause,
        showControlsAndCursor,
        handleSkipButtonClick,
        contentType,
        onPrevChannel,
        onNextChannel,
        controlsVisible,
        channelInfo,
        toggleFavorite,
        onBack,
        toggleFullscreen
    ]);

    // Focus management - duplicated from VideoPlayer because it relies on useEffect local to the DOM output
    useEffect(() => {
        if (showChannelList || isSettingsMenuOpen) return;
        const focusable = Array.from(
            playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') || []
        ) as HTMLElement[];
        if (focusable.length === 0) return;

        const newIndex = focusedIndex === null ? 0 : focusedIndex;
        if (newIndex >= focusable.length) {
            setFocusedIndex(focusable.length - 1);
            return;
        }

        if (focusedIndex === null) {
            setFocusedIndex(0);
        }

        focusable.forEach((el, index) => {
            if (index === newIndex) {
                el.classList.add('focused');
                el.focus();
            } else {
                el.classList.remove('focused');
            }
        });
    }, [focusedIndex, isSettingsMenuOpen, showChannelList]);

    useEffect(() => {
        if (!isSettingsMenuOpen || showChannelList) return;

        const focusable = Array.from(
            settingsMenuRef.current?.querySelectorAll('[data-focusable="true"]') || []
        ) as HTMLElement[];
        if (focusable.length === 0) return;

        const newIndex = focusedIndex === null ? 0 : focusedIndex;
        if (newIndex >= focusable.length) {
            setFocusedIndex(focusable.length - 1);
            return;
        }

        focusable.forEach((el, index) => {
            if (index === newIndex) {
                el.classList.add('focused');
                el.focus();
            } else {
                el.classList.remove('focused');
            }
        });
    }, [focusedIndex, isSettingsMenuOpen, activeSettingsMenu, showChannelList]);

    return (
        <div
            className="h-[100dvh] w-full bg-black"
            data-focusable="true"
            tabIndex={-1}
            style={{ '--video-fit-mode': fitMode } as React.CSSProperties}
        >
            <div
                ref={playerContainerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                    setIsTooltipVisible(false);
                    setControlsVisible(false);
                    setCursorVisible(false);
                    if (cursorTimeoutRef.current) {
                        clearTimeout(cursorTimeoutRef.current);
                    }
                }}
                className={`group relative h-full w-full overflow-hidden ${!cursorVisible && !controlsVisible ? 'cursor-none' : ''}`}
            >
                {/* Channel List Overlay */}
                {showChannelList &&
                    contentType === 'tv' &&
                    channels &&
                    onChannelSelect && (
                        <TvChannelList
                            ref={tvChannelListRef}
                            channels={channels}
                            channelGroups={channelGroups || []}
                            onChannelSelect={(item) => {
                                if (onChannelSelect) onChannelSelect(item);
                                setShowChannelList(false);
                            }}
                            onBack={() => setShowChannelList(false)}
                            currentItemId={itemId}
                            isOverlay={true}
                        />
                    )}



                {isRecovering ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-950/90 text-white backdrop-blur-md">
                        {/* Animated Rings Container */}
                        <div className="relative mb-8 h-20 w-20">
                            {/* Outer expanding ring for depth */}
                            <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>

                            {/* Inner pulsing glow */}
                            <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/30 blur-md"></div>

                            {/* Multi-colored smooth spinner */}
                            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-blue-500 border-r-indigo-500 animate-spin"></div>

                            {/* Center glowing dot */}
                            <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col items-center space-y-2 text-center">
                            <div className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                Connecting<span className="animate-pulse">...</span>
                            </div>

                            <div className="text-sm font-medium tracking-wide transition-colors duration-300">
                                {retryCount > 0 ? (
                                    <span className="text-amber-400/90">
                                        Retrying connection ({retryCount})...
                                    </span>
                                ) : (
                                    <span className="text-gray-400">
                                        Establishing secure stream
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <MediaPlayer
                        key={reloadTrigger}
                        className="h-full w-full media-provider"
                        title={item?.title || seriesItem?.title || channelInfo?.name || 'Video'}
                        src={
                            (() => {
                                const url = (streamUrl ?? rawStreamUrl) || '';
                                const isHls = url.includes('.m3u8') || url.includes('m3u8');
                                return isHls ? { src: url, type: 'application/x-mpegurl' } : url;
                            })()
                        }
                        viewType="video"
                        streamType={contentType === 'tv' ? 'live' : 'on-demand'}
                        logLevel="warn"
                        crossOrigin
                        playsInline
                        autoplay
                        load="eager"
                        ref={playerRef}
                        onProviderChange={onProviderChange}
                        onCanPlay={handleCanPlay}
                        onTimeUpdate={handleTimeUpdate}
                        onDurationChange={handleDurationChange}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onVolumeChange={handlePlayerVolumeChange}
                        onWaiting={handleWaiting}
                        onPlaying={handlePlaying}
                        onError={handleError}
                        onEnded={() => { }}
                        onClick={handleVideoClick}
                        onDoubleClick={toggleFullscreen}
                    >
                        <MediaProvider />
                    </MediaPlayer>
                )}

                {previewChannelInfo && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                        <div className="rounded-lg bg-black bg-opacity-75 p-6 shadow-xl">
                            <h2 className="text-center text-5xl font-bold text-white">
                                {previewChannelInfo.number}
                            </h2>
                            <h3 className="mt-2 text-center text-2xl text-gray-200">
                                {previewChannelInfo.name}
                            </h3>
                        </div>
                    </div>
                )}

                <BufferingOverlay />

                <div
                    className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible || isBuffering ? 'opacity-100' : 'opacity-0'}`}
                >
                    <TopBar onBack={onBack} />

                    {contentType === 'tv' ? (
                        <TVControls />
                    ) : (
                        <>
                            <SeekOverlay seekOverlay={seekOverlay} />
                            <VODControls />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoPlayerContent;
