import { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { MediaItem, ChannelGroup } from '@/types';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import '@/components/organisms/TvChannelList.css';

export interface TvChannelListRef {
  handleKeyDown: (e: KeyboardEvent) => void;
}

interface TvChannelListProps {
  channels: MediaItem[];
  channelGroups: ChannelGroup[];
  onChannelSelect: (item: MediaItem) => void;
  onBack: () => void;
  currentItemId: string | null | undefined;
  showCloseButton?: boolean;
  isOverlay?: boolean;
}

const TvChannelList = forwardRef<TvChannelListRef, TvChannelListProps>(({
  channels,
  channelGroups,
  onChannelSelect,
  onBack,
  currentItemId,
  showCloseButton = true,
  isOverlay = false,
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
    if (selectedGroup.id === 'recent') {
      try {
        const storedRecents = localStorage.getItem('recent_channels');
        const recents: string[] = storedRecents ? JSON.parse(storedRecents) : [];
        // Map recent IDs back to channel objects, maintaining the recent order
        return recents
          .map(id => channels.find(c => String(c.id) === String(id)))
          .filter((c): c is MediaItem => c !== undefined);
      } catch (e) {
        console.error('Failed to parse recents', e);
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
    if (!activeKeys.includes(e.keyCode)) {
      // Allow global keys (like Red/Green/Yellow/Blue/s) to bubble up to App.tsx or VideoPlayerContent
      return;
    }

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

  useEffect(() => {
  const timer = setTimeout(() => {
    if (groupListRef.current) {
      // Data-focusable attribute irukkura elements-ah correct-ah fetch panrom
      const items = groupListRef.current.querySelectorAll('[data-focusable="true"]');
      const focusedItem = items[focusedGroupIndex] as HTMLElement;
      
      if (focusedItem) {
        // Tizen-ku 'instant' thaan correct, 'center' block focus-ah munnadi kondivarum
        focusedItem.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }
  }, 10); // Very low delay for faster response
  return () => clearTimeout(timer);
}, [focusedGroupIndex, focusedColumn]);

// Scroll channels - Tizen compatible
useEffect(() => {
  const timer = setTimeout(() => {
    if (channelListRef.current) {
      // Card selection logic-ah double check pannunga
      const items = channelListRef.current.querySelectorAll('[data-focusable="true"]');
      const focusedItem = items[focusedChannelIndex] as HTMLElement;
      
      if (focusedItem) {
        focusedItem.scrollIntoView({ 
          behavior: 'instant', 
          block: 'center' 
        });
      }
    }
  }, 10);
  return () => clearTimeout(timer);
}, [focusedChannelIndex, filteredChannels, focusedColumn]);
  // Scroll groups
  // useEffect(() => {
  //   if (groupListRef.current) {
  //     const focusedItem = groupListRef.current.children[
  //       focusedGroupIndex
  //     ] as HTMLElement;
  //     if (focusedItem) {
  //       focusedItem.scrollIntoView({ behavior: 'instant', block: 'center' });
  //     }
  //   }
  // }, [focusedGroupIndex]);

  // // Scroll channels
  // useEffect(() => {
  //   if (channelListRef.current) {
  //     const focusedItem = channelListRef.current.children[
  //       focusedChannelIndex
  //     ] as HTMLElement;
  //     if (focusedItem) {
  //       focusedItem.scrollIntoView({ behavior: 'instant', block: 'center' });
  //     }
  //   }
  // }, [focusedChannelIndex, filteredChannels]); // Add filteredChannels as dependency

  return (
    <div
      className={`absolute left-0 top-0 z-40 flex h-full flex-row glass-panel shadow-2xl transition-all duration-300 ${isOverlay
        ? 'w-full md:w-auto md:max-w-[480px] lg:max-w-[560px]'
        : 'w-full'
        }`}
      tabIndex={-1}
    >
      {/* Desktop Close Button */}
      {!isMobile && showCloseButton && (
        <button
          onClick={onBack}
          className="absolute top-4 right-6 text-gray-400 hover:text-white transition-transform hover:scale-110 focus:scale-110 focus:text-white z-50 p-2 rounded-full focus:bg-white/10 outline-none"
          aria-label="Close"
          data-focusable="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Column 1: Groups */}
      <div
        ref={groupListRef}
        className={`h-full w-full md:w-[150px] lg:w-[180px] flex-shrink-0 overflow-y-auto custom-scrollbar no-scrollbar-mobile p-3 flex flex-col bg-gray-900/60 border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20 ${isMobile && showChannelsList ? 'hidden' : 'block animate-in slide-in-from-left duration-300'
          }`}
      >
        <div className="flex items-center justify-between mb-4 px-2 mt-2">
          <h2 className="text-sm sm:text-base font-black tracking-tight text-white/80 uppercase drop-shadow-md">Categories</h2>
          {isMobile && showCloseButton && (
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full p-2"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pb-20">
          {channelGroups?.map((group, index) => {
            if (!group) return null; // Skip undefined groups

            const isGroupFocused = focusedColumn === 'groups' && focusedGroupIndex === index;
            const isGroupSelected = selectedGroup?.id === group.id;

            return (
              <div
                key={group.id || index}
                data-focusable="true"
                onClick={() => handleGroupClick(group, index)}
                className={`px-2 py-2 rounded-lg text-left text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center justify-between group ${isGroupFocused
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 scale-[1.01]' // Focused on TV
                  : isGroupSelected
                    ? 'bg-white/15 text-white shadow-inner' // Selected but not focused
                    : 'text-gray-400 hover:bg-white/10 hover:text-gray-100' // Default
                  }`}
              >
                <span className="truncate drop-shadow-sm">{group.title}</span>
                {(isGroupFocused || isGroupSelected) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 2: Channels */}
      <div
        ref={channelListRef}
        className={`h-full flex-1 overflow-y-auto custom-scrollbar no-scrollbar-mobile p-2 sm:p-3 bg-gray-900/30 relative z-10 ${isMobile
          ? (showChannelsList ? 'block slide-enter-active' : 'hidden')
          : 'block'
          }`}
      >
        {isMobile && (
          <div className="flex items-center justify-between bg-gray-900/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20 w-full p-3 sm:p-4 mb-2 shadow-md rounded-b-2xl">
            <button
              onClick={() => setShowChannelsList(false)}
              className="flex items-center text-white/90 hover:text-white flex-1 transition-colors"
            >
              <div className="bg-white/10 rounded-full p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="font-extrabold text-lg sm:text-xl truncate tracking-tight">{selectedGroup?.title || 'Channels'}</span>
            </button>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full p-2 ml-2"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {!isMobile && (
          <div className="mb-6 px-3">
            <h1 className="text-3xl font-black text-white/90 tracking-tight drop-shadow-md">{selectedGroup?.title || 'Channels'}</h1>
            <p className="text-gray-400 mt-1">{filteredChannels.length} channels available</p>
          </div>
        )}

        <div className="flex flex-col gap-0.5 pb-32">
          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No channels found</p>
            </div>
          ) : (
            filteredChannels.map((item, index) => (
              <TvChannelListCard
                key={item.id}
                item={item}
                onClick={onChannelSelect}
                isFocused={
                  focusedColumn === 'channels' && focusedChannelIndex === index
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});

TvChannelList.displayName = 'TvChannelList';

export default TvChannelList;
