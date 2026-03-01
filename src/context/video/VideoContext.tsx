/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { formatTime, isTizenDevice } from '@/utils/helpers';
import { isHLSProvider, type MediaProviderAdapter } from '@vidstack/react';
import { toast } from 'react-toastify';
import { URL_PATHS } from '@/services/api';
import type { VideoFitMode, MediaPlaylist, SeekOverlayData } from '@/types';
import { VideoContext, type VideoContextType } from '@/context/video/VideoContextTypes';


// Provider Props
interface VideoProviderProps {
    children: ReactNode;
    // External props that come from parent
    streamUrl?: string | null;
    rawStreamUrl?: string | null;
    itemId?: string | null;
    contentType: 'movie' | 'series' | 'tv';
    mediaId?: string | null;
    item?: any;
    seriesItem?: any;
    channelInfo?: any;
    previewChannelInfo?: any;
    epgData?: any;
    channels?: any[];
    channelGroups?: any[];
    onNextChannel?: () => void;
    onPrevChannel?: () => void;
    onChannelSelect?: (item: any) => void;
    favorites: string[];
    recentChannels?: string[];
    toggleFavorite: (channel: any) => void;
    initialPlaybackState?: any;
    onEnded?: () => void;
    onBack: () => void;
    receivers?: any[];
    isReceiver?: boolean;
    castTo?: (deviceId: string, media: any, state: any) => void;
    refreshReceivers?: () => void;
}

