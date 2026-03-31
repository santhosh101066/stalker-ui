/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  MediaPlayer,
  MediaProvider,
  Captions,
  useMediaRemote,
  type PlayerSrc,
} from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';

import TvChannelList, {
  type TvChannelListRef,
} from '@/components/organisms/TvChannelList';
import '@/components/organisms/VideoPlayerContent.css';

import { BufferingOverlay } from '@/components/molecules/BufferingOverlay';
import { SeekOverlay } from '@/components/molecules/SeekOverlay';
import { TopBar } from '@/components/organisms/TopBar';
import { TVControls } from '@/components/organisms/TVControls';
import { VODControls } from '@/components/organisms/VODControls';
import { useVideoContext } from '@/context/video';

const VideoPlayerContent: React.FC = () => {
  const {
    playerRef,
    playerContainerRef,
    settingsMenuRef,

    controlsVisible,
    cursorVisible,
    useProxy,
    focusedIndex,
    showChannelList,
    seekOverlay,
    fitMode,
    isSettingsMenuOpen,
    activeSettingsMenu,

    streamUrl,
    rawStreamUrl,
    contentType,
    itemId,
    item,
    seriesItem,
    channels,
    previewChannelInfo,
    channelInfo,
    channelGroups,
    retryCount,
    reloadTrigger,
    isRecovering,

    toggleFavorite,
    onProviderChange,
    handleCanPlay,
    handleTimeUpdate,
    handleError,
    handleEnded,
    handleMouseMove,
    toggleChannelList,
    setControlsVisible,
    setCursorVisible,
    setIsTooltipVisible,
    setFocusedIndex,
    setShowChannelList,
    showControlsAndCursor,
    handleSkipButtonClick,
    onPrevChannel,
    onNextChannel,
    onChannelSelect,
    onBack,
    setIsSettingsMenuOpen,
  } = useVideoContext();

  const remote = useMediaRemote();
  const tvChannelListRef = useRef<TvChannelListRef>(null);
  const [showExitToast, setShowExitToast] = useState(false);
  const backPressRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 FIX 1: Synchronous Navigation Ref (Prevents getting stuck on fast clicks)
  const navRef = useRef({
    index: focusedIndex ?? 0,
    isSettingsOpen: isSettingsMenuOpen,
    isControlsVisible: controlsVisible,
  });

  // Keep ref in sync with React state
  useEffect(() => {
    navRef.current.isSettingsOpen = isSettingsMenuOpen;
  }, [isSettingsMenuOpen]);
  useEffect(() => {
    navRef.current.isControlsVisible = controlsVisible;
  }, [controlsVisible]);
  useEffect(() => {
    if (focusedIndex !== null) navRef.current.index = focusedIndex;
  }, [focusedIndex]);

  const setFocusSync = useCallback(
    (newIndex: number) => {
      navRef.current.index = newIndex; // Update instantly for the next fast keypress
      setFocusedIndex(newIndex); // Update UI
    },
    [setFocusedIndex]
  );

  // 👻 FIX 2: Bulletproof Visibility Check (Kills invisible ghost menus)
  const getVisibleFocusableElements = useCallback(() => {
    const containerRef = navRef.current.isSettingsOpen
      ? settingsMenuRef
      : playerContainerRef;
    if (!containerRef.current) return [];

    const allFocusable = Array.from(
      containerRef.current.querySelectorAll('[data-focusable="true"]')
    ) as HTMLElement[];

    return allFocusable.filter((el) => {
      // 1. Must have physical dimensions
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      // 2. Ignore elements inside closed Vidstack menus
      const parentMenu = el.closest('[data-open]');
      if (parentMenu && parentMenu.getAttribute('data-open') === 'false')
        return false;

      // 3. Ignore transparent or disabled elements
      const style = window.getComputedStyle(el);
      if (
        style.opacity === '0' ||
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        style.pointerEvents === 'none'
      ) {
        return false;
      }

      return true;
    });
  }, [playerContainerRef, settingsMenuRef]);

  // TV Key Navigation Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (!e.isTrusted && e.keyCode === 0)) return;
      const wereControlsHidden = !navRef.current.isControlsVisible;
      showControlsAndCursor();
      e.stopPropagation();

      // If UI was hidden, only open it on 'OK' (Enter) without triggering action
      if (wereControlsHidden && e.keyCode === 13) return;
      // Direct Global TV Keys
      if (e.keyCode === 405 && contentType === 'tv' && channelInfo) {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(channelInfo);
        return;
      } else if (e.keyCode === 10073) {
        e.preventDefault();
        e.stopPropagation();
        if (contentType === 'tv') toggleChannelList();
        return;
      }

      if (showChannelList) {
        e.stopPropagation();
        tvChannelListRef.current?.handleKeyDown(e);
        return;
      }

      const focusable = getVisibleFocusableElements();

      if (focusable.length === 0) {
        // Fallback Native Media Control Keys
        if ([415, 19, 10252].includes(e.keyCode)) {
          e.preventDefault();
          remote.togglePaused();
        }
        if (e.keyCode === 412) {
          e.preventDefault();
          contentType === 'tv' ? onPrevChannel?.() : handleSkipButtonClick(-30);
        }
        if (e.keyCode === 417) {
          e.preventDefault();
          contentType === 'tv' ? onNextChannel?.() : handleSkipButtonClick(30);
        }
        if (e.keyCode === 427 && contentType === 'tv') {
          e.preventDefault();
          onPrevChannel?.();
        }
        if (e.keyCode === 428 && contentType === 'tv') {
          e.preventDefault();
          onNextChannel?.();
        }
        if ([0, 10009, 8].includes(e.keyCode)) {
          e.preventDefault();
          document.fullscreenElement ? remote.toggleFullscreen() : onBack();
        }
        return;
      }

      // Read from the instant Ref, not the delayed React state
      let currentIndex = navRef.current.index;
      currentIndex = Math.max(0, Math.min(currentIndex, focusable.length - 1));

      const focusedElement = focusable[currentIndex];
      const isMenuOpen = navRef.current.isSettingsOpen;

      switch (e.keyCode) {
        case 37: // Left
          e.preventDefault();
          if (
            !isMenuOpen &&
            contentType === 'tv' &&
            focusedElement?.getAttribute('data-control') !== 'seekbar'
          ) {
            onPrevChannel?.();
            showControlsAndCursor();
          } else if (
            focusedElement?.getAttribute('data-control') === 'seekbar'
          ) {
            handleSkipButtonClick(-10);
          } else {
            const minIndex = contentType !== 'tv' && !isMenuOpen ? 1 : 0;
            if (currentIndex > minIndex) setFocusSync(currentIndex - 1);
          }
          break;
        case 39: // Right
          e.preventDefault();
          if (
            !isMenuOpen &&
            contentType === 'tv' &&
            focusedElement?.getAttribute('data-control') !== 'seekbar'
          ) {
            onNextChannel?.();
            showControlsAndCursor();
          } else if (
            focusedElement?.getAttribute('data-control') === 'seekbar'
          ) {
            handleSkipButtonClick(10);
          } else if (currentIndex < focusable.length - 1) {
            setFocusSync(currentIndex + 1);
          }
          break;
        case 38: // Up
          e.preventDefault();
          e.stopPropagation();
          setFocusSync(currentIndex > 0 ? currentIndex - 1 : 0);
          break;
        case 40: // Down
          e.preventDefault();
          e.stopPropagation();
          setFocusSync(
            currentIndex < focusable.length - 1
              ? currentIndex + 1
              : currentIndex
          );
          break;
        case 13: // Enter
          e.preventDefault();
          if (focusedElement) {
            focusedElement.focus();
            focusedElement.dispatchEvent(
              new PointerEvent('pointerdown', { bubbles: true })
            );
            focusedElement.dispatchEvent(
              new PointerEvent('pointerup', { bubbles: true })
            );
            focusedElement.click();

            if (
              focusedElement.getAttribute('data-control') === 'settings-menu'
            ) {
              setIsSettingsMenuOpen(true);
              setFocusSync(0);
            }
          }
          break;
        case 415:
        case 19:
        case 10252: // Play/Pause
          e.preventDefault();
          remote.togglePaused();
          break;
        case 412: // Rewind
          e.preventDefault();
          contentType === 'tv' ? onPrevChannel?.() : handleSkipButtonClick(-30);
          break;
        case 417: // Fast Forward
          e.preventDefault();
          contentType === 'tv' ? onNextChannel?.() : handleSkipButtonClick(30);
          break;
        case 427: // Channel Down
          e.preventDefault();
          if (contentType === 'tv') onPrevChannel?.();
          break;
        case 428: // Channel Up
          e.preventDefault();
          if (contentType === 'tv') onNextChannel?.();
          break;
        case 0:
        case 10009:
        case 8: // Back/Return
          e.preventDefault();
          e.stopPropagation();

          if (isMenuOpen) {
            const activeTarget =
              document.activeElement ||
              settingsMenuRef.current ||
              document.body;
            activeTarget.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                bubbles: true,
              })
            );
            setTimeout(() => {
              const anyMenuOpen = document.querySelector('[data-open]');
              if (!anyMenuOpen) {
                setIsSettingsMenuOpen(false);
                setFocusSync(0);
              } else {
                setFocusSync(0);
              }
            }, 150);
            return;
          }

          if (document.fullscreenElement) {
            remote.toggleFullscreen();
            return;
          }

          if (backPressRef.current) {
            clearTimeout(backPressRef.current);
            backPressRef.current = null;
            setShowExitToast(false);
            onBack();
          } else {
            setShowExitToast(true);
            backPressRef.current = setTimeout(() => {
              backPressRef.current = null;
              setShowExitToast(false);
            }, 2000);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    showChannelList,
    contentType,
    remote,
    handleSkipButtonClick,
    onPrevChannel,
    onNextChannel,
    channelInfo,
    toggleFavorite,
    onBack,
    toggleChannelList,
    setIsSettingsMenuOpen,
    showControlsAndCursor,
    getVisibleFocusableElements,
    setFocusSync,
    settingsMenuRef,
  ]);

  // Handle Focus CSS Classes
  useEffect(() => {
    if (showChannelList) return;
    const focusable = getVisibleFocusableElements();
    if (focusable.length === 0) return;

    const newIndex =
      focusedIndex === null ? 0 : Math.min(focusedIndex, focusable.length - 1);
    if (focusedIndex !== newIndex) setFocusedIndex(newIndex);

    focusable.forEach((el, index) => {
      if (index === newIndex) {
        el.classList.add('focused');
        el.focus();
      } else {
        el.classList.remove('focused');
      }
    });
  }, [
    focusedIndex,
    isSettingsMenuOpen,
    activeSettingsMenu,
    showChannelList,
    getVisibleFocusableElements,
    setFocusedIndex,
  ]);

  const videoSrc = useMemo<PlayerSrc>(() => {
    const activeUrl =
      (useProxy ? streamUrl || rawStreamUrl : rawStreamUrl || streamUrl) || '';
    if (!activeUrl) return '';
    return {
      src: activeUrl,
      type: activeUrl.toLowerCase().includes('m3u8')
        ? 'application/x-mpegurl'
        : 'video/mp4',
    } as PlayerSrc;
  }, [useProxy, streamUrl, rawStreamUrl]);

  return (
    <div
      className="h-[100dvh] w-full bg-black"
      data-focusable="true"
      tabIndex={-1}
      style={{ '--video-fit-mode': fitMode } as React.CSSProperties}
    >
      <div
        ref={playerContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setIsTooltipVisible(false);
          setControlsVisible(false);
          setCursorVisible(false);
        }}
        className={`group relative h-full w-full overflow-hidden ${!cursorVisible && !controlsVisible ? 'cursor-none' : ''}`}
      >
        {showChannelList &&
          contentType === 'tv' &&
          channels &&
          onChannelSelect && (
            <TvChannelList
              ref={tvChannelListRef}
              channels={channels}
              channelGroups={channelGroups || []}
              onChannelSelect={(item) => {
                onChannelSelect(item);
                setShowChannelList(false);
              }}
              onBack={() => setShowChannelList(false)}
              currentItemId={itemId}
              isOverlay={true}
            />
          )}

        {isRecovering && (
          <div className="absolute z-50 flex h-full w-full flex-col items-center justify-center bg-gray-950/90 text-white backdrop-blur-md">
            <div className="relative mb-8 h-20 w-20">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>
              <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/30 blur-md"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/5 border-r-indigo-500 border-t-blue-500"></div>
              <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
            </div>
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-2xl font-bold tracking-wider text-transparent">
                Connecting...
              </div>
              <div className="text-sm font-medium tracking-wide transition-colors duration-300">
                {retryCount > 0 ? (
                  <span className="text-amber-400/90">
                    Retrying connection ({retryCount})...
                  </span>
                ) : (
                  <span className="text-gray-400">
                    Establishing secure stream
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <MediaPlayer
          key={`${reloadTrigger}-${useProxy ? 'proxied' : 'direct'}`}
          className={`media-provider h-full w-full ${isRecovering ? 'invisible' : ''}`}
          title={
            item?.title || seriesItem?.title || channelInfo?.name || 'Video'
          }
          src={videoSrc}
          viewType="video"
          streamType={contentType === 'tv' ? 'live' : 'on-demand'}
          crossOrigin
          playsInline
          autoplay
          load="eager"
          ref={playerRef}
          onProviderChange={onProviderChange}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onError={handleError}
          onEnded={handleEnded}
          onDoubleClick={() => remote.toggleFullscreen()}
          keyDisabled={true}
        >
          <MediaProvider>
            {item?.subtitles?.map((sub: any, index: number) => (
              <track
                key={index}
                src={sub.url}
                kind="subtitles"
                label={sub.language}
                srcLang={sub.langCode}
                default={index === 0}
              />
            ))}
          </MediaProvider>

          <Captions
            className={`media-captions pointer-events-none absolute left-0 right-0 z-10 select-none break-words text-center transition-[bottom] duration-300 ease-in-out ${
              controlsVisible
                ? 'bottom-32 md:bottom-40'
                : 'bottom-10 md:bottom-12'
            }`}
          />

          <div
            className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <TopBar onBack={onBack} />

            {contentType === 'tv' ? (
              <TVControls />
            ) : (
              <>
                <SeekOverlay seekOverlay={seekOverlay} />
                <VODControls />
              </>
            )}
          </div>
        </MediaPlayer>

        {previewChannelInfo && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className="rounded-lg bg-black bg-opacity-75 p-6 shadow-xl">
              <h2 className="text-center text-5xl font-bold text-white">
                {previewChannelInfo.number}
              </h2>
              <h3 className="mt-2 text-center text-2xl text-gray-200">
                {previewChannelInfo.name}
              </h3>
            </div>
          </div>
        )}

        {showExitToast && (
          <div className="pointer-events-none absolute bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-gray-700 bg-black/90 px-6 py-3 text-white shadow-xl backdrop-blur-md transition-all duration-300">
            <span className="text-sm font-medium tracking-wide">
              Press BACK again to exit
            </span>
          </div>
        )}

        <BufferingOverlay />
      </div>
    </div>
  );
};

export default VideoPlayerContent;
