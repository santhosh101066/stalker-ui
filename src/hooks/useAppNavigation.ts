/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getMedia, getMovieUrl } from '@/services/services';
import { BASE_URL, URL_PATHS } from '@/services/api';
import type { MediaItem, ContextType } from '@/types';
import { isTizenDevice } from '@/utils/helpers';
import { initialContext } from './useMediaLibrary';

interface NavFrame {
  context: ContextType;
  items: MediaItem[];
  focusedIndex: number;
  currentSeriesItem: MediaItem | null;
  totalItemsCount: number;
}

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

  if (seriesNumber !== undefined) {
    urlParams.series = seriesNumber;
  }

  const linkData = (await getMovieUrl(urlParams)) as Record<string, any>;
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

export function useAppNavigation(
  context: ContextType,
  items: MediaItem[],
  contentType: 'movie' | 'series' | 'tv',
  totalItemsCount: number,
  fetchData: (
    context: ContextType,
    typeOverride?: 'movie' | 'series' | 'tv'
  ) => void,
  isPortal: boolean,
  addToRecentChannels: (item: MediaItem) => void,
  playLastTvChannel: string | null,
  setPlayLastTvChannel: (value: string | null) => void,
  setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>,
  setContext: React.Dispatch<React.SetStateAction<ContextType>>,
  setTotalItemsCount: React.Dispatch<React.SetStateAction<number>>,
  isRestoringFromHistory: React.MutableRefObject<boolean>
) {
  const isTizen = isTizenDevice();

  const [history, setHistory] = useState<NavFrame[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [currentSeriesItem, setCurrentSeriesItem] = useState<MediaItem | null>(
    null
  );
  const [resumePlaybackState, setResumePlaybackState] = useState<
    { currentTime: number } | undefined
  >(undefined);
  const [previewChannel, setPreviewChannel] = useState<MediaItem | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const channelChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushFrame = useCallback(() => {
    setHistory((prev) => [
      ...prev,
      { context, items, focusedIndex, currentSeriesItem, totalItemsCount },
    ]);
  }, [context, items, focusedIndex, currentSeriesItem, totalItemsCount]);

  const openPlayer = useCallback(
    (item: MediaItem, raw: string, proxied: string, resumeTime?: number) => {
      setCurrentItem(item);
      setRawStreamUrl(raw);
      setStreamUrl(proxied);
      setResumePlaybackState(
        resumeTime !== undefined ? { currentTime: resumeTime } : undefined
      );
    },
    []
  );

  const playContinueWatching = useCallback(
    async (item: MediaItem, displayTitle: string) => {
      let savedResumeTime: number | undefined;
      try {
        const raw = localStorage.getItem(`video-in-progress-${item.id}`);
        if (raw) {
          const entry = JSON.parse(raw);
          if (entry.currentTime && entry.currentTime > 2)
            savedResumeTime = entry.currentTime;
          if (entry.playbackFileId)
            (item as any).playbackFileId = entry.playbackFileId;
        }
      } catch {
        /* ignore */
      }

      const playbackId =
        (item as any).playbackFileId ||
        (item as any).stream_id ||
        (item as any).episode_id ||
        (item as any).video_id ||
        item.id;
      const mainSeriesId =
        (item as any).series_id ||
        (item as any).show_id ||
        (item as any).movie_id ||
        item.id;
      const activeSeasonId =
        (item as any).season_id || (item as any).season || 1;

      const isEpisodeCWT =
        item.is_episode == 1 ||
        item.is_episode === true ||
        (item as any).season_id !== undefined ||
        (item as any).series_id !== undefined;

      if (isEpisodeCWT && mainSeriesId) {
        const homeState: NavFrame = {
          context,
          items,
          focusedIndex,
          currentSeriesItem,
          totalItemsCount,
        };
        const seasonContext: ContextType = {
          ...initialContext,
          category: '*',
          movieId: mainSeriesId,
          parentTitle: displayTitle,
          contentType: 'series',
        };
        const seasonState: NavFrame = {
          context: seasonContext,
          items: [],
          focusedIndex: 0,
          currentSeriesItem: {
            ...item,
            id: mainSeriesId,
            is_series: 1,
          } as MediaItem,
          totalItemsCount: 0,
        };

        setHistory((prev) => [...prev, homeState, seasonState]);

        const episodeContext: ContextType = {
          ...initialContext,
          category: context.category,
          movieId: mainSeriesId,
          seasonId: activeSeasonId,
          parentTitle: displayTitle,
          contentType: 'series',
        };
        fetchData(episodeContext, 'series');
      }

      setCurrentItem({
        ...item,
        title: item.title || item.name,
        name: item.name || item.title,
      } as MediaItem);

      const urlParams: Record<string, any> = { id: playbackId };
      if (item.series_number !== undefined) {
        urlParams.series = item.series_number;
      }

      const linkData = (await getMovieUrl(urlParams)) as Record<string, any>;
      const freshCmd = linkData?.js?.cmd || linkData?.cmd;
      if (typeof freshCmd !== 'string')
        throw new Error('Fresh stream URL not found.');

      setRawStreamUrl(freshCmd);
      setStreamUrl(buildProxiedUrl(freshCmd));
      setResumePlaybackState(
        savedResumeTime ? { currentTime: savedResumeTime } : undefined
      );
    },
    [context, currentSeriesItem, fetchData, focusedIndex, items, totalItemsCount]
  );

  const handleItemClick = useCallback(
    async (item: MediaItem) => {
      if (contentType === 'tv' && streamUrl && currentItem?.id === item.id)
        return;

      if (channelChangeTimer.current) {
        clearTimeout(channelChangeTimer.current);
        channelChangeTimer.current = null;
      }
      setPreviewChannel(null);

      const displayTitle = item.title || item.name || '';

      if (item.is_continue_watching) {
        try {
          await playContinueWatching(item, displayTitle);
        } catch (err) {
          console.error(err);
          toast.error('Link expired or server busy.');
        }
        return;
      }

      const isInsideMovieCategory =
        contentType === 'movie' && context.category !== null;

      if (item.is_series == 1) {
        pushFrame();
        setCurrentSeriesItem(item);
        setResumePlaybackState(undefined);
        fetchData({
          ...initialContext,
          category: '*',
          movieId: item.id,
          parentTitle: displayTitle,
          contentType,
        });
        return;
      }

      if (!isInsideMovieCategory && contentType === 'movie') {
        pushFrame();
        fetchData({
          ...initialContext,
          category: item.id.toString(),
          parentTitle: displayTitle,
          contentType,
        });
        return;
      }

      if (item.is_season) {
        pushFrame();
        fetchData({
          ...initialContext,
          category: context.category,
          movieId: context.movieId,
          seasonId: item.id,
          parentTitle: displayTitle,
          contentType,
        });
        return;
      }

      if (item.is_episode) {
        try {
          const res = await getMedia({
            movieId: context.movieId,
            seasonId: context.seasonId,
            episodeId: item.id,
            category: '*',
          });
          const episodeFiles = res.data;

          if (!episodeFiles?.length)
            throw new Error('No episode files returned.');

          const episodeFile = episodeFiles[0];

          const enrichedItem = {
            ...episodeFile,
            _episodeCardId: item.id,
            series_number: item.series_number,
          };

          const { raw, proxied } = await resolveStreamUrl(
            episodeFile,
            isPortal,
            item.series_number
          );

          openPlayer(enrichedItem as any, raw, proxied, getResumeTime(item));
        } catch (err) {
          console.error(err);
          toast.error('Could not fetch stream URL.');
        }
        return;
      }

      if (isInsideMovieCategory || item.is_playable_movie) {
        try {
          const res = await getMedia({
            movieId: item.id,
            category: context.category || '*',
          });
          if (!res.data?.length) throw new Error('No movie files returned.');

          const movieFile = res.data[0];
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

      fetchData({
        ...initialContext,
        category: item.id,
        parentTitle: displayTitle,
        contentType,
      });
    },
    [
      contentType,
      context,
      currentItem,
      fetchData,
      isPortal,
      openPlayer,
      playContinueWatching,
      pushFrame,
      streamUrl,
      addToRecentChannels,
    ]
  );

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

  const handleBack = useCallback(() => {
    if (streamUrl) {
      closePlayer();
      return;
    }

    if (history.length > 0) {
      const previousFrame = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));

      isRestoringFromHistory.current = true;

      setFocusedIndex(previousFrame.focusedIndex);
      setCurrentSeriesItem(previousFrame.currentSeriesItem);
      setItems(previousFrame.items);
      setContext(previousFrame.context);
      setTotalItemsCount(previousFrame.totalItemsCount);

      setTimeout(() => {
        isRestoringFromHistory.current = false;
      }, 500);
    }
  }, [
    streamUrl,
    history,
    closePlayer,
    isRestoringFromHistory,
    setItems,
    setContext,
    setTotalItemsCount,
  ]);

  const playCastedMedia = useCallback(
    (media: MediaItem, castStreamUrl?: string, castRawStreamUrl?: string) => {
      setCurrentItem(media);
      if (castRawStreamUrl) setRawStreamUrl(castRawStreamUrl);
      setStreamUrl(castStreamUrl ?? castRawStreamUrl ?? null);
    },
    []
  );

  const debounceChannelChange = useCallback(
    (direction: 'next' | 'prev') => {
      if (channelChangeTimer.current) clearTimeout(channelChangeTimer.current);

      const activeChannel = previewChannel || currentItem;
      if (!activeChannel) return;

      const currentIndex = items.findIndex((i) => i.id === activeChannel.id);
      if (currentIndex === -1) return;

      const newIndex =
        direction === 'next'
          ? Math.min(currentIndex + 1, items.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (newIndex === currentIndex) return;

      const nextChannel = items[newIndex];
      setPreviewChannel(nextChannel);

      channelChangeTimer.current = setTimeout(() => {
        handleItemClick(nextChannel);
        setPreviewChannel(null);
        channelChangeTimer.current = null;
      }, 2000);
    },
    [currentItem, handleItemClick, items, previewChannel]
  );

  const handleNextChannel = useCallback(
    () => debounceChannelChange('next'),
    [debounceChannelChange]
  );
  const handlePrevChannel = useCallback(
    () => debounceChannelChange('prev'),
    [debounceChannelChange]
  );

  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

  const navDepth = history.length + (streamUrl ? 1 : 0);
  const prevNavDepth = useRef(navDepth);

  useEffect(() => {
    if (navDepth > prevNavDepth.current) {
      window.history.pushState({ depth: navDepth }, '');
    }
    prevNavDepth.current = navDepth;
  }, [navDepth]);

  useEffect(() => {
    const onPopState = () => {
      handleBackRef.current?.();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (
      !playLastTvChannel ||
      items.length === 0 ||
      contentType !== 'tv' ||
      !isTizen
    )
      return;
    const channel =
      playLastTvChannel === '__play_first__'
        ? items[0]
        : (items.find((i) => i.id === playLastTvChannel) ?? items[0]);
    if (channel) handleItemClick(channel);
    setPlayLastTvChannel(null);
  }, [
    items,
    playLastTvChannel,
    contentType,
    handleItemClick,
    isTizen,
    setPlayLastTvChannel,
  ]);

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
    pushFrame,
  };
}
