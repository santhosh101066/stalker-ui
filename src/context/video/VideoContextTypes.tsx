/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext } from 'react';
import type { MediaProviderAdapter } from '@vidstack/react';
import type { VideoFitMode, MediaPlaylist, SeekOverlayData } from '@/types';

export interface VideoContextState {
  playerRef: React.MutableRefObject<any | null>;
  playerContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  settingsMenuRef: React.MutableRefObject<HTMLDivElement | null>;
  seekBarRef: React.MutableRefObject<HTMLInputElement | null>;

  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  progress: number;
  buffered: number;
  duration: number;
  currentTime: number;
  seeking: boolean;

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

  seekOverlay: SeekOverlayData | null;

  fitMode: VideoFitMode;
  isSettingsMenuOpen: boolean;
  activeSettingsMenu: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast';

  videoLevels: any[];
  audioTracks: MediaPlaylist[];
  subtitleTracks: TextTrack[];
  currentVideoLevel: number;
  currentAudioTrack: number;
  currentSubtitleTrack: number;
  showSettingsButton: boolean;

  currentProgram: any | null;
  nextProgram: any | null;
  programProgress: number;
  liveTime: string;
  isFavorite: boolean;

  retryCount: number;
  reloadTrigger: number;
  isRecovering: boolean;

  isTizen: boolean;

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
  recentChannels?: string[];
  initialPlaybackState?: any;

  receivers: any[];
  isReceiver: boolean;
  refreshReceivers: () => void;

  onBack: () => void;
  toggleFavorite: (channel: any) => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onChannelSelect?: (item: any) => void;
}

export interface VideoContextActions {
  togglePlayPause: () => void;
  handlePlay: () => void;
  handlePause: () => void;

  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;

  handleSeekMouseDown: () => void;
  handleSeekMouseUp: (e: React.MouseEvent<HTMLInputElement>) => void;
  handleSeekTouchEnd: (e: React.TouchEvent<HTMLInputElement>) => void;
  handleSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSeekBarHover: (e: React.MouseEvent<HTMLInputElement>) => void;
  handleSkipButtonClick: (seconds: number) => void;

  setControlsVisible: (visible: boolean) => void;
  setCursorVisible: (visible: boolean) => void;
  setIsTooltipVisible: (visible: boolean) => void;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setShowChannelList: (show: boolean) => void;
  showControlsAndCursor: () => void;

  cycleFitMode: () => void;
  toggleSettingsMenu: () => void;
  setActiveSettingsMenu: (
    menu: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast'
  ) => void;
  setIsSettingsMenuOpen: (open: boolean) => void;
  handleVideoLevelChange: (level: number) => void;
  handleAudioTrackChange: (trackId: number) => void;
  handleSubtitleTrackChange: (track: TextTrack | null) => void;

  toggleFullscreen: () => void;

  handleCopyLink: () => void;
  setUseProxy: (use: boolean) => void;
  handleCast: (deviceId: string) => void;

  onProviderChange: (provider: MediaProviderAdapter | null) => void;
  handleCanPlay: () => void;
  handleTimeUpdate: (event: any) => void;
  handleDurationChange: (event: any) => void;
  handlePlayerVolumeChange: (event: any) => void;
  handleWaiting: () => void;
  handlePlaying: () => void;
  handleError: (event: any) => void;
  handleEnded: () => void;
  handleVideoClick: () => void;
  handleMouseMove: () => void;
  toggleChannelList: () => void;
}

export type VideoContextType = VideoContextState & VideoContextActions;

export const VideoContext = createContext<VideoContextType | undefined>(
  undefined
);
