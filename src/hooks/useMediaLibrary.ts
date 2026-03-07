import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getChannels, getMedia, getSeries, getEPG, getChannelGroups } from '@/services/services';
import type { MediaItem, ContextType, EPG_List, ChannelGroup } from '@/types';
import type { PaginatedResponse } from '@/services/services';

const PREFERRED_CONTENT_TYPE_KEY = 'preferredContentType';

export const getInitialState = (): { initialType: 'movie' | 'series' | 'tv', initialTitle: string } => {
    const savedType = localStorage.getItem(PREFERRED_CONTENT_TYPE_KEY) as 'movie' | 'series' | 'tv' | null;
    if (savedType === 'series') return { initialType: 'series', initialTitle: 'Series' };
    if (savedType === 'tv') return { initialType: 'tv', initialTitle: 'TV' };
    return { initialType: 'movie', initialTitle: 'Movies' };
};

const { initialType, initialTitle } = getInitialState();

export const initialContext: ContextType = {
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

export function useMediaLibrary() {
    const [context, setContext] = useState<ContextType>(initialContext);
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paginationError, setPaginationError] = useState<string | null>(null);
    const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
    const [contentType, setContentType] = useState<'movie' | 'series' | 'tv'>(initialType);
    const [isPortal, setIsPortal] = useState(false);
    const [epgData, setEpgData] = useState<Record<string, EPG_List[]>>({});
    const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
    const [cwRefreshKey, setCwRefreshKey] = useState(0);
    const [playLastTvChannel, setPlayLastTvChannel] = useState<string | null>(null);

    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            const storedFavorites = localStorage.getItem('favorite_channels');
            return storedFavorites ? JSON.parse(storedFavorites) : [];
        } catch (e) {
            return [];
        }
    });

    const [recentChannels, setRecentChannels] = useState<string[]>(() => {
        try {
            const storedRecents = localStorage.getItem('recent_channels');
            return storedRecents ? JSON.parse(storedRecents) : [];
        } catch (e) {
            return [];
        }
    });

    const isFetchingMore = useRef(false);

    const loadEpgData = useCallback(async () => {
        try {
            const response = await getEPG();
            if (response.data?.data) setEpgData(response.data.data);
        } catch (err) {
            toast.warn('Could not load program guide.');
        }
    }, []);

    const fetchData = useCallback(async (newContext: ContextType, typeOverride?: 'movie' | 'series' | 'tv') => {
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
                setItems((prev) => newContext.page === 1 ? response.data : [...prev, ...response.data]);
                if (response.total_items) setTotalItemsCount(response.total_items);
                if (response.isPortal !== undefined) setIsPortal(response.isPortal);
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
                    response = await getSeries({
                        page: newContext.page,
                        search: newContext.search,
                        pageAtaTime: 1,
                        category: newContext.category,
                        sort: newContext.sort,
                    });
                }
                setItems((prev) => newContext.page === 1 ? response.data : [...prev, ...response.data]);
                if (response.total_items) setTotalItemsCount(response.total_items);
            } else {
                const [channelResponse, groupResponse] = await Promise.all([getChannels(), getChannelGroups()]);
                const allChannels = channelResponse.data || [];
                const allGroups = groupResponse.data || [];
                const filteredChannels = newContext.search
                    ? allChannels.filter((c) => c.name?.toLowerCase().includes(newContext.search!.toLowerCase()))
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
        } catch (err) {
            if (newContext.page > 1) setPaginationError('Could not load more content.');
            else setError('Could not load content. Please try again later.');
        } finally {
            setLoading(false);
            isFetchingMore.current = false;
        }
    }, [contentType]);

    useEffect(() => {
        fetchData(initialContext);
        if (initialContext.contentType === 'tv') loadEpgData();
    }, [fetchData, loadEpgData]);

    const handlePageChange = useCallback((direction: number) => {
        if (direction <= 0 || contentType === 'tv') return;
        if (isFetchingMore.current || loading || (totalItemsCount > 0 && items.length >= totalItemsCount)) return;

        isFetchingMore.current = true;
        const newPage = context.page + direction;
        fetchData({ ...context, page: newPage });
    }, [loading, totalItemsCount, items.length, context, fetchData, contentType]);

    const toggleFavorite = useCallback((item: MediaItem) => {
        if (!item?.id) return;
        const newFavs = favorites.includes(item.id)
            ? favorites.filter((id) => id !== item.id)
            : [...favorites, item.id];

        setFavorites(newFavs);
        localStorage.setItem('favorite_channels', JSON.stringify(newFavs));
        favorites.includes(item.id)
            ? toast.info(`Removed ${item.name || 'Channel'} from favorites`)
            : toast.success(`Added ${item.name || 'Channel'} to favorites`);
    }, [favorites]);

    const handleContentTypeChange = useCallback((type: 'movie' | 'series' | 'tv') => {
        if (type === contentType) return;
        const newTitle = type === 'movie' ? 'Movies' : type === 'series' ? 'Series' : 'TV';
        const newContext = { ...initialContext, parentTitle: newTitle, category: null, contentType: type };

        if (type === 'tv') setChannelGroups([]);
        setContentType(type);
        localStorage.setItem(PREFERRED_CONTENT_TYPE_KEY, type);
        setContext(newContext);
        fetchData(newContext, type);
        if (type === 'tv') {
            loadEpgData();
            const lastPlayedId = localStorage.getItem('lastPlayedTvChannelId');
            setPlayLastTvChannel(lastPlayedId || '__play_first__');
        } else {
            setPlayLastTvChannel(null);
        }
    }, [contentType, fetchData, loadEpgData]);

    const cycleSort = useCallback(() => {
        const sortOptions = ['latest', 'alphabetic', 'oldest'];
        const currentSort = context.sort || 'latest';
        const nextSort = sortOptions[(sortOptions.indexOf(currentSort) + 1) % sortOptions.length];
        fetchData({ ...context, sort: nextSort, page: 1 });
    }, [context, fetchData]);

    const handleSearch = (search: string) => {
        const newTitle = search ? `Results for "${search}"` : contentType === 'movie' ? 'Movies' : contentType === 'series' ? 'Series' : 'TV';
        fetchData({ ...initialContext, search, category: search ? '*' : contentType === 'tv' ? null : '*', parentTitle: newTitle, contentType });
    };

    const handleClearWatched = (setConfirmModal: Function) => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear History',
            message: 'Are you sure you want to clear all watched and in-progress statuses?',
            isDestructive: true,
            onConfirm: () => {
                setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
                Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith('video-completed-') || key.startsWith('video-in-progress-')) {
                        localStorage.removeItem(key);
                    }
                });
                toast.success('All watched and in-progress statuses have been cleared.');
                fetchData(initialContext, contentType);
            },
        });
    };

    const addToRecentChannels = useCallback((item: MediaItem) => {
        if (!item?.id) return;
        setRecentChannels((prev) => {
            const filtered = prev.filter((id) => id !== item.id);
            const updated = [item.id, ...filtered].slice(0, 20); // Top 20 mattum vachikkanum
            localStorage.setItem('recent_channels', JSON.stringify(updated));
            return updated;
        });
    }, []);

    useEffect(() => {
        const isTizen = !!(window as any).tizen;
        if (isTizen || contentType === 'tv' || loading || isFetchingMore.current) return;
        if (items.length === 0 || (totalItemsCount > 0 && items.length >= totalItemsCount)) return;

        const timer = setTimeout(() => {
            if (document.documentElement.scrollHeight <= window.innerHeight + 50) {
                handlePageChange(1);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [items, loading, contentType, totalItemsCount, handlePageChange]);

    // --- Web Scroll Pagination ---
    useEffect(() => {
        const handleScroll = () => {
            const isTizen = !!(window as any).tizen;
            if (isTizen || contentType === 'tv') return;

            const buffer = 200;
            const isNearBottom = window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - buffer;
            if (isNearBottom) {
                handlePageChange(1);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [contentType, handlePageChange]);

    return {
        context, items, loading, error, paginationError, totalItemsCount, contentType,
        epgData, channelGroups, favorites, recentChannels, isPortal, cwRefreshKey,
        fetchData, handlePageChange, toggleFavorite, handleContentTypeChange, cycleSort,
        handleSearch, handleClearWatched, setCwRefreshKey, addToRecentChannels, playLastTvChannel, setPlayLastTvChannel, setLoading,
        setItems, setContext
    };
}