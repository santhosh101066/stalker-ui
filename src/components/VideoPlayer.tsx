/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useEffect, useCallback } from 'react';
import { formatTime, isTizenDevice } from '../utils/helpers';
import { MediaPlayer, MediaProvider, isHLSProvider, type MediaProviderAdapter } from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';
import { toast } from 'react-toastify';
import { URL_PATHS } from '../api/api'; // Import URL_PATHS

import type { ChannelGroup, ContextType, EPG_List, MediaItem } from '../types';
import TvChannelList from './TvChannelList';
import { useSocket } from '../context/SocketContext';
import { FaChromecast } from 'react-icons/fa';

type VideoFitMode = 'contain' | 'cover' | 'fill';
const FIT_MODES: VideoFitMode[] = ['contain', 'cover', 'fill'];
const RETRY_TIMEOUT_MS = 5000;

interface MediaPlaylist {
  id: number;
  name: string;
  lang?: string;
}

interface VideoPlayerProps {
  streamUrl: string | null;
  rawStreamUrl: string | null;
  onBack: () => void;
  itemId: string | null;
  context: ContextType;
  contentType: 'movie' | 'series' | 'tv';
  mediaId: string | null;
  item: MediaItem | null;
  seriesItem: MediaItem | null;
  channels?: MediaItem[];
  channelInfo?: MediaItem | null;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onChannelSelect?: (item: MediaItem) => void;
  previewChannelInfo?: MediaItem | null;
  epgData: Record<string, EPG_List[]>;
  channelGroups?: ChannelGroup[];
  favorites: string[]; // <-- ADD THIS
  toggleFavorite: (item: MediaItem) => void;
}

const useLiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // Formats to: "Wed 12 Jun 02:46 pm"
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(time);
};

