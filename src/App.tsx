/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getChannels,
  getMedia,
  getSeries,
  getMovieUrl,
  getEPG,
  getChannelGroups,
} from './api/services';
import { isTizenDevice } from './utils/helpers';
import LoadingSpinner from './components/LoadingSpinner';
import MediaCard from './components/MediaCard';
import EpisodeCard from './components/EpisodeCard';
import VideoPlayer from './components/VideoPlayer';
import ContinueWatching from './components/ContinueWatching';
import type { MediaItem, ContextType, EPG_List, ChannelGroup } from './types';
import { BASE_URL, URL_PATHS } from './api/api';
import { toast, ToastContainer } from 'react-toastify';
import type { PaginatedResponse } from './api/services';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Admin from './components/Admin';
import TvChannelListCard from './components/TvChannelListCard';
import ConfirmationModal from './components/ConfirmationModal';
import { useSocket } from './context/SocketContext';

const PREFERRED_CONTENT_TYPE_KEY = 'preferredContentType';

const getInitialState = (): {
  initialType: 'movie' | 'series' | 'tv';
  initialTitle: string;
} => {
  const savedType = localStorage.getItem(PREFERRED_CONTENT_TYPE_KEY) as
    | 'movie'
    | 'series'
    | 'tv'
    | null;
  if (savedType === 'series') {
    return { initialType: 'series', initialTitle: 'Series' };
  }
  if (savedType === 'tv') {
    return { initialType: 'tv', initialTitle: 'TV' };
  }
  return { initialType: 'movie', initialTitle: 'Movies' }; // Default
};

const { initialType, initialTitle } = getInitialState();

