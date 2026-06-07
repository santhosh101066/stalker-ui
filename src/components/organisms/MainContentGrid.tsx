import React from 'react';
import LoadingSpinner from '@/components/atoms/LoadingSpinner';
import MediaCard from '@/components/molecules/MediaCard';
import EpisodeCard from '@/components/molecules/EpisodeCard';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import TvChannelList from '@/components/organisms/TvChannelList';
import ContinueWatching from '@/components/organisms/ContinueWatching';
import { WelcomeCarousel } from '@/components/organisms/WelcomeCarousel';
import { CategorySelector } from '@/components/organisms/CategorySelector';
import { isTizenDevice } from '@/utils/helpers';
import type { MediaItem, ContextType, ChannelGroup } from '@/types';
import type { CarouselSlide, ProgressRecord } from '@/services/services';

interface MainContentGridProps {
  items: MediaItem[];
  currentSeriesItem?: MediaItem | null;
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
  fetchData: (
    context: ContextType,
    contentType: 'movie' | 'series' | 'tv'
  ) => void;
  isRestoringFromHistory: boolean;
  vodCategories?: ChannelGroup[];
  loadingCategories?: boolean;
  carouselSlides?: CarouselSlide[];
  handleCarouselAction?: (slide: CarouselSlide) => void;
  onSelectCategory?: (categoryId: string, categoryTitle: string) => void;
  favorites?: string[];
  recentChannels?: string[];
  progressRecords?: ProgressRecord[];
  providerKey?: string;
  isCategoriesOpen?: boolean;
  setIsCategoriesOpen?: (open: boolean) => void;
}

const MainContentGrid = React.memo(
  ({
    items,
    currentSeriesItem,
    loading,
    error,
    paginationError,
    context,
    contentType,
    totalItemsCount,
    handleItemClick,
    handlePageChange,
    channelGroups,
    handleBack,
    cwRefreshKey,
    fetchData,
    vodCategories = [],
    carouselSlides = [],
    handleCarouselAction = () => {},
    onSelectCategory = () => {},
    favorites = [],
    recentChannels = [],
    progressRecords = [],
    providerKey = 'default',
    isCategoriesOpen = false,
    setIsCategoriesOpen = () => {},
  }: MainContentGridProps) => {
    const isTizen = isTizenDevice();
    const isEpisodeList =
      items &&
      items.length > 0 &&
      (!!items[0].is_episode || context.seasonId !== null);

    const enrichedItems = React.useMemo(() => {
      if (!isEpisodeList || !items) return items;
      return items.map((item) => ({
        ...item,
        is_episode: 1,
        description: item.description || currentSeriesItem?.description,
        director: item.director || currentSeriesItem?.director,
        actors: item.actors || currentSeriesItem?.actors,
        year: item.year || currentSeriesItem?.year,
        rating_imdb: item.rating_imdb || currentSeriesItem?.rating_imdb,
        rating_kinopoisk:
          item.rating_kinopoisk || currentSeriesItem?.rating_kinopoisk,
        rating_mpaa: item.rating_mpaa || currentSeriesItem?.rating_mpaa,
        age: item.age || currentSeriesItem?.age,
        country: item.country || currentSeriesItem?.country,
        genres_str: item.genres_str || currentSeriesItem?.genres_str,
        screenshot_uri:
          item.screenshot_uri || currentSeriesItem?.screenshot_uri,
      }));
    }, [items, isEpisodeList, currentSeriesItem]);

    const isRootVod = contentType !== 'tv' && !context.search && !context.movieId;

    if (loading && items.length === 0 && !isRootVod) return <LoadingSpinner />;

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
              favorites={favorites}
              recentChannels={recentChannels}
            />
          </div>
        ) : (
          <>
            {isRootVod && carouselSlides.length > 0 && (
              <div data-focus-group="carousel">
                <WelcomeCarousel slides={carouselSlides} onAction={handleCarouselAction} />
              </div>
            )}

            {isRootVod && (
              <ContinueWatching
                onClick={handleItemClick}
                refreshKey={cwRefreshKey}
              />
            )}

            {isRootVod && (
              <CategorySelector
                categories={vodCategories}
                selectedCategory={context.category}
                onSelectCategory={onSelectCategory}
                contentType={contentType as 'movie' | 'series'}
                providerKey={providerKey}
                showAllOverlay={isCategoriesOpen}
                setShowAllOverlay={setIsCategoriesOpen}
              />
            )}

            {loading && items.length === 0 ? (
              <div className="flex w-full justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
              </div>
            ) : (
              <div
                className={`${
                  contentType === 'tv'
                    ? 'channel-list flex flex-col gap-1'
                    : isEpisodeList && !isTizen
                      ? 'flex flex-col gap-4'
                      : isEpisodeList
                        ? 'grid grid-cols-1 gap-4 px-2 sm:px-0 md:grid-cols-2'
                        : 'grid grid-cols-3 gap-2 px-2 sm:grid-cols-4 sm:gap-4 sm:px-0 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7'
                } ${loading && items.length > 0 && context.page === 1 ? 'pointer-events-none opacity-50 transition-opacity duration-300' : 'opacity-100'}`}
              >
                {enrichedItems?.map((item, index) =>
                  contentType === 'tv' ? (
                    <TvChannelListCard
                      key={`${item.id}-${index}`}
                      item={item}
                      onClick={handleItemClick}
                      isFocused={false}
                    />
                  ) : isEpisodeList ? (
                    (() => {
                      const record = progressRecords.find((r) => String(r.mediaId) === String(item.id));
                      return (
                        <EpisodeCard
                          key={`${item.id}-${index}`}
                          item={item}
                          onClick={handleItemClick}
                          isCompleted={record?.completed}
                        />
                      );
                    })()
                  ) : (
                    (() => {
                      const record = progressRecords.find((r) => String(r.mediaId) === String(item.id));
                      return (
                        <MediaCard
                          key={`${item.id}-${index}`}
                          item={item}
                          onClick={handleItemClick}
                          isCompleted={record?.completed}
                          progressPercent={record?.meta?.progressPercent}
                        />
                      );
                    })()
                  )
                )}
              </div>
            )}
          </>
        )}

        {!items?.length && !loading && !context.search && (
          <p className="mt-10 text-center text-gray-400">No content found.</p>
        )}
        {!items?.length && !loading && context.search && (
          <p className="mt-10 text-center text-gray-400">
            No results found for "{context.search}".
          </p>
        )}

        {(totalItemsCount === 0 || items.length < totalItemsCount) &&
          contentType !== 'tv' && (
            <div className="w-full py-8 flex flex-col items-center justify-center">
              {loading && items.length > 0 && (
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
              )}
              {!loading && paginationError && (
                <div className="text-center">
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
);

export default MainContentGrid;
