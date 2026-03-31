/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { formatTime, isTizenDevice } from '@/utils/helpers';
import { isHLSProvider, type MediaProviderAdapter } from '@vidstack/react';
import { toast } from 'react-toastify';
import { URL_PATHS } from '@/services/api';
import type { VideoFitMode, SeekOverlayData } from '@/types';
import {
  VideoContext,
  type VideoContextType,
} from '@/context/video/VideoContextTypes';

interface VideoProviderProps {
  children: ReactNode;
  streamUrl?: string | null;
  rawStreamUrl?: string | null;
  itemId?: string | null;
  seasonId?: string | null;
  categoryId?: string | null;
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

export const VideoProvider: React.FC<VideoProviderProps> = ({
  children,
  streamUrl,
  rawStreamUrl,
  contentType,
  mediaId,
  item,
  seriesItem,
  itemId,
  seasonId,
  categoryId,
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

  // --- Refs ---
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
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

  // --- App & UI States ---
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [useProxy, setUseProxy] = useState(!isTizenDevice());
  const [retryCount, setRetryCount] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showChannelList, setShowChannelList] = useState(false);
  const [seekOverlay, setSeekOverlay] = useState<SeekOverlayData | null>(null);

  const [fitMode, setFitMode] = useState<VideoFitMode>(() => {
    return (localStorage.getItem('videoFitMode') as VideoFitMode) || 'contain';
  });

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [activeSettingsMenu, setActiveSettingsMenu] = useState<
    'main' | 'quality' | 'audio' | 'subtitles' | 'cast'
  >('main');

  // --- Live TV States ---
  const [currentProgram, setCurrentProgram] = useState<any | null>(null);
  const [nextProgram, setNextProgram] = useState<any | null>(null);
  const [programProgress, setProgramProgress] = useState(0);
  const [liveTime, setLiveTime] = useState('');

  const isFavorite = channelInfo ? favorites.includes(channelInfo.id) : false;
  // Always true now since we use Vidstack's native menus which auto-populate
  const showSettingsButton = true;

  // --- Live Time Update ---
  useEffect(() => {
    if (contentType !== 'tv') return;
    const updateLiveTime = () => {
      const now = new Date();
      setLiveTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    };
    updateLiveTime();
    const interval = setInterval(updateLiveTime, 1000);
    return () => clearInterval(interval);
  }, [contentType]);

  useEffect(() => {
    localStorage.setItem('videoFitMode', fitMode);
  }, [fitMode]);

  useEffect(() => {
    setIsRecovering(false);
    isRetrying.current = false;
    setRetryCount(0);
  }, [streamUrl, rawStreamUrl]);

  // --- Controls & Cursor Visibility ---
  const showControlsAndCursor = useCallback(() => {
    setControlsVisible(true);
    setCursorVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(
      () => setControlsVisible(false),
      5000
    );
    cursorTimeoutRef.current = setTimeout(() => setCursorVisible(false), 5000);
  }, []);

  useEffect(() => {
    showControlsAndCursor();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    };
  }, [showControlsAndCursor]);

