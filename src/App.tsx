import React, { useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/App.css';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Home from '@/components/pages/Home';
import Login from '@/components/pages/Login';
import Verify from '@/components/pages/Verify';
import { Loader2 } from 'lucide-react';

import { Header } from '@/components/organisms/Header';
import Admin from '@/components/organisms/Admin';
import VideoPlayer from '@/components/organisms/VideoPlayer';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import MainContentGrid from '@/components/organisms/MainContentGrid';
import DetailModal from '@/components/organisms/DetailModal';

import { useMediaLibrary, initialContext } from '@/hooks/useMediaLibrary';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useTVFocus } from '@/hooks/useTVFocus';
import { useCastReceiver } from '@/hooks/useCastReceiver';
import { isTizenDevice } from './utils/helpers';
import type { MediaItem } from '@/types';
import { getMedia, getSeries, getChannels, type CarouselSlide } from '@/services/services';

function TVPortal({ onShowAdmin }: { onShowAdmin: () => void }) {
  const isTizen = isTizenDevice();
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  // Track whether the detail modal pushed its own history entry
  const detailHistoryPushed = React.useRef(false);
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
    vodCategories,
    loadingCategories,
    carouselSlides,
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
    focusedIndex,
    setFocusedIndex,
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
    focusedIndex,
    setFocusedIndex,
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

  // Push a history entry when the modal opens so the browser Back button
  // closes the modal rather than popping a navigation frame.
  React.useEffect(() => {
    if (detailItem) {
      window.history.pushState({ modal: 'detail' }, '');
      detailHistoryPushed.current = true;
    }
  }, [detailItem]);

  // Hardware Back (popstate) while the modal is open — just close the modal.
  React.useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (detailItem) {
        e.stopImmediatePropagation();
        setDetailItem(null);
        detailHistoryPushed.current = false;
      }
    };
    window.addEventListener('popstate', onPop, true); // capture phase → runs before nav handler
    return () => window.removeEventListener('popstate', onPop, true);
  }, [detailItem]);

  const handleCloseDetail = useCallback(() => {
    // If we pushed a history entry for the modal, remove it cleanly.
    if (detailHistoryPushed.current) {
      window.history.back();
    } else {
      setDetailItem(null);
    }
  }, []);

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

  const handleCarouselAction = useCallback(
    async (slide: CarouselSlide) => {
      if (slide.actionType === 'none') return;
      try {
        let resolvedItem: MediaItem;
        if (slide.mediaType === 'movie') {
          const res = await getMedia({ movieId: slide.mediaId, category: '*' });
          if (res.data && res.data.length > 0) {
            resolvedItem = {
              ...res.data[0],
              is_playable_movie: true,
            };
          } else {
            throw new Error('Movie not found');
          }
        } else if (slide.mediaType === 'series') {
          const res = await getSeries({ movieId: slide.mediaId, category: '*' });
          if (res.data && res.data.length > 0) {
            resolvedItem = {
              ...res.data[0],
              is_series: 1,
            };
          } else {
            throw new Error('Series not found');
          }
        } else {
          // TV Channel
          const res = await getChannels();
          const channel = res.data.find(
            (c) => String(c.id) === String(slide.mediaId)
          );
          if (channel) {
            resolvedItem = channel;
          } else {
            throw new Error('Channel not found');
          }
        }

        if (slide.actionType === 'play') {
          await startPlayback(resolvedItem);
        } else if (slide.actionType === 'details') {
          await handleItemClick(resolvedItem);
        }
      } catch (err) {
        console.error('Failed to execute carousel action:', err);
        toast.error('Failed to load media.');
      }
    },
    [startPlayback, handleItemClick]
  );

  const onSelectCategory = useCallback(
    (categoryId: string, categoryTitle: string) => {
      const newContext = {
        ...initialContext,
        category: categoryId,
        parentTitle:
          categoryId === '*'
            ? contentType === 'movie'
              ? 'Movies'
              : 'Series'
            : categoryTitle,
        contentType,
      };
      fetchData(newContext);
    },
    [contentType, fetchData]
  );

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
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 font-sans text-gray-200">
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
                vodCategories={vodCategories}
                loadingCategories={loadingCategories}
                carouselSlides={carouselSlides}
                handleCarouselAction={handleCarouselAction}
                onSelectCategory={onSelectCategory}
              />
            </main>
          </div>
        </div>
      )}

      {detailItem && (
        <DetailModal
          item={detailItem}
          epgData={epgData}
          onClose={handleCloseDetail}
          onPlay={(item, startTime, endTime) => {
            if (detailHistoryPushed.current) {
              detailHistoryPushed.current = false;
              window.history.back();
            }
            setDetailItem(null);
            setTimeout(() => {
              startPlayback(item, startTime, endTime);
            }, 50);
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

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isLoggedIn, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 flex justify-center items-center font-sans text-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isLoggedIn) {
    const dest = isTizenDevice() ? '/login' : '/home';
    return <Navigate to={dest} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const navigate = useNavigate();

  return (
    <>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TVPortal onShowAdmin={() => navigate('/admin')} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-indigo-950 font-sans text-gray-200">
                <Admin onBack={() => navigate('/')} />
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName={(context) =>
          "relative flex p-1 min-h-[60px] rounded-2xl justify-between overflow-hidden cursor-pointer bg-[#0b0f19] border border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.4)] text-gray-200 mb-3 " +
          (context?.type === 'success' ? 'border-l-4 border-l-emerald-500' : 
           context?.type === 'error' ? 'border-l-4 border-l-red-500' : 
           'border-l-4 border-l-[#3b82f6]') // Matching your app's electric blue
        }
        bodyClassName={() => "text-sm font-medium p-3 flex items-start text-gray-300"}
      />
    </>
  );
}