// Provider Component
export const VideoProvider: React.FC<VideoProviderProps> = ({
    children,
    streamUrl,
    rawStreamUrl,
    contentType,
    mediaId,
    item,
    seriesItem,
    itemId,
    channelInfo,
    previewChannelInfo,
    epgData,
    channels,
    channelGroups,
    onNextChannel,
    onPrevChannel,
    onChannelSelect,
    favorites,
    recentChannels,
    toggleFavorite,
    initialPlaybackState,
    onBack,
    receivers,
    isReceiver,
    castTo,
    refreshReceivers,
}) => {
    const isTizen = isTizenDevice();

    // Refs
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const settingsMenuRef = useRef<HTMLDivElement>(null);
    const seekBarRef = useRef<HTMLInputElement>(null);
    const playerRef = useRef<any | null>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seekRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seekRunStart = useRef<number | null>(null);
    const seekRunLevel = useRef<number>(0);
    const seekRunDirection = useRef<number>(0);
    const hasRestoredProgress = useRef(false);
    const isRetrying = useRef(false);

    const SEEK_LEVELS = useMemo(() => [10, 30, 60, 180], []);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [buffered] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [seeking, setSeeking] = useState(false);

    // UI state
    const [controlsVisible, setControlsVisible] = useState(true);
    const [cursorVisible, setCursorVisible] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [useProxy, setUseProxy] = useState(isTizenDevice() ? false : true);
    const [hoverTime, setHoverTime] = useState(0);
    const [hoverPosition, setHoverPosition] = useState(0);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [showChannelList, setShowChannelList] = useState(false);

    // Seek state
    const [seekOverlay, setSeekOverlay] = useState<SeekOverlayData | null>(null);

    // Settings state
    const [fitMode, setFitMode] = useState<VideoFitMode>(() => {
        return (localStorage.getItem('videoFitMode') as VideoFitMode) || 'contain';
    });
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [activeSettingsMenu, setActiveSettingsMenu] = useState<'main' | 'quality' | 'audio' | 'subtitles' | 'cast'>('main');

    // Media tracks
    const [videoLevels] = useState<any[]>([]);
    const [audioTracks] = useState<MediaPlaylist[]>([]);
    const [subtitleTracks, setSubtitleTracks] = useState<TextTrack[]>([]);
    const [currentVideoLevel, setCurrentVideoLevel] = useState(-1);
    const [currentAudioTrack] = useState(-1);
    const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);

    // TV specific
    const [currentProgram, setCurrentProgram] = useState<any | null>(null);
    const [nextProgram, setNextProgram] = useState<any | null>(null);
    const [programProgress, setProgramProgress] = useState(0);
    const [liveTime, setLiveTime] = useState('');

    // Recovery state
    const [retryCount, setRetryCount] = useState(0);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [isRecovering, setIsRecovering] = useState(false);
    const [seekOffset] = useState(0);

    const isFavorite = channelInfo ? favorites.includes(channelInfo.id) : false;
    const showSettingsButton =
        videoLevels.length > 1 ||
        audioTracks.length > 1 ||
        subtitleTracks.length > 0;

    // Live clock for TV
    useEffect(() => {
        if (contentType !== 'tv') return;

        const updateLiveTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setLiveTime(`${hours}:${minutes}`);
        };

        updateLiveTime();
        const interval = setInterval(updateLiveTime, 1000);
        return () => clearInterval(interval);
    }, [contentType]);

    // Persist fitMode
    useEffect(() => {
        localStorage.setItem('videoFitMode', fitMode);
    }, [fitMode]);

    // Show controls and cursor
    const showControlsAndCursor = useCallback(() => {
        setControlsVisible(true);
        setCursorVisible(true);

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (cursorTimeoutRef.current) {
            clearTimeout(cursorTimeoutRef.current);
        }

        controlsTimeoutRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3000);

        cursorTimeoutRef.current = setTimeout(() => {
            setCursorVisible(false);
        }, 3000);
    }, []);

    // Playback actions
    const togglePlayPause = useCallback(() => {
        const player = playerRef.current;
        if (player) {
            try {
                // Check if player state is available/ready if needed, but simple null check usually enough
                if (player.paused) {
                    player.play();
                } else {
                    player.pause();
                }
            } catch (error) {
                console.error("Error toggling play/pause:", error);
            }
        }
    }, [playerRef]);

    const handlePlay = useCallback(() => {
        setIsPlaying(true);
    }, []);

    const handlePause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    // Volume actions
    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const player = playerRef.current;
        const newVolume = parseFloat(e.target.value);

        if (player) {
            player.volume = newVolume;
            player.muted = (newVolume === 0);
        }

        // React state-ah update panna thaan UI (slider & icon) udane maarum!
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    }, [setVolume, setIsMuted]); // Dependencies add pannikonga

    const toggleMute = useCallback(() => {
        const player = playerRef.current;
        if (player) {
            const nextMuted = !player.muted;
            player.muted = nextMuted;
            setIsMuted(nextMuted);

            // Unmute aagum bodhu (nextMuted === false) AND volume 0-la irundha mattum 1-ku mathanum
            if (!nextMuted && player.volume === 0) {
                player.volume = 1;
                setVolume(1);
            }
        }
    }, [setIsMuted, setVolume]);

    // Seek actions
    const handleSeekMouseDown = useCallback(() => {
        if (contentType === 'tv') return;
        setSeeking(true);
    }, [contentType]);

    const handleSeekTouchEnd = useCallback((e: React.TouchEvent<HTMLInputElement>) => {
        if (contentType === 'tv') return;
        setSeeking(false);
        const player = playerRef.current;
        if (!player) return; // Guard clause

        const currentDuration = Number.isFinite(player.duration) ? player.duration : duration;

        if (currentDuration > 0) {
            const seekTime = (Number((e.target as HTMLInputElement).value) / 100) * (currentDuration + seekOffset);
            player.currentTime = seekTime;
        }
    }, [contentType, duration, seekOffset]);

    const handleSeekMouseUp = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        if (contentType === 'tv') return;
        setSeeking(false);
        const player = playerRef.current;
        if (!player) return; // Guard clause

        const currentDuration = Number.isFinite(player.duration) ? player.duration : duration;

        if (currentDuration > 0) {
            const seekTime = (Number((e.currentTarget as HTMLInputElement).value) / 100) * (currentDuration + seekOffset);
            player.currentTime = seekTime;
        }
    }, [contentType, duration, seekOffset]);

    const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (contentType === 'tv') return;
        setProgress(Number(e.target.value));
    }, [contentType]);

    const handleSeekBarHover = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        if (contentType === 'tv') return;
        const player = playerRef.current;
        const currentDuration = (player && Number.isFinite(player.duration)) ? player.duration : duration;

        if (player && currentDuration > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const time = percentage * currentDuration;
            setHoverTime(time);
            setHoverPosition(x);
        }
    }, [contentType, duration]);

    const handleSkipButtonClick = useCallback((seconds: number) => {
        const player = playerRef.current;
        if (!player) return;

        const direction = seconds > 0 ? 1 : -1;
        const currentDuration = Number.isFinite(player.duration) ? player.duration : duration;

        if (seekRunTimer.current) {
            clearTimeout(seekRunTimer.current);
        }

        if (seekRunStart.current === null) {
            seekRunStart.current = player.currentTime;
            seekRunLevel.current = 0;
            seekRunDirection.current = direction;
        } else if (seekRunDirection.current !== direction) {
            seekRunStart.current = player.currentTime;
            seekRunLevel.current = 0;
            seekRunDirection.current = direction;
        } else {
            seekRunLevel.current += 1;
        }

        let offset;
        const maxLevelIndex = SEEK_LEVELS.length - 1;
        if (seekRunLevel.current <= maxLevelIndex) {
            offset = SEEK_LEVELS[seekRunLevel.current];
        } else {
            const baseOffset = SEEK_LEVELS[maxLevelIndex];
            const extraSteps = seekRunLevel.current - maxLevelIndex;
            offset = baseOffset + (extraSteps * 60);
        }

        const totalDelta = offset * direction;
        const targetTime = Math.max(0, Math.min(currentDuration, seekRunStart.current! + totalDelta));

        player.currentTime = targetTime;

        const newProgress = (targetTime / currentDuration) * 100;
        setProgress(newProgress);
        setCurrentTime(targetTime);

        const sign = direction > 0 ? '+' : '-';
        setSeekOverlay({
            visible: true,
            text: `${sign}${offset}s`,
            time: formatTime(targetTime)
        });

        seekRunTimer.current = setTimeout(() => {
            seekRunStart.current = null;
            seekRunLevel.current = 0;
            setSeekOverlay(null);
        }, 1500);
    }, [duration, SEEK_LEVELS]);

    // Settings actions
    const cycleFitMode = useCallback(() => {
        const FIT_MODES: VideoFitMode[] = ['contain', 'cover', 'fill'];
        setFitMode((currentMode) => {
            const currentIndex = FIT_MODES.indexOf(currentMode);
            const nextIndex = (currentIndex + 1) % FIT_MODES.length;
            return FIT_MODES[nextIndex];
        });
    }, []);

    const toggleSettingsMenu = useCallback(() => {
        if (isSettingsMenuOpen) {
            setIsSettingsMenuOpen(false);
            setActiveSettingsMenu('main');
        } else {
            setIsSettingsMenuOpen(true);
        }
    }, [isSettingsMenuOpen]);

    const handleVideoLevelChange = useCallback((levelIndex: number) => {
        setCurrentVideoLevel(levelIndex);
        console.warn("Quality selection not implemented for Vidstack yet");
        setActiveSettingsMenu('main');
        setIsSettingsMenuOpen(false);
    }, []);

    const handleAudioTrackChange = useCallback(() => {
        console.warn("Audio track selection not implemented for Vidstack yet");
        setActiveSettingsMenu('main');
        setIsSettingsMenuOpen(false);
    }, []);

    const handleSubtitleTrackChange = useCallback((track: TextTrack | null) => {
        const player = playerRef.current;
        if (!player) return;

        for (const t of player.state.textTracks) {
            if (t.kind === 'subtitles' || t.kind === 'captions') {
                t.mode = 'disabled';
            }
        }

        if (track) {
            track.mode = 'showing';
        }

        setActiveSettingsMenu('main');
        setIsSettingsMenuOpen(false);
    }, []);

    // Fullscreen
    const toggleFullscreen = useCallback(async () => {
        const elem = playerContainerRef.current;
        if (elem) {
            if (!document.fullscreenElement) {
                try {
                    await elem.requestFullscreen();
                    if (screen.orientation && 'lock' in screen.orientation) {
                        // @ts-expect-error - Screen Orientation API types not fully supported
                        screen.orientation.lock('landscape').catch((e) => {
                            console.warn("Orientation lock failed:", e);
                        });
                    }
                } catch (err: any) {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                }
            } else {
                if (screen.orientation && 'unlock' in screen.orientation) {
                    screen.orientation.unlock();
                }
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    }, []);

    // Other actions
    const handleCopyLink = useCallback(async () => {
        if (rawStreamUrl) {
            try {
                await navigator.clipboard.writeText(rawStreamUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
                const tempInput = document.createElement('textarea');
                tempInput.value = rawStreamUrl;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    }, [rawStreamUrl]);

    const handleCast = useCallback((deviceId: string) => {
        if (!item && !previewChannelInfo && !channelInfo) return;
        const mediaItem = item || previewChannelInfo || channelInfo;

        const baseUrl = URL_PATHS.HOST || window.location.origin;

        const absoluteUrl = streamUrl && streamUrl.startsWith('http')
            ? streamUrl
            : streamUrl ? `${baseUrl}${streamUrl.startsWith('/') ? '' : '/'}${streamUrl}` : undefined;

        const absoluteRawUrl = rawStreamUrl && rawStreamUrl.startsWith('http')
            ? rawStreamUrl
            : rawStreamUrl ? `${baseUrl}${rawStreamUrl.startsWith('/') ? '' : '/'}${rawStreamUrl}` : undefined;

        if (castTo) {
            castTo(deviceId, {
                media: mediaItem,
                streamUrl: absoluteUrl,
                rawStreamUrl: absoluteRawUrl
            }, {
                currentTime: playerRef.current?.currentTime || 0,
                volume: 1,
                muted: isMuted,
                subtitleTrackIndex: currentSubtitleTrack,
                audioTrackIndex: currentAudioTrack
            });
        }

        toast.success('Casting started...');
        setIsSettingsMenuOpen(false);
        setActiveSettingsMenu('main');
    }, [item, previewChannelInfo, channelInfo, streamUrl, rawStreamUrl, volume, isMuted, currentSubtitleTrack, currentAudioTrack, castTo]);

    const handleVideoClick = useCallback(() => {
        const wereControlsHidden = !controlsVisible;
        showControlsAndCursor();
        if (!wereControlsHidden) {
            togglePlayPause();
        }
    }, [controlsVisible, showControlsAndCursor, togglePlayPause]);

    const handleMouseMove = useCallback(() => {
        showControlsAndCursor();
    }, [showControlsAndCursor]);

    const toggleChannelList = useCallback(() => {
        const wereControlsHidden = !controlsVisible;
        showControlsAndCursor();
        if (!wereControlsHidden) {
            setShowChannelList(true);
        }
    }, [controlsVisible, showControlsAndCursor]);

    // Player event handlers
    const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
        if (isHLSProvider(provider)) {
            console.log('[VideoPlayer] HLS provider loaded');
        }
    }, []);

    const handleCanPlay = useCallback(() => {
        const player = playerRef.current;
        if (!player) return;

        setIsBuffering(false);
        setIsRecovering(false);
        isRetrying.current = false;

        // Volume and Mute restoration
        if (initialPlaybackState) {
            if (initialPlaybackState.volume !== undefined) {
                player.volume = initialPlaybackState.volume;
                setVolume(initialPlaybackState.volume);
            }
            if (initialPlaybackState.muted !== undefined) {
                player.muted = initialPlaybackState.muted;
                setIsMuted(initialPlaybackState.muted);
            }
        }
    }, [initialPlaybackState, setVolume, setIsMuted, playerRef]);

    const handleTimeUpdate = useCallback((event: any) => {
        const time = typeof event?.detail === 'number'
            ? event.detail
            : event?.target?.currentTime ?? playerRef.current?.currentTime ?? 0;

        const dur = playerRef.current?.state?.duration ?? playerRef.current?.duration ?? duration;

        setCurrentTime(time);

        // 1. Restore Logic (Existing)
        if (initialPlaybackState && !hasRestoredProgress.current && time >= 1) {
            hasRestoredProgress.current = true;
            const targetTime = initialPlaybackState.currentTime;
            if (targetTime && targetTime > 2 && playerRef.current) {
                playerRef.current.currentTime = targetTime;
            }
        }

        // 2. Progress Update (UI)
        if (dur > 0 && !seeking) {
            const prog = (time / dur) * 100;
            setProgress(prog);
        }
    }, [duration, seeking, contentType, mediaId, itemId, item, initialPlaybackState]);

    const handleDurationChange = useCallback((event: any) => {
        // Vidstack passes duration in event.detail
        const newDuration = typeof event?.detail === 'number'
            ? event.detail
            : event?.target?.duration ?? playerRef.current?.duration;

        if (Number.isFinite(newDuration) && newDuration > 0) {
            setDuration(newDuration);
        }
    }, []);

    const handlePlayerVolumeChange = useCallback((event: any) => {
        const player = event.target;
        if (player) {
            setVolume(player.volume);
            setIsMuted(player.muted);
        }
    }, []);

    const handleWaiting = useCallback(() => {
        setIsBuffering(true);
    }, []);

    const handlePlaying = useCallback(() => {
        setIsBuffering(false);
    }, []);

    const handleError = useCallback((event: any) => {
        console.error('[VideoPlayer] Error:', event);

        if (isRetrying.current) {
            console.log('[VideoPlayer] Already retrying, ignoring error');
            return;
        }

        const error = event.detail;
        const errorCode = error?.code;
        const errorMessage = error?.message || 'Unknown error';

        console.log(`[VideoPlayer] Error code: ${errorCode}, message: ${errorMessage}`);

        // Check for 404 / component failure
        if (errorCode === 4 || errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('500') || errorMessage.includes('Not Found')) {
            // SPECIAL HANDLING FOR TV: Retry on 404 up to 10 times to allow server-side resolution
            if (contentType === 'tv' && retryCount < 10) {
                console.log(`[VideoPlayer] 404 detected on Live TV. Retrying... (${retryCount + 1}/10)`);
                // Fall through to the retry logic below
            } else {
                // Immediate fail for VOD or if retries exhausted
                toast.error('Stream not found. Please try another source.');
                isRetrying.current = false;
                return;
            }
        }

        if (retryCount < 10) {
            isRetrying.current = true;
            setIsRecovering(true);

            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);

            setTimeout(() => {
                console.log(`[VideoPlayer] Retrying... (${retryCount + 1}/3)`);
                setRetryCount(prev => prev + 1);
                setReloadTrigger(prev => prev + 1);
            }, delay);
        } else {
            toast.error('Failed to load stream after multiple attempts');
            isRetrying.current = false;
            setIsRecovering(false);
        }
    }, [retryCount, contentType]);

    const handleEnded = useCallback(() => {


        const completedData = {
            mediaId,
            itemId,
            type: contentType,
            title: item?.name || item?.title || '',
            timestamp: Date.now()
        };

        localStorage.setItem(`video-completed-${mediaId}`, JSON.stringify(completedData));
        if (itemId && itemId !== mediaId) {
            localStorage.setItem(`video-completed-${itemId}`, JSON.stringify(completedData));
        }
    }, [contentType, mediaId, itemId, item]);

    // EPG updates for TV
    useEffect(() => {
        if (contentType !== 'tv' || !channelInfo || !epgData) return;

        const updateEPG = () => {
            const now = Date.now();
            const programs = epgData[channelInfo.id] || [];

            const current = programs.find((p: any) => {
                const start = new Date(p.start).getTime();
                const end = new Date(p.end).getTime();
                return now >= start && now < end;
            });

            setCurrentProgram(current || null);

            if (current) {
                const start = new Date(current.start).getTime();
                const end = new Date(current.end).getTime();
                const totalDuration = end - start;
                const elapsed = now - start;
                const progress = (elapsed / totalDuration) * 100;
                setProgramProgress(Math.min(100, Math.max(0, progress)));

                const nextProg = programs.find((p: any) => {
                    const pStart = new Date(p.start).getTime();
                    return pStart >= end;
                });
                setNextProgram(nextProg || null);
            }
        };

        updateEPG();
        const interval = setInterval(updateEPG, 10000);
        return () => clearInterval(interval);
    }, [contentType, channelInfo, epgData]);

    // Sync tracks with player
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        return player.subscribe(({ textTracks }: { textTracks: any }) => {
            const subs = Array.from(textTracks as any[]).filter((t: any) => t.kind === 'subtitles' || t.kind === 'captions');
            setSubtitleTracks(subs as TextTrack[]);

            const activeIndex = subs.findIndex((t: any) => t.mode === 'showing');
            setCurrentSubtitleTrack(activeIndex);

            if (initialPlaybackState?.subtitleTrackIndex !== undefined && initialPlaybackState.subtitleTrackIndex !== -1) {
                if (subs[initialPlaybackState.subtitleTrackIndex]) {
                    const targetTrack = subs[initialPlaybackState.subtitleTrackIndex] as TextTrack;
                    if (targetTrack.mode !== 'showing') {
                        subs.forEach((t: any) => { if (t !== targetTrack) t.mode = 'disabled'; });
                        targetTrack.mode = 'showing';
                        console.log(`[Cast] Auto-enabled subtitle track ${initialPlaybackState.subtitleTrackIndex}`);
                    }
                }
            }
        });
    }, [initialPlaybackState]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Show controls on preview channel
    useEffect(() => {
        if (previewChannelInfo) {
            showControlsAndCursor();
        }
    }, [previewChannelInfo, showControlsAndCursor]);

    // Context value
    const value: VideoContextType = {
        // Refs
        playerRef,
        playerContainerRef,
        settingsMenuRef,
        seekBarRef,

        // State
        isPlaying,
        isMuted,
        volume,
        progress,
        buffered,
        duration,
        currentTime,
        seeking,
        controlsVisible,
        cursorVisible,
        copied,
        isFullscreen,
        isBuffering,
        useProxy,
        hoverTime,
        hoverPosition,
        isTooltipVisible,
        focusedIndex,
        showChannelList,
        seekOverlay,
        fitMode,
        isSettingsMenuOpen,
        activeSettingsMenu,
        videoLevels,
        audioTracks,
        subtitleTracks,
        currentVideoLevel,
        currentAudioTrack,
        currentSubtitleTrack,
        showSettingsButton,
        currentProgram,
        nextProgram,
        programProgress,
        liveTime,
        isFavorite,
        retryCount,
        reloadTrigger,
        isRecovering,
        isTizen,

        // External Props & Data
        streamUrl,
        rawStreamUrl,
        itemId,
        contentType,
        mediaId,
        item,
        seriesItem,
        channelInfo,
        previewChannelInfo,
        epgData,
        channels,
        initialPlaybackState,
        channelGroups,
        favorites,
        recentChannels,

        // Cast State
        receivers: receivers || [], // Fallback if undefined
        isReceiver: isReceiver || false, // Fallback if undefined
        refreshReceivers: refreshReceivers || (() => { }), // Fallback if undefined

        // External Actions
        onBack,
        toggleFavorite,
        onNextChannel,
        onPrevChannel,
        onChannelSelect,

        // Actions
        togglePlayPause,
        handlePlay,
        handlePause,
        handleVolumeChange,
        toggleMute,
        handleSeekMouseDown,
        handleSeekMouseUp,
        handleSeekTouchEnd,
        handleSeekChange,
        handleSeekBarHover,
        handleSkipButtonClick,
        setControlsVisible,
        setCursorVisible,
        setIsTooltipVisible,
        setFocusedIndex,
        setShowChannelList,
        showControlsAndCursor,
        cycleFitMode,
        toggleSettingsMenu,
        setActiveSettingsMenu,
        setIsSettingsMenuOpen,
        handleVideoLevelChange,
        handleAudioTrackChange,
        handleSubtitleTrackChange,
        toggleFullscreen,
        handleCopyLink,
        setUseProxy,
        handleCast,
        onProviderChange,
        handleCanPlay,
        handleTimeUpdate,
        handleDurationChange,
        handlePlayerVolumeChange,
        handleWaiting,
        handlePlaying,
        handleError,
        handleEnded,
        handleVideoClick,
        handleMouseMove,
        toggleChannelList,
    };

    return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
};
