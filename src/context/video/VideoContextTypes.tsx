/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, type RefObject } from 'react';
import type { VideoFitMode, SeekOverlayData } from '@/types';
import type { MediaProviderAdapter } from '@vidstack/react';

export interface VideoContextType {
  // --- Refs ---
  playerRef: RefObject<any>;
  playerContainerRef: RefObject<HTMLDivElement | null>;
  settingsMenuRef: RefObject<HTMLDivElement | null>;

  useProxy: boolean;

  // --- UI States ---
  controlsVisible: boolean;
  cursorVisible: boolean;
  copied: boolean;
  isTooltipVisible: boolean;
  focusedIndex: number | null;
  showChannelList: boolean;
  seekOverlay: SeekOverlayData | null;
  fitMode: VideoFitMode;
  isSettingsMenuOpen: boolean;
  activeSettingsMenu: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast';
  showSettingsButton: boolean;

  // --- Live TV States ---
  currentProgram: any | null;
  nextProgram: any | null;
  programProgress: number;
  liveTime: string;
  isFavorite: boolean;

  // --- System States ---
  retryCount: number;
  reloadTrigger: number;
  isRecovering: boolean;
  isTizen: boolean;

  // --- Data / Props ---
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
  initialPlaybackState?: any;
  channelGroups?: any[];
  favorites: string[];
  recentChannels?: string[];
  receivers: any[];
  isReceiver: boolean;
  refreshReceivers: () => void;

  // --- Actions / App Functions ---
  onBack: () => void;
  toggleFavorite: (channel: any) => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onChannelSelect?: (item: any) => void;

  toggleSettingsMenu: () => void;
  toggleChannelList: () => void;

  setControlsVisible: (v: boolean) => void;
  setCursorVisible: (v: boolean) => void;
  setIsTooltipVisible: (v: boolean) => void;
  setFocusedIndex: (i: number | null) => void;
  setShowChannelList: (v: boolean) => void;
  showControlsAndCursor: () => void;
  cycleFitMode: () => void;
  setActiveSettingsMenu: (
    menu: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast'
  ) => void;
  setIsSettingsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setUseProxy: (v: boolean) => void;
  handleSkipButtonClick: (seconds: number) => void;

  // --- Vidstack Native Event Handlers ---
  handleCanPlay: () => void;
  handleTimeUpdate: (e?: any) => void;
  handleError: (e: any) => void;
  handleEnded: () => void;
  handleVideoClick: () => void;
  handleMouseMove: () => void;
  onProviderChange: (provider: MediaProviderAdapter | null) => void;
  handleCast: (deviceId: string) => void;
  handleCopyLink: () => void;
}

// Create and export the Context
export const VideoContext = createContext<VideoContextType | undefined>(
  undefined
);
