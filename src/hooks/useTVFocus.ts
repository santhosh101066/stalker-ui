import { useState, useEffect, useCallback } from 'react';
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
}

export function useTVFocus({
  streamUrl, items, contentType, handleBack, handlePageChange, cycleSort, handleContentTypeChange, handleClearWatched
}: TVFocusProps) {
  const isTizen = isTizenDevice();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isTizen) {
      const keysToRegister = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'ChannelUp', 'ChannelDown', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'];
      try {
        keysToRegister.forEach((key) => {
          try { (window as Window & { tizen?: { tvinputdevice: { registerKey: (k: string) => void, unregisterKey: (k: string) => void } } }).tizen?.tvinputdevice?.registerKey(key); } catch { /* ignore */ }
        });
      } catch { /* ignore */ }
      return () => {
        try { keysToRegister.forEach((key) => { (window as Window & { tizen?: { tvinputdevice: { registerKey: (k: string) => void, unregisterKey: (k: string) => void } } }).tizen?.tvinputdevice?.unregisterKey(key); }); } catch { /* ignore */ }
      };
    }
  }, [isTizen]);

  const checkAndFetchNextPage = useCallback((newIndex: number, totalItems: number) => {
    if (contentType === 'tv') return;
    const grid = document.querySelector('.grid');
    let triggerThreshold = 2;
    if (grid) {
      const cols = window.getComputedStyle(grid).getPropertyValue('grid-template-columns').split(' ').length;
      triggerThreshold = parseInt(cols.toString(), 10) || 2;
    }
    if (newIndex >= totalItems - triggerThreshold) {
      handlePageChange(1);
    }
  }, [contentType, handlePageChange]);

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
      const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

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

      const focusable = Array.from(document.querySelectorAll('[data-focusable="true"]')) as HTMLElement[];
      if (focusable.length === 0) return;

      let currentIndex = focusedIndex === null ? 0 : focusedIndex;
      if (currentIndex >= focusable.length) currentIndex = focusable.length - 1;

      switch (e.keyCode) {
        case 37: // LEFT
          e.preventDefault();
          if (currentIndex > 0) setFocusedIndex(currentIndex - 1);
          break;
        case 39: // RIGHT
          e.preventDefault();
          if (currentIndex < focusable.length - 1) {
            const newIndex = currentIndex + 1;
            setFocusedIndex(newIndex);
            checkAndFetchNextPage(newIndex, focusable.length);
          }
          break;
        case 38: { // UP
          e.preventDefault();
          const gridUp = document.querySelector('.grid, .channel-list');
          if (gridUp) {
            const cols = window.getComputedStyle(gridUp).getPropertyValue('grid-template-columns').split(' ').length;
            const parsedCols = parseInt(cols.toString(), 10) || 1;
            if (currentIndex - parsedCols >= 0) setFocusedIndex(currentIndex - parsedCols);
          } else if (currentIndex > 0) setFocusedIndex(currentIndex - 1);
          break;
        }
        case 40: { // DOWN
          e.preventDefault();
          const gridDown = document.querySelector('.grid, .channel-list');
          let newIndexDown = currentIndex;
          
          if (gridDown) {
            const cols = window.getComputedStyle(gridDown).getPropertyValue('grid-template-columns').split(' ').length;
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
        case 13: // OK
          e.preventDefault();
          if (focusedIndex !== null && focusable[focusedIndex]) {
            const el = focusable[focusedIndex];
            if (el.matches('input[type="search"]')) {
              if (isTizen) { setIsSearchActive(true); } else { setIsSearchTyping(true); }
              el.focus();
            } else if (el.getAttribute('data-control') === 'sort') {
              cycleSort();
            } else {
              el.click();
            }
          }
          break;
        case 0: case 10009: case 8: // BACK
          if (isInput) return;
          e.preventDefault();
          handleBack();
          break;
        case 403: handleClearWatched(); break;
        case 404: handleContentTypeChange('movie'); break;
        case 405: cycleSort(); break;
        case 406: handleContentTypeChange('tv'); break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, items, streamUrl, isTizen, isSearchActive, isSearchTyping, handleBack, handlePageChange, cycleSort, handleContentTypeChange, handleClearWatched, contentType, checkAndFetchNextPage]);

  useEffect(() => {
    if (streamUrl || (isTizen && isSearchActive)) return;
    const focusable = Array.from(document.querySelectorAll('[data-focusable="true"]')) as HTMLElement[];
    if (focusable.length === 0) return;

    const newIndex = focusedIndex === null ? 0 : focusedIndex;
    focusable.forEach((el, i) => {
      if (i === newIndex) { el.classList.add('focused'); } else { el.classList.remove('focused'); }
      if (i === newIndex) el.focus();
    });
  }, [focusedIndex, items, streamUrl, isTizen, isSearchActive]);

  return {
    isSearchActive, setIsSearchActive,
    isSearchTyping, setIsSearchTyping, searchTerm, setSearchTerm
  };
}