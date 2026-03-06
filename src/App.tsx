/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/App.css';

// Components
import { Header } from '@/components/organisms/Header';
import Admin from '@/components/organisms/Admin';
import VideoPlayer from '@/components/organisms/VideoPlayer';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import MainContentGrid from '@/components/organisms/MainContentGrid';

// Custom Hooks
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useTVFocus } from '@/hooks/useTVFocus';
import { useCastReceiver } from '@/hooks/useCastReceiver';
import { isTizenDevice } from './utils/helpers';

export default function App() {
  const isTizen = isTizenDevice();
  const [showAdmin, setShowAdmin] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { }, isDestructive: false });

  // Hook 1: Manages API calls, Context, and Items
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
    setLoading
  } = useMediaLibrary();

  // Hook 2: Manages navigation history, Back button, and Stream URLs
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
    playCastedMedia
  } = useAppNavigation(context, items, contentType, fetchData, isPortal, addToRecentChannels, playLastTvChannel,
    setPlayLastTvChannel);

  const onClearWatched = () => handleClearWatched(setConfirmModal);
  // Hook 3: Handles Tizen/Web Keyboard spatial focus logic
  const { isSearchActive, setIsSearchActive, isSearchTyping, setIsSearchTyping, searchTerm, setSearchTerm } = useTVFocus({
    streamUrl,
    items,
    contentType,
    handleBack,
    handlePageChange,
    cycleSort,
    handleContentTypeChange,
    handleClearWatched: onClearWatched
  });

  const onSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSearch(searchTerm);
  };

  // Hook 4: Handles Sockets for Casting
  const { pendingPlaybackState } = useCastReceiver({
    playCastedMedia
  });


  const currentTitle = streamUrl ? 'Now Playing' : context.parentTitle || 'Browse';

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
          mediaId={contentType === 'series' ? context.movieId : contentType === 'movie' && currentItem ? currentItem.id : null}
          item={currentItem}
          seriesItem={currentSeriesItem}
          channels={contentType === 'tv' ? items : undefined}
          channelInfo={contentType === 'tv' ? currentItem : null}
          previewChannelInfo={contentType === 'tv' ? previewChannel : null}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          onChannelSelect={handleItemClick}
          epgData={epgData}
          channelGroups={channelGroups}
          favorites={favorites}
          recentChannels={recentChannels}
          toggleFavorite={toggleFavorite}
          initialPlaybackState={resumePlaybackState || pendingPlaybackState || undefined}
        />
      ) : (
        <div className="min-h-screen font-sans text-gray-200">
          <div className="container mx-auto p-0 sm:p-6 pb-4">
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
              showAdmin={showAdmin}
              setShowAdmin={setShowAdmin}
              handleClearWatched={onClearWatched}
              streamUrl={streamUrl}
              historyLength={history.length}
              handleBack={handleBack}
              isTizen={isTizen}
            />

            <main>
              {showAdmin ? (
                <Admin />
              ) : (
                <MainContentGrid
                  items={items}
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
                />
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