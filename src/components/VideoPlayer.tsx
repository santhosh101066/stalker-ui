/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime } from '../utils/helpers';
import Hls, { Level, type MediaPlaylist } from 'hls.js';
import { toast } from 'react-toastify';
import { URL_PATHS } from '../api/api'; // Import URL_PATHS

import type { ContextType, MediaItem } from '../types';
import TvChannelList from './TvChannelList';

type VideoFitMode = 'contain' | 'cover' | 'fill';
const FIT_MODES: VideoFitMode[] = ['contain', 'cover', 'fill'];

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
}) => {
  const isTizen = !!(window as any).tizen;
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLInputElement>(null);
  const hlsInstance = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveTime = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [copied, setCopied] = useState(false); // This state is no longer used but safe to keep
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [useProxy, setUseProxy] = useState(
    (window as any).tizen ? false : true
  );
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const seekBuffer = useRef(0);
  const seekApplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const [showChannelList, setShowChannelList] = useState(false);

  const [videoLevels, setVideoLevels] = useState<Level[]>([]);
  const [audioTracks, setAudioTracks] = useState<MediaPlaylist[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<MediaPlaylist[]>([]);
  const [currentVideoLevel, setCurrentVideoLevel] = useState(-1); // -1 is 'auto'
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [activeSettingsMenu, setActiveSettingsMenu] = useState<
    'main' | 'quality' | 'audio' | 'subtitles'
  >('main');

  const [fitMode, setFitMode] = useState<VideoFitMode>(() => {
    return (localStorage.getItem('videoFitMode') as VideoFitMode) || 'contain';
  });

  const liveTime = useLiveClock();

  const showSettingsButton =
    videoLevels.length > 1 ||
    audioTracks.length > 1 ||
    subtitleTracks.length > 0;

  useEffect(() => {
    localStorage.setItem('videoFitMode', fitMode);
    if (videoRef.current) {
      videoRef.current.style.objectFit = fitMode;
    }
  }, [fitMode]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const urlToPlay = useProxy ? streamUrl : rawStreamUrl;

    if (!videoElement || !urlToPlay) return;

    const initializePlayer = () => {
      if (contentType !== 'tv') {
        const savedTime = localStorage.getItem(`video-progress-${itemId}`);
        if (savedTime) {
          videoElement.currentTime = parseFloat(savedTime);
        }
      }

      if (Hls.isSupported()) {
        if (hlsInstance.current) {
          hlsInstance.current.destroy();
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          abrEwmaDefaultEstimate: 500000,
          ...(contentType === 'tv' && {
            liveSyncDuration: 10,
            liveMaxLatencyDuration: 20,
            maxBufferLength: 10,
            maxMaxBufferLength: 20,
          }),
        });
        hlsInstance.current = hls;
        hls.loadSource(urlToPlay);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          videoElement.play();
          setVideoLevels(data.levels);
          setCurrentVideoLevel(hls.currentLevel); // Set initial level
        });
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          setAudioTracks(data.audioTracks);
          setCurrentAudioTrack(hls.audioTrack);
        });
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
          setSubtitleTracks(data.subtitleTracks);
          setCurrentSubtitleTrack(hls.subtitleTrack);
        });
        // Listen for changes (e.g., ABR)
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentVideoLevel(data.level);
        });
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setCurrentAudioTrack(data.id);
        });
        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
          setCurrentSubtitleTrack(data.id);
        });
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            let errorMessage = `An error occurred: ${data.details}`;
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                errorMessage = `A network error occurred: ${data.details}. Retrying...`;
                toast.warn(errorMessage);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                errorMessage = `A media error occurred: ${data.details}`;
                if (
                  data.details === 'bufferAppendError' &&
                  streamUrl &&
                  rawStreamUrl
                ) {
                  errorMessage =
                    'Buffer append error. Trying the other stream source...';
                  toast.warn(errorMessage);
                  setUseProxy((prev) => !prev);
                } else {
                  toast.error(errorMessage);
                  hls.recoverMediaError();
                }
                break;
              default:
                errorMessage = `An unrecoverable error occurred: ${data.details}`;
                hls.destroy();
                toast.error(errorMessage);
                onBack();
                break;
            }
          }
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = urlToPlay;
        videoElement.addEventListener('loadedmetadata', () => {
          if (contentType !== 'tv') {
            const savedTime = localStorage.getItem(`video-progress-${itemId}`);
            if (savedTime) {
              videoElement.currentTime = parseFloat(savedTime);
            }
          }
          videoElement.play();
        });
      }
    };

    initializePlayer();

    return () => {
      if (hlsInstance.current) {
        hlsInstance.current.destroy();
      }
    };
  }, [streamUrl, rawStreamUrl, useProxy, itemId, contentType, onBack]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (!video) return;
      if (contentType === 'tv') {
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
      } else if (!seeking) {
        if (video.duration && video.duration > 0) {
          setProgress((video.currentTime / video.duration) * 100);
        } else {
          setProgress(0);
        }
      }
      if (contentType !== 'tv') {
        setCurrentTime(video.currentTime);
      }

      if (contentType !== 'tv' && video.duration > 0 && mediaId && itemId) {
        const progressPercentage = (video.currentTime / video.duration) * 100;
        const itemToSave = seriesItem || item;
        const mediaProgressData = JSON.stringify({
          mediaId: mediaId,
          fileId: itemId,
          type: contentType,
          title: itemToSave?.title,
          name: itemToSave?.name || itemToSave?.title,
          screenshot_uri: itemToSave?.screenshot_uri,
          is_series: itemToSave?.is_series,
        });

        if (progressPercentage > 95) {
          if (seriesItem) {
            localStorage.setItem(`video-completed-${itemId}`, 'true');
            localStorage.removeItem(`video-in-progress-${itemId}`);
            localStorage.setItem(
              `video-in-progress-${mediaId}`,
              mediaProgressData
            );
            localStorage.removeItem(`video-completed-${mediaId}`);
          } else {
            localStorage.setItem(
              `video-completed-${mediaId}`,
              mediaProgressData
            );
            localStorage.removeItem(`video-in-progress-${mediaId}`);
          }
        } else if (progressPercentage > 2) {
          localStorage.setItem(
            `video-in-progress-${mediaId}`,
            mediaProgressData
          );
          localStorage.removeItem(`video-completed-${mediaId}`);

          if (seriesItem) {
            localStorage.setItem(`video-in-progress-${itemId}`, 'true');
            localStorage.removeItem(`video-completed-${itemId}`);
          }
        }
      }

      if (contentType !== 'tv') {
        const now = Date.now();
        if (now - lastSaveTime.current > 5000) {
          localStorage.setItem(
            `video-progress-${itemId}`,
            String(video.currentTime)
          );
          lastSaveTime.current = now;
        }
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handleError = () => {
      const video = videoRef.current;
      if (video && video.error) {
        console.error(
          `Video Error (code ${video.error.code}): ${video.error.message}`
        );
        let errorMessage = `An error occurred (Code: ${video.error.code})`;
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback aborted.';
            toast.info(errorMessage);
            onBack();
            break;
          case video.error.MEDIA_ERR_NETWORK:
            errorMessage =
              'A network error caused the video download to fail. Retrying...';
            toast.warn(errorMessage);
            if (hlsInstance.current) {
              hlsInstance.current.startLoad();
            }
            break;
          case video.error.MEDIA_ERR_DECODE:
            errorMessage =
              'The video playback was aborted due to a corruption problem.';
            if (streamUrl && rawStreamUrl) {
              errorMessage += ' Attempting to recover by switching source...';
              toast.warn(errorMessage);
              setUseProxy((prev) => !prev);
            } else if (hlsInstance.current) {
              errorMessage += ' Attempting to recover...';
              toast.warn(errorMessage);
              hlsInstance.current.recoverMediaError();
            } else {
              toast.error(errorMessage);
              onBack();
            }
            break;
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'The video format is not supported.';
            if (streamUrl && rawStreamUrl) {
              errorMessage += ' Trying the other stream source...';
              toast.warn(errorMessage);
              setUseProxy((prev) => !prev);
            } else {
              errorMessage =
                'The video could not be loaded because the format is not supported.';
              toast.error(errorMessage);
              onBack();
            }
            break;
          default:
            errorMessage = `An unknown error occurred. (Code: ${video.error.code})`;
            toast.error(errorMessage);
            onBack();
            break;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [
    seeking,
    itemId,
    streamUrl,
    rawStreamUrl,
    contentType,
    mediaId,
    item,
    seriesItem,
    onBack,
  ]);

  const handleBack = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      onBack();
    }
  }, [onBack]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) video.play();
      else video.pause();
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime += seconds;
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

      const video = videoRef.current;
      const seekBar = seekBarRef.current;
      if (video && isFinite(video.duration) && seekBar) {
        const newTime = Math.max(
          0,
          Math.min(video.duration, video.currentTime + seekBuffer.current)
        );
        const newProgress = (newTime / video.duration) * 100;
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
    [skip]
  );

  const handleSkipButtonClick = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      const seekBar = seekBarRef.current;
      if (video && isFinite(video.duration) && seekBar) {
        const newTime = Math.max(
          0,
          Math.min(video.duration, video.currentTime + seconds)
        );
        const newProgress = (newTime / video.duration) * 100;
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
    [skip]
  );

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
          if (activeSettingsMenu !== 'main') {
            setActiveSettingsMenu('main');
            setFocusedIndex(0); // Reset focus to first item in main menu
          } else {
            setIsSettingsMenuOpen(false);
          }
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

      showControlsAndCursor();
      e.stopPropagation();

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
    const video = videoRef.current;
    if (video && isFinite(video.duration)) {
      const seekTime =
        (Number((e.target as HTMLInputElement).value) / 100) * video.duration;
      video.currentTime = seekTime;
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (contentType === 'tv') return;
    setProgress(Number(e.target.value));
  };

  const handleSeekBarHover = (e: React.MouseEvent<HTMLInputElement>) => {
    if (contentType === 'tv') return;
    const video = videoRef.current;
    if (video && isFinite(video.duration)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = percentage * video.duration;
      setHoverTime(time);
      setHoverPosition(x);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const newVolume = parseFloat(e.target.value);
      video.volume = newVolume;
      video.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
    }
  };

  const handleMouseMove = () => {
    showControlsAndCursor();
  };

  const toggleFullscreen = useCallback(() => {
    const elem = playerContainerRef.current;
    if (elem) {
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch((err) => {
          console.error(
            `Error attempting to enable full-screen mode: ${err.message}`
          );
        });
      } else {
        document.exitFullscreen();
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

    toggleFullscreen();
  }, [showControlsAndCursor, toggleFullscreen]);

  const cycleFitMode = () => {
    setFitMode((currentMode) => {
      const currentIndex = FIT_MODES.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % FIT_MODES.length;
      return FIT_MODES[nextIndex];
    });
  };

  const toggleSettingsMenu = () => {
    if (isSettingsMenuOpen) {
      setIsSettingsMenuOpen(false);
      setActiveSettingsMenu('main');
    } else {
      setIsSettingsMenuOpen(true);
    }
  };

  const handleVideoLevelChange = (levelIndex: number) => {
    if (hlsInstance.current) {
      hlsInstance.current.nextLevel = levelIndex;
    }
    setActiveSettingsMenu('main');
    setIsSettingsMenuOpen(false); // Close menu on selection
  };

  const handleAudioTrackChange = (trackId: number) => {
    if (hlsInstance.current) {
      hlsInstance.current.audioTrack = trackId;
    }
    setActiveSettingsMenu('main');
    setIsSettingsMenuOpen(false);
  };

  const handleSubtitleTrackChange = (trackId: number) => {
    if (hlsInstance.current) {
      hlsInstance.current.subtitleTrack = trackId;
    }
    setActiveSettingsMenu('main');
    setIsSettingsMenuOpen(false);
  };

  const handleCopyLink = () => {
    if (rawStreamUrl) {
      const tempInput = document.createElement('textarea');
      tempInput.value = rawStreamUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="h-screen w-full bg-black"
      data-focusable="true"
      tabIndex={-1}
    >
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
        className={`group relative h-full w-full overflow-hidden ${
          !cursorVisible && !controlsVisible ? 'cursor-none' : ''
        }`}
      >
        {/* Channel List Overlay */}
        {showChannelList &&
          contentType === 'tv' &&
          channels &&
          onChannelSelect && (
            <TvChannelList
              channels={channels}
              onChannelSelect={(item) => {
                if (onChannelSelect) onChannelSelect(item);
                setShowChannelList(false);
              }}
              onBack={() => setShowChannelList(false)}
              currentItemId={itemId}
            />
          )}
        <video
          ref={videoRef}
          style={{ objectFit: fitMode }}
          crossOrigin="anonymous"
          autoPlay
          playsInline
          className="h-full w-full"
          onClick={togglePlayPause}
          onDoubleClick={toggleFullscreen}
        />

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

        {isBuffering && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="relative h-16 w-16">
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></div>
              <div className="relative h-full w-full rounded-full bg-blue-500"></div>
            </div>
          </div>
        )}

        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
            controlsVisible || isBuffering ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="pointer-events-auto absolute left-0 right-0 top-0 p-4">
            <div className="flex items-center space-x-4">
              <button
                data-focusable="true"
                onClick={handleBack}
                className="flex items-center rounded-lg bg-gray-700 bg-opacity-70 px-4 py-2 text-white transition-colors hover:bg-gray-600"
              >
                <svg
                  className="mr-2 h-5 w-5"
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
                Back
              </button>

              {/* --- MODIFICATION HERE --- */}
              {!isTizen && (
                <button
                  data-focusable="true"
                  onClick={handleCopyLink}
                  className="relative flex items-center rounded-lg bg-gray-700 bg-opacity-70 px-4 py-2 text-white transition-colors hover:bg-gray-600"
                >
                  <svg
                    className="mr-2 h-5 w-5"
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
                  {copied ? 'Copied!' : 'Copy Link'}
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
                            : `${URL_PATHS.HOST}/api/images${(previewChannelInfo || channelInfo)!.screenshot_uri}`
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
                      {previewChannelInfo
                        ? previewChannelInfo.name
                        : 'Current Program'}
                    </span>
                    <span className="ml-2 flex-shrink-0 text-sm">
                      {previewChannelInfo ? '...' : 'Now'}
                    </span>
                  </div>
                  {/* Next Program */}
                  <div className="flex items-center justify-between p-1.5 px-3">
                    <span className="text-gray-200">
                      {previewChannelInfo ? '...' : 'Next Program'}
                    </span>
                    <span className="text-sm text-gray-300">...</span>
                  </div>
                </div>

                {/* Progress Bar (Placeholder) */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-600">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: '30%' }}
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
                      ref={playButtonRef}
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
                      onClick={() => setShowChannelList(true)}
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
                      {showSettingsButton && (
                        <button
                          data-focusable="true"
                          onClick={toggleSettingsMenu}
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
                            </>
                          )}

                          {activeSettingsMenu === 'quality' && (
                            <>
                              <button
                                onClick={() => handleVideoLevelChange(-1)}
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === -1 ? 'bg-blue-500' : ''}`}
                                data-focusable="true"
                              >
                                Auto
                              </button>
                              {videoLevels.map((level, index) => (
                                <button
                                  key={String(level.url) + index}
                                  onClick={() => handleVideoLevelChange(index)}
                                  data-focusable="true"
                                  className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === index ? 'bg-blue-500' : ''}`}
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
                                  className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentAudioTrack === track.id ? 'bg-blue-500' : ''}`}
                                >
                                  {track.name} {track.lang && `(${track.lang})`}
                                </button>
                              ))}
                            </>
                          )}

                          {activeSettingsMenu === 'subtitles' && (
                            <>
                              <button
                                onClick={() => handleSubtitleTrackChange(-1)}
                                data-focusable="true"
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === -1 ? 'bg-blue-500' : ''}`}
                              >
                                Off
                              </button>
                              {subtitleTracks.map((track) => (
                                <button
                                  data-focusable="true"
                                  key={track.id}
                                  onClick={() =>
                                    handleSubtitleTrackChange(track.id)
                                  }
                                  className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === track.id ? 'bg-blue-500' : ''}`}
                                >
                                  {track.name} {track.lang && `(${track.lang})`}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {!isTizen && (
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
                    )}

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
                      left: `${hoverPosition}px`,
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
                    ref={playButtonRef}
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
                  )}

                  <div className="relative">
                    {showSettingsButton && (
                      <button
                        data-focusable="true"
                        onClick={toggleSettingsMenu}
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
                          </>
                        )}

                        {activeSettingsMenu === 'quality' && (
                          <>
                            <button
                              onClick={() => handleVideoLevelChange(-1)}
                              className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === -1 ? 'bg-blue-500' : ''}`}
                              data-focusable="true"
                            >
                              Auto
                            </button>
                            {videoLevels.map((level, index) => (
                              <button
                                key={String(level.url) + index}
                                onClick={() => handleVideoLevelChange(index)}
                                data-focusable="true"
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentVideoLevel === index ? 'bg-blue-500' : ''}`}
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
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentAudioTrack === track.id ? 'bg-blue-500' : ''}`}
                              >
                                {track.name} {track.lang && `(${track.lang})`}
                              </button>
                            ))}
                          </>
                        )}

                        {activeSettingsMenu === 'subtitles' && (
                          <>
                            <button
                              onClick={() => handleSubtitleTrackChange(-1)}
                              data-focusable="true"
                              className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === -1 ? 'bg-blue-500' : ''}`}
                            >
                              Off
                            </button>
                            {subtitleTracks.map((track) => (
                              <button
                                data-focusable="true"
                                key={track.id}
                                onClick={() =>
                                  handleSubtitleTrackChange(track.id)
                                }
                                className={`block w-full px-4 py-2 text-left hover:bg-gray-700 ${currentSubtitleTrack === track.id ? 'bg-blue-500' : ''}`}
                              >
                                {track.name} {track.lang && `(${track.lang})`}
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
                  )}

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