const formatTimestamp = (timestamp: number): string => {
  if (isNaN(timestamp)) return '...';
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  rawStreamUrl,
  onBack,
  itemId,
  contentType,
  mediaId,
  item,
  seriesItem,
  channels,
  previewChannelInfo,
  channelInfo,
  onNextChannel,
  onPrevChannel,
  onChannelSelect,
  epgData,
  channelGroups,
  favorites, // <-- ADD THIS
  toggleFavorite,
}) => {
  const isTizen = isTizenDevice();
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLInputElement>(null);

  const playerRef = useRef<any | null>(null); // Ref to hold player instance for cleanup
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSaveTime = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [useProxy, setUseProxy] = useState(
    isTizenDevice() ? false : true
  );
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const seekBuffer = useRef(0);
  const seekApplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showChannelList, setShowChannelList] = useState(false);

  const [videoLevels] = useState<any[]>([]);
  const [audioTracks] = useState<MediaPlaylist[]>([]);
  // Changed to use TextTrack[] and added setter
  const [subtitleTracks, setSubtitleTracks] = useState<TextTrack[]>([]);
  const [currentVideoLevel, setCurrentVideoLevel] = useState(-1); // -1 is 'auto'
  const [currentAudioTrack] = useState(-1);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1); // Added setter
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [activeSettingsMenu, setActiveSettingsMenu] = useState<
    'main' | 'quality' | 'audio' | 'subtitles' | 'cast'
  >('main');
  const [currentProgram, setCurrentProgram] = useState<EPG_List | null>(null);
  const [nextProgram, setNextProgram] = useState<EPG_List | null>(null);

  const { isReceiver, receivers, castTo } = useSocket();
  const [programProgress, setProgramProgress] = useState(0);

  // Sync Tracks with Player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    return player.subscribe(({ textTracks }: { textTracks: any }) => {
      // Filter for subtitles/captions
      const subs = Array.from(textTracks as any[]).filter((t: any) => t.kind === 'subtitles' || t.kind === 'captions');
      setSubtitleTracks(subs as TextTrack[]);

      // Check active
      const activeIndex = subs.findIndex((t: any) => t.mode === 'showing');
      setCurrentSubtitleTrack(activeIndex);
    });
  }, []);

  // Resume Playback State
  const hasRestoredProgress = useRef(false);

  useEffect(() => {
    // Reset restore flag when item changes so we can restore progress for the new item
    hasRestoredProgress.current = false;
  }, [itemId]);

  // VOD Proxy State

  const [seekOffset] = useState(0);


  const [retryCount, setRetryCount] = useState(0);


  const [reloadTrigger, setReloadTrigger] = useState(0); // Used to force reload on retry
  const [isRecovering, setIsRecovering] = useState(false);
  const isRetrying = useRef(false);

  // Audio Boost Refs




  const [fitMode, setFitMode] = useState<VideoFitMode>(() => {
    return (localStorage.getItem('videoFitMode') as VideoFitMode) || 'contain';
  });

  const liveTime = useLiveClock();
  const isFavorite = channelInfo ? favorites.includes(channelInfo.id) : false;

  const showSettingsButton =
    videoLevels.length > 1 ||
    audioTracks.length > 1 ||
    subtitleTracks.length > 0;

  // Vidstack 1.x Event Handlers
  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (isHLSProvider(provider)) {
      if (contentType === 'tv') {
        // Optimized for Live TV (Low Latency)
        provider.config = {
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 20,
          // Removed manual buffer limits to fallback to HLS defaults (unlimited/"speed limit" removed)
        };
      } else {
        // Default/Robust for VOD (Movies/Series)
        provider.config = {
          enableWorker: true,
          lowLatencyMode: false,
          // Removed manual buffer limits to fallback to HLS defaults (600s+)
        };
      }
    }
  }, [contentType]);

  const handleCanPlay = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.volume = volume;
      playerRef.current.muted = isMuted;

      // Restore Progress Logic
      if (!hasRestoredProgress.current && mediaId) {
        const savedProgress = localStorage.getItem(`video-progress-${itemId}`);
        if (savedProgress) {
          const startTime = parseFloat(savedProgress);
          if (!isNaN(startTime) && startTime > 0) {
            console.log(`Restoring playback to: ${startTime}`);
            playerRef.current.currentTime = startTime;
          }
        }
        hasRestoredProgress.current = true;
      }
    }
  }, [volume, isMuted, mediaId, itemId]);

  const handleTimeUpdate = useCallback((_: any) => {
    // Vidstack provides detail.currentTime in seconds, but depending on event type it might be different.
    // Safest to read from player instance.
    const player = playerRef.current;
    if (!player) return;

    const currentTime = player.currentTime;
    const duration = player.duration;

    if (contentType === 'tv') {
      setProgress(0);
      setDuration(0);
    } else {
      const totalDuration = duration + seekOffset;
      const currentPos = currentTime + seekOffset;

      if (!seeking) {
        if (duration > 0) {
          setProgress((currentPos / totalDuration) * 100);
          setDuration(totalDuration);
        } else {
          setProgress(0);
        }
        setCurrentTime(currentPos);
      }

      // Progress Saving Logic
      if (duration > 0 && mediaId && itemId) {
        const progressPercentage = (currentTime / duration) * 100;
        const itemToSave = seriesItem || item;
        const mediaProgressData = JSON.stringify({
          mediaId: mediaId,
          fileId: itemId,
          type: contentType,
          title: itemToSave?.title,
          name: itemToSave?.name || itemToSave?.title,
          screenshot_uri: itemToSave?.screenshot_uri,
          is_series: itemToSave?.is_series,
          cmd: rawStreamUrl,
        });

        if (progressPercentage > 95) {
          if (seriesItem) {
            localStorage.setItem(`video-completed-${itemId}`, 'true');
            localStorage.removeItem(`video-in-progress-${itemId}`);
            localStorage.setItem(`video-in-progress-${mediaId}`, mediaProgressData);
            localStorage.removeItem(`video-completed-${mediaId}`);
          } else {
            localStorage.setItem(`video-completed-${mediaId}`, mediaProgressData);
            localStorage.removeItem(`video-in-progress-${mediaId}`);
          }
        } else if (progressPercentage > 2) {
          localStorage.setItem(`video-in-progress-${mediaId}`, mediaProgressData);
          localStorage.removeItem(`video-completed-${mediaId}`);
          if (seriesItem) {
            localStorage.setItem(`video-in-progress-${itemId}`, 'true');
            localStorage.removeItem(`video-completed-${itemId}`);
          }
        }
      }

      const now = Date.now();
      if (now - (lastSaveTime.current || 0) > 5000) {
        localStorage.setItem(`video-progress-${itemId}`, String(currentPos));
        lastSaveTime.current = now;
      }
    }
  }, [contentType, seekOffset, mediaId, itemId, item, seriesItem, rawStreamUrl, seeking]);

  const handleDurationChange = useCallback((detail: number) => {
    if (contentType !== 'tv') {
      setDuration(detail + seekOffset);
    } else {
      setDuration(detail);
    }
  }, [contentType, seekOffset]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handlePlayerVolumeChange = useCallback((detail: any) => {
    setVolume(detail.volume);
    setIsMuted(detail.muted);
  }, []);
  const handleWaiting = useCallback(() => setIsBuffering(true), []);
  const handlePlaying = useCallback(() => {
    setIsBuffering(false);
    setIsPlaying(true);
    setRetryCount(0); // Reset retry count on successful playback
    isRetrying.current = false;
  }, []);

  const handleError = useCallback(async (detail: any) => {
    // Prevent multiple error handling calls at once
    if (isRetrying.current) return;
    isRetrying.current = true;

    console.error("Player Error:", detail);

    // Determine the stream URL
    // Determine the stream URL
    const sourceUrl = streamUrl || rawStreamUrl;
    if (!sourceUrl) {
      isRetrying.current = false;
      return;
    }

    // Force Play on Fragile/Non-Fatal Errors
    // User Request: "force play if there is any fragale error"
    const errorString = JSON.stringify(detail || {});
    if (
      (detail && detail.fatal === false) ||
      errorString.includes('frag') ||
      errorString.includes('buffer') ||
      errorString.includes('stall')
    ) {
      console.warn("Non-fatal/Fragile error detected. Forcing playback...", detail);
      if (playerRef.current && playerRef.current.paused) {
        playerRef.current.play().catch((e: any) => console.error("Force play failed", e));
      }
      // Do not trigger full retry cycle for these errors
      isRetrying.current = false;
      return;
    }

    try {
      // Check the actual HTTP status
      const response = await fetch(sourceUrl, { method: 'HEAD' });
      const status = response.status;

      console.log(`Stream Status: ${status}`);

      if (status === 404) {
        // 404: Limit to 2 retries
        if (retryCount < 2) {
          const nextRetry = retryCount + 1;
          toast.warning(`Stream not found (404). Retrying (${nextRetry}/2)...`);
          setRetryCount(nextRetry);
          setIsRecovering(true); // Unmount player

          setTimeout(() => {
            setReloadTrigger(prev => prev + 1);
            setIsRecovering(false); // Remount
            isRetrying.current = false;
          }, RETRY_TIMEOUT_MS);
        } else {
          toast.error("Stream unavailable (404).");
          // Keep isRetrying true to prevent further attempts until user fixes or manual reload
        }
      } else if (status >= 500) {
        // 500: Infinite retries, faster delay (2s)
        toast.warning(`Server error (${status}). Retrying...`);
        setIsRecovering(true); // Unmount player

        // We don't increment retryCount for 500s to allow infinite retries
        setTimeout(() => {
          setReloadTrigger(prev => prev + 1);
          setIsRecovering(false); // Remount
          isRetrying.current = false;
        }, RETRY_TIMEOUT_MS);
      } else {
        // Other errors: Infinite retries, standard delay
        toast.warning(`Playback error. Retrying...`);
        setIsRecovering(true); // Unmount player

        setTimeout(() => {
          setReloadTrigger(prev => prev + 1);
          setIsRecovering(false); // Remount
          isRetrying.current = false;
        }, RETRY_TIMEOUT_MS);
      }

    } catch (err) {
      // Network failure to check status (likely offline or CORS)
      console.error("Failed to check stream status", err);
      // Assume generic error and retry
      toast.warning(`Network error. Retrying...`);
      setIsRecovering(true); // Unmount player

      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setIsRecovering(false); // Remount
        isRetrying.current = false;
      }, RETRY_TIMEOUT_MS);
    }
  }, [retryCount, streamUrl, rawStreamUrl]);

  const onEnded = useCallback(() => {
    if (contentType === 'tv') return;
    toast.success('Video finished');
    // handle auto-next logic if implemented
  }, [contentType]);



  useEffect(() => {
    const updateProgramInfo = () => {
      const channel = previewChannelInfo || channelInfo;
      if (!channel || !epgData) {
        setCurrentProgram(null);
        setNextProgram(null);
        setProgramProgress(0);
        return;
      }

      const epgList = epgData[channel.id];
      if (!epgList || epgList.length === 0) {
        setCurrentProgram(null);
        setNextProgram(null);
        setProgramProgress(0);
        return;
      }

      const nowInSeconds = Date.now() / 1000;
      const currentIdx = epgList.findIndex(
        (p) =>
          nowInSeconds >= parseInt(p.start_timestamp) &&
          nowInSeconds < parseInt(p.stop_timestamp)
      );

      if (currentIdx !== -1) {
        const current = epgList[currentIdx];
        setCurrentProgram(current);
        setNextProgram(epgList[currentIdx + 1] || null);

        // Calculate progress
        const start = parseInt(current.start_timestamp);
        const end = parseInt(current.stop_timestamp);
        const duration = end - start;
        if (duration > 0) {
          const elapsed = nowInSeconds - start;
          setProgramProgress(Math.min(100, (elapsed / duration) * 100));
        } else {
          setProgramProgress(0);
        }
      } else {
        // No current program, find next one
        setCurrentProgram(null);
        const nextIdx = epgList.findIndex(
          (p) => parseInt(p.start_timestamp) > nowInSeconds
        );
        setNextProgram(epgList[nextIdx] || null);
        setProgramProgress(0);
      }
    };

    updateProgramInfo();
    // Update every 30 seconds
    const interval = setInterval(updateProgramInfo, 30000);
    return () => clearInterval(interval);
  }, [channelInfo, previewChannelInfo, epgData]);

  const handleBack = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      onBack();
    }
  }, [onBack]);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      if (player.paused) player.play();
      else player.pause();
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (player) {
      player.currentTime += seconds;
    }
  }, []);

  const showControlsAndCursor = useCallback(() => {
    setControlsVisible(true);
    setCursorVisible(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);

    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }
    cursorTimeoutRef.current = setTimeout(() => {
      setCursorVisible(false);
    }, 3000);
  }, []);

  const applySeekBuffer = useCallback(
    (amount: number) => {
      if (seekApplyTimer.current) clearTimeout(seekApplyTimer.current);
      seekBuffer.current += amount;

      const player = playerRef.current;
      const seekBar = seekBarRef.current;
      // Use state duration if player.duration is unavailable
      const currentDuration = (player && Number.isFinite(player.duration)) ? player.duration : duration;

      if (player && currentDuration > 0 && seekBar) {
        const newTime = Math.max(
          0,
          Math.min(currentDuration, player.currentTime + seekBuffer.current)
        );
        const newProgress = (newTime / currentDuration) * 100;
        const newPosition = (newProgress / 100) * seekBar.offsetWidth;
        setHoverTime(newTime);
        setHoverPosition(newPosition);
        setIsTooltipVisible(true);
      }

      seekApplyTimer.current = setTimeout(() => {
        skip(seekBuffer.current);
        seekBuffer.current = 0;
        setTimeout(() => setIsTooltipVisible(false), 500);
      }, 500);
    },
    [skip, duration]
  );

  const handleSkipButtonClick = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      const seekBar = seekBarRef.current;
      // Use state duration if player.duration is unavailable
      const currentDuration = (player && Number.isFinite(player.duration)) ? player.duration : duration;

      if (player && currentDuration > 0 && seekBar) {
        const newTime = Math.max(
          0,
          Math.min(currentDuration, player.currentTime + seconds)
        );
        const newProgress = (newTime / currentDuration) * 100;
        const newPosition = (newProgress / 100) * seekBar.offsetWidth;

        setHoverTime(newTime);
        setHoverPosition(newPosition);
        setIsTooltipVisible(true);

        skip(seconds);

        setTimeout(() => {
          setIsTooltipVisible(false);
        }, 500);
      }
    },
    [skip, duration]
  );

  const handleVideoLevelChange = (levelIndex: number) => {
    setCurrentVideoLevel(levelIndex);
    // TODO: Implement Vidstack specific quality selection
    console.warn("Quality selection not implemented for Vidstack yet");
    setActiveSettingsMenu('main');
    setIsSettingsMenuOpen(false);
  };

  const handleAudioTrackChange = (_trackId: number) => {
    // TODO: Implement Vidstack specific audio track selection
    console.warn("Audio track selection not implemented for Vidstack yet");
    setActiveSettingsMenu('main');
    setIsSettingsMenuOpen(false);
  };

  const handleSubtitleTrackChange = (track: TextTrack | null) => {
    const player = playerRef.current;
    if (!player) return;

    // Disable all subtitles first
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
  };

  const handleCast = (deviceId: string) => {
    if (!item && !previewChannelInfo && !channelInfo) return;
    const mediaItem = item || previewChannelInfo || channelInfo;

    castTo(deviceId, {
      media: mediaItem,
      streamUrl,
      rawStreamUrl
    }, {
      currentTime: playerRef.current?.currentTime || 0
    });

    toast.success('Casting started...');
    setIsSettingsMenuOpen(false);
    setActiveSettingsMenu('main');
  };

  useEffect(() => {
    // Helper function for the main player controls
    const handlePlayerControlsKeyDown = (e: KeyboardEvent) => {
      const focusable = Array.from(
        playerContainerRef.current?.querySelectorAll(
          '[data-focusable="true"]'
        ) || []
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
            applySeekBuffer(-10);
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
            applySeekBuffer(10);
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

        case 0: // BACK on some devices
        case 10009: // RETURN on Tizen
        case 8: // BACK
          e.preventDefault();
          handleBack();
          break;
        default:
          break;
      }
    };

    // Helper function for the settings menu
    const handleSettingsMenuKeyDown = (e: KeyboardEvent) => {
      const focusable = Array.from(
        settingsMenuRef.current?.querySelectorAll('[data-focusable="true"]') ||
        []
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
          handleBack();
          break;
        default:
          break;
      }
    };

    // --- Main Key Handler ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showChannelList) {
        // Let TvChannelList handle its own keys
        e.stopPropagation();
        return;
      }
      const wereControlsHidden = !controlsVisible;
      showControlsAndCursor();
      e.stopPropagation();
      if (wereControlsHidden && e.keyCode !== 405) {
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
    activeSettingsMenu,
    showChannelList,
    skip,
    togglePlayPause,
    showControlsAndCursor,
    applySeekBuffer,
    handleSkipButtonClick,
    handleBack,
    contentType,
    onPrevChannel,
    onNextChannel,
    controlsVisible,
    channelInfo,
    toggleFavorite,
  ]);


  useEffect(() => {
    if (showChannelList || isSettingsMenuOpen) return;
    const focusable = Array.from(
      playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') ||
      []
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
    // Only run if the settings menu is open
    if (!isSettingsMenuOpen || showChannelList) return;

    const focusable = Array.from(
      settingsMenuRef.current?.querySelectorAll('[data-focusable="true"]') || []
    ) as HTMLElement[];
    if (focusable.length === 0) return;

    const newIndex = focusedIndex === null ? 0 : focusedIndex;
    if (newIndex >= focusable.length) {
      setFocusedIndex(focusable.length - 1); // fix for out-of-bounds
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        if (focusedIndex !== null) {
          const focusable = Array.from(
            playerContainerRef.current?.querySelectorAll(
              '[data-focusable="true"]'
            ) || []
          ) as HTMLElement[];
          const elementToFocus = focusable[focusedIndex];
          if (elementToFocus) {
            elementToFocus.focus();
          }
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [focusedIndex]);

  useEffect(() => {
    if (previewChannelInfo) {
      showControlsAndCursor();
    }
  }, [previewChannelInfo, showControlsAndCursor]);

  const handleSeekMouseDown = () => {
    if (contentType === 'tv') return;
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (contentType === 'tv') return;
    setSeeking(false);
    const player = playerRef.current;

    // Updated for Vidstack
    const currentDuration = (player && Number.isFinite(player.duration)) ? player.duration : duration;

    if (player && currentDuration > 0) {
      const seekTime =
        (Number((e.target as HTMLInputElement).value) / 100) * (currentDuration + seekOffset);
      player.currentTime = seekTime;
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (contentType === 'tv') return;
    setProgress(Number(e.target.value));
  };

  const handleSeekBarHover = (e: React.MouseEvent<HTMLInputElement>) => {
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
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (player) {
      const newVolume = parseFloat(e.target.value);
      player.volume = newVolume;
      player.muted = (newVolume === 0);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (player) {
      player.muted = !player.muted;
    }
  };

  const handleMouseMove = () => {
    showControlsAndCursor();
  };



  const toggleFullscreen = useCallback(async () => {
    const elem = playerContainerRef.current;
    if (elem) {
      if (!document.fullscreenElement) {
        try {
          await elem.requestFullscreen();
          // Attempt to lock orientation to landscape
          if (screen.orientation && 'lock' in screen.orientation) {
            // @ts-ignore - lock might not be in TS defs
            screen.orientation.lock('landscape').catch((e) => {
              console.warn("Orientation lock failed:", e);
            });
          }
        } catch (err: any) {
          console.error(
            `Error attempting to enable full-screen mode: ${err.message} `
          );
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

  useEffect(() => {
    showControlsAndCursor();

    setTimeout(() => {
      const focusable = Array.from(
        playerContainerRef.current?.querySelectorAll(
          '[data-focusable="true"]'
        ) || []
      ) as HTMLElement[];
      const playPauseButtonIndex = focusable.findIndex(
        (el) => el.getAttribute('data-control') === 'play-pause'
      );
      if (playPauseButtonIndex !== -1) {
        setFocusedIndex(playPauseButtonIndex);
      } else {
        playerContainerRef.current?.focus();
      }
    }, 100);
  }, [showControlsAndCursor, toggleFullscreen]);

  const cycleFitMode = () => {
    setFitMode((currentMode) => {
      const currentIndex = FIT_MODES.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % FIT_MODES.length;
      return FIT_MODES[nextIndex];
    });
  };

  const handleVideoClick = useCallback(() => {
    // 1. Check if controls were hidden
    const wereControlsHidden = !controlsVisible;

    // 2. Always show controls (or reset timer)
    showControlsAndCursor();

    // 3. If controls were visible, then toggle play/pause
    if (!wereControlsHidden) {
      togglePlayPause();
    }
  }, [controlsVisible, showControlsAndCursor, togglePlayPause]);

  const toggleChannelList = useCallback(() => {
    // Check if controls were hidden *before* showControlsAndCursor was called
    const wereControlsHidden = !controlsVisible;

    // Always show controls
    showControlsAndCursor();

    // Only open the list if controls were already visible
    if (!wereControlsHidden) {
      setShowChannelList(true);
    }
  }, [controlsVisible, showControlsAndCursor]);

  const toggleSettingsMenu = () => {
    if (isSettingsMenuOpen) {
      setIsSettingsMenuOpen(false);
      setActiveSettingsMenu('main');
    } else {
      setIsSettingsMenuOpen(true);
    }
  };



  const handleCopyLink = async () => {
    if (rawStreamUrl) {
      try {
        await navigator.clipboard.writeText(rawStreamUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers or non-secure contexts
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
  };

  return (
    <div
      className="h-[100dvh] w-full bg-black"
      data-focusable="true"
      tabIndex={-1}
    >
      <style>{`
        /* Vidstack Overrides for correct fit mode */
        media-player {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: black;
        }
        media-provider {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Target the video element specifically */
        .media-provider video {
          width: 100% !important;
          height: 100% !important;
          object-fit: ${fitMode} !important;
        }
      `}</style>
      <div
        ref={playerContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setIsTooltipVisible(false);
          setControlsVisible(false);
          setCursorVisible(false); // Hide cursor immediately on mouse leave
          if (cursorTimeoutRef.current) {
            clearTimeout(cursorTimeoutRef.current);
          }
        }}
        className={`group relative h-full w-full overflow-hidden ${!cursorVisible && !controlsVisible ? 'cursor-none' : ''
          }`}
      >
        {/* Channel List Overlay */}
        {showChannelList &&
          contentType === 'tv' &&
          channels &&
          onChannelSelect && (
            <TvChannelList
              channels={channels}
              channelGroups={channelGroups || []}
              onChannelSelect={(item) => {
                if (onChannelSelect) onChannelSelect(item);
                setShowChannelList(false);
              }}
              onBack={() => setShowChannelList(false)}
              currentItemId={itemId}
            />
          )}

        {isRecovering ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm">
            <div className="relative mb-4 h-12 w-12">
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-500 opacity-75"></div>
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-600">
                <svg
                  className="h-6 w-6 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="text-xl font-bold">Connecting...</div>
            <div className="mt-2 text-sm text-gray-400">
              Retrying stream connection ({retryCount > 0 ? `${retryCount}/2` : 'Auto'})...
            </div>
          </div>
        ) : (
          <MediaPlayer
            key={reloadTrigger}
            className="h-full w-full media-provider"
            title={item?.title || seriesItem?.title || channelInfo?.name || 'Video'}
            src={streamUrl || rawStreamUrl || ''}
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
            onEnded={onEnded}
            onClick={handleVideoClick}
            onDoubleClick={toggleFullscreen}
          >
            <MediaProvider>
              {/* Add poster if available */}
              {/* Tracks can be added here */}
            </MediaProvider>
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

        {isBuffering && !isRecovering && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="relative h-16 w-16">
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></div>
              <div className="relative h-full w-full rounded-full bg-blue-500"></div>
            </div>
          </div>
        )}

        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible || isBuffering ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <div className="pointer-events-auto absolute left-0 right-0 top-0 p-4">
            <div className="flex items-center space-x-4">
              <button
                data-focusable="true"
                onClick={handleBack}
                className="flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-4 py-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95"
              >
                <svg
                  className="h-5 w-5 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  ></path>
                </svg>
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* --- MODIFICATION HERE --- */}
              {!isTizen && (
                <button
                  data-focusable="true"
                  onClick={handleCopyLink}
                  className="relative flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-4 py-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95"
                >
                  <svg
                    className="h-5 w-5 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    ></path>
                  </svg>
                  <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              )}
              {/* --- END MODIFICATION --- */}

              <label
                htmlFor="proxy-switch"
                className="flex cursor-pointer items-center"
                data-focusable="true"
              >
                <span className="mr-2 text-white">Use Proxy</span>
                <div className="relative">
                  <input
                    id="proxy-switch"
                    type="checkbox"
                    className="peer sr-only"
                    checked={useProxy}
                    onChange={() => setUseProxy(!useProxy)}
                  />
                  <div className="h-6 w-10 rounded-full bg-gray-600 peer-checked:bg-blue-500"></div>
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-full"></div>
                </div>
              </label>
            </div>
          </div>
          {contentType === 'tv' ? (
            // --- NEW TV INFO BANNER (STB Style) ---
            <div className="pointer-events-auto absolute bottom-4 left-4 right-4 p-2.5 text-white">
              <div className="rounded-lg border border-gray-700/80 bg-gray-800 bg-opacity-60 p-2.5 shadow-2xl">
                {/* Top Row: Channel Info */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex min-w-0 items-center">
                    {(previewChannelInfo || channelInfo)?.screenshot_uri && (
                      <img
                        src={
                          (previewChannelInfo ||
                            channelInfo)!.screenshot_uri?.startsWith('http')
                            ? (previewChannelInfo || channelInfo)!
                              .screenshot_uri
                            : `${URL_PATHS.HOST} /api/images${(previewChannelInfo || channelInfo)!.screenshot_uri} `
                        }
                        alt={(previewChannelInfo || channelInfo)!.name}
                        className="mr-3 h-10 w-12 flex-shrink-0 rounded-sm bg-black object-contain p-0.5"
                      />
                    )}
                    <span className="text-2xl font-bold">
                      {previewChannelInfo
                        ? previewChannelInfo.number
                        : channelInfo?.number}
                    </span>
                    <span className="ml-4 truncate text-xl font-semibold">
                      {previewChannelInfo
                        ? previewChannelInfo.name
                        : channelInfo?.name}
                    </span>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-lg text-gray-200">
                    {liveTime}
                  </div>
                </div>

                {/* Program Info (Placeholders) */}
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
                        ? `${formatTimestamp(
                          parseInt(currentProgram.start_timestamp)
                        )
                        } - ${formatTimestamp(
                          parseInt(currentProgram.stop_timestamp)
                        )
                        } `
                        : previewChannelInfo
                          ? '...'
                          : 'Now'}
                    </span>
                  </div>
                  {/* Next Program */}
                  <div className="flex items-center justify-between p-1.5 px-3">
                    <span className="text-gray-200">
                      {nextProgram
                        ? nextProgram.name
                        : previewChannelInfo
                          ? '...'
                          : 'Next Program'}
                    </span>
                    <span className="text-sm text-gray-300">
                      {nextProgram
                        ? formatTimestamp(parseInt(nextProgram.start_timestamp))
                        : '...'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar (Placeholder) */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-600">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${programProgress}% ` }}
                  ></div>
                </div>

                {/* Bottom Bar (Buttons) */}
                <div className="mt-2 flex items-center justify-between px-1 text-sm text-gray-200">
                  {/* Left Side: Play/List */}
                  <div className="flex items-center space-x-4">
                    <button
                      data-focusable="true"
                      data-control="play-pause"
                      onClick={togglePlayPause}

                      className="text-white hover:text-blue-400"
                    >
                      {isPlaying ? (
                        <svg
                          className="h-6 w-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          className="h-6 w-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
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
                      onClick={toggleChannelList}
                      className="text-white hover:text-blue-400"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
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
                      onClick={cycleFitMode}
                      className="w-16 text-center text-xs font-semibold uppercase text-white hover:text-blue-400"
                    >
                      {fitMode === 'contain' && 'Fit'}
                      {fitMode === 'cover' && 'Fill'}
                      {fitMode === 'fill' && 'Stretch'}
                    </button>
                    <div className="relative">
                      {/* --- ADD CAST BUTTON HERE --- */}
                      {!isReceiver && (
                        <button
                          data-focusable="true"
                          onClick={() => {
                            if (isSettingsMenuOpen && activeSettingsMenu === 'cast') {
                              setIsSettingsMenuOpen(false);
                            } else {
                              setIsSettingsMenuOpen(true);
                              setActiveSettingsMenu('cast');
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
                              setActiveSettingsMenu('main');
                            } else {
                              toggleSettingsMenu();
                            }
                          }}
                          className="text-white hover:text-blue-400"
                        >
                          <svg
                            className="h-6 w-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106A1.532 1.532 0 0111.49 3.17zM10 13a3 3 0 100-6 3 3 0 000 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                      {/* --- ADD SETTINGS MENU --- */}
                      {isSettingsMenuOpen && (
                        <div
                          ref={settingsMenuRef}
                          className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-gray-800 bg-opacity-90 py-1 text-sm text-white"
                        >
                          {activeSettingsMenu === 'main' && (
                            <>
                              {videoLevels.length > 1 && (
                                <button
                                  onClick={() =>
                                    setActiveSettingsMenu('quality')
                                  }
                                  className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                  data-focusable="true"
                                >
                                  Quality
                                </button>
                              )}
                              {audioTracks.length > 1 && (
                                <button
                                  onClick={() => setActiveSettingsMenu('audio')}
                                  className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                  data-focusable="true"
                                >
                                  Audio
                                </button>
                              )}
                              {subtitleTracks.length > 0 && (
                                <button
                                  onClick={() =>
                                    setActiveSettingsMenu('subtitles')
                                  }
                                  className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                  data-focusable="true"
                                >
                                  Subtitles
                                </button>
                              )}
                              {/* "Cast to Device" removed from here as it has a dedicated button now */}
                            </>
                          )}

                          {activeSettingsMenu === 'cast' && (
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
                                    onClick={() => handleCast(device.id)}
                                    className="block w-full px-4 py-2 text-left hover:bg-gray-700 truncate"
                                    data-focusable="true"
                                  >
                                    {device.name}
                                  </button>
                                ))
                              )}
                            </>
                          )}

                          {activeSettingsMenu === 'quality' && (
                            <>
                              <button
                                onClick={() => handleVideoLevelChange(-1)}
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === -1 ? 'bg-blue-500' : ''} `}
                                data-focusable="true"
                              >
                                Auto
                              </button>
                              {videoLevels.map((level, index) => (
                                <button
                                  key={String(level.url) + index}
                                  onClick={() => handleVideoLevelChange(index)}
                                  data-focusable="true"
                                  className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === index ? 'bg-blue-500' : ''} `}
                                >
                                  {level.height}p{' '}
                                  {level.bitrate > 0 &&
                                    `(${(level.bitrate / 1000000).toFixed(1)} Mbps)`}
                                </button>
                              ))}
                            </>
                          )}

                          {activeSettingsMenu === 'audio' && (
                            <>
                              {audioTracks.map((track) => (
                                <button
                                  key={track.id}
                                  data-focusable="true"
                                  onClick={() =>
                                    handleAudioTrackChange(track.id)
                                  }
                                  className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentAudioTrack === track.id ? 'bg-blue-500' : ''} `}
                                >
                                  {track.name} {track.lang && `(${track.lang})`}
                                </button>
                              ))}
                            </>
                          )}

                          {activeSettingsMenu === 'subtitles' && (
                            <>
                              <button
                                onClick={() => handleSubtitleTrackChange(null)}
                                data-focusable="true"
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === -1 ? 'bg-blue-500' : ''} `}
                              >
                                Off
                              </button>
                              {subtitleTracks.map((track, i) => (
                                <button
                                  data-focusable="true"
                                  key={i}
                                  onClick={() => handleSubtitleTrackChange(track)}
                                  className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === i ? 'bg-blue-500' : ''} `}
                                >
                                  {track.label || `Subtitle ${i + 1}`} {track.language && `(${track.language})`}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      data-focusable="true"
                      onClick={() => channelInfo && toggleFavorite(channelInfo)}
                      className="text-white hover:text-yellow-400"
                    >
                      {isFavorite ? (
                        <svg
                          className="h-6 w-6 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ) : (
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
                          onClick={toggleMute}
                          className="text-white hover:text-blue-400"
                        >
                          {isMuted || volume === 0 ? (
                            <svg
                              className="h-6 w-6"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="h-6 w-6"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
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
                          onClick={toggleFullscreen}
                          className="text-white hover:text-blue-400"
                        >
                          {isFullscreen ? (
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 4H4v6m10 10h6v-6M4 20l6-6m4-4l6-6"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
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
          ) : (
            // --- EXISTING MOVIE/SERIES CONTROLS ---
            <div
              className="pointer-events-auto absolute bottom-0 left-0 right-0 p-4"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0) 100%)',
              }}
            >
              {/* Seek Bar */}
              <div className="relative w-full">
                {isTooltipVisible && (
                  <div
                    className="absolute bottom-full mb-2 rounded bg-black bg-opacity-75 px-2 py-1 text-xs text-white"
                    style={{
                      left: `${hoverPosition} px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
                <input
                  ref={seekBarRef}
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onMouseDown={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  onChange={handleSeekChange}
                  onMouseMove={handleSeekBarHover}
                  onMouseEnter={() => setIsTooltipVisible(true)}
                  onMouseLeave={() => setIsTooltipVisible(false)}
                  className="range-sm h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
                  style={{ accentColor: '#3b82f6' }}
                  data-focusable="true"
                  data-control="seekbar"
                />
              </div>

              {/* Button Row */}
              <div className="mt-2 flex items-center justify-between text-white">
                {/* Left Controls (Play, Skip, Time) */}
                <div className="flex items-center space-x-4">
                  <button
                    data-focusable="true"
                    data-control="play-pause"
                    onClick={togglePlayPause}

                    className="text-white hover:text-blue-400"
                  >
                    {isPlaying ? (
                      <svg
                        className="h-8 w-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="h-8 w-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
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
                      onClick={() => handleSkipButtonClick(-30)}
                      className="text-white hover:text-blue-400"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 19l-7-7 7-7"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 19l-7-7 7-7"
                        ></path>
                      </svg>
                    </button>
                    <button
                      data-focusable="true"
                      onClick={() => handleSkipButtonClick(30)}
                      className="text-white hover:text-blue-400"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 5l7 7-7 7"
                        ></path>
                      </svg>
                    </button>
                  </div>
                  <span className="font-mono text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right Controls (Mute, Fit, Subs, Fullscreen) */}
                <div className="flex items-center space-x-4">
                  {!isTizen && (
                    <>
                      <button
                        data-focusable="true"
                        onClick={toggleMute}
                        className="text-white hover:text-blue-400"
                      >
                        {isMuted || volume === 0 ? (
                          <svg
                            className="h-6 w-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                              clipRule="evenodd"
                            ></path>
                          </svg>
                        )}
                      </button>
                    </>
                  )}

                  <div className="relative">
                    {/* --- ADD CAST BUTTON HERE --- */}
                    {!isReceiver && (
                      <button
                        data-focusable="true"
                        onClick={() => {
                          if (isSettingsMenuOpen && activeSettingsMenu === 'cast') {
                            setIsSettingsMenuOpen(false);
                          } else {
                            setIsSettingsMenuOpen(true);
                            setActiveSettingsMenu('cast');
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
                            setActiveSettingsMenu('main');
                          } else {
                            toggleSettingsMenu();
                          }
                        }}
                        className="text-white hover:text-blue-400"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106A1.532 1.532 0 0111.49 3.17zM10 13a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                    {/* --- ADD SETTINGS MENU --- */}
                    {isSettingsMenuOpen && (
                      <div
                        ref={settingsMenuRef}
                        className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-gray-800 bg-opacity-90 py-1 text-sm text-white"
                      >
                        {activeSettingsMenu === 'main' && (
                          <>
                            {videoLevels.length > 1 && (
                              <button
                                onClick={() => setActiveSettingsMenu('quality')}
                                className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                data-focusable="true"
                              >
                                Quality
                              </button>
                            )}
                            {audioTracks.length > 1 && (
                              <button
                                onClick={() => setActiveSettingsMenu('audio')}
                                className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                data-focusable="true"
                              >
                                Audio
                              </button>
                            )}
                            {subtitleTracks.length > 0 && (
                              <button
                                onClick={() =>
                                  setActiveSettingsMenu('subtitles')
                                }
                                className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                data-focusable="true"
                              >
                                Subtitles
                              </button>
                            )}
                            {!isReceiver && (
                              <button
                                onClick={() => setActiveSettingsMenu('cast')}
                                className="block w-full px-4 py-2 text-left hover:bg-gray-700"
                                data-focusable="true"
                              >
                                <div className="flex items-center">
                                  <FaChromecast className="mr-2" /> Cast to Device
                                </div>
                              </button>
                            )}
                          </>
                        )}

                        {activeSettingsMenu === 'cast' && (
                          <>
                            <button
                              onClick={() => setActiveSettingsMenu('main')}
                              className="block w-full px-4 py-2 text-left text-gray-400 hover:bg-gray-700 border-b border-gray-600 mb-1"
                            >
                              ← Back
                            </button>
                            {receivers.length === 0 ? (
                              <div className="px-4 py-2 text-gray-400 text-xs">No devices found</div>
                            ) : (
                              receivers.map((device) => (
                                <button
                                  key={device.id}
                                  onClick={() => handleCast(device.id)}
                                  className="block w-full px-4 py-2 text-left hover:bg-gray-700 truncate"
                                  data-focusable="true"
                                >
                                  {device.name}
                                </button>
                              ))
                            )}
                          </>
                        )}

                        {activeSettingsMenu === 'quality' && (
                          <>
                            <button
                              onClick={() => handleVideoLevelChange(-1)}
                              className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === -1 ? 'bg-blue-500' : ''} `}
                              data-focusable="true"
                            >
                              Auto
                            </button>
                            {videoLevels.map((level, index) => (
                              <button
                                key={String(level.url) + index}
                                onClick={() => handleVideoLevelChange(index)}
                                data-focusable="true"
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === index ? 'bg-blue-500' : ''} `}
                              >
                                {level.height}p{' '}
                                {level.bitrate > 0 &&
                                  `(${(level.bitrate / 1000000).toFixed(1)} Mbps)`}
                              </button>
                            ))}
                          </>
                        )}

                        {activeSettingsMenu === 'audio' && (
                          <>
                            {audioTracks.map((track) => (
                              <button
                                key={track.id}
                                data-focusable="true"
                                onClick={() => handleAudioTrackChange(track.id)}
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentAudioTrack === track.id ? 'bg-blue-500' : ''} `}
                              >
                                {track.name} {track.lang && `(${track.lang})`}
                              </button>
                            ))}
                          </>
                        )}

                        {activeSettingsMenu === 'subtitles' && (
                          <>
                            <button
                              onClick={() => handleSubtitleTrackChange(null)}
                              data-focusable="true"
                              className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === -1 ? 'bg-blue-500' : ''} `}
                            >
                              Off
                            </button>
                            {subtitleTracks.map((track, i) => (
                              <button
                                data-focusable="true"
                                key={i}
                                onClick={() => handleSubtitleTrackChange(track)}
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === i ? 'bg-blue-500' : ''} `}
                              >
                                {track.label || `Subtitle ${i + 1}`} {track.language && `(${track.language})`}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    data-focusable="true"
                    onClick={cycleFitMode}
                    className="w-16 text-center text-xs font-semibold uppercase text-white hover:text-blue-400"
                  >
                    {fitMode === 'contain' && 'Fit'}
                    {fitMode === 'cover' && 'Fill'}
                    {fitMode === 'fill' && 'Stretch'}
                  </button>

                  {!isTizen && (
                    <>
                      <input
                        data-focusable="true"
                        data-control="volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="range-sm h-1 w-24 cursor-pointer appearance-none rounded-lg bg-gray-600"
                        style={{ accentColor: '#3b82f6' }}
                      />
                      <button
                        data-focusable="true"
                        onClick={toggleFullscreen}
                        className="text-white hover:text-blue-400"
                      >
                        {isFullscreen ? (
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 4H4v6m10 10h6v-6M4 20l6-6m4-4l6-6"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
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
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
