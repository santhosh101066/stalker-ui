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
}: TVFocusProps) {
  const isTizen = isTizenDevice();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
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

  const savedGridIndex = useRef<number | null>(null);
  const latestFocusedIndex = useRef<number | null>(null);

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
        setFocusedIndex(defaultIndex !== -1 ? defaultIndex : 0);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (savedGridIndex.current !== null) {
        setFocusedIndex(savedGridIndex.current);
        savedGridIndex.current = null;
      }
    }
  }, [isDetailOpen, isConfirmingDelete, getFocusableElements]);

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
          setFocusedIndex(0);
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

      const focusable = getFocusableElements();
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
          const gridUp =
            !isModalOpen && document.querySelector('.grid, .channel-list');
          if (gridUp) {
            const cols = window
              .getComputedStyle(gridUp)
              .getPropertyValue('grid-template-columns')
              .split(' ').length;
            const parsedCols = parseInt(cols.toString(), 10) || 1;
            if (currentIndex - parsedCols >= 0)
              setFocusedIndex(currentIndex - parsedCols);
          } else if (currentIndex > 0) setFocusedIndex(currentIndex - 1);
          break;
        }
        case 40: {
          e.preventDefault();
          const isModalOpen =
            !!document.querySelector('.detail-modal-container') ||
            !!document.querySelector('[role="dialog"]');
          const gridDown =
            !isModalOpen && document.querySelector('.grid, .channel-list');
          let newIndexDown = currentIndex;

          if (gridDown) {
            const cols = window
              .getComputedStyle(gridDown)
              .getPropertyValue('grid-template-columns')
              .split(' ').length;
            const parsedCols = parseInt(cols.toString(), 10) || 1;

            if (currentIndex + parsedCols < focusable.length) {
              newIndexDown = currentIndex + parsedCols;
              setFocusedIndex(newIndexDown);
            } else {
              handlePageChange(1);
            }
          } else if (currentIndex < focusable.length - 1) {
            newIndexDown = currentIndex + 1;
            setFocusedIndex(newIndexDown);
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
  ]);

  useEffect(() => {
    if (streamUrl || (isTizen && isSearchActive)) return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const newIndex = focusedIndex === null ? 0 : focusedIndex;
    focusable.forEach((el, i) => {
      if (i === newIndex) {
        el.classList.add('focused');
      } else {
        el.classList.remove('focused');
      }
      if (i === newIndex) el.focus();
    });
  }, [
    focusedIndex,
    items,
    streamUrl,
    isTizen,
    isSearchActive,
    getFocusableElements,
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
