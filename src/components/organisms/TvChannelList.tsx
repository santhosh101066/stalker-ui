import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { MediaItem, ChannelGroup } from '@/types';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import '@/components/organisms/TvChannelList.css';

export interface TvChannelListRef {
  handleKeyDown: (e: KeyboardEvent) => void;
}

interface TvChannelListProps {
  channels: MediaItem[];
  channelGroups: ChannelGroup[]; // <-- NEW PROP
  onChannelSelect: (item: MediaItem) => void;
  onBack: () => void;
  currentItemId: string | null | undefined;
}

const TvChannelList = forwardRef<TvChannelListRef, TvChannelListProps>(({
  channels,
  channelGroups,
  onChannelSelect,
  onBack,
  currentItemId,
}, ref) => {
  // Find initial group and channel
  const findInitialIndexes = useCallback(() => {
    if (!currentItemId) return { groupIdx: 0, channelIdx: 0 };
    const currentChannel = channels.find((c) => c.id === currentItemId);
    const resolvedGroupIdx = currentChannel
      ? channelGroups.findIndex((g) => String(g.id) === String(currentChannel.tv_genre_id))
      : -1;

    let targetGroupIdx = 0;

    if (resolvedGroupIdx > -1) {
      targetGroupIdx = resolvedGroupIdx;
    } else {
      // If the channel's group is not found, fallback to "All Channels",
      // which might be ID 'all', so we look for it, else index 0
      const allIdx = channelGroups.findIndex(g => g.id === 'all');
      targetGroupIdx = allIdx > -1 ? allIdx : 0;
    }

    if (!channelGroups[targetGroupIdx]) return { groupIdx: 0, channelIdx: 0 };

    let targetChannelIdx = 0;
    if (targetGroupIdx > -1) {
      const filteredChannelsVal = channels.filter(
        (c) => String(c.tv_genre_id) === String(channelGroups[targetGroupIdx].id)
      );
      if (channelGroups[targetGroupIdx].id === 'all') {
        targetChannelIdx = channels.findIndex((c) => c.id === currentItemId);
      } else {
        targetChannelIdx = filteredChannelsVal.findIndex((c) => c.id === currentItemId);
      }
    }

    return { groupIdx: targetGroupIdx, channelIdx: Math.max(0, targetChannelIdx) };
  }, [currentItemId, channels, channelGroups]);

  const initialIndexes = findInitialIndexes();

  // --- Responsive State ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChannelsList, setShowChannelsList] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [focusedColumn, setFocusedColumn] = useState<'groups' | 'channels'>(
    'channels'
  );
  const [selectedGroup, setSelectedGroup] = useState<ChannelGroup | undefined>(
    channelGroups[initialIndexes.groupIdx] || channelGroups[0]
  );
  const [focusedGroupIndex, setFocusedGroupIndex] = useState(
    initialIndexes.groupIdx
  );
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(
    initialIndexes.channelIdx
  );

  useEffect(() => {
    if (!selectedGroup && channelGroups.length > 0) {
      const indexes = findInitialIndexes();
      setSelectedGroup(channelGroups[indexes.groupIdx] || channelGroups[0]);
      setFocusedGroupIndex(indexes.groupIdx);
      setFocusedChannelIndex(indexes.channelIdx);
    }
  }, [selectedGroup, channelGroups, findInitialIndexes]);

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
    return channels.filter((c) => String(c.tv_genre_id) === String(selectedGroup.id));
  }, [channels, selectedGroup]);

  // --- NEW: Click handler for groups ---
  const handleGroupClick = useCallback((group: ChannelGroup, index: number) => {
    setSelectedGroup(group);
    setFocusedGroupIndex(index);
    setFocusedChannelIndex(0);
    setFocusedColumn('channels');
    if (isMobile) {
      setShowChannelsList(true);
    }
  }, [isMobile]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Allow specific navigation keys, include 10073 (CH_LIST)
    const activeKeys = [37, 38, 39, 40, 13, 0, 10009, 8, 10073];
    if (!activeKeys.includes(e.keyCode)) return;

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
      case 10073: // CH_LIST (Tizen) toggle to close
        if (isMobile && showChannelsList) {
          setShowChannelsList(false);
        } else {
          onBack();
        }
        break;
    }
  }, [
    focusedColumn,
    focusedGroupIndex,
    focusedChannelIndex,
    channelGroups,
    filteredChannels,
    onChannelSelect,
    onBack,
    handleGroupClick,
    isMobile,
    showChannelsList
  ]);

  useImperativeHandle(ref, () => ({
    handleKeyDown
  }), [handleKeyDown]);

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
      className="absolute left-0 top-0 z-40 flex h-full w-full max-w-full flex-row bg-gray-900 bg-opacity-95 md:bg-opacity-80 backdrop-blur-md"
      tabIndex={-1}
    >
      {/* Desktop Close Button */}
      {!isMobile && (
        <button
          onClick={onBack}
          className="absolute top-4 right-6 text-gray-400 hover:text-white transition-colors z-50"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Column 1: Groups */}
      <div
        ref={groupListRef}
        className={`h-full w-full md:w-1/3 overflow-y-auto custom-scrollbar p-2 ${isMobile && showChannelsList ? 'hidden' : 'block'}`}
      >
        {isMobile && (
          <div className="flex items-center justify-between border-b border-gray-700 mb-1 p-2">
            <h2 className="text-base sm:text-lg font-bold text-white">Groups</h2>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {channelGroups?.map((group, index) => {
          if (!group) return null; // Skip undefined groups
          return (
            <div
              key={group.id || index}
              data-focusable="true"
              // --- ADDED onClick ---
              onClick={() => handleGroupClick(group, index)}
              className={`px-3 py-2 text-left text-sm sm:text-base font-medium sm:font-semibold text-white transition-colors duration-150 ${focusedColumn === 'groups' && focusedGroupIndex === index
                ? 'bg-blue-600' // Focused
                : selectedGroup?.id === group.id
                  ? 'bg-gray-700' // Selected but not focused
                  : 'hover:bg-gray-700/50' // Default
                }`}
            >
              {group.title}
            </div>
          );
        })}
      </div>

      {/* Column 2: Channels */}
      <div
        ref={channelListRef}
        className={`h-full w-full md:w-2/3 overflow-y-auto custom-scrollbar md:border-l border-gray-700 ${isMobile && !showChannelsList ? 'hidden' : 'block'}`}
      >
        {isMobile && (
          <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700 sticky top-0 z-10 w-full p-2 sm:p-4">
            <button
              onClick={() => setShowChannelsList(false)}
              className="flex items-center text-white flex-1"
            >
              <span className="material-icons mr-2">arrow_back</span>
              <span className="font-bold text-base sm:text-lg truncate">{selectedGroup?.title || 'Channels'}</span>
            </button>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors ml-2"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
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
});

TvChannelList.displayName = 'TvChannelList';

export default TvChannelList;
