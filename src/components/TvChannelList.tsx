import React, { useState, useEffect, useRef } from 'react';
import type { MediaItem } from '../types';
import TvChannelListCard from './TvChannelListCard';

interface TvChannelListProps {
  channels: MediaItem[];
  onChannelSelect: (item: MediaItem) => void;
  onBack: () => void;
  currentItemId: string | null;
}

const TvChannelList: React.FC<TvChannelListProps> = ({
  channels,
  onChannelSelect,
  onBack,
  currentItemId,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(() => {
    if (currentItemId) {
      const index = channels.findIndex((c) => c.id === currentItemId);
      if (index > -1) return index;
    }
    return 0; // Default to 0 if not found
  });
  const listRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation for the list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      switch (e.keyCode) {
        case 38: // UP
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 40: // DOWN
          setFocusedIndex((prev) =>
            prev < channels.length - 1 ? prev + 1 : channels.length - 1
          );
          break;
        case 13: // ENTER
          onChannelSelect(channels[focusedIndex]);
          break;
        case 0: // BACK on some devices
        case 10009: // RETURN on Tizen
        case 8: // Backspace for web
          onBack();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [channels, focusedIndex, onChannelSelect, onBack]);

  // Scroll to focused item
  useEffect(() => {
    if (listRef.current) {
      const focusedItem = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({
          behavior: 'instant',
          block: 'nearest',
        });
      }
    }
  }, [focusedIndex]);

  useEffect(() => {
    if (listRef.current) {
      const focusable = Array.from(
        listRef.current.querySelectorAll('[data-focusable="true"]')
      ) as HTMLElement[];
      if (focusable.length === 0) return;

      focusable.forEach((el, index) => {
        if (index === focusedIndex) {
          el.classList.add('focused');
          el.focus(); // This is the crucial missing part
        } else {
          el.classList.remove('focused');
        }
      });
    }
  }, [focusedIndex, channels]);

  useEffect(() => {
    const index = channels.findIndex((c) => c.id === currentItemId);
    if (index > -1) {
      setFocusedIndex(index);
    }
  }, [currentItemId, channels]);

  return (
    <div
      ref={listRef}
      className="absolute left-0 top-0 z-40 h-full w-full max-w-xs overflow-y-auto bg-black bg-opacity-80"
      tabIndex={-1}
    >
      <div className="p-2">
        {channels.map((item, index) => (
          <TvChannelListCard
            key={item.id}
            item={item}
            onClick={onChannelSelect}
            isFocused={index === focusedIndex}
          />
        ))}
      </div>
    </div>
  );
};

export default TvChannelList;
