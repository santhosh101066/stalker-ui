/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMedia, getMovieUrl } from '@/services/services';
import { BASE_URL, URL_PATHS } from '@/services/api';
import type { MediaItem, ContextType } from '@/types';
import { isTizenDevice } from '@/utils/helpers';
import { initialContext } from './useMediaLibrary';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavFrame {
    context: ContextType;
    items: MediaItem[];
    focusedIndex: number;
    currentSeriesItem: MediaItem | null;
}

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function buildProxiedUrl(raw: string) {
    return `${BASE_URL}/proxy?url=${btoa(raw)}`;
}

async function resolveStreamUrl(
    item: MediaItem,
    isPortal: boolean,
    seriesNumber?: number
): Promise<{ raw: string; proxied: string }> {
    if (!isPortal && item.cmd) {
        return { raw: item.cmd, proxied: buildProxiedUrl(item.cmd) };
    }

    const urlParams: Record<string, any> = { id: item.id };

    // 🎯 Map series number exactly like original
    if (seriesNumber !== undefined) {
        urlParams.series = seriesNumber;
    }

    const linkData = await getMovieUrl(urlParams) as Record<string, any>;
    const raw = linkData?.js?.cmd || linkData?.cmd;
    if (typeof raw !== 'string') throw new Error('Stream URL not found.');
    return { raw, proxied: buildProxiedUrl(raw) };
}

