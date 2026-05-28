import React, { useState, useCallback, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/App.css';

import { Header } from '@/components/organisms/Header';
import Admin from '@/components/organisms/Admin';
import VideoPlayer from '@/components/organisms/VideoPlayer';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import MainContentGrid from '@/components/organisms/MainContentGrid';
import DetailModal from '@/components/organisms/DetailModal';

import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useTVFocus } from '@/hooks/useTVFocus';
import { useCastReceiver } from '@/hooks/useCastReceiver';
import { isTizenDevice } from './utils/helpers';
import type { MediaItem } from '@/types';

function TVPortal({ onShowAdmin }: { onShowAdmin: () => void }) {
  const isTizen = isTizenDevice();
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const {
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
    handleContentTypeChange,
    handleSearch,
    cycleSort,
    handlePageChange,
    toggleFavorite,
    fetchData,
    handleClearWatched,
    cwRefreshKey,
    isPortal,
    addToRecentChannels,
    playLastTvChannel,
    setPlayLastTvChannel,

    setItems,
    setContext,
    isRestoringFromHistory,
    setTotalItemsCount,
  } = useMediaLibrary();

  const {
    history,
    streamUrl,
    rawStreamUrl,
    currentItem,
    currentSeriesItem,
    resumePlaybackState,
    handleItemClick,
    handleBack,
    closePlayer,
    previewChannel,
    handleNextChannel,
    handlePrevChannel,
    playCastedMedia,
    pushFrame,
    startPlayback,
  } = useAppNavigation(
    context,
    items,
    contentType,
    totalItemsCount,
    fetchData,
    isPortal,
    addToRecentChannels,
    playLastTvChannel,
    setPlayLastTvChannel,
    setItems,
    setContext,
    setTotalItemsCount,
    isRestoringFromHistory,
    setDetailItem
  );

  const onClearWatched = useCallback(
    () => handleClearWatched(setConfirmModal),
    [handleClearWatched]
  );

  const {
    isSearchActive,
    setIsSearchActive,
    isSearchTyping,
    setIsSearchTyping,
    searchTerm,
    setSearchTerm,
  } = useTVFocus({
    streamUrl,
    items,
    contentType,
    handleBack,
    handlePageChange,
    cycleSort,
    handleContentTypeChange,
    handleClearWatched: onClearWatched,
    isConfirmingDelete: confirmModal.isOpen,
    isDetailOpen: !!detailItem,
  });

  const onSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (searchTerm !== context.search) {
        pushFrame();
      }
      handleSearch(searchTerm);
    },
    [searchTerm, context.search, pushFrame, handleSearch]
  );

  const { pendingPlaybackState } = useCastReceiver({
    playCastedMedia,
  });

  const currentTitle = React.useMemo(() => {
    if (streamUrl) return 'Now Playing';

    const isRoot =
      (!context.category || context.category === '*') &&
      !context.search &&
      !context.movieId &&
      !context.seasonId;

    if (isRoot) {
      return contentType === 'tv'
        ? 'TV'
        : contentType === 'series'
          ? 'Series'
          : 'Movies';
    }

    return context.parentTitle || 'Browse';
  }, [streamUrl, context, contentType]);

  return (
    <>
      {streamUrl ? (
        <VideoPlayer
          streamUrl={streamUrl}
          rawStreamUrl={rawStreamUrl}
          onBack={closePlayer}
          itemId={currentItem?.id || null}
          seasonId={context.seasonId}
          categoryId={context.category}
          context={context}
          contentType={contentType}
          mediaId={
            context.movieId ??
            (contentType === 'movie' && currentItem ? currentItem.id : null)
          }
          item={currentItem}
          seriesItem={currentSeriesItem}
          channels={contentType === 'tv' ? items : undefined}
          episodes={
            currentItem?.is_episode || currentItem?.series_number !== undefined
              ? items
              : undefined
          }
          channelInfo={contentType === 'tv' ? currentItem : null}
          previewChannelInfo={contentType === 'tv' ? previewChannel : null}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          onChannelSelect={handleItemClick}
          onEpisodeSelect={startPlayback}
          onLoadMoreEpisodes={async () => handlePageChange(1)}
          epgData={epgData}
          channelGroups={channelGroups}
          favorites={favorites}
          recentChannels={recentChannels}
          toggleFavorite={toggleFavorite}
          initialPlaybackState={
            resumePlaybackState || pendingPlaybackState || undefined
          }
        />
      ) : (
        <div className="min-h-screen font-sans text-gray-200">
          <div className="container mx-auto p-0 pb-4 sm:p-6">
            <Header
              currentTitle={currentTitle}
              contentType={contentType}
              handleContentTypeChange={handleContentTypeChange}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleSearch={onSearchSubmit}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              isSearchTyping={isSearchTyping}
              setIsSearchTyping={setIsSearchTyping}
              sort={context.sort}
              cycleSort={cycleSort}
              showAdmin={false}
              setShowAdmin={onShowAdmin}
              handleClearWatched={onClearWatched}
              streamUrl={streamUrl}
              historyLength={history.length}
              handleBack={handleBack}
              isTizen={isTizen}
            />

            <main>
              <MainContentGrid
                items={items}
                currentSeriesItem={currentSeriesItem}
                loading={loading}
                error={error}
                paginationError={paginationError}
                context={context}
                contentType={contentType}
                totalItemsCount={totalItemsCount}
                handleItemClick={handleItemClick}
                handlePageChange={handlePageChange}
                channelGroups={channelGroups}
                handleBack={handleBack}
                cwRefreshKey={cwRefreshKey}
                fetchData={fetchData}
                isRestoringFromHistory={isRestoringFromHistory.current}
              />
            </main>
          </div>
        </div>
      )}

      {detailItem && (
        <DetailModal
          item={detailItem}
          epgData={epgData}
          onClose={() => setDetailItem(null)}
          onPlay={(item, startTime, endTime) => {
            setDetailItem(null);
            startPlayback(item, startTime, endTime);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
    </>
  );
}

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  const enterAdmin = useCallback(() => {
    window.history.pushState({ view: 'admin' }, '', '');
    setShowAdmin(true);
  }, []);

  const exitAdmin = useCallback(() => {
    if (window.history.state && window.history.state.view === 'admin') {
      window.history.back();
    } else {
      window.history.replaceState({}, '', '');
      setShowAdmin(false);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      setShowAdmin(!!(state && state.view === 'admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 font-sans text-gray-200">
        <Admin onBack={exitAdmin} />
        <ToastContainer />
      </div>
    );
  }

  return (
    <>
      <TVPortal onShowAdmin={enterAdmin} />
      <ToastContainer />
    </>
  );
}