  // --- Actions ---
  const handleSkipButtonClick = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player) return;

      const direction = seconds > 0 ? 1 : -1;

      const currentDuration = player.state?.duration || player.duration || 0;
      const currentTime = player.state?.currentTime || player.currentTime || 0;

      if (seekRunTimer.current) clearTimeout(seekRunTimer.current);

      if (
        seekRunStart.current === null ||
        seekRunDirection.current !== direction
      ) {
        seekRunStart.current = currentTime;
        seekRunLevel.current = 0;
        seekRunDirection.current = direction;
      } else {
        seekRunLevel.current += 1;
      }

      const maxLevelIndex = SEEK_LEVELS.length - 1;
      const offset =
        seekRunLevel.current <= maxLevelIndex
          ? SEEK_LEVELS[seekRunLevel.current]
          : SEEK_LEVELS[maxLevelIndex] +
            (seekRunLevel.current - maxLevelIndex) * 60;

      const targetTime = Math.max(
        0,
        Math.min(currentDuration, seekRunStart.current! + offset * direction)
      );

      player.currentTime = targetTime;

      setSeekOverlay({
        visible: true,
        text: `${direction > 0 ? '+' : '-'}${offset}s`,
        time: formatTime(targetTime),
      });

      seekRunTimer.current = setTimeout(() => {
        seekRunStart.current = null;
        seekRunLevel.current = 0;
        setSeekOverlay(null);
      }, 1500);
    },
    [SEEK_LEVELS]
  );

  const cycleFitMode = useCallback(() => {
    const FIT_MODES: VideoFitMode[] = ['contain', 'cover', 'fill'];
    setFitMode(
      (curr) => FIT_MODES[(FIT_MODES.indexOf(curr) + 1) % FIT_MODES.length]
    );
  }, []);

  const toggleSettingsMenu = useCallback(() => {
    setIsSettingsMenuOpen((prev) => !prev);
    if (!isSettingsMenuOpen) setActiveSettingsMenu('main');
  }, [isSettingsMenuOpen]);

  const handleCopyLink = useCallback(async () => {
    if (rawStreamUrl) {
      try {
        await navigator.clipboard.writeText(rawStreamUrl);
      } catch {
        const tempInput = document.createElement('textarea');
        tempInput.value = rawStreamUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [rawStreamUrl]);

  const handleCast = useCallback(
    (deviceId: string) => {
      if (!item && !previewChannelInfo && !channelInfo) return;
      const baseUrl = URL_PATHS.HOST || window.location.origin;
      const formatUrl = (url?: string | null) =>
        url?.startsWith('http')
          ? url
          : url
            ? `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
            : undefined;

      if (castTo) {
        castTo(
          deviceId,
          {
            media: item || previewChannelInfo || channelInfo,
            streamUrl: formatUrl(streamUrl),
            rawStreamUrl: formatUrl(rawStreamUrl),
          },
          {
            currentTime: playerRef.current?.currentTime || 0,
            volume: playerRef.current?.volume || 1,
            muted: playerRef.current?.muted || false,
          }
        );
      }
      toast.success('Casting started...');
      setIsSettingsMenuOpen(false);
    },
    [item, previewChannelInfo, channelInfo, streamUrl, rawStreamUrl, castTo]
  );

  const toggleChannelList = useCallback(() => {
    showControlsAndCursor();
    if (controlsVisible) setShowChannelList(true);
  }, [controlsVisible, showControlsAndCursor]);

  const onProviderChange = useCallback(
    (provider: MediaProviderAdapter | null) => {
      if (isHLSProvider(provider))
        console.log('[VideoPlayer] HLS provider loaded');
    },
    []
  );

  const handleCanPlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    setIsRecovering(false);
    isRetrying.current = false;

    if (initialPlaybackState) {
      if (initialPlaybackState.volume !== undefined)
        player.volume = initialPlaybackState.volume;
      if (initialPlaybackState.muted !== undefined)
        player.muted = initialPlaybackState.muted;
    }
  }, [initialPlaybackState]);

  // Cleaned TimeUpdate: No UI Re-renders, only progress restore & completion logic
  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const time = player.currentTime;
    const dur = player.duration;

    if (!hasRestoredProgress.current && time >= 1) {
      hasRestoredProgress.current = true;
      let targetTime = initialPlaybackState?.currentTime || 0;
      try {
        const storedProgress = localStorage.getItem(
          `video-in-progress-${itemId || mediaId}`
        );
        if (storedProgress) {
          const parsed = JSON.parse(storedProgress);
          if (parsed.currentTime > targetTime) targetTime = parsed.currentTime;
        }
      } catch {
        /* NOTHING */
      }
      if (targetTime > 2) player.currentTime = targetTime;
    }

    if (dur > 0 && contentType !== 'tv' && time / dur >= 0.9 && mediaId) {
      localStorage.removeItem(`video-in-progress-${mediaId}`);
      if (itemId) localStorage.removeItem(`video-in-progress-${itemId}`);
      localStorage.setItem(
        `video-completed-${mediaId}`,
        JSON.stringify({
          mediaId,
          itemId,
          type: contentType,
          timestamp: Date.now(),
        })
      );
    }
  }, [contentType, mediaId, itemId, initialPlaybackState]);

  const handleError = useCallback(
    (event: any) => {
      if (isRetrying.current) return;
      const error = event.detail;

      if (
        error?.code === 4 ||
        error?.message?.includes('404') ||
        error?.message?.includes('500')
      ) {
        if (contentType === 'tv' && retryCount < 10) {
          console.log(
            `[VideoPlayer] Live TV 404. Retrying... (${retryCount + 1}/10)`
          );
        } else {
          toast.error('Stream not found. Please try another source.');
          return;
        }
      }

      if (retryCount < 10) {
        isRetrying.current = true;
        setIsRecovering(true);
        setTimeout(
          () => {
            setRetryCount((prev) => prev + 1);
            setReloadTrigger((prev) => prev + 1);
            setIsRecovering(false);
          },
          Math.min(1000 * Math.pow(2, retryCount), 5000)
        );
      } else {
        toast.error('Failed to load stream after multiple attempts');
        setIsRecovering(false);
      }
    },
    [retryCount, contentType]
  );

  const saveProgress = useCallback(() => {
    if (contentType === 'tv') return;
    const player = playerRef.current;
    if (
      !player ||
      !mediaId ||
      !player.duration ||
      player.duration <= 0 ||
      player.currentTime <= 2
    )
      return;

    if (player.currentTime / player.duration >= 0.9) return; // Cleanup handled in handleTimeUpdate

    const targetKeyId = itemId && itemId !== mediaId ? itemId : mediaId;
    const progressData = {
      id: targetKeyId,
      playbackFileId: itemId || mediaId,
      mediaId,
      itemId,
      seasonId,
      categoryId,
      type: contentType,
      title:
        seriesItem?.name ||
        seriesItem?.title ||
        item?.name ||
        item?.title ||
        '',
      currentTime: player.currentTime,
      duration: player.duration,
      progressPercent: Math.round((player.currentTime / player.duration) * 100),
      timestamp: Date.now(),
      name:
        seriesItem?.name ||
        seriesItem?.title ||
        item?.name ||
        item?.title ||
        '',
      episodeTitle: item?.name || item?.title || '',
      screenshot_uri: seriesItem?.screenshot_uri || item?.screenshot_uri || '',
      is_series: seriesItem ? 1 : 0,
      cmd: item?.cmd || rawStreamUrl || '',
      series_number: item?.series_number,
    };

    localStorage.setItem(
      `video-in-progress-${targetKeyId}`,
      JSON.stringify(progressData)
    );
    if (mediaId)
      localStorage.setItem(
        `video-in-progress-${mediaId}`,
        JSON.stringify(progressData)
      );
  }, [contentType, mediaId, itemId, seasonId, categoryId, seriesItem, item?.name, item?.title, item?.screenshot_uri, item?.cmd, item?.series_number, rawStreamUrl]);

  const handleEnded = useCallback(() => {
    if (mediaId) {
      localStorage.removeItem(`video-in-progress-${mediaId}`);
      localStorage.setItem(
        `video-completed-${mediaId}`,
        JSON.stringify({
          mediaId,
          itemId,
          type: contentType,
          timestamp: Date.now(),
        })
      );
    }
    if (itemId && itemId !== mediaId) {
      localStorage.removeItem(`video-in-progress-${itemId}`);
    }
  }, [contentType, mediaId, itemId]);

  useEffect(() => {
    if (contentType === 'tv') return;
    const interval = setInterval(saveProgress, 30000);
    window.addEventListener('beforeunload', saveProgress);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', saveProgress);
      saveProgress();
    };
  }, [contentType, saveProgress]);

  const handleProxyToggle = useCallback(
    (newProxyState: boolean) => {
      saveProgress();
      setUseProxy(newProxyState);
      hasRestoredProgress.current = false;
      setReloadTrigger((prev) => prev + 1);
    },
    [saveProgress]
  );

  // --- EPG Updates ---
  useEffect(() => {
    if (contentType !== 'tv' || !channelInfo || !epgData) return;
    const updateEPG = () => {
      const now = Date.now();
      const programs = epgData[channelInfo.id] || [];
      const current = programs.find(
        (p: any) =>
          now >= new Date(p.start).getTime() && now < new Date(p.end).getTime()
      );
      setCurrentProgram(current || null);

      if (current) {
        const start = new Date(current.start).getTime();
        const end = new Date(current.end).getTime();
        setProgramProgress(
          Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
        );
        setNextProgram(
          programs.find((p: any) => new Date(p.start).getTime() >= end) || null
        );
      }
    };
    updateEPG();
    const interval = setInterval(updateEPG, 10000);
    return () => clearInterval(interval);
  }, [contentType, channelInfo, epgData]);

  useEffect(() => {
    if (previewChannelInfo) showControlsAndCursor();
  }, [previewChannelInfo, showControlsAndCursor]);

  // Note: Only the essential non-video states are passed here.
  // Make sure your `VideoContextTypes.ts` matches the cleaned up version provided in the previous step!
  const value: VideoContextType = {
    playerRef,
    playerContainerRef,
    settingsMenuRef,

    controlsVisible,
    cursorVisible,
    copied,
    useProxy,
    isTooltipVisible,
    focusedIndex,
    showChannelList,
    seekOverlay,
    fitMode,
    isSettingsMenuOpen,
    activeSettingsMenu,
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
    receivers: receivers || [],
    isReceiver: isReceiver || false,
    refreshReceivers: refreshReceivers || (() => {}),

    onBack,
    toggleFavorite,
    onNextChannel,
    onPrevChannel,
    onChannelSelect,

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
    handleCopyLink,
    setUseProxy: handleProxyToggle,
    handleCast,
    onProviderChange,
    handleCanPlay,
    handleTimeUpdate,
    handleError,
    handleEnded,
    toggleChannelList,
    handleVideoClick: showControlsAndCursor,
    handleMouseMove: showControlsAndCursor,
  };

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};