function getResumeTime(item: MediaItem): number | undefined {
    try {
        const raw = localStorage.getItem(`video-in-progress-${item.id}`);
        if (!raw) return undefined;
        const entry = JSON.parse(raw);
        return entry.currentTime > 2 ? entry.currentTime : undefined;
    } catch {
        return undefined;
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppNavigation(
    context: ContextType,
    items: MediaItem[],
    contentType: 'movie' | 'series' | 'tv',
    fetchData: (context: ContextType, typeOverride?: 'movie' | 'series' | 'tv') => void,
    isPortal: boolean,
    addToRecentChannels: (item: MediaItem) => void,
    playLastTvChannel: string | null,
    setPlayLastTvChannel: (value: string | null) => void,
    setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>,
    setContext: React.Dispatch<React.SetStateAction<ContextType>>
) {
    const isTizen = isTizenDevice();

    // ── State ─────────────────────────────────────────────────────────────────
    const [history, setHistory] = useState<NavFrame[]>([]);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
    const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
    const [currentSeriesItem, setCurrentSeriesItem] = useState<MediaItem | null>(null);
    const [resumePlaybackState, setResumePlaybackState] = useState<{ currentTime: number } | undefined>(undefined);
    const [previewChannel, setPreviewChannel] = useState<MediaItem | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number>(0);

    const channelChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Internal helpers ──────────────────────────────────────────────────────

    const pushFrame = useCallback(() => {
        setHistory((prev) => [
            ...prev,
            { context, items, focusedIndex, currentSeriesItem },
        ]);
    }, [context, items, focusedIndex, currentSeriesItem]);

    const openPlayer = useCallback((
        item: MediaItem,
        raw: string,
        proxied: string,
        resumeTime?: number
    ) => {
        setCurrentItem(item);
        setRawStreamUrl(raw);
        setStreamUrl(proxied);
        setResumePlaybackState(resumeTime !== undefined ? { currentTime: resumeTime } : undefined);
    }, []);

    // ── Continue-watching resolution ──────────────────────────────────────────

    const playContinueWatching = useCallback(async (item: MediaItem, displayTitle: string) => {
        let savedResumeTime: number | undefined;
        try {
            const raw = localStorage.getItem(`video-in-progress-${item.id}`);
            if (raw) {
                const entry = JSON.parse(raw);
                if (entry.currentTime && entry.currentTime > 2) savedResumeTime = entry.currentTime;
                if (entry.playbackFileId) (item as any).playbackFileId = entry.playbackFileId;
            }
        } catch { /* ignore */ }

        const playbackId = (item as any).playbackFileId || (item as any).stream_id || (item as any).episode_id || (item as any).video_id || item.id;
        const mainSeriesId = (item as any).series_id || (item as any).show_id || (item as any).movie_id || item.id;
        const activeSeasonId = (item as any).season_id || (item as any).season || 1;

        const isEpisodeCWT = item.is_episode == 1 || item.is_episode === true || (item as any).season_id !== undefined || (item as any).series_id !== undefined;

        if (isEpisodeCWT && mainSeriesId) {
            const homeState: NavFrame = { context, items, focusedIndex, currentSeriesItem };
            const seasonContext: ContextType = { ...initialContext, category: '*', movieId: mainSeriesId, parentTitle: displayTitle, contentType: 'series' };
            const seasonState: NavFrame = {
                context: seasonContext,
                items: [],
                focusedIndex: 0,
                currentSeriesItem: { ...item, id: mainSeriesId, is_series: 1 } as MediaItem,
            };

            setHistory((prev) => [...prev, homeState, seasonState]);

            const episodeContext: ContextType = { ...initialContext, category: context.category, movieId: mainSeriesId, seasonId: activeSeasonId, parentTitle: displayTitle, contentType: 'series' };
            fetchData(episodeContext, 'series');
        }

        setCurrentItem({
            ...item,
            title: item.title || item.name,
            name: item.name || item.title,
        } as MediaItem);

        // 🎯 EXACTLY like original
        const urlParams: Record<string, any> = { id: playbackId };
        if (item.series_number !== undefined) {
            urlParams.series = item.series_number;
        }

        const linkData = await getMovieUrl(urlParams) as Record<string, any>;
        const freshCmd = linkData?.js?.cmd || linkData?.cmd;
        if (typeof freshCmd !== 'string') throw new Error('Fresh stream URL not found.');

        setRawStreamUrl(freshCmd);
        setStreamUrl(buildProxiedUrl(freshCmd));
        setResumePlaybackState(savedResumeTime ? { currentTime: savedResumeTime } : undefined);
    }, [context, currentSeriesItem, fetchData, focusedIndex, items]);

    // ── Main click handler ────────────────────────────────────────────────────

    const handleItemClick = useCallback(async (item: MediaItem) => {
        // 1. Basic Validation & UI Cleanup
        if (contentType === 'tv' && streamUrl && currentItem?.id === item.id) return;

        if (channelChangeTimer.current) {
            clearTimeout(channelChangeTimer.current);
            channelChangeTimer.current = null;
        }
        setPreviewChannel(null);

        const displayTitle = item.title || item.name || '';

        // 2. Continue Watching Flow
        if (item.is_continue_watching) {
            try {
                await playContinueWatching(item, displayTitle);
            } catch (err) {
                console.error(err);
                toast.error('Link expired or server busy.');
            }
            return;
        }

        const isInsideMovieCategory = contentType === 'movie' && context.category !== null;

        // 3. Navigation Logic (Series/Seasons/Categories)
        if (item.is_series == 1) {
            pushFrame(); // Old code used pushFrame for history
            setCurrentSeriesItem(item);
            setResumePlaybackState(undefined);
            fetchData({ ...initialContext, category: '*', movieId: item.id, parentTitle: displayTitle, contentType });
            return;
        }

        if (!isInsideMovieCategory && contentType === 'movie') {
            pushFrame();
            fetchData({ ...initialContext, category: item.id.toString(), parentTitle: displayTitle, contentType });
            return;
        }

        if (item.is_season) {
            pushFrame();
            fetchData({ ...initialContext, category: context.category, movieId: context.movieId, seasonId: item.id, parentTitle: displayTitle, contentType });
            return;
        }

        // 4. Playable Item: EPISODE
        if (item.is_episode) {
            try {
                const res = await getMedia({ movieId: context.movieId, seasonId: context.seasonId, episodeId: item.id, category: '*' });
                const episodeFiles = res.data;

                if (!episodeFiles?.length) throw new Error('No episode files returned.');

                const episodeFile = episodeFiles[0];
                // Enriched item-la existing metadata (image, title) ellam irukkum
                const enrichedItem = { ...episodeFile, _episodeCardId: item.id, series_number: item.series_number };

                const { raw, proxied } = await resolveStreamUrl(episodeFile, isPortal, item.series_number);

                // Resume time-a eduthu player-kku anuprom
                openPlayer(enrichedItem as any, raw, proxied, getResumeTime(item));
            } catch (err) {
                console.error(err);
                toast.error('Could not fetch stream URL.');
            }
            return;
        }

        // 5. Playable Item: MOVIE
        if (isInsideMovieCategory || item.is_playable_movie) {
            try {
                const res = await getMedia({ movieId: item.id, category: context.category || '*' });
                if (!res.data?.length) throw new Error('No movie files returned.');

                const movieFile = res.data[0];
                // Metadata missing-a avoid panna, current item details-a kooda merge pannikalam
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, cmd, ...filteredItem } = item;
                const finalMovieItem = { ...movieFile, ...filteredItem };


                const { raw, proxied } = await resolveStreamUrl(movieFile, isPortal);
                openPlayer(finalMovieItem, raw, proxied, getResumeTime(item));
            } catch (err) {
                console.error(err);
                toast.error('Could not fetch stream details.');
            }
            return;
        }

        // 6. Live TV Flow
        if (contentType === 'tv') {
            if (!item.cmd) {
                toast.error('Channel has no command to play.');
                return;
            }
            const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
            const channelUrl = `${baseUrl}/live.m3u8?cmd=${item.cmd}&id=${item.id}&proxy=1`;

            localStorage.setItem('lastPlayedTvChannelId', item.id.toString());
            addToRecentChannels(item);
            openPlayer(item, channelUrl, channelUrl);
            return;
        }

        // Default Fallback
        fetchData({ ...initialContext, category: item.id, parentTitle: displayTitle, contentType });

    }, [
        contentType, context, currentItem, fetchData, isPortal,
        openPlayer, playContinueWatching, pushFrame, streamUrl, addToRecentChannels
    ]);

    // ── Close player ──────────────────────────────────────────────────────────

    const closePlayer = useCallback(() => {
        if (channelChangeTimer.current) {
            clearTimeout(channelChangeTimer.current);
            channelChangeTimer.current = null;
            setPreviewChannel(null);
            return;
        }
        setStreamUrl(null);
        setRawStreamUrl(null);
        setCurrentItem(null);
        setResumePlaybackState(undefined);
    }, []);

    // ── Back navigation ───────────────────────────────────────────────────────

    const handleBack = useCallback(() => {
        // 1. Player open-la iruntha, atha mattum close panrom
        if (streamUrl) {
            closePlayer();
            return;
        }

        // 2. Pure History Stack Management
        if (history.length > 0) {
            // Stack-la ulla last item edukurom (Pop operation)
            const previousFrame = history[history.length - 1];

            setHistory((prev) => prev.slice(0, -1));

            // 🎯 EXACT restoration: Enna irunthutho atha apdiye set panrom. No extra conditions!
            setFocusedIndex(previousFrame.focusedIndex);
            setCurrentSeriesItem(previousFrame.currentSeriesItem); // Null-a irunthalum null, object-a irunthalum object set aagidum
            setItems(previousFrame.items);
            setContext(previousFrame.context);
            // Previous context-ku data fetch panrom
            // fetchData(previousFrame.context, previousFrame.context.contentType);
        }
    }, [streamUrl, history, closePlayer, setItems, setContext]);

    // ── Cast ──────────────────────────────────────────────────────────────────

    const playCastedMedia = useCallback((
        media: MediaItem,
        castStreamUrl?: string,
        castRawStreamUrl?: string
    ) => {
        setCurrentItem(media);
        if (castRawStreamUrl) setRawStreamUrl(castRawStreamUrl);
        setStreamUrl(castStreamUrl ?? castRawStreamUrl ?? null);
    }, []);

    // ── Channel debounce ──────────────────────────────────────────────────────

    const debounceChannelChange = useCallback((direction: 'next' | 'prev') => {
        if (channelChangeTimer.current) clearTimeout(channelChangeTimer.current);

        const activeChannel = previewChannel || currentItem;
        if (!activeChannel) return;

        const currentIndex = items.findIndex((i) => i.id === activeChannel.id);
        if (currentIndex === -1) return;

        const newIndex =
            direction === 'next' ? Math.min(currentIndex + 1, items.length - 1)
                : Math.max(currentIndex - 1, 0);

        if (newIndex === currentIndex) return;

        const nextChannel = items[newIndex];
        setPreviewChannel(nextChannel);

        channelChangeTimer.current = setTimeout(() => {
            handleItemClick(nextChannel);
            setPreviewChannel(null);
            channelChangeTimer.current = null;
        }, 2000);
    }, [currentItem, handleItemClick, items, previewChannel]);

    const handleNextChannel = useCallback(() => debounceChannelChange('next'), [debounceChannelChange]);
    const handlePrevChannel = useCallback(() => debounceChannelChange('prev'), [debounceChannelChange]);

    // ── Browser history sync ──────────────────────────────────────────────────

    const handleBackRef = useRef(handleBack);
    useEffect(() => { handleBackRef.current = handleBack; }, [handleBack]);

    const navDepth = history.length + (streamUrl ? 1 : 0);
    const prevNavDepth = useRef(navDepth);
    const ignoreNextPopState = useRef(false);

    useEffect(() => {
        if (navDepth > prevNavDepth.current) {
            window.history.pushState({ depth: navDepth }, '');
        } else if (navDepth < prevNavDepth.current) {
            const currentState = window.history.state;
            if (currentState?.depth > navDepth) {
                ignoreNextPopState.current = true;
                window.history.back();
            }
        }
        prevNavDepth.current = navDepth;
    }, [navDepth]);

    useEffect(() => {
        const onPopState = () => {
            if (ignoreNextPopState.current) {
                ignoreNextPopState.current = false;
                return;
            }
            handleBackRef.current();
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // ── Auto-play last TV channel (Tizen) ─────────────────────────────────────

    useEffect(() => {
        if (!playLastTvChannel || items.length === 0 || contentType !== 'tv' || !isTizen) return;
        const channel =
            playLastTvChannel === '__play_first__'
                ? items[0]
                : items.find((i) => i.id === playLastTvChannel) ?? items[0];
        if (channel) handleItemClick(channel);
        setPlayLastTvChannel(null);
    }, [items, playLastTvChannel, contentType, handleItemClick, isTizen, setPlayLastTvChannel]);

    // ── Public API ────────────────────────────────────────────────────────────

    return {
        history,
        streamUrl,
        rawStreamUrl,
        currentItem,
        currentSeriesItem,
        resumePlaybackState,
        previewChannel,
        focusedIndex,
        setFocusedIndex,
        handleItemClick,
        handleBack,
        closePlayer,
        handleNextChannel,
        handlePrevChannel,
        playCastedMedia,
    };
}