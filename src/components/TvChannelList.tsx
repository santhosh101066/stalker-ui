import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { MediaItem, ChannelGroup } from '../types';
import TvChannelListCard from './TvChannelListCard';

interface TvChannelListProps {
  channels: MediaItem[];
  channelGroups: ChannelGroup[]; // <-- NEW PROP
  onChannelSelect: (item: MediaItem) => void;
  onBack: () => void;
  currentItemId: string | null;
}

const TvChannelList: React.FC<TvChannelListProps> = ({
  channels,
  channelGroups,
  onChannelSelect,
  onBack,
  currentItemId,
}) => {
  // Find initial group and channel
  const findInitialIndexes = () => {
    if (!currentItemId) return { groupIdx: 0, channelIdx: 0 };
    const currentChannel = channels.find((c) => c.id === currentItemId);
    if (!currentChannel) return { groupIdx: 0, channelIdx: 0 };

    const groupIdx = channelGroups.findIndex(
      (g) => g.id === currentChannel.tv_genre_id
    );

    if (groupIdx > -1) {
      // Found group, now find channel index within that group
      const filteredChannels = channels.filter(
        (c) => c.tv_genre_id === channelGroups[groupIdx].id
      );
      const channelIdx = filteredChannels.findIndex(
        (c) => c.id === currentItemId
      );
      return { groupIdx, channelIdx: Math.max(0, channelIdx) };
    }

    // Could not find group, default to "All Channels"
    const allChannelsIdx = channels.findIndex((c) => c.id === currentItemId);
    return { groupIdx: 0, channelIdx: Math.max(0, allChannelsIdx) };
  };

  const initialIndexes = findInitialIndexes();

  const [focusedColumn, setFocusedColumn] = useState<'groups' | 'channels'>(
    'channels'
  );
  const [selectedGroup, setSelectedGroup] = useState<ChannelGroup>(
    channelGroups[initialIndexes.groupIdx] || channelGroups[0]
  );
  const [focusedGroupIndex, setFocusedGroupIndex] = useState(
    initialIndexes.groupIdx
  );
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(
    initialIndexes.channelIdx
  );

  const groupListRef = useRef<HTMLDivElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);

  // Filter channels based on the selected group
const filteredChannels = useMemo(() => {
    if (!selectedGroup || selectedGroup.id === 'all') {
      return channels;
    }
    // --- ADD THIS BLOCK ---
    if (selectedGroup.id === 'fav') {
      try {
        const storedFavorites = localStorage.getItem('favorite_channels');
        const favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
        const favIds = new Set(favorites);
        return channels.filter(c => favIds.has(c.id));
      } catch (e) {
        console.error('Failed to parse favorites', e);
        return [];
      }
    }
    // --- END BLOCK ---
    return channels.filter((c) => c.tv_genre_id === selectedGroup.id);
  }, [channels, selectedGroup]);

  // --- NEW: Click handler for groups ---
  const handleGroupClick = useCallback((group: ChannelGroup, index: number) => {
    setSelectedGroup(group);
    setFocusedGroupIndex(index);
    setFocusedChannelIndex(0);
    setFocusedColumn('channels');
  },[]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      switch (e.keyCode) {
        case 37: // LEFT
          setFocusedColumn('groups');
          break;
        case 39: // RIGHT
          setFocusedColumn('channels');
          break;
        case 38: // UP
          if (focusedColumn === 'groups') {
            setFocusedGroupIndex((prev) => (prev > 0 ? prev - 1 : 0));
          } else {
            setFocusedChannelIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;
        case 40: // DOWN
          if (focusedColumn === 'groups') {
            setFocusedGroupIndex((prev) =>
              prev < channelGroups.length - 1
                ? prev + 1
                : channelGroups.length - 1
            );
          } else {
            setFocusedChannelIndex((prev) =>
              prev < filteredChannels.length - 1
                ? prev + 1
                : filteredChannels.length - 1
            );
          }
          break;
        case 13: // ENTER
          if (focusedColumn === 'groups') {
            // --- Use the new click handler function ---
            handleGroupClick(
              channelGroups[focusedGroupIndex],
              focusedGroupIndex
            );
          } else {
            onChannelSelect(filteredChannels[focusedChannelIndex]);
          }
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
  }, [
    focusedColumn,
    focusedGroupIndex,
    focusedChannelIndex,
    channelGroups,
    filteredChannels,
    onChannelSelect,
    onBack,
    handleGroupClick, // <-- Add new dependency
  ]);

  // Scroll groups
  useEffect(() => {
    if (groupListRef.current) {
      const focusedItem = groupListRef.current.children[
        focusedGroupIndex
      ] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      }
    }
  }, [focusedGroupIndex]);

  // Scroll channels
  useEffect(() => {
    if (channelListRef.current) {
      const focusedItem = channelListRef.current.children[
        focusedChannelIndex
      ] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      }
    }
  }, [focusedChannelIndex, filteredChannels]); // Add filteredChannels as dependency

  return (
    <div
      className="absolute left-0 top-0 z-40 flex h-full w-full max-w-xl flex-row bg-gray-900 bg-opacity-80 backdrop-blur-md"
      tabIndex={-1}
    >
      {/* Column 1: Groups */}
      <div ref={groupListRef} className="h-full w-1/3 overflow-y-auto p-2">
        {channelGroups.map((group, index) => (
          <div
            key={group.id}
            data-focusable="true"
            // --- ADDED onClick ---
            onClick={() => handleGroupClick(group, index)}
            className={`p-3 text-left text-lg font-semibold text-white transition-colors duration-150 ${
              focusedColumn === 'groups' && focusedGroupIndex === index
                ? 'bg-blue-600' // Focused
                : selectedGroup.id === group.id
                  ? 'bg-gray-700' // Selected but not focused
                  : 'hover:bg-gray-700/50' // Default
            }`}
          >
            {group.title}
          </div>
        ))}
      </div>

      {/* Column 2: Channels */}
      <div
        ref={channelListRef}
        className="h-full w-2/3 overflow-y-auto border-l border-gray-700"
      >
        {filteredChannels.map((item, index) => (
          <TvChannelListCard
            key={item.id}
            item={item}
            onClick={onChannelSelect}
            isFocused={
              focusedColumn === 'channels' && focusedChannelIndex === index
            }
          />
        ))}
      </div>
    </div>
  );
};

export default TvChannelList;