const initialContext: ContextType = {
  page: 1,
  pageAtaTime: 1,
  search: '',
  category: null,
  movieId: null,
  seasonId: null,
  parentTitle: initialTitle,
  focusedIndex: null,
  contentType: initialType,
  sort: 'latest',
};
// --- Main Application Component ---
export default function App() {
  const isTizen = isTizenDevice(); // Detect Tizen environment
  const [isPortal, setIsPortal] = useState(false);

  const [context, setContext] = useState<ContextType>(initialContext);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<ContextType[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [contentType, setContentType] = useState<'movie' | 'series' | 'tv'>(
    initialType
  ); // 'movie' or 'series'
  const [showAdmin, setShowAdmin] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [currentSeriesItem, setCurrentSeriesItem] = useState<MediaItem | null>(
    null
  );
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchTyping, setIsSearchTyping] = useState(false); // <-- ADD THIS
  const [searchTerm, setSearchTerm] = useState(''); // <-- ADD THIS
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [playLastTvChannel, setPlayLastTvChannel] = useState<string | null>(
    null
  );
  const channelChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null); // <-- ADD THIS
  const [previewChannel, setPreviewChannel] = useState<MediaItem | null>(null); // <-- ADD THIS
  const [epgData, setEpgData] = useState<Record<string, EPG_List[]>>({});
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const storedFavorites = localStorage.getItem('favorite_channels');
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (e) {
      console.error('Failed to parse favorites from localStorage', e);
      return [];
    }
  });

  const isFetchingMore = useRef(false);

  const loadEpgData = useCallback(async () => {
    try {
      const response = await getEPG();
      if (response.data?.data) {
        setEpgData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch EPG data:', err);
      toast.warn('Could not load program guide.');
    }
  }, []);

  const fetchData = useCallback(
    async (
      newContext: ContextType,
      typeOverride?: 'movie' | 'series' | 'tv'
    ) => {
      const currentContentType = typeOverride || contentType;
      setLoading(true);
      setError(null);
      setPaginationError(null);

      if (newContext.page === 1) {
        setItems([]);
        setTotalItemsCount(0);
      }

      try {
        let response: PaginatedResponse<MediaItem>;

        if (currentContentType === 'movie') {
          const params = {
            page: newContext.page,
            search: newContext.search,
            pageAtaTime: 1,
            category: newContext.category,
            movieId: newContext.movieId,
            seasonId: newContext.seasonId,
            sort: newContext.sort,
          };
          response = await getMedia(params);
          setItems((prevItems) =>
            newContext.page === 1
              ? response.data
              : [...prevItems, ...response.data]
          );
          if (response.total_items) {
            setTotalItemsCount(response.total_items);
          }
          if (response.isPortal !== undefined) {
            setIsPortal(response.isPortal);
          }
        } else if (currentContentType === 'series') {
          if (newContext.movieId) {
            response = await getSeries({ movieId: newContext.movieId });
          } else if (newContext.seasonId) {
            response = await getSeries({
              seasonId: newContext.seasonId,
              page: newContext.page,
              pageAtaTime: 1,
            });
          } else {
            const params = {
              page: newContext.page,
              search: newContext.search,
              pageAtaTime: 1,
              category: newContext.category,
              sort: newContext.sort,
            };
            response = await getSeries(params);
          }
          setItems((prevItems) =>
            newContext.page === 1
              ? response.data
              : [...prevItems, ...response.data]
          );
          if (response.total_items) {
            setTotalItemsCount(response.total_items);
          }
        } else {
          // --- NEW 'tv' LOGIC ---
          // Fetch ALL channels and ALL groups simultaneously
          const [channelResponse, groupResponse] = await Promise.all([
            getChannels(),
            getChannelGroups(), // Pass true to get all groups for the player
          ]);

          const allChannels = channelResponse.data || [];
          const allGroups = groupResponse.data || [];

          const filteredChannels = newContext.search
            ? allChannels.filter((c) =>
              c.name?.toLowerCase().includes(newContext.search.toLowerCase())
            )
            : allChannels;

          setItems(filteredChannels); // Set items to filtered channels
          setTotalItemsCount(filteredChannels.length);
          setChannelGroups([
            { id: 'fav', title: 'Favorites' },
            { id: 'all', title: 'All Channels' },
            ...allGroups,
          ]);
        }

        setContext(newContext);
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        if (newContext.page > 1) {
          setPaginationError('Could not load more content. Please try again.');
        } else {
          setError('Could not load content. Please try again later.');
        }
      } finally {
        setLoading(false);
        isFetchingMore.current = false;
      }
    },
    [contentType] // Remove getGroups from dependency array
  );

  const toggleFavorite = useCallback((item: MediaItem) => {
    if (!item || !item.id) return;

    setFavorites((prevFavorites) => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(item.id)) {
        newFavorites.delete(item.id);
        toast.info(`Removed ${item.name || 'Channel'} from favorites`);
      } else {
        newFavorites.add(item.id);
        toast.success(`Added ${item.name || 'Channel'} to favorites`);
      }

      const favoritesArray = Array.from(newFavorites);
      localStorage.setItem('favorite_channels', JSON.stringify(favoritesArray));
      return favoritesArray;
    });
  }, []);

  useEffect(() => {
    fetchData(initialContext);
  }, [fetchData]);

  useEffect(() => {
    if (initialContext.contentType === 'tv') {
      loadEpgData();
      const lastPlayedId = localStorage.getItem('lastPlayedTvChannelId');
      if (lastPlayedId) {
        setPlayLastTvChannel(lastPlayedId); // Set trigger
      } else {
        setPlayLastTvChannel('__play_first__'); // Set trigger for first channel
      }
    }
  }, [loadEpgData]);

  // Sync searchTerm with context.search
  useEffect(() => {
    setSearchTerm(context.search || '');
  }, [context.search]);

  const handleItemClick = useCallback(
    async (item: MediaItem) => {
      if (contentType === 'tv' && currentItem?.id === item.id) {
        return;
      }
      if (channelChangeTimer.current) {
        clearTimeout(channelChangeTimer.current);
        channelChangeTimer.current = null;
      }
      setPreviewChannel(null);
      setHistory((prev) => [
        ...prev,
        { ...context, focusedIndex: focusedIndex ?? 0 },
      ]);
      const displayTitle = item.title || item.name || '';

      const isInsideMovieCategory =
        contentType === 'movie' && context.category !== null;

      if (item.is_series == 1) {
        setCurrentSeriesItem(item);

        fetchData({
          ...initialContext,
          category: '*',
          movieId: item.id,
          parentTitle: displayTitle,
          contentType,
        });
      } else if (item.is_season) {
        fetchData({
          ...initialContext,
          category: context.category,
          movieId: context.movieId,
          seasonId: item.id,
          parentTitle: displayTitle,
          contentType,
        });
      } else if (item.is_episode) {
        setLoading(true);
        setCurrentItem(item);
        try {
          let episodeFiles: MediaItem[] = [];
          if (contentType === 'series') {
            // --- FIX: Destructure the 'data' property from the response ---
            const response = await getSeries({
              movieId: context.movieId,
              seasonId: context.seasonId,
              episodeId: item.id,
            });
            episodeFiles = response.data;
          } else {
            // --- FIX: Destructure the 'data' property from the response ---
            const response = await getMedia({
              movieId: context.movieId,
              seasonId: context.seasonId,
              episodeId: item.id,
              category: '*',
            });
            episodeFiles = response.data;
          }

          if (episodeFiles && episodeFiles.length > 0) {
            const episodeFile = episodeFiles[0];
            if (episodeFile.id !== undefined) {
              // SIMPLIFIED LOGIC:
              // If Xtream (!isPortal), use the direct URL (cmd) via proxy.
              // If Stalker (isPortal), fetch the secure link via API.
              if (!isPortal && episodeFile.cmd) {
                setRawStreamUrl(episodeFile.cmd);
                setStreamUrl(`${BASE_URL}/proxy?url=${btoa(episodeFile.cmd)}`);
              } else {
                const urlParams: Record<string, string | number | undefined> = {
                  id: episodeFile.id,
                };
                if (item.series_number !== undefined) {
                  urlParams.series = item.series_number;
                }

                const linkData = await getMovieUrl(urlParams);
                const cmd =
                  (linkData && linkData.js && linkData.js.cmd) ||
                  (linkData && linkData.cmd);

                if (typeof cmd === 'string') {
                  setRawStreamUrl(cmd);
                  // User requested to use /api/proxy for VOD Stalker portal
                  setStreamUrl(`${BASE_URL}/proxy?url=${btoa(cmd)}`);
                } else {
                  throw new Error('Episode stream URL (cmd) not found.');
                }
              }
            } else {
              throw new Error('Episode details (id) missing.');
            }
          } else {
            throw new Error('Could not fetch episode details.');
          }
        } catch (err: unknown) {
          console.error(err);
          setError('Could not fetch stream URL.');
          setCurrentItem(null);
          setHistory((prev) => prev.slice(0, -1));
        } finally {
          setLoading(false);
        }
      } else if (isInsideMovieCategory || item.is_playable_movie) {
        // OPTIMIZATION: If item already has cmd (e.g. from Continue Watching) AND it's Xtream, play immediately.
        // If it's Stalker, we MUST go through the API to get a fresh/valid link.
        if (!isPortal && item.cmd) {
          setLoading(true);
          setCurrentItem(item);
          setRawStreamUrl(item.cmd);
          // We set streamUrl to raw cmd. VideoPlayer will handle proxying if enabled.
          // We avoid the old /proxy route to prevent confusion.
          setStreamUrl(item.cmd);
          setLoading(false);
          return;
        }

        setLoading(true);
        setCurrentItem(item);
        try {
          // --- FIX: Destructure the 'data' property from the response ---
          const response = await getMedia({
            movieId: item.id,
            category: context.category || '*',
          });
          const files = response.data; // Get the array from the response object

          if (files && files.length > 0) {
            const movieFile = files[0];

            // SIMPLIFIED LOGIC:
            // If Xtream (!isPortal), use the direct URL (cmd) via proxy.
            // If Stalker (isPortal), fetch the secure link via API.
            if (!isPortal && movieFile.cmd) {
              setRawStreamUrl(movieFile.cmd);
              setStreamUrl(`${BASE_URL}/proxy?url=${btoa(movieFile.cmd)}`);
            } else {
              const linkData = await getMovieUrl({ id: movieFile.id });

              if (
                linkData &&
                linkData.js &&
                typeof linkData.js.cmd === 'string'
              ) {
                const rawUrl = linkData.js.cmd;
                setRawStreamUrl(rawUrl);
                // User requested to use /api/proxy for VOD Stalker portal
                setStreamUrl(`${BASE_URL}/proxy?url=${btoa(rawUrl)}`);
              } else {
                throw new Error('Movie stream URL not found.');
              }
            }
          } else {
            throw new Error('Movie file could not be found.');
          }
        } catch (err: unknown) {
          console.error(err);
          setError('Could not fetch stream URL.');
          setCurrentItem(null);
          setHistory((prev) => prev.slice(0, -1));
        } finally {
          setLoading(false);
        }
      } else if (contentType === 'tv') {
        // Handle TV Channel Click
        if (channelChangeTimer.current) {
          clearTimeout(channelChangeTimer.current);
          channelChangeTimer.current = null;
        }
        setPreviewChannel(null);

        if (!item.cmd) {
          toast.error('Channel has no command to play.');
          return;
        }

        // This is the correct, proxied URL your backend provides
        const channelUrl = `${URL_PATHS.HOST}/live.m3u8?cmd=${item.cmd}&id=${item.id}&proxy=1`;

        localStorage.setItem('lastPlayedTvChannelId', item.id);
        setCurrentItem(item);

        // Set both URLs. The player will pick one.
        // We don't need to btoa() or use /proxy because /live.m3u8 IS the proxy.
        setRawStreamUrl(channelUrl);
        setStreamUrl(channelUrl);
        // --- END REPLACEMENT ---
      } else {
        fetchData({
          ...initialContext,
          category: item.id,
          parentTitle: displayTitle,
          contentType,
        });
      }
    },
    [contentType, context, currentItem, fetchData, focusedIndex]
  );

  const debounceChannelChange = useCallback(
    (direction: 'next' | 'prev') => {
      // 1. Clear any existing timer
      if (channelChangeTimer.current) {
        clearTimeout(channelChangeTimer.current);
      }

      // 2. Find the channel to preview (base it on the last preview, or the current playing item)
      const currentSelectedChannel = previewChannel || currentItem;
      if (!currentSelectedChannel) return;

      const currentIndex = items.findIndex(
        (item) => item.id === currentSelectedChannel.id
      );
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (direction === 'next' && currentIndex < items.length - 1) {
        newIndex = currentIndex + 1;
      } else if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }

      // Don't do anything if we're at the start/end of the list
      if (newIndex === currentIndex) return;

      const newPreviewChannel = items[newIndex];

      // 3. Set the preview state (this will update the UI)
      setPreviewChannel(newPreviewChannel);

      // 4. Set a new 2-second timer
      channelChangeTimer.current = setTimeout(() => {
        // Timer finished! Fetch the channel.
        handleItemClick(newPreviewChannel);
        setPreviewChannel(null); // Clear the preview
        channelChangeTimer.current = null;
      }, 2000); // 2000ms = 2 seconds
    },
    [currentItem, handleItemClick, items, previewChannel]
  );

  const handleBack = useCallback(() => {
    if (channelChangeTimer.current) {
      clearTimeout(channelChangeTimer.current);
      channelChangeTimer.current = null;
      setPreviewChannel(null);
      return; // Just cancel the timer, don't go back
    }
    if (streamUrl) {
      setStreamUrl(null);
      setRawStreamUrl(null);
      setCurrentItem(null);
      return;
    }

    if (history.length > 0) {
      const lastContext = history[history.length - 1]; // Get previous context
      if (!lastContext.movieId) {
        setCurrentSeriesItem(null);
      }
      setHistory((prev) => prev.slice(0, -1));
      setContentType(lastContext.contentType); // Restore contentType
      fetchData(lastContext); // Fetch data with old context

      // --- FOCUS FIX: Restore old focused index ---
      setFocusedIndex(lastContext.focusedIndex ?? 0);
    }
  }, [streamUrl, history, fetchData]);

  const closePlayer = useCallback(() => {
    if (channelChangeTimer.current) {
      clearTimeout(channelChangeTimer.current);
      channelChangeTimer.current = null;
      setPreviewChannel(null);
      return; // Just cancel the timer, don't go back
    }
    if (streamUrl) {
      setStreamUrl(null);
      setRawStreamUrl(null);
      setCurrentItem(null);
      return;
    }
  }, [streamUrl]);

  const handlePageChange = useCallback(
    (direction: number) => {
      if (direction <= 0) return;
      if (contentType === 'tv') return;

      // This block is unchanged and still has our ref lock
      if (
        isFetchingMore.current ||
        loading ||
        (totalItemsCount > 0 && items.length >= totalItemsCount)
      ) {
        return;
      }
      isFetchingMore.current = true;

      const newPage = context.page + direction;
      if (newPage < 1) {
        isFetchingMore.current = false;
        return;
      }

      fetchData({ ...context, page: newPage });
    },
    [loading, totalItemsCount, items?.length, context, fetchData, contentType]
  );
  const handleChannelSelect = useCallback(
    (item: MediaItem) => {
      handleItemClick(item);
    },
    [handleItemClick]
  ); // handleItemClick is already memoized

  const handleNextChannel = useCallback(() => {
    if (!currentItem || contentType !== 'tv') return;
    debounceChannelChange('next');
  }, [currentItem, contentType, debounceChannelChange]); // <-- Note new dependencies

  const handlePrevChannel = useCallback(() => {
    if (!currentItem || contentType !== 'tv') return;
    debounceChannelChange('prev');
  }, [currentItem, contentType, debounceChannelChange]); // <-- Note new dependencies

  const handleClearWatched = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear History',
      message: 'Are you sure you want to clear all watched and in-progress statuses?',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        Object.keys(localStorage).forEach((key) => {
          // Clear completed, in-progress, AND resume time keys
          if (
            key.startsWith('video-completed-') ||
            key.startsWith('video-in-progress-') ||
            key.startsWith('video-progress-')
          ) {
            localStorage.removeItem(key);
          }
        });
        toast.success('All watched and in-progress statuses have been cleared.');

        // Re-fetch data to clear the "Continue Watching" list
        fetchData(initialContext, contentType);
      },
    });
  }, [fetchData, contentType, initialContext]); // Add dependencies

  useEffect(() => {
    // Reset focus when the view changes (e.g., new category, new search)
    // ONLY reset if it's page 1.
    if (context.page === 1) {
      setFocusedIndex(null);
    }
  }, [items, showAdmin, streamUrl, context.page]);

  useEffect(() => {
    if (streamUrl) return; // Do not manage focus from App.tsx when video player is active
    if (isTizen && isSearchActive) return;
    const focusable = Array.from(
      document.querySelectorAll('[data-focusable="true"]')
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
  }, [focusedIndex, isSearchActive, isTizen, items, showAdmin, streamUrl]);

  const checkAndFetchNextPage = useCallback(
    (newIndex: number, totalItems: number) => {
      if (contentType === 'tv') return;
      // How many items from the end should trigger the fetch?
      // Your "last 2" idea is good. Let's make it the last row.
      const grid = document.querySelector('.grid');
      let triggerThreshold = 2; // Default for non-grid

      if (grid) {
        const gridComputedStyle = window.getComputedStyle(grid);
        const gridColumnCount = gridComputedStyle
          .getPropertyValue('grid-template-columns')
          .split(' ').length;
        triggerThreshold = gridColumnCount; // Trigger on the last row
      }

      if (newIndex >= totalItems - triggerThreshold) {
        // We are focusing on one of the last items.
        // It's safe to call this multiple times because
        // handlePageChange has the 'isFetchingMore' lock.
        handlePageChange(1);
      }
    },
    [handlePageChange, contentType]
  );

  useEffect(() => {
    if (isTizen) {
      const keysToRegister = [
        'MediaPlay',
        'MediaPause',
        'MediaPlayPause', // Catches the combined Play/Pause button
        'MediaStop',
        'MediaFastForward',
        'MediaRewind',
        'ChannelUp',
        'ChannelDown',
        'ColorF0Red',
        'ColorF1Green',
        'ColorF2Yellow',
        'ColorF3Blue',
      ];

      try {
        // Tizen API recommends registering one by one in a loop
        // in case one of them fails
        keysToRegister.forEach((key) => {
          try {
            (window as any).tizen.tvinputdevice.registerKey(key);
            console.log(`Key registered: ${key}`);
          } catch (e: any) {
            console.error(`Failed to register key "${key}": ${e.message}`);
          }
        });
      } catch (e: any) {
        console.error('Error registering keys: ' + e.message);
      }

      // Return a cleanup function to unregister keys
      return () => {
        try {
          keysToRegister.forEach((key) => {
            (window as any).tizen.tvinputdevice.unregisterKey(key);
          });
          console.log('Media and Color keys unregistered.');
        } catch (e: any) {
          console.error('Error unregistering keys: ' + e.message);
        }
      };
    }
  }, [isTizen]);

  // --- Socket Receiver Logic ---
  const { socket, isReceiver } = useSocket();

  useEffect(() => {
    if (!socket || !isReceiver) return;

    const handleCastCommand = (data: { command: string; payload: any; from: string }) => {
      console.log('Received Cast Command:', data);
      if (data.command === 'play') {
        const { media, streamUrl, rawStreamUrl } = data.payload.media;

        toast.info(`Casting from ${data.from}...`);

        // Set state to play video
        setCurrentItem(media);
        if (streamUrl) setStreamUrl(streamUrl);
        if (rawStreamUrl) setRawStreamUrl(rawStreamUrl);

        // Handle playback info (seek) if provided
        if (data.payload.playbackInfo?.currentTime) {
          localStorage.setItem(`video-progress-${media.id}`, data.payload.playbackInfo.currentTime);
        }
      }
    };

    socket.on('receive_cast_command', handleCastCommand);

    return () => {
      socket.off('receive_cast_command', handleCastCommand);
    };
  }, [socket, isReceiver]);

  const handleContentTypeChange = useCallback(
    (type: 'movie' | 'series' | 'tv') => {
      if (type === contentType) return;
      const newTitle =
        type === 'movie' ? 'Movies' : type === 'series' ? 'Series' : 'TV';
      const newContext = {
        ...initialContext,
        parentTitle: newTitle,
        category: null,
        contentType: type,
      };
      if (type === 'tv') {
        setChannelGroups([]); // Clear groups *before* fetching
      }
      setContentType(type);
      localStorage.setItem(PREFERRED_CONTENT_TYPE_KEY, type);
      setHistory([]);
      setStreamUrl(null);
      setRawStreamUrl(null);
      setContext(newContext);
      fetchData(newContext, type);
      if (type === 'tv') {
        loadEpgData();
        const lastPlayedId = localStorage.getItem('lastPlayedTvChannelId');
        if (lastPlayedId) {
          setPlayLastTvChannel(lastPlayedId); // Set trigger to play last channel
        } else {
          setPlayLastTvChannel('__play_first__'); // Set trigger to play first channel
        }
      } else {
        setPlayLastTvChannel(null); // <-- ADD THIS ELSE BLOCK
      }
    },
    [contentType, fetchData, loadEpgData]
  );

  const cycleSort = useCallback(() => {
    const sortOptions = ['latest', 'alphabetic', 'oldest'];
    const currentSort = context.sort || 'latest';
    const currentIndex = sortOptions.indexOf(currentSort);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    const nextSort = sortOptions[nextIndex];
    fetchData({ ...context, sort: nextSort, page: 1 });
  }, [context, fetchData]);

  const handleSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    // Use the state 'searchTerm' instead of form elements
    const search = searchTerm;

    if (isTizen) {
      setIsSearchActive(false);
    }

    // Preserve history!
    setHistory((prev) => [
      ...prev,
      { ...context, focusedIndex: focusedIndex ?? 0 },
    ]);

    const newTitle = search
      ? `Results for "${search}"`
      : contentType === 'movie'
        ? 'Movies'
        : contentType === 'series'
          ? 'Series'
          : 'TV';

    fetchData({
      ...initialContext,
      search,
      category: search ? '*' : contentType === 'tv' ? null : '*',
      parentTitle: newTitle,
      contentType,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (streamUrl) return; // Do not handle key events when video player is active

      // --- START: TIZEN SEARCH LOGIC ---
      if (isTizen && isSearchActive) {
        if (e.keyCode === 13) {
          return;
        }
        if (e.keyCode === 0 || e.keyCode === 10009 || e.keyCode === 8) {
          e.preventDefault();
          setIsSearchActive(false);
          const focusable = Array.from(
            document.querySelectorAll('[data-focusable="true"]')
          ) as HTMLElement[];
          const searchIndex = focusable.findIndex((el) =>
            el.matches('input[type="search"]')
          );
          if (searchIndex !== -1) {
            setFocusedIndex(searchIndex);
          }
        }
        return;
      }
      // --- END: TIZEN SEARCH LOGIC ---

      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA');

      if (isInput) {
        // Allow Down (40) to exit input focus
        if (e.keyCode === 40) {
          e.preventDefault();
          (activeElement as HTMLElement).blur();
          setIsSearchTyping(false); // Stop typing mode
          setFocusedIndex(0); // Focus first item
          return;
        }

        // If we are typing, allow normal input behavior
        if (isSearchTyping) {
          // Allow Escape (27) or Enter (13) to stop typing
          // Allow Escape (27) to stop typing
          if (e.keyCode === 27) {
            e.preventDefault();
            setIsSearchTyping(false);
            (activeElement as HTMLElement).blur();
            return;
          }

          // Allow Enter (13) to stop typing AND submit form
          if (e.keyCode === 13) {
            e.preventDefault(); // Prevent duplicate form submission
            setIsSearchTyping(false);
            (activeElement as HTMLElement).blur();
            handleSearch(); // Explicitly call search
            return;
          }
          // Trap navigation keys inside input while typing
          if ([37, 38, 39].includes(e.keyCode)) {
            return;
          }
          return; // Let other keys (letters) pass through
        }

        // If NOT typing (just focused), trap keys or handle Enter to start typing
        if (e.keyCode === 13) {
          e.preventDefault();
          setIsSearchTyping(true);
          return;
        }

        // If focused but not typing, we might want to allow moving away with Left/Right/Up too?
        // For now, let's stick to the requested "Enter to allow type"
        // If we press other keys, we might want to prevent them if they would type
        // But since we will set readOnly={!isSearchTyping}, we don't need to preventDefault all.
      }

      const focusable = Array.from(
        document.querySelectorAll('[data-focusable="true"]')
      ) as HTMLElement[];
      if (focusable.length === 0) return;

      let currentIndex = focusedIndex === null ? 0 : focusedIndex;
      if (currentIndex >= focusable.length) currentIndex = focusable.length - 1;

      switch (e.keyCode) {
        case 37: // LEFT
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedIndex(currentIndex - 1);
          }
          break;
        case 39: // RIGHT
          e.preventDefault();
          if (currentIndex < focusable.length - 1) {
            const newIndex = currentIndex + 1; // Calculate new index
            setFocusedIndex(newIndex);

            // --- NEW: Check if this new index is near the end ---
            checkAndFetchNextPage(newIndex, focusable.length);
          }
          break;
        case 38: {
          // UP
          e.preventDefault();
          const grid = document.querySelector('.grid, .channel-list');
          if (grid) {
            const gridComputedStyle = window.getComputedStyle(grid);
            const gridColumnCount = gridComputedStyle
              .getPropertyValue('grid-template-columns')
              .split(' ').length;
            const newIndex = currentIndex - gridColumnCount;
            if (newIndex >= 0) {
              setFocusedIndex(newIndex);
            }
          } else if (currentIndex > 0) {
            setFocusedIndex(currentIndex - 1);
          }
          break;
        }
        case 40: {
          // DOWN
          e.preventDefault();
          const gridDown = document.querySelector('.grid, .channel-list');
          let newIndex = -1; // Flag for new index

          if (gridDown) {
            const gridComputedStyle = window.getComputedStyle(gridDown);
            const gridColumnCount = gridComputedStyle
              .getPropertyValue('grid-template-columns')
              .split(' ').length;
            const potentialNewIndex = currentIndex + gridColumnCount;

            if (potentialNewIndex < focusable.length) {
              newIndex = potentialNewIndex;
            } else {
              // --- MODIFIED: At the bottom, load more ---
              handlePageChange(1);
              setFocusedIndex(currentIndex); // Keep focus on current item
            }
          } else if (currentIndex < focusable.length - 1) {
            // Not a grid, just move down one
            newIndex = currentIndex + 1;
          }

          if (newIndex !== -1) {
            setFocusedIndex(newIndex);
            // --- NEW: Check if this new index is near the end ---
            checkAndFetchNextPage(newIndex, focusable.length);
          }
          break;
        }
        case 13: // OK
          e.preventDefault();
          if (focusedIndex !== null && focusable[focusedIndex]) {
            const focusedElement = focusable[focusedIndex] as HTMLElement;
            if (isTizen && focusedElement.matches('input[type="search"]')) {
              setIsSearchActive(true);
              focusedElement.focus();
            } else if (focusedElement.matches('input[type="search"]')) {
              // Web: Enter on search input starts typing
              setIsSearchTyping(true);
              focusedElement.focus();
            } else if (focusedElement.getAttribute('data-control') === 'sort') {
              cycleSort();
            } else {
              focusedElement.click();
            }
          }
          break;
        case 0: // BACK on some devices
        case 10009: // RETURN on Tizen
        case 8: {
          // Backspace for web

          const activeElement = document.activeElement;
          const isInput =
            activeElement &&
            (activeElement.tagName === 'INPUT' ||
              activeElement.tagName === 'TEXTAREA');

          if (isInput) {
            // If typing, DO NOT prevent default. Let the browser delete the character.
            return;
          }
          e.preventDefault();
          handleBack();
          break;
        }

        // --- ADDED TIZEN COLOR KEY STUBS ---
        case 403:
          handleClearWatched();
          break;
        case 404: // ColorF1Green
          handleContentTypeChange('movie');
          break;
        case 405: // ColorF2Yellow
          cycleSort();
          break;
        case 83: // 's' key for Web testing
          if (!isInput) {
            e.preventDefault();
            cycleSort();
          }
          break;
        case 406: // ColorF3Blue
          console.log('Blue button pressed');
          handleContentTypeChange('tv');
          break;
        // --- END OF ADDED CASES ---

        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedIndex,
    items,
    handleBack,
    showAdmin,
    streamUrl,
    isTizen,
    isSearchActive,
    context,
    handlePageChange,
    checkAndFetchNextPage,
    handleClearWatched,
    checkAndFetchNextPage,
    handleClearWatched,
    handleContentTypeChange,
    cycleSort,
    isSearchTyping,
    handleSearch,
  ]);



  useEffect(() => {
    if (
      playLastTvChannel &&
      items.length > 0 &&
      contentType === 'tv' &&
      !loading
    ) {
      const channelToPlay =
        playLastTvChannel === '__play_first__'
          ? items[0] // Get the first channel
          : items.find((item) => item.id === playLastTvChannel); // Get the last played one

      if (channelToPlay) {
        handleItemClick(channelToPlay);
      } else if (items[0]) {
        // Fallback to first channel if last-played ID isn't found
        handleItemClick(items[0]);
      }
      setPlayLastTvChannel(null); // Clear the trigger
    }
  }, [items, playLastTvChannel, contentType, loading, handleItemClick]);

  useEffect(() => {
    const handleScroll = () => {
      // Don't run this logic on Tizen
      const isTizen = !!(window as any).tizen;
      if (isTizen || contentType === 'tv') return;

      // Check if user is scrolled 200px from the bottom
      const buffer = 200;
      const isNearBottom =
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - buffer;

      if (isNearBottom) {
        // Call our existing function.
        // It's safe because it has the ref lock and loading checks.
        handlePageChange(1);
      }
    };

    // Add the event listener for the web
    window.addEventListener('scroll', handleScroll);

    // Clean up the listener when the component unmounts
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [contentType, handlePageChange]);

  const isEpisodeList = items && items.length > 0 && items[0].is_episode;
  const currentTitle = streamUrl
    ? 'Now Playing'
    : context.parentTitle || 'Browse';

  return (
    <>
      {streamUrl ? (
        <VideoPlayer
          streamUrl={streamUrl}
          rawStreamUrl={rawStreamUrl}
          onBack={closePlayer}
          itemId={currentItem?.id || null}
          context={context}
          contentType={contentType}
          mediaId={
            contentType === 'series'
              ? context.movieId // This is the Series ID
              : contentType === 'movie' && currentItem
                ? currentItem.id // This is the Movie ID
                : null
          }
          item={currentSeriesItem || currentItem}
          seriesItem={currentSeriesItem}
          // --- ADD THESE NEW PROPS for TV ---
          channels={contentType === 'tv' ? items : undefined}
          channelInfo={contentType === 'tv' ? currentItem : null}
          previewChannelInfo={contentType === 'tv' ? previewChannel : null}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          onChannelSelect={handleChannelSelect}
          epgData={epgData}
          channelGroups={channelGroups}
          favorites={favorites} // <-- ADD THIS
          toggleFavorite={toggleFavorite}
        />
      ) : (
        <div className="min-h-screen font-sans text-gray-200">
          <div className="container mx-auto p-4 sm:p-6">
            <header className="sticky top-0 sm:top-4 z-10 mb-2 sm:mb-6 rounded-b-xl sm:rounded-xl border border-gray-700/80 bg-gray-800/50 p-2 sm:p-4 backdrop-blur-lg">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center self-start sm:self-center">
                  {(history.length > 0 || streamUrl) && !streamUrl && (
                    <button
                      onClick={handleBack}
                      className="mr-2 text-white transition-colors hover:text-blue-400"
                      data-focusable="true"
                      tabIndex={-1}
                      aria-label="Back"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                  <img src="stalker-logo.svg" className="w-28 sm:w-44" />
                  <h1 className="text-lg sm:text-xl font-bold tracking-wider text-white">
                    {currentTitle}
                  </h1>
                </div>

                {/* --- MOVED ADMIN/CLEAR BUTTONS HERE (Top Right) --- */}
                {/* --- MOVED ADMIN/CLEAR BUTTONS HERE (Top Right) --- */}
                {
                  !streamUrl && isTizen && (
                    <div className="flex items-center">
                      <button
                        onClick={handleClearWatched}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-red-700 sm:px-4 sm:py-2 sm:text-base"
                        data-focusable="true"
                        tabIndex={-1}
                      >
                        Clear
                      </button>
                    </div>
                  )
                }

                {!streamUrl && (
                  <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-4">
                    <div className="flex w-auto justify-center space-x-2 rounded-full border border-gray-700/50 bg-gray-900/70 p-1 backdrop-blur-md transition-all duration-300">
                      <button
                        onClick={() => handleContentTypeChange('movie')}
                        className={`flex w-auto items-center justify-center rounded-full px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${contentType === 'movie'
                          ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                          }`}
                        data-focusable="true"
                        tabIndex={-1}
                        title="Movies"
                      >
                        <span className="sm:hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </span>
                        <span className="hidden sm:inline">Movies</span>
                      </button>
                      <button
                        onClick={() => handleContentTypeChange('series')}
                        className={`flex w-auto items-center justify-center rounded-full px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${contentType === 'series'
                          ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                          }`}
                        data-focusable="true"
                        tabIndex={-1}
                        title="Series"
                      >
                        <span className="sm:hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </span>
                        <span className="hidden sm:inline">Series</span>
                      </button>
                      <button
                        onClick={() => handleContentTypeChange('tv')}
                        className={`flex w-auto items-center justify-center rounded-full px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${contentType === 'tv'
                          ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                          }`}
                        data-focusable="true"
                        tabIndex={-1}
                        title="TV"
                      >
                        <span className="sm:hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="hidden sm:inline">TV</span>
                      </button>
                      {/* Admin Button - Icon on Mobile, Text on Desktop */}
                      {!isTizen && (
                        <button
                          onClick={() => setShowAdmin(!showAdmin)}
                          className={`flex items-center justify-center rounded-full p-2 transition-colors duration-300 ${showAdmin
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          data-focusable="true"
                          tabIndex={-1}
                          title={showAdmin ? 'Close Admin' : 'Admin Settings'}
                        >
                          {/* Icon (Cog) */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* --- ROW 3: Search + Sort (Combined) --- */}
                    <div className="flex w-auto flex-grow gap-2 sm:w-auto sm:flex-grow-0 items-center">
                      <form onSubmit={handleSearch} className="flex-grow sm:w-auto">
                        <input
                          type="search"
                          name="search"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search titles..."
                          className="w-full rounded-full border border-gray-700/50 bg-gray-900/70 px-4 py-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-800/90 sm:w-64"
                          data-focusable="true"
                          readOnly={isTizen ? !isSearchActive : !isSearchTyping} // ReadOnly unless typing/active
                          onClick={() => {
                            if (isTizen) setIsSearchActive(true);
                            // On Web, click should probably enable typing too
                            if (!isTizen) setIsSearchTyping(true);
                          }}
                          onBlur={() => {
                            if (isTizen) setIsSearchActive(false);
                            setIsSearchTyping(false);
                          }}
                        />
                      </form>
                      <div className="flex-shrink-0">
                        <button
                          onClick={cycleSort}
                          className="flex items-center justify-center rounded-full border border-gray-700/50 bg-gray-900/70 p-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                          data-focusable="true"
                          data-control="sort"
                          title={`Sort: ${context.sort === 'alphabetic' ? 'A-Z' : context.sort === 'oldest' ? 'Oldest' : 'Latest'}`}
                        >
                          {/* Icon based on sort state */}
                          {(!context.sort || context.sort === 'latest') && (
                            // Latest (Bars Arrow Down)
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                          )}
                          {context.sort === 'oldest' && (
                            // Oldest (Bars Arrow Up)
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                          )}
                          {context.sort === 'alphabetic' && (
                            // Alphabetic (A-Z / Language)
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* --- REMOVED OLD ADMIN BUTTON LOCATION --- */}
                  </div>
                )}
              </div>
            </header>

            <main>
              {showAdmin ? (
                <Admin />
              ) : (
                <>
                  {/* --- CHANGE 1: Spinner now ONLY shows on *initial* load (no items) --- */}
                  {loading && items.length === 0 && <LoadingSpinner />}

                  {/* --- This error block is unchanged --- */}
                  {error && (
                    <div className="text-center">
                      <p className="text-red-500">{error}</p>
                      <button
                        onClick={() => fetchData(context)}
                        className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                        data-focusable="true"
                        tabIndex={-1}
                      >
                        Reload
                      </button>
                    </div>
                  )}

                  {/* --- CHANGE 2: Content (Player or Grid) now renders *even if loading* --- */}
                  {/* This prevents the flicker, as the grid no longer disappears. */}

                  {/* --- Video Player (unchanged logic) --- */}
                  {!error && streamUrl ? (
                    <VideoPlayer
                      streamUrl={streamUrl}
                      rawStreamUrl={rawStreamUrl}
                      onBack={handleBack}
                      itemId={currentItem?.id || null}
                      context={context}
                      contentType={contentType}
                      mediaId={
                        contentType === 'series'
                          ? context.movieId // This is the Series ID
                          : contentType === 'movie' && currentItem
                            ? currentItem.id // This is the Movie ID
                            : null
                      }
                      item={currentSeriesItem || currentItem}
                      seriesItem={currentSeriesItem}
                      epgData={epgData}
                      channelGroups={channelGroups}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                    />
                  ) : (
                    // --- Content Grid (now visible during load, if !error) ---
                    !error && (
                      <>
                        {contentType !== 'tv' &&
                          context.category === null &&
                          !context.search && (
                            <ContinueWatching
                              onClick={handleItemClick}
                              contentType={contentType}
                            />
                          )}
                        <div
                          className={` ${contentType === 'tv' // TV List
                            ? 'channel-list flex flex-col gap-1'
                            : isEpisodeList && !isTizen // Episode List (Web)
                              ? 'flex flex-col gap-4'
                              : isEpisodeList // Episode List (Tizen)
                                ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
                                : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6' // Movie/Series Grid
                            } ${loading && items.length > 0 && context.page === 1
                              ? 'pointer-events-none opacity-50 transition-opacity duration-300'
                              : 'opacity-100'
                            } `}
                        >
                          {items?.map((item) =>
                            contentType === 'tv' ? (
                              <TvChannelListCard
                                key={item.id}
                                item={item}
                                onClick={handleItemClick}
                                isFocused={false} // Focus is handled by App.tsx's useEffect
                              />
                            ) : isEpisodeList ? (
                              <EpisodeCard
                                key={item.id}
                                item={item}
                                onClick={handleItemClick}
                              />
                            ) : (
                              <MediaCard
                                key={item.id}
                                item={item}
                                onClick={handleItemClick}
                              />
                            )
                          )}
                        </div>

                        {/* --- No content messages (now must check !loading) --- */}
                        {!items?.length && !loading && !context.search && (
                          <p className="mt-10 text-center text-gray-400">
                            No content found.
                          </p>
                        )}
                        {!items?.length && !loading && context.search && (
                          <p className="mt-10 text-center text-gray-400">
                            No results found for "{context.search}".
                          </p>
                        )}

                        {/* --- Pagination & Retry Logic (from previous answers) --- */}
                        {/* This block correctly handles the spinner for *infinite scrolling* */}
                        {(totalItemsCount === 0 ||
                          items.length < totalItemsCount) &&
                          contentType !== 'tv' && (
                            <div className="col-span-full">
                              {loading && items.length > 0 && (
                                <LoadingSpinner />
                              )}

                              {!loading && paginationError && (
                                <div className="py-8 text-center">
                                  <p className="text-red-500">
                                    {paginationError}
                                  </p>
                                  <button
                                    onClick={() => handlePageChange(1)}
                                    className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                                    data-focusable="true"
                                    tabIndex={-1}
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                      </>
                    )
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
      <ToastContainer />
    </>
  );
}
