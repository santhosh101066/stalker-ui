import LoadingSpinner from '@/components/atoms/LoadingSpinner';
import MediaCard from '@/components/molecules/MediaCard';
import EpisodeCard from '@/components/molecules/EpisodeCard';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import TvChannelList from '@/components/organisms/TvChannelList';
import ContinueWatching from '@/components/organisms/ContinueWatching';
import { isTizenDevice } from '@/utils/helpers';
import type { MediaItem, ContextType, ChannelGroup } from '@/types';

interface MainContentGridProps {
    items: MediaItem[];
    loading: boolean;
    error: string | null;
    paginationError: string | null;
    context: ContextType;
    contentType: 'movie' | 'series' | 'tv';
    totalItemsCount: number;
    handleItemClick: (item: MediaItem) => void;
    handlePageChange: (dir: number) => void;
    channelGroups: ChannelGroup[];
    handleBack: () => void;
    cwRefreshKey: number;
    fetchData: Function;
}

export default function MainContentGrid({
    items, loading, error, paginationError, context, contentType, totalItemsCount,
    handleItemClick, handlePageChange, channelGroups, handleBack, cwRefreshKey, fetchData
}: MainContentGridProps) {
    const isTizen = isTizenDevice();
    const isEpisodeList = items && items.length > 0 && items[0].is_episode;

    if (loading && items.length === 0) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="text-center">
                <p className="text-red-500">{error}</p>
                <button
                    onClick={() => fetchData(context, contentType)}
                    className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                    data-focusable="true"
                >
                    Reload
                </button>
            </div>
        );
    }

    return (
        <>
            {!isTizen && contentType === 'tv' ? (
                <div className="relative h-[calc(100vh-100px)] w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50">
                    <TvChannelList
                        channels={items}
                        channelGroups={channelGroups}
                        onChannelSelect={handleItemClick}
                        onBack={handleBack}
                        currentItemId={null}
                        showCloseButton={false}
                    />
                </div>
            ) : (
                <>
                    {contentType !== 'tv' && !context.search && context.category === null && (
                        <ContinueWatching onClick={handleItemClick} refreshKey={cwRefreshKey} />
                    )}

                    <div
                        className={`${contentType === 'tv' ? 'channel-list flex flex-col gap-1'
                                : isEpisodeList && !isTizen ? 'flex flex-col gap-4'
                                    : isEpisodeList ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
                                        : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6'
                            } ${loading && items.length > 0 && context.page === 1 ? 'pointer-events-none opacity-50 transition-opacity duration-300' : 'opacity-100'}`}
                    >
                        {items?.map((item) =>
                            contentType === 'tv' ? (
                                <TvChannelListCard key={item.id} item={item} onClick={handleItemClick} isFocused={false} />
                            ) : isEpisodeList ? (
                                <EpisodeCard key={item.id} item={item} onClick={handleItemClick} />
                            ) : (
                                <MediaCard key={item.id} item={item} onClick={handleItemClick} />
                            )
                        )}
                    </div>
                </>
            )}

            {!items?.length && !loading && !context.search && <p className="mt-10 text-center text-gray-400">No content found.</p>}
            {!items?.length && !loading && context.search && <p className="mt-10 text-center text-gray-400">No results found for "{context.search}".</p>}

            {(totalItemsCount === 0 || items.length < totalItemsCount) && contentType !== 'tv' && (
                <div className="col-span-full">
                    {loading && items.length > 0 && <LoadingSpinner />}
                    {!loading && paginationError && (
                        <div className="py-8 text-center">
                            <p className="text-red-500">{paginationError}</p>
                            <button
                                onClick={() => handlePageChange(1)}
                                className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                                data-focusable="true"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}