/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime } from '../utils/helpers';
import Hls from 'hls.js';
import { toast } from 'react-toastify';

import type { ContextType, MediaItem } from '../types';
import TvChannelList from './TvChannelList';

interface Subtitle {
    language: string;
    url: string;
}

interface VideoPlayerProps {
    streamUrl: string | null;
    rawStreamUrl: string | null;
    onBack: () => void;
    itemId: string | null;
    subtitles?: Subtitle[];
    context: ContextType;
    contentType: 'movie' | 'series'|"tv";
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl, rawStreamUrl, onBack, itemId, subtitles: initialSubtitles, contentType, mediaId, item, seriesItem ,channels,
    previewChannelInfo,
    channelInfo,
    onNextChannel,
    onPrevChannel,
    onChannelSelect}) => {
    const isTizen = !!(window as any).tizen;
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
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
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [seeking, setSeeking] = useState(false);
    const [useProxy, setUseProxy] = useState((window as any).tizen ? false : true);
    const [hoverTime, setHoverTime] = useState(0);
    const [hoverPosition, setHoverPosition] = useState(0);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
    const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
    const [cursorVisible, setCursorVisible] = useState(true);
    const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const seekBuffer = useRef(0);
    const seekApplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playButtonRef = useRef<HTMLButtonElement>(null);
    const [showChannelList, setShowChannelList] = useState(false);


    useEffect(() => {
        const videoElement = videoRef.current;
        const urlToPlay = useProxy ? streamUrl : rawStreamUrl;

        if (!videoElement || !urlToPlay) return;

        const initializePlayer = () => {
            if (contentType !== 'tv') {
                const savedTime = localStorage.getItem(`video-progress-${itemId}`);
                if (savedTime) {
                    videoElement.currentTime = 
parseFloat(savedTime);
                }
            }

            // This line will now work because Hls is a value
            if (Hls.isSupported()) { 
                if (hlsInstance.current) {
                    hlsInstance.current.destroy();
                }
                const hls = new Hls({ // This will also work
                   // 1. Start playing after 15s of video (half your old setting)
                    maxBufferLength: 15,
                    
                    // 2. Keep the max buffer smaller (30s) to save memory
                    maxMaxBufferLength: 30,
                    
                    // 3. Tell HLS to assume a lower starting bandwidth (500kbps)
                    // This forces it to load a lower-quality stream first, which is faster.
                    abrEwmaDefaultEstimate: 500000,
                    ...(contentType === 'tv' && {
                        liveSyncDuration: 10,
                        liveMaxLatencyDuration: 20,
                        maxBufferLength: 10,
                        maxMaxBufferLength: 20,
                    })
                });
                hlsInstance.current = hls;
                hls.loadSource(urlToPlay);
                hls.attachMedia(videoElement);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { videoElement.play(); });
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
                                if (data.details === 'bufferAppendError' && streamUrl && rawStreamUrl) {
                                    errorMessage = 'Buffer append error. Trying the other stream source...';
                                    toast.warn(errorMessage);
                                    setUseProxy(prev => !prev); // Keep the source switching
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
                    const savedTime = localStorage.getItem(`video-progress-${itemId}`);
                    if (savedTime) {
                        videoElement.currentTime = parseFloat(savedTime);
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
            }
            else if (!seeking) {
                if (video.duration && video.duration > 0) {
                    setProgress((video.currentTime / video.duration) * 100);
                } else {
                    setProgress(0); // Force progress to 0 if duration is NaN or 0
                }
            }
            if (contentType !== 'tv') {
                setCurrentTime(video.currentTime);
            }

      
           if (contentType !== 'tv' &&video.duration > 0 && mediaId && itemId) {
                const progressPercentage = (video.currentTime / video.duration) * 100;

                // This is the JSON object for MediaCard (Movies or Series)
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
                    // --- COMPLETED ---

                    if (seriesItem) {
                        // --- IT'S A SERIES EPISODE ---
                        
                        // 1. Mark the episode as 'completed' (for EpisodeCard)
                        localStorage.setItem(`video-completed-${itemId}`, 'true');
                        localStorage.removeItem(`video-in-progress-${itemId}`);
                        
                        // 2. Mark the SERIES as 'in-progress' (for MediaCard)
                        //    This ensures the series card stays yellow, not green.
                        localStorage.setItem(`video-in-progress-${mediaId}`, mediaProgressData);
                        localStorage.removeItem(`video-completed-${mediaId}`); // Remove any old 'completed' flag

                    } else {
                        // --- IT'S A MOVIE ---
                        // Mark the movie as 'completed'
                        localStorage.setItem(`video-completed-${mediaId}`, mediaProgressData);
                        localStorage.removeItem(`video-in-progress-${mediaId}`);
                    }

                } else if (progressPercentage > 2) {
                    // --- IN-PROGRESS ---

                    // 1. Mark the media (Movie OR Series) as 'in-progress'
                    localStorage.setItem(`video-in-progress-${mediaId}`, mediaProgressData);
                    localStorage.removeItem(`video-completed-${mediaId}`);

                    if (seriesItem) {
                        // 2. Mark the episode as 'in-progress'
                        localStorage.setItem(`video-in-progress-${itemId}`, 'true');
                        localStorage.removeItem(`video-completed-${itemId}`);
                    }
                }
            }

            // This part is for resuming playback time, which is working correctly
            if(contentType!=="tv"){
                const now = Date.now();
            if (now - lastSaveTime.current > 5000) {
                localStorage.setItem(`video-progress-${itemId}`, String(video.currentTime));
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
                console.error(`Video Error (code ${video.error.code}): ${video.error.message}`);
                let errorMessage = `An error occurred (Code: ${video.error.code})`;
                switch (video.error.code) {
                    case video.error.MEDIA_ERR_ABORTED:
                        errorMessage = 'Video playback aborted.';
                        toast.info(errorMessage); // This is usually user-initiated
                        onBack();
                        break;
                    case video.error.MEDIA_ERR_NETWORK:
                        errorMessage = 'A network error caused the video download to fail. Retrying...';
                        toast.warn(errorMessage);
                        if (hlsInstance.current) {
                            hlsInstance.current.startLoad();
                        }
                        break;
                    case video.error.MEDIA_ERR_DECODE:
                        errorMessage = 'The video playback was aborted due to a corruption problem.';
                        if (streamUrl && rawStreamUrl) {
                            errorMessage += ' Attempting to recover by switching source...';
                            toast.warn(errorMessage);
                            setUseProxy(prev => !prev);
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
                            setUseProxy(prev => !prev);
                        } else {
                            errorMessage = 'The video could not be loaded because the format is not supported.';
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
    }, [seeking, itemId, streamUrl, rawStreamUrl, contentType, mediaId, item, seriesItem, onBack]);

    

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

    const applySeekBuffer = useCallback((amount: number) => {
        if (seekApplyTimer.current) clearTimeout(seekApplyTimer.current);
        seekBuffer.current += amount;

        const video = videoRef.current;
        const seekBar = seekBarRef.current;
        if (video && isFinite(video.duration) && seekBar) {
            const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seekBuffer.current));
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
    }, [skip]);

    const handleSkipButtonClick = useCallback((seconds: number) => {
        const video = videoRef.current;
        const seekBar = seekBarRef.current;
        if (video && isFinite(video.duration) && seekBar) {
            const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
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
    }, [skip]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // If channel list is open, stop propagation and let the list handle keys
            if (showChannelList) {
                e.stopPropagation();
                return;
            }

            showControlsAndCursor();
            e.stopPropagation();
            const focusable = Array.from(playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') || []) as HTMLElement[];
            if (focusable.length === 0) return;

            const currentIndex = focusedIndex === null ? 0 : focusedIndex;
            const focusedElement = focusable[currentIndex];

            switch (e.keyCode) {
              case 37: // LEFT
                e.preventDefault();
                if (
                  contentType === "tv" &&
                  focusedElement &&
                  focusedElement.getAttribute("data-control") !== "seekbar"
                ) {
                  onPrevChannel?.();
                  showControlsAndCursor(); // Show controls on channel change
                } else if (
                  focusedElement &&
                  focusedElement.getAttribute("data-control") === "seekbar"
                ) {
                  applySeekBuffer(-10);
                } else if (currentIndex > 0) {
                  setFocusedIndex(currentIndex - 1);
                }
                break;
              case 39: // RIGHT
                e.preventDefault();
                if (
                  contentType === "tv" &&
                  focusedElement &&
                  focusedElement.getAttribute("data-control") !== "seekbar"
                ) {
                  onNextChannel?.();
                  showControlsAndCursor(); // Show controls on channel change
                } else if (
                  focusedElement &&
                  focusedElement.getAttribute("data-control") === "seekbar"
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
                if (contentType === "tv") {
                  onPrevChannel?.();
                } else {
                  handleSkipButtonClick(-30);
                }
                break;
              case 417: // NEXT
                e.preventDefault();
                if (contentType === "tv") {
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

        // --- THIS IS THE FIX ---
        // Attach to the document to capture all keys while the player is active
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
        // --- END FIX ---

    }, [focusedIndex, skip, togglePlayPause, showControlsAndCursor, applySeekBuffer, handleSkipButtonClick, handleBack, showChannelList, contentType, onPrevChannel, onNextChannel]);

  
    useEffect(() => {
        if (showChannelList) return;
        const focusable = Array.from(playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') || []) as HTMLElement[];
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
    }, [focusedIndex,showChannelList]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            if (!isFs) {
                // Exited fullscreen, let's ensure focus is correct
                if (focusedIndex !== null) {
                    const focusable = Array.from(playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') || []) as HTMLElement[];
                    const elementToFocus = focusable[focusedIndex];
                    if (elementToFocus) {
                        elementToFocus.focus();
                    }
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [focusedIndex]);


    useEffect(() => {
        if (initialSubtitles) {
            setSubtitles(initialSubtitles);
            const englishSubtitle = initialSubtitles.find(s => s.language.toLowerCase() === 'english');
            if (englishSubtitle) {
                setSelectedSubtitle(englishSubtitle.url);
            } else if (initialSubtitles.length > 0) {
                setSelectedSubtitle(initialSubtitles[0].url);
            }
        }
    }, [initialSubtitles]);

    const handleSubtitleChange = (url: string | null) => {
        setSelectedSubtitle(url);
        if (url) {
            setSubtitlesEnabled(true);
        } else {
            setSubtitlesEnabled(false);
        }
        setIsSubtitleMenuOpen(false);
    };

    const toggleSubtitleMenu = () => {
        setIsSubtitleMenuOpen(!isSubtitleMenuOpen);
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Clear existing text tracks
        Array.from(video.textTracks).forEach(track => {
            track.mode = 'disabled';
        });

        if (subtitlesEnabled && selectedSubtitle) {
            const trackExists = Array.from(video.textTracks).find(t => t.language === selectedSubtitle);
            if (trackExists) {
                trackExists.mode = 'showing';
            } else {
                const track = document.createElement('track');
                const subtitleInfo = subtitles.find(s => s.url === selectedSubtitle);
                if (subtitleInfo) {
                    track.src = subtitleInfo.url;
                    track.label = subtitleInfo.language;
                    track.srclang = subtitleInfo.language;
                    track.default = true;
                    // track.mode = 'showing';
                    video.appendChild(track);
                }
            }
        }
    }, [selectedSubtitle, subtitlesEnabled, subtitles]);

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
            const seekTime = (Number((e.target as HTMLInputElement).value) / 100) * video.duration;
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
                elem.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        showControlsAndCursor();

        // Focus on the play/pause button after a short delay to allow the UI to update
        setTimeout(() => {
            const focusable = Array.from(playerContainerRef.current?.querySelectorAll('[data-focusable="true"]') || []) as HTMLElement[];
            const playPauseButtonIndex = focusable.findIndex(el => el.getAttribute('data-control') === 'play-pause');
            if (playPauseButtonIndex !== -1) {
                 setFocusedIndex(playPauseButtonIndex);
            } else {
                playerContainerRef.current?.focus();
            }
        }, 100);
        
        toggleFullscreen();
    }, [showControlsAndCursor, toggleFullscreen]);

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
        <div className="w-full max-w-5xl mx-auto mt-4" data-focusable="true" tabIndex={-1}>
            <div className="flex items-center space-x-4 mb-4">
                <button data-focusable="true" onClick={handleBack} className="bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to List
                </button>
                <button data-focusable="true" onClick={handleCopyLink} className="bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center relative">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <label htmlFor="proxy-switch" className="flex items-center cursor-pointer" data-focusable="true">
                    <span className="mr-2 text-white">Use Proxy</span>
                    <div className="relative">
                        <input id="proxy-switch" type="checkbox" className="sr-only peer" checked={useProxy} onChange={() => setUseProxy(!useProxy)} />
                        <div className="w-10 h-6 bg-gray-600 rounded-full peer-checked:bg-blue-500"></div>
                        <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                    </div>
                </label>
            </div>
            <div ref={playerContainerRef} onMouseMove={handleMouseMove} onMouseLeave={() => {
                setIsTooltipVisible(false);
                setControlsVisible(false);
                setCursorVisible(false); // Hide cursor immediately on mouse leave
                if (cursorTimeoutRef.current) {
                    clearTimeout(cursorTimeoutRef.current);
                }
            }} className={`relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl group ${!cursorVisible && !controlsVisible ? 'cursor-none' : ''}`}>
                {/* Channel List Overlay */}
                {showChannelList && contentType === 'tv' && channels && onChannelSelect && (
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
                <video ref={videoRef} crossOrigin='anonymous' autoPlay playsInline className="w-full h-full" onClick={togglePlayPause} onDoubleClick={toggleFullscreen} />

                {previewChannelInfo && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div className="bg-black bg-opacity-75 p-6 rounded-lg shadow-xl">
                            <h2 className="text-5xl font-bold text-white text-center">
                                {previewChannelInfo.number}
                            </h2>
                            <h3 className="text-2xl text-gray-200 text-center mt-2">
                                {previewChannelInfo.name}
                            </h3>
                        </div>
                    </div>
                )}

                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="relative w-16 h-16">
                            <div className="absolute w-full h-full bg-blue-400 rounded-full opacity-75 animate-ping"></div>
                            <div className="relative w-full h-full bg-blue-500 rounded-full"></div>
                        </div>
                    </div>
                )}

                <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${controlsVisible || isBuffering ? 'opacity-100' : 'opacity-0'} z-20`}>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black via-black/70 to-transparent">
                        {contentType!=="tv"&&<div className="relative w-full pointer-events-auto">
                            {isTooltipVisible && (
                                <div
                                    className="absolute bottom-full mb-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded"
                                    style={{ left: `${hoverPosition}px`, transform: 'translateX(-50%)' }}
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
                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                                style={{ accentColor: '#3b82f6' }}
                                data-focusable="true"
                                data-control="seekbar"
                            />
                        </div>}

                        <div className="flex items-center justify-between text-white mt-2 pointer-events-auto">
                            <div className="flex items-center space-x-4">
                                <button data-focusable="true" data-control="play-pause" onClick={togglePlayPause} ref={playButtonRef} className="text-white hover:text-blue-400">
                                    {isPlaying ?
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg> :
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>}
                                </button>
                                <div className="flex items-center space-x-2">
                                    {contentType==="tv"?<>
                                            <button data-focusable="true" onClick={onPrevChannel} className="text-white hover:text-blue-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                            </button>
                                            <button data-focusable="true" onClick={() => setShowChannelList(true)} className="text-white hover:text-blue-400">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                            </button>
                                            <button data-focusable="true" onClick={onNextChannel} className="text-white hover:text-blue-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                            </button>
                                        </>:<><button data-focusable="true" onClick={() => handleSkipButtonClick(-30)} className="text-white hover:text-blue-400">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 19l-7-7 7-7"></path></svg>
                                        </button><button data-focusable="true" onClick={() => handleSkipButtonClick(30)} className="text-white hover:text-blue-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 5l7 7-7 7"></path></svg>
                                            </button></>}
                                </div>
                               {contentType === 'tv' && (previewChannelInfo || channelInfo) ? (
                                    <span className="font-semibold text-sm truncate max-w-xs">
                                        {/* Show preview name, or fall back to current channel name */}
                                        {previewChannelInfo ? previewChannelInfo.name : channelInfo?.name}
                                    </span>
                                ) : (
                    <span className="font-mono text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                )}
                            </div>
                            <div className="flex items-center space-x-4">
                                {!isTizen && <button data-focusable="true" onClick={toggleMute} className="text-white hover:text-blue-400">
                                    {isMuted || volume === 0 ?
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg> :
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"></path></svg>}
                                </button>}
                                {subtitles && subtitles.length > 0 && (
                                    <div className="relative">
                                        <button data-focusable="true" onClick={toggleSubtitleMenu} className="text-white hover:text-blue-400">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1H3zm2 4a1 1 0 011-1h2a1 1 0 110 2H6a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H6a1 1 0 01-1-1zm5-4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                        </button>
                                        {isSubtitleMenuOpen && (
                                            <div className="absolute bottom-full right-0 mb-2 bg-gray-800 bg-opacity-90 rounded-lg py-1 text-white text-sm">
                                                <button onClick={() => handleSubtitleChange(null)} className={`block w-full text-left px-4 py-2 hover:bg-gray-700 ${!selectedSubtitle ? 'bg-blue-500' : ''}`}>
                                                    Off
                                                </button>
                                                {subtitles.map(subtitle => (
                                                    <button key={subtitle.url} onClick={() => handleSubtitleChange(subtitle.url)} className={`block w-full text-left px-4 py-2 hover:bg-gray-700 ${selectedSubtitle === subtitle.url ? 'bg-blue-500' : ''}`}>
                                                        {subtitle.language}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!isTizen && (
                                    <input data-focusable="true" data-control="volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm" style={{ accentColor: '#3b82f6' }} />
                                )}
                                <button data-focusable="true" onClick={toggleFullscreen} className="text-white hover:text-blue-400">
                                    {isFullscreen ?
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4H4v6m10 10h6v-6M4 20l6-6m4-4l6-6"></path></svg> :
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5"></path></svg>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;