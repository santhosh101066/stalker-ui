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
import EpisodeOverlay, {
  type EpisodeOverlayRef,
} from '@/components/organisms/EpisodeOverlay';
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
    showEpisodeList,
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
    episodes,
    previewChannelInfo,
    channelInfo,
    channelGroups,
    retryCount,
    reloadTrigger,
    isRecovering,
    isTizen,
    streamError,

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
    setShowEpisodeList,
    showControlsAndCursor,
    handleSkipButtonClick,
    onPrevChannel,
    onNextChannel,
    onChannelSelect,
    onEpisodeSelect,
    playNextEpisode,
    playPrevEpisode,
    onBack,
    setIsSettingsMenuOpen,
    subtitles,
    favorites,
    recentChannels,
  } = useVideoContext();

  const remote = useMediaRemote(playerRef);
  const tvChannelListRef = useRef<TvChannelListRef>(null);
  const episodeOverlayRef = useRef<EpisodeOverlayRef>(null);
  const [showExitToast, setShowExitToast] = useState(false);
  const backPressRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTime = useRef(0);
  const isKeyboardModeRef = useRef(false);

  // Detect pointer vs keyboard usage to hide focus highlights on touch/click
  useEffect(() => {
    const handleKeyDown = () => {
      isKeyboardModeRef.current = true;
    };
    const handlePointerDown = () => {
      isKeyboardModeRef.current = false;
      const focusedElements = document.querySelectorAll('.focused');
      focusedElements.forEach((el) => el.classList.remove('focused'));
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  // 🚀 FIX 1: Synchronous Navigation Ref (Prevents getting stuck on fast clicks)
  const navRef = useRef({
    index: focusedIndex ?? 0,
    isSettingsOpen: isSettingsMenuOpen,
    isControlsVisible: controlsVisible,
    isEpisodeListOpen: showEpisodeList,
  });

  // Keep ref in sync with React state
  useEffect(() => {
    navRef.current.isSettingsOpen = isSettingsMenuOpen;
  }, [isSettingsMenuOpen]);
  useEffect(() => {
    navRef.current.isControlsVisible = controlsVisible;
  }, [controlsVisible]);
  useEffect(() => {
    navRef.current.isEpisodeListOpen = showEpisodeList;
  }, [showEpisodeList]);

  // Handle auto-focus sync on change
  const setFocusSync = useCallback((idx: number) => {
    navRef.current.index = idx;
    setFocusedIndex(idx);
  }, [setFocusedIndex]);

  const getVisibleFocusableElements = useCallback((): HTMLElement[] => {
    if (!playerContainerRef.current) return [];

    // Tizen TV settings menu items are nested.
    if (navRef.current.isSettingsOpen && settingsMenuRef.current) {
      const menuFocusables = Array.from(
        settingsMenuRef.current.querySelectorAll<HTMLElement>(
          '[data-focusable="true"]'
        )
      ).filter((el) => {
        // filter out elements inside hidden menus
        const parentMenu = el.closest('[data-submenu]');
        if (parentMenu) {
          return parentMenu.getAttribute('data-open') === 'true';
        }
        return true;
      });
      if (menuFocusables.length > 0) return menuFocusables;
    }

    const elements = Array.from(
      playerContainerRef.current.querySelectorAll<HTMLElement>(
        '[data-focusable="true"]'
      )
    );

    return elements.filter((el) => {
      // 1. Ensure element is visible
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      if (!isVisible) return false;

      // 2. Filter out elements in hidden menus
      const parentMenu = el.closest('.more-options-menu');
      if (parentMenu) {
        // Only focus if the menu is open
        return true;
      }

      // If settings menu is open but it's not the active focused list, don't focus outer elements
      if (navRef.current.isSettingsOpen) {
        return el.closest('.settings-menu-container') !== null;
      }

      return true;
    });
  }, [playerContainerRef, settingsMenuRef]);

  // TV Key Navigation Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (!e.isTrusted && e.keyCode === 0)) return;
      const wereControlsHidden = !navRef.current.isControlsVisible;
      
      e.stopPropagation();

      // Direct Global TV Keys
      if (e.keyCode === 405 && contentType === 'tv' && channelInfo) {
        e.preventDefault();
        toggleFavorite(channelInfo);
        return;
      } else if (e.keyCode === 10073) {
        e.preventDefault();
        if (contentType === 'tv') toggleChannelList();
        return;
      }

      if (showChannelList) {
        tvChannelListRef.current?.handleKeyDown(e);
        return;
      }

      if (showEpisodeList) {
        episodeOverlayRef.current?.handleKeyDown(e);
        return;
      }

      const focusable = getVisibleFocusableElements();
      const isMenuOpen = navRef.current.isSettingsOpen;

      let currentIndex = navRef.current.index;
      currentIndex = Math.max(0, Math.min(currentIndex, focusable.length - 1));
      const focusedElement = focusable[currentIndex];

      // Handle Directional & OK Keys
      if ([37, 38, 39, 40, 13].includes(e.keyCode)) {
        if (wereControlsHidden) {
          e.preventDefault();
          showControlsAndCursor();
          
          // Special Live TV shortcut: Left/Right key switches channels immediately on first press
          if (contentType === 'tv') {
            if (e.keyCode === 37) onPrevChannel?.();
            if (e.keyCode === 39) onNextChannel?.();
          }

          // Special VOD shortcut: Left/Right key seeks immediately on first press
          if (contentType !== 'tv') {
            if (e.keyCode === 37) handleSkipButtonClick(-10, true);
            if (e.keyCode === 39) handleSkipButtonClick(10, true);
          }
          return;
        }

        // Controls are visible
        showControlsAndCursor();

        if (contentType === 'tv') {
          // --- TV Mode ---
          switch (e.keyCode) {
            case 37: // Left
              e.preventDefault();
              if (!isMenuOpen) {
                onPrevChannel?.();
              } else if (currentIndex > 0) {
                setFocusSync(currentIndex - 1);
              }
              break;
            case 39: // Right
              e.preventDefault();
              if (!isMenuOpen) {
                onNextChannel?.();
              } else if (currentIndex < focusable.length - 1) {
                setFocusSync(currentIndex + 1);
              }
              break;
            case 38: // Up
              e.preventDefault();
              setFocusSync(currentIndex > 0 ? currentIndex - 1 : 0);
              break;
            case 40: // Down
              e.preventDefault();
              setFocusSync(
                currentIndex < focusable.length - 1
                  ? currentIndex + 1
                  : currentIndex
              );
              break;
            case 13: // Enter
              e.preventDefault();
              if (focusedElement) {
                const control = focusedElement.getAttribute('data-control');
                if (control === 'play-pause') {
                  remote.togglePaused();
                } else if (control === 'fullscreen') {
                  remote.toggleFullscreen();
                } else if (control === 'settings-menu') {
                  focusedElement.click();
                  setIsSettingsMenuOpen(true);
                  setFocusSync(0);
                } else {
                  focusedElement.click();
                }
              }
              break;
          }
        } else {
          // --- VOD Mode ---
          switch (e.keyCode) {
            case 37: // Left
              e.preventDefault();
              if (isMenuOpen) {
                if (currentIndex > 0) setFocusSync(currentIndex - 1);
              } else if (
                focusedElement?.getAttribute('data-control') === 'seekbar' ||
                focusedElement?.getAttribute('data-control') === 'play-pause'
              ) {
                handleSkipButtonClick(-10, true);
              } else {
                const minIndex = 1;
                if (currentIndex > minIndex) {
                  setFocusSync(currentIndex - 1);
                }
              }
              break;
            case 39: // Right
              e.preventDefault();
              if (isMenuOpen) {
                if (currentIndex < focusable.length - 1) setFocusSync(currentIndex + 1);
              } else if (
                focusedElement?.getAttribute('data-control') === 'seekbar' ||
                focusedElement?.getAttribute('data-control') === 'play-pause'
              ) {
                handleSkipButtonClick(10, true);
              } else {
                if (currentIndex < focusable.length - 1) {
                  setFocusSync(currentIndex + 1);
                }
              }
              break;
            case 38: // Up
              e.preventDefault();
              if (isMenuOpen) {
                setFocusSync(currentIndex > 0 ? currentIndex - 1 : 0);
              } else {
                setFocusSync(0); // Focus seekbar (index 0)
              }
              break;
            case 40: // Down
              e.preventDefault();
              if (isMenuOpen) {
                setFocusSync(
                  currentIndex < focusable.length - 1
                    ? currentIndex + 1
                    : currentIndex
                );
              } else if (focusedElement?.getAttribute('data-control') === 'seekbar') {
                const playIdx = focusable.findIndex(
                  (el) => el.getAttribute('data-control') === 'play-pause'
                );
                setFocusSync(playIdx !== -1 ? playIdx : 1);
              } else {
                setControlsVisible(false); // Hide controls
              }
              break;
            case 13: // Enter
              e.preventDefault();
              if (focusedElement) {
                const control = focusedElement.getAttribute('data-control');
                if (control === 'play-pause') {
                  remote.togglePaused();
                } else if (control === 'fullscreen') {
                  remote.toggleFullscreen();
                } else if (control === 'settings-menu') {
                  focusedElement.click();
                  setIsSettingsMenuOpen(true);
                  setFocusSync(0);
                } else {
                  focusedElement.click();
                }
              }
              break;
          }
        }
        return;
      }

      // Handle non-directional and non-OK keys
      switch (e.keyCode) {
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
        case 10232: // MediaTrackPrevious
          e.preventDefault();
          if (contentType === 'tv') onPrevChannel?.();
          else if (contentType === 'series') playPrevEpisode?.();
          break;
        case 428: // Channel Up
        case 10233: // MediaTrackNext
          e.preventDefault();
          if (contentType === 'tv') onNextChannel?.();
          else if (contentType === 'series') playNextEpisode?.();
          break;
        case 0:
        case 10009:
        case 8: // Back/Return
          e.preventDefault();
          e.stopPropagation();

          if (showEpisodeList) {
            setShowEpisodeList(false);
            setFocusSync(0);
            return;
          }

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
    showEpisodeList,
    setShowEpisodeList,
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
    playNextEpisode,
    playPrevEpisode,
    settingsMenuRef,
    setControlsVisible,
  ]);

  // Handle Focus CSS Classes
  useEffect(() => {
    if (showChannelList || showEpisodeList) return;
    const focusable = getVisibleFocusableElements();
    if (focusable.length === 0) return;

    const newIndex =
      focusedIndex === null ? 0 : Math.min(focusedIndex, focusable.length - 1);
    if (focusedIndex !== newIndex) setFocusedIndex(newIndex);

    focusable.forEach((el, index) => {
      if (index === newIndex) {
        if (isKeyboardModeRef.current) {
          el.classList.add('focused');
        } else {
          el.classList.remove('focused');
        }
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
    showEpisodeList,
    getVisibleFocusableElements,
    setFocusedIndex,
    controlsVisible,
    seekOverlay,
  ]);

  // Default focus when controls transition to visible
  useEffect(() => {
    if (controlsVisible && !isSettingsMenuOpen && !showChannelList && !showEpisodeList) {
      const timer = setTimeout(() => {
        const focusable = getVisibleFocusableElements();
        
        // Always focus the play-pause button by default
        const defaultIndex = focusable.findIndex(
          (el) => el.getAttribute('data-control') === 'play-pause'
        );
        if (defaultIndex !== -1) {
          setFocusSync(defaultIndex);
        } else if (focusable.length > 0) {
          setFocusSync(0);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    controlsVisible,
    isSettingsMenuOpen,
    showChannelList,
    showEpisodeList,
    getVisibleFocusableElements,
    setFocusSync,
    contentType,
  ]);



  const videoSrc = useMemo<PlayerSrc>(() => {
    const activeUrl =
      (useProxy ? streamUrl || rawStreamUrl : rawStreamUrl || streamUrl) || '';
    if (!activeUrl) return '';
    const isM3u8 =
      (rawStreamUrl && rawStreamUrl.toLowerCase().includes('m3u8')) ||
      activeUrl.toLowerCase().includes('m3u8');
    return {
      src: activeUrl,
      type: isM3u8 ? 'application/x-mpegurl' : 'video/mp4',
    } as PlayerSrc;
  }, [useProxy, streamUrl, rawStreamUrl]);

  return (
    <div
      className="h-[100dvh] w-full bg-black"
      data-focusable="true"
      tabIndex={-1}
      style={{ '--video-fit-mode': fitMode } as React.CSSProperties}
      onTouchStart={() => {
        lastTouchTime.current = Date.now();
      }}
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
        <MediaPlayer
          key={`${reloadTrigger}-${useProxy ? 'proxied' : 'direct'}`}
          className="media-provider h-full w-full"
          title={
            item?.title || seriesItem?.title || channelInfo?.name || 'Video'
          }
          src={videoSrc}
          viewType="video"
          streamType={contentType === 'tv' ? 'live' : 'on-demand'}
          googleCast={{
            autoJoinPolicy: 'origin_scoped' as any,
            language: 'en-US',
          }}
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
          onDoubleClick={() => {
            const isTouch = Date.now() - lastTouchTime.current < 500;
            if (isTizen || isTouch) return;
            remote.toggleFullscreen();
          }}
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
            {subtitles?.map((sub: any, index: number) => (
              <track
                key={`dynamic-sub-${sub.id}-${index}`}
                src={sub.src}
                kind="subtitles"
                label={sub.label}
                srcLang={sub.srclang}
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
            className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'} ${seekOverlay?.isLeftRight ? 'seek-bar-only' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
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

          {showChannelList &&
            contentType === 'tv' &&
            channels &&
            onChannelSelect && (
              <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
                  favorites={favorites}
                  recentChannels={recentChannels}
                />
              </div>
            )}

          {showEpisodeList &&
            episodes &&
            onEpisodeSelect && (
              <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <EpisodeOverlay
                  ref={episodeOverlayRef}
                  episodes={episodes}
                  onEpisodeSelect={(item) => {
                    onEpisodeSelect(item);
                    setShowEpisodeList(false);
                  }}
                  onBack={() => setShowEpisodeList(false)}
                  currentItemId={item?._episodeCardId || itemId}
                />
              </div>
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

          {streamError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black pointer-events-none">
              <div className="w-[90%] max-w-md p-6 rounded-xl border border-zinc-800 bg-zinc-900/95 text-center shadow-2xl shadow-black/80 space-y-3">
                <h3 className="text-lg font-bold text-red-500 tracking-wide">
                  Error 404: Signal Not Found
                </h3>
                <p className="text-sm text-zinc-300 font-medium leading-relaxed px-2">
                  We are currently unable to fetch the broadcast from the provider. Please try again later
                </p>
              </div>
            </div>
          )}

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
        </MediaPlayer>
      </div>
    </div>
  );
};

export default VideoPlayerContent;
