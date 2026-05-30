import { useState, useEffect, useCallback, useRef } from 'react';
import { isTizenDevice } from '@/utils/helpers';
import type { MediaItem } from '@/types';

interface TVFocusProps {
  streamUrl: string | null;
  items: MediaItem[];
  contentType: string;
  handleBack: () => void;
  handlePageChange: (dir: number) => void;
  cycleSort: () => void;
  handleContentTypeChange: (type: 'movie' | 'series' | 'tv') => void;
  handleClearWatched: () => void;
  isConfirmingDelete: boolean;
  isDetailOpen: boolean;
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
}

export function useTVFocus({
  streamUrl,
  items,
  contentType,
  handleBack,
  handlePageChange,
  cycleSort,
  handleContentTypeChange,
  handleClearWatched,
  isConfirmingDelete,
  isDetailOpen,
  focusedIndex,
  setFocusedIndex,
}: TVFocusProps) {
  const isTizen = isTizenDevice();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getFocusableElements = useCallback(() => {
    const detailModal = document.querySelector('.detail-modal-container');
    const confirmModal = document.querySelector('[role="dialog"]');

    if (detailModal) {
      return Array.from(
        detailModal.querySelectorAll('[data-focusable="true"]')
      ) as HTMLElement[];
    } else if (confirmModal) {
      return Array.from(
        confirmModal.querySelectorAll('[data-focusable="true"]')
      ) as HTMLElement[];
    } else {
      return Array.from(
        document.querySelectorAll('[data-focusable="true"]')
      ) as HTMLElement[];
    }
  }, []);

  const getFirstContentIndex = useCallback((focusableElements: HTMLElement[]) => {
    const header = document.querySelector('header');
    if (!header) return 0;
    const firstContentIdx = focusableElements.findIndex((el) => !header.contains(el));
    return firstContentIdx !== -1 ? firstContentIdx : 0;
  }, []);

  const savedGridIndex = useRef<number | null>(null);
  const latestFocusedIndex = useRef<number | null>(null);
  const lastFocusedIndexRef = useRef<number | null>(null);
  const shouldScroll = useRef(false);

  useEffect(() => {
    latestFocusedIndex.current = focusedIndex;
  }, [focusedIndex]);

  useEffect(() => {
    if (isDetailOpen || isConfirmingDelete) {
      savedGridIndex.current = latestFocusedIndex.current;
      const timer = setTimeout(() => {
        const focusable = getFocusableElements();
        const defaultIndex = focusable.findIndex(
          (el) => el.getAttribute('data-default-focus') === 'true'
        );
        shouldScroll.current = true;
        setFocusedIndex(defaultIndex !== -1 ? defaultIndex : 0);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (savedGridIndex.current !== null) {
        shouldScroll.current = true;
        setFocusedIndex(savedGridIndex.current);
        savedGridIndex.current = null;
      }
    }
  }, [isDetailOpen, isConfirmingDelete, getFocusableElements, setFocusedIndex]);

  useEffect(() => {
    if (isTizen) {
      const keysToRegister = [
        'MediaPlay',
        'MediaPause',
        'MediaPlayPause',
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
        keysToRegister.forEach((key) => {
          try {
            (
              window as Window & {
                tizen?: {
                  tvinputdevice: {
                    registerKey: (k: string) => void;
                    unregisterKey: (k: string) => void;
                  };
                };
              }
            ).tizen?.tvinputdevice?.registerKey(key);
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
      return () => {
        try {
          keysToRegister.forEach((key) => {
            (
              window as Window & {
                tizen?: {
                  tvinputdevice: {
                    registerKey: (k: string) => void;
                    unregisterKey: (k: string) => void;
                  };
                };
              }
            ).tizen?.tvinputdevice?.unregisterKey(key);
          });
        } catch {
          /* ignore */
        }
      };
    }
  }, [isTizen]);

  const checkAndFetchNextPage = useCallback(
    (newIndex: number, totalItems: number) => {
      if (contentType === 'tv') return;
      const grid = document.querySelector('.grid');
      let triggerThreshold = 2;
      if (grid) {
        const cols = window
          .getComputedStyle(grid)
          .getPropertyValue('grid-template-columns')
          .split(' ').length;
        triggerThreshold = parseInt(cols.toString(), 10) || 2;
      }
      if (newIndex >= totalItems - triggerThreshold) {
        handlePageChange(1);
      }
    },
    [contentType, handlePageChange]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (streamUrl) return;

      if ([37, 38, 39, 40].includes(e.keyCode)) {
        shouldScroll.current = true;
      }

      const focusable = getFocusableElements();

      if (isTizen && isSearchActive) {
        if (e.keyCode === 13) return;
        if (e.keyCode === 0 || e.keyCode === 10009 || e.keyCode === 8) {
          e.preventDefault();
          setIsSearchActive(false);
        }
        return;
      }

      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA');

      if (isInput) {
        if (e.keyCode === 40) {
          e.preventDefault();
          (activeElement as HTMLElement).blur();
          setIsSearchTyping(false);
          const firstContent = getFirstContentIndex(focusable);
          shouldScroll.current = true;
          setFocusedIndex(firstContent);
          return;
        }
        if (isSearchTyping) {
          if (e.keyCode === 27 || e.keyCode === 13) {
            e.preventDefault();
            setIsSearchTyping(false);
            (activeElement as HTMLElement).blur();
            return;
          }
          if ([37, 38, 39].includes(e.keyCode)) return;
          return;
        }
        if (e.keyCode === 13) {
          e.preventDefault();
          setIsSearchTyping(true);
          return;
        }
      }

      if (focusable.length === 0) return;

      let currentIndex = focusedIndex === null ? 0 : focusedIndex;
      if (currentIndex >= focusable.length) currentIndex = focusable.length - 1;

      switch (e.keyCode) {
        case 37:
          e.preventDefault();
          if (currentIndex > 0) setFocusedIndex(currentIndex - 1);
          break;
        case 39:
          e.preventDefault();
          if (currentIndex < focusable.length - 1) {
            const newIndex = currentIndex + 1;
            setFocusedIndex(newIndex);
            checkAndFetchNextPage(newIndex, focusable.length);
          }
          break;
        case 38: {
          e.preventDefault();
          const isModalOpen =
            !!document.querySelector('.detail-modal-container') ||
            !!document.querySelector('[role="dialog"]');
          const currentEl = focusable[currentIndex];
          const isInGrid = !isModalOpen && currentEl?.closest('.grid, .channel-list');
          if (isInGrid) {
            const cols = window
              .getComputedStyle(isInGrid)
              .getPropertyValue('grid-template-columns')
              .split(' ').length;
            const parsedCols = parseInt(cols.toString(), 10) || 1;
            if (currentIndex - parsedCols >= 0) {
              const targetEl = focusable[currentIndex - parsedCols];
              // Check if the target element is in the same grid/list
              if (targetEl.closest('.grid, .channel-list') === currentEl.closest('.grid, .channel-list')) {
                setFocusedIndex(currentIndex - parsedCols);
              } else {
                // We are leaving the grid going UP!
                const categoriesContainer = document.querySelector('[data-focus-group="categories"]');
                if (categoriesContainer) {
                  const activeCat = categoriesContainer.querySelector('[data-selected="true"]') as HTMLElement;
                  const activeCatIdx = activeCat ? focusable.indexOf(activeCat) : -1;
                  if (activeCatIdx !== -1) {
                    setFocusedIndex(activeCatIdx);
                  } else {
                    const firstCat = categoriesContainer.querySelector('[data-focusable="true"]') as HTMLElement;
                    const firstCatIdx = firstCat ? focusable.indexOf(firstCat) : -1;
                    if (firstCatIdx !== -1) {
                      setFocusedIndex(firstCatIdx);
                    } else {
                      setFocusedIndex(currentIndex - parsedCols);
                    }
                  }
                } else {
                  // Fallback: just go to the element directly before this grid
                  const gridEl = currentEl.closest('.grid, .channel-list');
                  const gridFocusables = Array.from(gridEl?.querySelectorAll('[data-focusable="true"]') || []);
                  if (gridFocusables.length > 0) {
                    const firstGridIdx = focusable.indexOf(gridFocusables[0] as HTMLElement);
                    if (firstGridIdx > 0) {
                      setFocusedIndex(firstGridIdx - 1);
                    } else {
                      setFocusedIndex(currentIndex - parsedCols);
                    }
                  } else {
                    setFocusedIndex(currentIndex - parsedCols);
                  }
                }
              }
            } else {
              if (currentIndex > 0) setFocusedIndex(currentIndex - 1);
            }
          } else {
            const container = currentEl?.closest('[data-focus-group]');
            if (container) {
              const groupElements = Array.from(
                container.querySelectorAll('[data-focusable="true"]')
              );
              const firstInGroup = focusable.indexOf(groupElements[0] as HTMLElement);
              if (firstInGroup > 0) {
                setFocusedIndex(firstInGroup - 1);
              } else if (currentIndex > 0) {
                setFocusedIndex(currentIndex - 1);
              }
            } else if (currentIndex > 0) {
              setFocusedIndex(currentIndex - 1);
            }
          }
          break;
        }
        case 40: {
          e.preventDefault();
          const isModalOpen =
            !!document.querySelector('.detail-modal-container') ||
            !!document.querySelector('[role="dialog"]');
          const currentEl = focusable[currentIndex];
          const isInGrid = !isModalOpen && currentEl?.closest('.grid, .channel-list');
          let newIndexDown = currentIndex;

          if (isInGrid) {
            const cols = window
              .getComputedStyle(isInGrid)
              .getPropertyValue('grid-template-columns')
              .split(' ').length;
            const parsedCols = parseInt(cols.toString(), 10) || 1;

            if (currentIndex + parsedCols < focusable.length) {
              const targetEl = focusable[currentIndex + parsedCols];
              // Check if the target is in the same grid/list
              if (targetEl.closest('.grid, .channel-list') === currentEl.closest('.grid, .channel-list')) {
                newIndexDown = currentIndex + parsedCols;
                setFocusedIndex(newIndexDown);
              } else {
                // We are leaving the grid going DOWN (e.g. from Continue Watching to Category Selector)
                const gridEl = currentEl.closest('.grid, .channel-list');
                const gridFocusables = Array.from(gridEl?.querySelectorAll('[data-focusable="true"]') || []);
                if (gridFocusables.length > 0) {
                  const lastGridIdx = focusable.indexOf(gridFocusables[gridFocusables.length - 1] as HTMLElement);
                  if (lastGridIdx !== -1 && lastGridIdx + 1 < focusable.length) {
                    newIndexDown = lastGridIdx + 1;
                    setFocusedIndex(newIndexDown);
                  } else {
                    handlePageChange(1);
                  }
                } else if (currentIndex < focusable.length - 1) {
                  newIndexDown = currentIndex + 1;
                  setFocusedIndex(newIndexDown);
                }
              }
            } else {
              handlePageChange(1);
            }
          } else {
            const container = currentEl?.closest('[data-focus-group]');
            if (container) {
              const groupElements = Array.from(
                container.querySelectorAll('[data-focusable="true"]')
              );
              const lastInGroup = focusable.indexOf(
                groupElements[groupElements.length - 1] as HTMLElement
              );
              if (lastInGroup !== -1 && lastInGroup + 1 < focusable.length) {
                newIndexDown = lastInGroup + 1;
                setFocusedIndex(newIndexDown);
              } else if (currentIndex < focusable.length - 1) {
                newIndexDown = currentIndex + 1;
                setFocusedIndex(newIndexDown);
              }
            } else if (currentIndex < focusable.length - 1) {
              newIndexDown = currentIndex + 1;
              setFocusedIndex(newIndexDown);
            }
          }

          if (newIndexDown !== currentIndex) {
            checkAndFetchNextPage(newIndexDown, focusable.length);
          }
          break;
        }
        case 13:
          e.preventDefault();
          if (focusedIndex !== null && focusable[focusedIndex]) {
            const el = focusable[focusedIndex];
            if (el.matches('input[type="search"]')) {
              if (isTizen) {
                setIsSearchActive(true);
              } else {
                setIsSearchTyping(true);
              }
              el.focus();
            } else if (el.getAttribute('data-control') === 'sort') {
              cycleSort();
            } else {
              el.click();
            }
          }
          break;
        case 0:
        case 10009:
        case 8:
          if (isInput) return;
          e.preventDefault();
          handleBack();
          break;
        case 403:
          handleClearWatched();
          break;
        case 404:
          handleContentTypeChange('movie');
          break;
        case 405:
          cycleSort();
          break;
        case 406:
          handleContentTypeChange('tv');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedIndex,
    items,
    streamUrl,
    isTizen,
    isSearchActive,
    isSearchTyping,
    handleBack,
    handlePageChange,
    cycleSort,
    handleContentTypeChange,
    handleClearWatched,
    contentType,
    checkAndFetchNextPage,
    getFocusableElements,
    getFirstContentIndex,
    setFocusedIndex,
  ]);

  useEffect(() => {
    if (streamUrl || (isTizen && isSearchActive)) return;

    const timer = setTimeout(() => {
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      let targetIndex = focusedIndex;
      if (targetIndex === null) {
        targetIndex = getFirstContentIndex(focusable);
        setFocusedIndex(targetIndex);
        lastFocusedIndexRef.current = targetIndex;
        return;
      }

      // Sync index if the previously focused element is still in the document but its index has shifted
      // Only run this if focusedIndex itself hasn't changed via navigation (i.e., it matches lastFocusedIndexRef.current)
      if (targetIndex === lastFocusedIndexRef.current) {
        const activeEl = (document.activeElement as HTMLElement) || document.querySelector('.focused');
        if (activeEl && (activeEl.getAttribute('data-focusable') === 'true' || activeEl.classList.contains('focused'))) {
          const activeIdx = focusable.indexOf(activeEl as HTMLElement);
          if (activeIdx !== -1 && activeIdx !== targetIndex) {
            setFocusedIndex(activeIdx);
            lastFocusedIndexRef.current = activeIdx;
            return;
          }
        }
      }

      if (targetIndex >= focusable.length) {
        targetIndex = focusable.length - 1;
        setFocusedIndex(targetIndex);
      }

      focusable.forEach((el, i) => {
        if (i === targetIndex) {
          el.classList.add('focused');
          if (shouldScroll.current) {
            el.focus();
            if (el.closest('header')) {
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              });
            } else {
              el.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
              });
            }
            shouldScroll.current = false;
          } else {
            el.focus({ preventScroll: true });
          }
        } else {
          el.classList.remove('focused');
        }
      });

      lastFocusedIndexRef.current = targetIndex;
    }, 50);

    return () => clearTimeout(timer);
  }, [
    focusedIndex,
    items,
    streamUrl,
    isTizen,
    isSearchActive,
    getFocusableElements,
    getFirstContentIndex,
    setFocusedIndex,
  ]);

  return {
    isSearchActive,
    setIsSearchActive,
    isSearchTyping,
    setIsSearchTyping,
    searchTerm,
    setSearchTerm,
  };
}
