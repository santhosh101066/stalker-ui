import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMedia, getSeries, getMovieUrl } from '@/services/services';
import { BASE_URL, URL_PATHS } from '@/services/api';
import type { MediaItem, ContextType, HistoryState } from '@/types';
import { isTizenDevice } from '@/utils/helpers';
import { initialContext } from './useMediaLibrary';

export function useAppNavigation(
    context: ContextType,
    items: MediaItem[],
    contentType: 'movie' | 'series' | 'tv',
    fetchData: Function,
    isPortal: boolean,
    addToRecentChannels: (item: MediaItem) => void,
    playLastTvChannel: string | null,
    setPlayLastTvChannel: (value: string | null) => void
) {
    const isTizen = isTizenDevice()
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
    const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
    const [currentSeriesItem, setCurrentSeriesItem] = useState<MediaItem | null>(null);
    const [resumePlaybackState, setResumePlaybackState] = useState<{ currentTime?: number } | undefined>(undefined);
    const [previewChannel, setPreviewChannel] = useState<MediaItem | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const channelChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleItemClick = useCallback(async (item: MediaItem) => {
        if (contentType === 'tv' && streamUrl && currentItem?.id === item.id) return;

        if (channelChangeTimer.current) {
            clearTimeout(channelChangeTimer.current);
            channelChangeTimer.current = null;
        }
        setPreviewChannel(null);

        const pushHistory = () => {
            setHistory((prev) => [...prev, { context, items, totalItemsCount: items.length, focusedIndex: focusedIndex ?? 0, currentSeriesItem }]);
        };

        const displayTitle = item.title || item.name || '';
        let savedResumeTime: number | undefined;

        if (item.is_continue_watching) {
            try {
                const raw = localStorage.getItem(`video-in-progress-${item.id}`);
                if (raw) {
                    const entry = JSON.parse(raw);
                    if (entry.currentTime && entry.currentTime > 2) savedResumeTime = entry.currentTime;
                }
            } catch (_) { }
        }

        // Continue Watching Fast-Path
        if (item.is_continue_watching) {
            // setLoading(true);
            setCurrentItem(item);
            try {
                // Step 1: Stored ID and Series Number (if any)-a eduthu fresh URL fetch panrom
                const urlParams: Record<string, any> = { id: item.id };
                if (item.series_number !== undefined) urlParams.series = item.series_number;

                const linkData = await getMovieUrl(urlParams);
                const freshCmd = linkData?.js?.cmd || linkData?.cmd;

                if (typeof freshCmd === 'string') {
                    // Fresh-ana URL kedaichiduchu! 🚀
                    setRawStreamUrl(freshCmd);
                    setStreamUrl(`${BASE_URL}/proxy?url=${btoa(freshCmd)}`);

                    // Resume position-a apply panrom
                    if (savedResumeTime) {
                        setResumePlaybackState({ currentTime: savedResumeTime });
                    } else {
                        setResumePlaybackState(undefined);
                    }
                } else {
                    throw new Error('Fresh stream URL not found.');
                }
            } catch (err) {
                console.error(err);
                toast.error('Link expired or server busy. Finding it in library...');
                // Inga venum na normal flow-ku redirect pannalam
            } finally {
                // setLoading(false);
            }
            return;
        }

        const isInsideMovieCategory = contentType === 'movie' && context.category !== null;

        if (item.is_series == 1) {
            pushHistory();
            setCurrentSeriesItem(item);
            setResumePlaybackState(undefined);
            fetchData({ ...initialContext, category: '*', movieId: item.id, parentTitle: displayTitle, contentType });
        } else if (!isInsideMovieCategory && contentType === 'movie') {
            pushHistory();
            fetchData({ ...initialContext, category: item.id.toString(), parentTitle: displayTitle, contentType });
        } else if (item.is_season) {
            pushHistory();
            fetchData({ ...initialContext, category: context.category, movieId: context.movieId, seasonId: item.id, parentTitle: displayTitle, contentType });
        } else if (item.is_episode) {
            setCurrentItem(item);
            try {
                let episodeFiles: MediaItem[] = [];
                if (contentType === 'series') {
                    const response = await getSeries({ movieId: context.movieId, seasonId: context.seasonId, episodeId: item.id });
                    episodeFiles = response.data;
                } else {
                    const response = await getMedia({ movieId: context.movieId, seasonId: context.seasonId, episodeId: item.id, category: '*' });
                    episodeFiles = response.data;
                }

                if (episodeFiles && episodeFiles.length > 0) {
                    const episodeFile = episodeFiles[0];
                    if (!isPortal && episodeFile.cmd) {
                        setRawStreamUrl(episodeFile.cmd);
                        setStreamUrl(`${BASE_URL}/proxy?url=${btoa(episodeFile.cmd)}`);
                        setResumePlaybackState(savedResumeTime ? { currentTime: savedResumeTime } : undefined);
                    } else {
                        const urlParams: Record<string, any> = { id: episodeFile.id };
                        if (item.series_number !== undefined) urlParams.series = item.series_number;
                        const linkData = await getMovieUrl(urlParams);
                        const cmd = linkData?.js?.cmd || linkData?.cmd;
                        if (typeof cmd === 'string') {
                            setRawStreamUrl(cmd);
                            setStreamUrl(`${BASE_URL}/proxy?url=${btoa(cmd)}`);
                            setResumePlaybackState(savedResumeTime ? { currentTime: savedResumeTime } : undefined);
                        }
                    }
                }
            } catch (err) {
                toast.error('Could not fetch stream URL.');
                setCurrentItem(null);
                setHistory((prev) => prev.slice(0, -1));
            }
        }else if (isInsideMovieCategory || item.is_playable_movie) {
        
        // --- STEP 1: Always fetch fresh details to get the REAL Playable ID ---
        // setLoading(true);
        try {
          const response = await getMedia({
            movieId: item.id,
            category: context.category || '*',
          });
          const files = response.data;

          if (files && files.length > 0) {
            const movieFile = files[0]; // Intha movieFile-la thaan correct ID irukkum!

            // --- STEP 2: Use the real movieFile for tracking ---
            setCurrentItem(movieFile); // Ippo local storage-la correct ID vizhum ✅

            // --- STEP 3: Handle Playback (Xtream vs Stalker) ---
            if (!isPortal && movieFile.cmd) {
              // Xtream na direct-a play pannidalam
              setRawStreamUrl(movieFile.cmd);
              setStreamUrl(`${BASE_URL}/proxy?url=${btoa(movieFile.cmd)}`);
            } else {
              // Stalker na fresh stream URL fetch pannuvom
              const linkData = await getMovieUrl({ id: movieFile.id });
              const freshCmd = linkData?.js?.cmd || linkData?.cmd;

              if (typeof freshCmd === 'string') {
                setRawStreamUrl(freshCmd);
                setStreamUrl(`${BASE_URL}/proxy?url=${btoa(freshCmd)}`);
              } else {
                throw new Error('Movie stream URL not found.');
              }
            }

            // Resume timing logic
            if (savedResumeTime) {
              setResumePlaybackState({ currentTime: savedResumeTime });
            } else {
              setResumePlaybackState(undefined);
            }

          } else {
            throw new Error('Movie file could not be found.');
          }
        } catch (err: unknown) {
          console.error(err);
          toast.error('Could not fetch stream details.');
          setCurrentItem(null);
        } finally {
        //   setLoading(false);
        }
      }else if (contentType === 'tv') {
            if (channelChangeTimer.current) {
                clearTimeout(channelChangeTimer.current);
                channelChangeTimer.current = null;
            }
            setPreviewChannel(null);
            if (!item.cmd) {
                toast.error('Channel has no command to play.');
                return;
            }
            const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
            const channelUrl = `${baseUrl}/live.m3u8?cmd=${item.cmd}&id=${item.id}&proxy=1`;
            localStorage.setItem('lastPlayedTvChannelId', item.id.toString());
            setCurrentItem(item);
            addToRecentChannels(item);
            setRawStreamUrl(channelUrl);
            setStreamUrl(channelUrl);
        } else {
            fetchData({ ...initialContext, category: item.id, parentTitle: displayTitle, contentType });
        }
    }, [contentType, context, currentItem, fetchData, focusedIndex, isPortal, items]);

    const closePlayer = useCallback(() => {
        if (channelChangeTimer.current) {
            clearTimeout(channelChangeTimer.current);
            channelChangeTimer.current = null;
            setPreviewChannel(null);
            return;
        }
        setStreamUrl(null);
        setRawStreamUrl(null);
        if (contentType !== 'tv') {
            setCurrentItem(null);
            setResumePlaybackState(undefined);
        }
    }, [contentType]);

    const handleBack = useCallback(() => {
        if (streamUrl) {
            closePlayer();
            return;
        }
        if (history.length > 0) {
            const lastState = history[history.length - 1];
            setHistory((prev) => prev.slice(0, -1));
            fetchData(lastState.context, lastState.context.contentType); // Re-fetch to restore state properly or update context directly
        }
    }, [streamUrl, history, closePlayer, fetchData]);
    const playCastedMedia = useCallback((media: MediaItem, castStreamUrl?: string, castRawStreamUrl?: string) => {
        setCurrentItem(media);
        if (castRawStreamUrl) setRawStreamUrl(castRawStreamUrl);
        if (castStreamUrl) {
            setStreamUrl(castStreamUrl);
        } else if (castRawStreamUrl) {
            setStreamUrl(castRawStreamUrl);
        }
    }, []);

    const debounceChannelChange = useCallback((direction: 'next' | 'prev') => {
        if (channelChangeTimer.current) clearTimeout(channelChangeTimer.current);
        const currentSelectedChannel = previewChannel || currentItem;
        if (!currentSelectedChannel) return;
        const currentIndex = items.findIndex((item) => item.id === currentSelectedChannel.id);
        if (currentIndex === -1) return;
        let newIndex = currentIndex;
        if (direction === 'next' && currentIndex < items.length - 1) newIndex = currentIndex + 1;
        else if (direction === 'prev' && currentIndex > 0) newIndex = currentIndex - 1;
        if (newIndex === currentIndex) return;

        const newPreviewChannel = items[newIndex];
        setPreviewChannel(newPreviewChannel);
        channelChangeTimer.current = setTimeout(() => {
            handleItemClick(newPreviewChannel);
            setPreviewChannel(null);
            channelChangeTimer.current = null;
        }, 2000);
    }, [currentItem, handleItemClick, items, previewChannel]);

    const handleNextChannel = useCallback(() => debounceChannelChange('next'), [debounceChannelChange]);
    const handlePrevChannel = useCallback(() => debounceChannelChange('prev'), [debounceChannelChange]);

    const handleBackRef = useRef(handleBack);

    useEffect(() => {
        handleBackRef.current = handleBack;
    }, [handleBack]);

    const navDepth = history.length + (streamUrl ? 1 : 0);
    const prevNavDepth = useRef(navDepth);
    const ignoreNextPopState = useRef(false);

    useEffect(() => {
        if (navDepth > prevNavDepth.current) {
            window.history.pushState({ depth: navDepth }, '');
        } else if (navDepth < prevNavDepth.current) {
            const currentState = window.history.state;
            if (currentState && currentState.depth > navDepth) {
                ignoreNextPopState.current = true;
                window.history.back();
            }
        }
        prevNavDepth.current = navDepth;
    }, [navDepth]);

    useEffect(() => {
        const handlePopState = () => {
            if (ignoreNextPopState.current) {
                ignoreNextPopState.current = false;
                return;
            }
            // Trigger internal back logic
            handleBackRef.current();
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (playLastTvChannel && items.length > 0 && contentType === 'tv' && isTizen) {
            const channelToPlay = playLastTvChannel === '__play_first__' ? items[0] : items.find((item) => item.id === playLastTvChannel);
            if (channelToPlay) handleItemClick(channelToPlay);
            else if (items[0]) handleItemClick(items[0]);
            setPlayLastTvChannel(null); // Itha prop vazhiya anuppi clear pannanum
        }
    }, [items, playLastTvChannel, contentType, handleItemClick]);

    return {
        history, streamUrl, rawStreamUrl, currentItem, currentSeriesItem, resumePlaybackState, previewChannel, focusedIndex,
        setFocusedIndex, handleItemClick, handleBack, closePlayer, handleNextChannel, handlePrevChannel, playCastedMedia
    };
}