/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext } from 'react';
import type { MediaProviderAdapter } from '@vidstack/react';
import type { VideoFitMode, MediaPlaylist, SeekOverlayData } from '../types';

// Context State Interface
export interface VideoContextState {
    // Refs
    playerRef: React.MutableRefObject<any | null>;
    playerContainerRef: React.MutableRefObject<HTMLDivElement | null>;
    settingsMenuRef: React.MutableRefObject<HTMLDivElement | null>;
    seekBarRef: React.MutableRefObject<HTMLInputElement | null>;

    // Playback state
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    progress: number;
    buffered: number;
    duration: number;
    currentTime: number;
    seeking: boolean;

    // UI state
    controlsVisible: boolean;
    cursorVisible: boolean;
    copied: boolean;
    isFullscreen: boolean;
    isBuffering: boolean;
    useProxy: boolean;
    hoverTime: number;
    hoverPosition: number;
    isTooltipVisible: boolean;
    focusedIndex: number | null;
    showChannelList: boolean;

    // Seek state
    seekOverlay: SeekOverlayData | null;

    // Settings state
    fitMode: VideoFitMode;
    isSettingsMenuOpen: boolean;
    activeSettingsMenu: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast';

    // Media tracks
    videoLevels: any[];
    audioTracks: MediaPlaylist[];
    subtitleTracks: TextTrack[];
    currentVideoLevel: number;
    currentAudioTrack: number;
    currentSubtitleTrack: number;
    showSettingsButton: boolean;

    // TV specific
    currentProgram: any | null;
    nextProgram: any | null;
    programProgress: number;
    liveTime: string;
    isFavorite: boolean;

    // Recovery state
    retryCount: number;
    reloadTrigger: number;
    isRecovering: boolean;

    // Device
    isTizen: boolean;

    // External Props & Data
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
    favorites?: string[];

    // Cast State
    receivers: any[];
    isReceiver: boolean;

    // External Actions
    onBack: () => void;
    toggleFavorite: (channel: any) => void;
    onNextChannel?: () => void;
    onPrevChannel?: () => void;
    onChannelSelect?: (item: any) => void;
}

// Context Actions Interface
export interface VideoContextActions {
    // Playback actions
    togglePlayPause: () => void;
    handlePlay: () => void;
    handlePause: () => void;

    // Volume actions
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;

    // Seek actions
    handleSeekMouseDown: () => void;
    handleSeekMouseUp: (e: React.MouseEvent<HTMLInputElement>) => void;
    handleSeekTouchEnd: (e: React.TouchEvent<HTMLInputElement>) => void;
    handleSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSeekBarHover: (e: React.MouseEvent<HTMLInputElement>) => void;
    handleSkipButtonClick: (seconds: number) => void;

    // UI actions
    setControlsVisible: (visible: boolean) => void;
    setCursorVisible: (visible: boolean) => void;
    setIsTooltipVisible: (visible: boolean) => void;
    setFocusedIndex: React.Dispatch<React.SetStateAction<number | null>>;
    setShowChannelList: (show: boolean) => void;
    showControlsAndCursor: () => void;

    // Settings actions
    cycleFitMode: () => void;
    toggleSettingsMenu: () => void;
    setActiveSettingsMenu: (menu: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast') => void;
    setIsSettingsMenuOpen: (open: boolean) => void;
    handleVideoLevelChange: (level: number) => void;
    handleAudioTrackChange: (trackId: number) => void;
    handleSubtitleTrackChange: (track: TextTrack | null) => void;

    // Fullscreen actions
    toggleFullscreen: () => void;

    // Other actions
    handleCopyLink: () => void;
    setUseProxy: (use: boolean) => void;
    handleCast: (deviceId: string) => void;

    // Player event handlers
    onProviderChange: (provider: MediaProviderAdapter | null) => void;
    handleCanPlay: () => void;
    handleTimeUpdate: (event: any) => void;
    handleDurationChange: (event: any) => void;
    handlePlayerVolumeChange: (event: any) => void;
    handleWaiting: () => void;
    handlePlaying: () => void;
    handleError: (event: any) => void;
    handleVideoClick: () => void;
    handleMouseMove: () => void;
    toggleChannelList: () => void;
}

// Combined Context Type
export type VideoContextType = VideoContextState & VideoContextActions;

// Create Context
export const VideoContext = createContext<VideoContextType | undefined>(undefined);
