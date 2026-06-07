import { useState, useCallback, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import {
  getChannels,
  getMedia,
  getSeries,
  getEPG,
  getChannelGroups,
  getMovieCategories,
  getSeriesCategories,
  getCarouselSlides,
  type CarouselSlide,
  clearUserProgress,
  getUserProgress,
  type ProgressRecord,
} from '@/services/services';
import type { MediaItem, ContextType, EPG_List, ChannelGroup } from '@/types';
import type { PaginatedResponse } from '@/services/services';
import { isTizenDevice } from '@/utils/helpers';

export const getInitialState = (): {
  initialType: 'movie' | 'series' | 'tv';
  initialTitle: string;
  initialCategory: string | null;
} => {
  return {
    initialType: 'movie',
    initialTitle: 'Movies',
    initialCategory: '*',
  };
};

const { initialType, initialTitle, initialCategory } = getInitialState();

export const initialContext: ContextType = {
  page: 1,
  pageAtaTime: 1,
  search: '',
  category: initialCategory,
  movieId: null,
  seasonId: null,
  parentTitle: initialTitle,
  focusedIndex: null,
  contentType: initialType,
  sort: 'latest',
};

export function useMediaLibrary() {
  const { user, updatePreferences } = useAuth();
  const [context, setContext] = useState<ContextType>(initialContext);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [contentType, setContentType] = useState<'movie' | 'series' | 'tv'>(
    initialType
  );
  const [isPortal, setIsPortal] = useState(false);
  const [epgData, setEpgData] = useState<Record<string, EPG_List[]>>({});
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [cwRefreshKey, setCwRefreshKey] = useState(0);
  const [playLastTvChannel, setPlayLastTvChannel] = useState<string | null>(
    null
  );
  const isTizen = isTizenDevice();

  const [vodCategories, setVodCategories] = useState<ChannelGroup[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [providerKey, setProviderKey] = useState<string>('');

  const fetchProviderKey = useCallback(async () => {
    try {
      const response = await api.get<{ hostname?: string; providerType?: string }>('/config');
      const host = response.data.hostname || 'default_host';
      const type = response.data.providerType || 'stalker';
      setProviderKey(`${type}_${host}`);
    } catch (err) {
      console.error('Failed to load active provider config:', err);
    }
  }, []);

  const fetchVodCategories = useCallback(async (type: 'movie' | 'series') => {
    setLoadingCategories(true);
    try {
      const response =
        type === 'movie'
          ? await getMovieCategories()
          : await getSeriesCategories();
      const allItem: ChannelGroup = { id: '*', title: 'ALL' };
      setVodCategories([allItem, ...response.data]);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchCarousel = useCallback(async () => {
    try {
      const slides = await getCarouselSlides();
      setCarouselSlides(slides.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      console.error('Failed to load carousel slides', err);
    }
  }, []);

  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentChannels, setRecentChannels] = useState<string[]>([]);

  useEffect(() => {
    if (user?.preferences && providerKey) {
      setFavorites(user.preferences.favorites || []);
      setRecentChannels(user.preferences.recentChannels || []);

      const savedType = user.preferences.preferredContentType || 'movie';
      const key = `${providerKey}_${savedType}`;
      const lastCategory = user.preferences.lastSelectedCategory?.[key] || '*';
      const lastCategoryTitle = user.preferences.lastSelectedCategoryTitle?.[key];
      const newTitle = savedType === 'series' ? 'Series' : savedType === 'tv' ? 'TV' : 'Movies';

      setContentType(savedType);
      setContext((prev) => ({
        ...prev,
        contentType: savedType,
        category: savedType === 'tv' ? null : lastCategory,
        parentTitle: savedType === 'tv' ? 'TV' : (lastCategory === '*' ? newTitle : (lastCategoryTitle || newTitle)),
      }));
    }
  }, [user, providerKey]);

  const [progressRecords, setInProgressRecords] = useState<ProgressRecord[]>([]);

  const fetchProgress = useCallback(async () => {
    try {
      const records = await getUserProgress();
      setInProgressRecords(records);
    } catch (err) {
      console.error('Failed to load user progress:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user, fetchProgress, cwRefreshKey]);

  const isFetchingMore = useRef(false);
  const isRestoringFromHistory = useRef(false);
  const initialLoadRef = useRef(false);

  const loadEpgData = useCallback(async () => {
    try {
      const response = await getEPG();
      if (response.data?.data) setEpgData(response.data.data);
    } catch {
      toast.warn('Could not load program guide.');
    }
  }, []);

  const fetchData = useCallback(
    async (
      newContext: ContextType,
      typeOverride?: 'movie' | 'series' | 'tv'
    ) => {
      if (isRestoringFromHistory.current) {
        console.log('Restoring from history... Fetch blocked, Bro!');
        return;
      }
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
          const responseData = response.data || [];
          setItems((prev) => {
            if (newContext.page === 1) return responseData;

            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueNew = responseData.filter(
              (item) => !existingIds.has(item.id)
            );

            if (uniqueNew.length === 0) {
              setTimeout(() => setTotalItemsCount(prev.length), 0);
            }
            return [...(prev || []), ...uniqueNew];
          });
          if (responseData.length > 0 && response.total_items) {
            setTotalItemsCount(response.total_items);
          } else if (newContext.page === 1) {
            setTotalItemsCount(0);
          }
          if (response.isPortal !== undefined) setIsPortal(response.isPortal);
        } else if (currentContentType === 'series') {
          if (newContext.seasonId && newContext.movieId) {
            response = await getSeries({
              movieId: newContext.movieId,
              seasonId: newContext.seasonId,
              page: newContext.page,
              pageAtaTime: 1,
              category: newContext.category || undefined,
            });
          }
          // 2. SECOND Priority: Check if movieId exists (Load Seasons)
          else if (newContext.movieId) {
            response = await getSeries({
              movieId: newContext.movieId,
              category: newContext.category || undefined,
            });
          }
          // 3. LAST Priority: Load main series list
          else {
            response = await getSeries({
              page: newContext.page,
              search: newContext.search,
              pageAtaTime: 1,
              category: newContext.category,
              sort: newContext.sort,
            });
          }
          const responseData = response.data || [];
          setItems((prev) => {
            if (newContext.page === 1) return responseData;

            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueNew = responseData.filter(
              (item) => !existingIds.has(item.id)
            );

            if (uniqueNew.length === 0) {
              setTimeout(() => setTotalItemsCount(prev.length), 0);
            }
            return [...(prev || []), ...uniqueNew];
          });
          if (responseData.length > 0 && response.total_items) {
            setTotalItemsCount(response.total_items);
          } else if (newContext.page === 1) {
            setTotalItemsCount(0);
          }
        } else {
          const [channelResponse, groupResponse] = await Promise.all([
            getChannels(),
            getChannelGroups(),
          ]);
          const allChannels = channelResponse.data || [];
          const allGroups = groupResponse.data || [];
          const filteredChannels = newContext.search
            ? allChannels.filter((c) =>
                c.name?.toLowerCase().includes(newContext.search!.toLowerCase())
              )
            : allChannels;

          setItems(filteredChannels);
          setTotalItemsCount(filteredChannels.length);
          setChannelGroups([
            { id: 'recent', title: 'Recent Channels' },
            { id: 'fav', title: 'Favorites' },
            { id: 'all', title: 'All Channels' },
            ...allGroups,
          ]);
        }
        setContext(newContext);
      } catch {
        if (newContext.page > 1)
          setPaginationError('Could not load more content.');
        else setError('Could not load content. Please try again later.');
      } finally {
        setLoading(false);
        isFetchingMore.current = false;
      }
    },
    [contentType]
  );

  useEffect(() => {
    fetchProviderKey();
  }, [fetchProviderKey]);

  useEffect(() => {
    if (!providerKey) return;

    if (!initialLoadRef.current) {
      // Determine initial category for this provider from preferences
      const savedType = user?.preferences?.preferredContentType || 'movie';
      const key = `${providerKey}_${savedType}`;
      const lastCategory = user?.preferences?.lastSelectedCategory?.[key] || '*';
      const lastCategoryTitle = user?.preferences?.lastSelectedCategoryTitle?.[key];
      const newTitle = savedType === 'series' ? 'Series' : savedType === 'tv' ? 'TV' : 'Movies';

      const initialCtx = {
        ...initialContext,
        contentType: savedType,
        category: savedType === 'tv' ? null : lastCategory,
        parentTitle: savedType === 'tv' ? 'TV' : (lastCategory === '*' ? newTitle : (lastCategoryTitle || newTitle)),
      };

      fetchData(initialCtx, savedType);
      initialLoadRef.current = true;
    }

    fetchCarousel();
    if (contentType !== 'tv') {
      fetchVodCategories(contentType as 'movie' | 'series');
    }

    if (contentType === 'tv') {
      loadEpgData();
      if (isTizen) {
        const lastPlayedId = user?.preferences?.lastSelectedCategory?.['lastPlayedTvChannelId'];
        setPlayLastTvChannel(lastPlayedId || '__play_first__');
      }
    }
  }, [fetchData, loadEpgData, isTizen, fetchCarousel, fetchVodCategories, user, contentType, providerKey, fetchProviderKey]);

  const handlePageChange = useCallback(
    (direction: number) => {
      const newPage = context.page + direction;
      if (newPage > 1 && (!items || items.length === 0)) {
        return;
      }
      if (
        isFetchingMore.current ||
        loading ||
        (totalItemsCount > 0 && (items?.length || 0) >= totalItemsCount)
      )
        return;

      isFetchingMore.current = true;
      fetchData({ ...context, page: newPage });
    },
    [loading, totalItemsCount, items, context, fetchData]
  );

  const toggleFavorite = useCallback(
    (item: MediaItem) => {
      if (!item?.id) return;
      const newFavs = favorites.includes(item.id)
        ? favorites.filter((id) => id !== item.id)
        : [...favorites, item.id];

      setFavorites(newFavs);
      updatePreferences({ favorites: newFavs });
      if (favorites.includes(item.id)) {
        toast.info(`Removed ${item.name || 'Channel'} from favorites`);
      } else {
        toast.success(`Added ${item.name || 'Channel'} to favorites`);
      }
    },
    [favorites, updatePreferences]
  );

  const handleContentTypeChange = useCallback(
    (type: 'movie' | 'series' | 'tv') => {
      if (type === contentType) return;
      
      const key = `${providerKey}_${type}`;
      const lastCategory = type === 'tv' ? null : (user?.preferences?.lastSelectedCategory?.[key] || '*');
      const lastCategoryTitle = type === 'tv' ? 'TV' : (user?.preferences?.lastSelectedCategoryTitle?.[key] || (type === 'movie' ? 'Movies' : 'Series'));

      const newContext = {
        ...initialContext,
        parentTitle: lastCategory === '*' ? (type === 'movie' ? 'Movies' : 'Series') : lastCategoryTitle,
        category: lastCategory,
        contentType: type,
      };

      if (type === 'tv') setChannelGroups([]);
      setContentType(type);
      updatePreferences({ preferredContentType: type });
      setContext(newContext);
      fetchData(newContext, type);

      if (type !== 'tv') {
        fetchVodCategories(type);
      }

      if (type === 'tv') {
        loadEpgData();
        const lastPlayedId = user?.preferences?.lastSelectedCategory?.['lastPlayedTvChannelId'];
        setPlayLastTvChannel(lastPlayedId || '__play_first__');
      } else {
        setPlayLastTvChannel(null);
      }
    },
    [contentType, fetchData, loadEpgData, fetchVodCategories, user, updatePreferences, providerKey]
  );

  const cycleSort = useCallback(() => {
    const sortOptions = ['latest', 'alphabetic', 'oldest'];
    const currentSort = context.sort || 'latest';
    const nextSort =
      sortOptions[(sortOptions.indexOf(currentSort) + 1) % sortOptions.length];
    fetchData({ ...context, sort: nextSort, page: 1 });
  }, [context, fetchData]);

  const handleSearch = useCallback(
    (search: string) => {
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
        category: search ? '*' : null,
        parentTitle: newTitle,
        contentType,
      });
    },
    [contentType, fetchData]
  );

  const handleClearWatched = useCallback(
    (
      setConfirmModal: Dispatch<
        SetStateAction<{
          isOpen: boolean;
          title: string;
          message: string;
          onConfirm: () => void;
          isDestructive: boolean;
        }>
      >
    ) => {
      setConfirmModal({
        isOpen: true,
        title: 'Clear History',
        message:
          'Are you sure you want to clear all watched and in-progress statuses?',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          try {
            await clearUserProgress();
            toast.success(
              'All watched and in-progress statuses have been cleared.'
            );
            fetchData(initialContext, contentType);
          } catch (err) {
            console.error('Failed to clear history:', err);
            toast.error('Failed to clear history.');
          }
        },
      });
    },
    [contentType, fetchData]
  );

  const addToRecentChannels = useCallback((item: MediaItem) => {
    if (!item?.id) return;
    setRecentChannels((prev) => {
      const filtered = prev.filter((id) => id !== item.id);
      const updated = [item.id, ...filtered].slice(0, 20);
      updatePreferences({ recentChannels: updated });
      return updated;
    });
  }, [updatePreferences]);

  useEffect(() => {
    const isTizen = !!(window as Window & { tizen?: unknown }).tizen;
    if (isTizen || contentType === 'tv' || loading || isFetchingMore.current)
      return;

    if (isRestoringFromHistory.current) {
      return;
    }
    if (
      (items?.length || 0) === 0 ||
      (totalItemsCount > 0 && (items?.length || 0) >= totalItemsCount)
    )
      return;

    const timer = setTimeout(() => {
      if (document.documentElement.scrollHeight <= window.innerHeight + 50) {
        handlePageChange(1);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [items, loading, contentType, totalItemsCount, handlePageChange]);

  useEffect(() => {
    const handleScroll = () => {
      const isTizen = !!(window as Window & { tizen?: unknown }).tizen;
      if (isTizen || contentType === 'tv') return;

      const buffer = 200;
      const isNearBottom =
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - buffer;
      if (isNearBottom) {
        handlePageChange(1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentType, handlePageChange]);

  useEffect(() => {
    const handleConfigChange = async () => {
      setItems([]);
      setTotalItemsCount(0);
      
      // Re-fetch provider config to get new providerKey
      let freshProviderKey = providerKey;
      try {
        const response = await api.get<{ hostname?: string; providerType?: string }>('/config');
        const host = response.data.hostname || 'default_host';
        const type = response.data.providerType || 'stalker';
        freshProviderKey = `${type}_${host}`;
        setProviderKey(freshProviderKey);
      } catch (err) {
        console.error('Failed to reload active provider config:', err);
      }

      const key = `${freshProviderKey}_${contentType}`;
      const lastCategory = contentType === 'tv' ? null : (user?.preferences?.lastSelectedCategory?.[key] || '*');
      const lastCategoryTitle = contentType === 'tv' ? 'TV' : (user?.preferences?.lastSelectedCategoryTitle?.[key] || (contentType === 'movie' ? 'Movies' : 'Series'));
      const initCtx = {
        ...initialContext,
        category: lastCategory,
        parentTitle: lastCategory === '*' ? (contentType === 'movie' ? 'Movies' : 'Series') : lastCategoryTitle,
        contentType,
      };
      setContext(initCtx);
      fetchData(initCtx, contentType);
      fetchCarousel();
      if (contentType !== 'tv') {
        fetchVodCategories(contentType as 'movie' | 'series');
      } else {
        loadEpgData();
      }
      toast.info('Configuration updated, content reloaded.', {
        autoClose: 3000,
      });
    };

    window.addEventListener('config-changed', handleConfigChange);
    return () =>
      window.removeEventListener('config-changed', handleConfigChange);
  }, [fetchData, contentType, loadEpgData, fetchCarousel, fetchVodCategories, user, providerKey, fetchProviderKey]);

  useEffect(() => {
    const handleCarouselChange = () => {
      fetchCarousel();
    };

    window.addEventListener('carousel-changed', handleCarouselChange);
    return () =>
      window.removeEventListener('carousel-changed', handleCarouselChange);
  }, [fetchCarousel]);

  return {
    context,
    items,
    loading,
    error,
    paginationError,
    totalItemsCount,
    contentType,
    epgData,
    channelGroups,
    favorites,
    recentChannels,
    isPortal,
    cwRefreshKey,
    fetchData,
    handlePageChange,
    toggleFavorite,
    handleContentTypeChange,
    cycleSort,
    handleSearch,
    handleClearWatched,
    setCwRefreshKey,
    addToRecentChannels,
    playLastTvChannel,
    setPlayLastTvChannel,
    vodCategories,
    loadingCategories,
    carouselSlides,
    fetchVodCategories,
    fetchCarousel,
    setLoading,
    setItems,
    setContext,
    isRestoringFromHistory,
    setTotalItemsCount,
    progressRecords,
    providerKey,
  };
}
