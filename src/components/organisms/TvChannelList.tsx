import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
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

const TvChannelList = forwardRef<TvChannelListRef, TvChannelListProps>(
  (
    {
      channels,
      channelGroups,
      onChannelSelect,
      onBack,
      currentItemId,
      showCloseButton = true,
      isOverlay = false,
    },
    ref
  ) => {
    const findInitialIndexes = useCallback(() => {
      if (!currentItemId) return { groupIdx: 0, channelIdx: 0 };
      const currentChannel = channels.find((c) => c.id === currentItemId);
      const resolvedGroupIdx = currentChannel
        ? channelGroups.findIndex(
            (g) => String(g.id) === String(currentChannel.tv_genre_id)
          )
        : -1;

      let targetGroupIdx = 0;

      if (resolvedGroupIdx > -1) {
        targetGroupIdx = resolvedGroupIdx;
      } else {
        const allIdx = channelGroups.findIndex((g) => g.id === 'all');
        targetGroupIdx = allIdx > -1 ? allIdx : 0;
      }

      if (!channelGroups[targetGroupIdx]) return { groupIdx: 0, channelIdx: 0 };

      let targetChannelIdx = 0;
      if (targetGroupIdx > -1) {
        const filteredChannelsVal = channels.filter(
          (c) =>
            String(c.tv_genre_id) === String(channelGroups[targetGroupIdx].id)
        );
        if (channelGroups[targetGroupIdx].id === 'all') {
          targetChannelIdx = channels.findIndex((c) => c.id === currentItemId);
        } else {
          targetChannelIdx = filteredChannelsVal.findIndex(
            (c) => c.id === currentItemId
          );
        }
      }

      return {
        groupIdx: targetGroupIdx,
        channelIdx: Math.max(0, targetChannelIdx),
      };
    }, [currentItemId, channels, channelGroups]);

    const initialIndexes = findInitialIndexes();

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
    const [selectedGroup, setSelectedGroup] = useState<
      ChannelGroup | undefined
    >(channelGroups[initialIndexes.groupIdx] || channelGroups[0]);
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

    const filteredChannels = useMemo(() => {
      if (!selectedGroup || selectedGroup.id === 'all') {
        return channels;
      }

      if (selectedGroup.id === 'fav') {
        try {
          const storedFavorites = localStorage.getItem('favorite_channels');
          const favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
          const favIds = new Set(favorites);
          return channels.filter((c) => favIds.has(c.id));
        } catch (e) {
          console.error('Failed to parse favorites', e);
          return [];
        }
      }
      if (selectedGroup.id === 'recent') {
        try {
          const storedRecents = localStorage.getItem('recent_channels');
          const recents: string[] = storedRecents
            ? JSON.parse(storedRecents)
            : [];

          return recents
            .map((id) => channels.find((c) => String(c.id) === String(id)))
            .filter((c): c is MediaItem => c !== undefined);
        } catch (e) {
          console.error('Failed to parse recents', e);
          return [];
        }
      }

      return channels.filter(
        (c) => String(c.tv_genre_id) === String(selectedGroup.id)
      );
    }, [channels, selectedGroup]);

    const handleGroupClick = useCallback(
      (group: ChannelGroup, index: number) => {
        setSelectedGroup(group);
        setFocusedGroupIndex(index);
        setFocusedChannelIndex(0);
        setFocusedColumn('channels');
        if (isMobile) {
          setShowChannelsList(true);
        }
      },
      [isMobile]
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        const activeKeys = [37, 38, 39, 40, 13, 0, 10009, 8, 10073];
        if (!activeKeys.includes(e.keyCode)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        switch (e.keyCode) {
          case 37:
            setFocusedColumn('groups');
            break;
          case 39:
            setFocusedColumn('channels');
            break;
          case 38:
            if (focusedColumn === 'groups') {
              setFocusedGroupIndex((prev) => (prev > 0 ? prev - 1 : 0));
            } else {
              setFocusedChannelIndex((prev) => (prev > 0 ? prev - 1 : 0));
            }
            break;
          case 40:
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
          case 13:
            if (focusedColumn === 'groups') {
              handleGroupClick(
                channelGroups[focusedGroupIndex],
                focusedGroupIndex
              );
            } else {
              onChannelSelect(filteredChannels[focusedChannelIndex]);
            }
            break;
          case 0:
          case 10009:
          case 8:
          case 10073:
            if (isMobile && showChannelsList) {
              setShowChannelsList(false);
            } else {
              onBack();
            }
            break;
        }
      },
      [
        focusedColumn,
        focusedGroupIndex,
        focusedChannelIndex,
        channelGroups,
        filteredChannels,
        onChannelSelect,
        onBack,
        handleGroupClick,
        isMobile,
        showChannelsList,
      ]
    );

    useImperativeHandle(
      ref,
      () => ({
        handleKeyDown,
      }),
      [handleKeyDown]
    );

    useEffect(() => {
      const timer = setTimeout(() => {
        if (groupListRef.current) {
          const items = groupListRef.current.querySelectorAll(
            '[data-focusable="true"]'
          );
          const focusedItem = items[focusedGroupIndex] as HTMLElement;

          if (focusedItem) {
            focusedItem.scrollIntoView({
              behavior: 'instant',
              block: 'center',
            });
          }
        }
      }, 10);
      return () => clearTimeout(timer);
    }, [focusedGroupIndex, focusedColumn]);

    useEffect(() => {
      const timer = setTimeout(() => {
        if (channelListRef.current) {
          const items = channelListRef.current.querySelectorAll(
            '[data-focusable="true"]'
          );
          const focusedItem = items[focusedChannelIndex] as HTMLElement;

          if (focusedItem) {
            focusedItem.scrollIntoView({
              behavior: 'instant',
              block: 'center',
            });
          }
        }
      }, 10);
      return () => clearTimeout(timer);
    }, [focusedChannelIndex, filteredChannels, focusedColumn]);

    return (
      <div
        className={`glass-panel absolute left-0 top-0 z-40 flex h-full flex-row shadow-2xl transition-all duration-300 ${
          isOverlay
            ? 'w-full md:w-auto md:max-w-[480px] lg:max-w-[560px]'
            : 'w-full'
        }`}
        tabIndex={-1}
      >
        {}
        {!isMobile && showCloseButton && (
          <button
            onClick={onBack}
            className="absolute right-6 top-4 z-50 rounded-full p-2 text-gray-400 outline-none transition-transform hover:scale-110 hover:text-white focus:scale-110 focus:bg-white/10 focus:text-white"
            aria-label="Close"
            data-focusable="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {}
        <div
          ref={groupListRef}
          className={`custom-scrollbar no-scrollbar-mobile z-20 flex h-full w-full flex-shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-gray-900/60 p-3 shadow-[4px_0_24px_rgba(0,0,0,0.2)] md:w-[150px] lg:w-[180px] ${
            isMobile && showChannelsList
              ? 'hidden'
              : 'animate-in slide-in-from-left block duration-300'
          }`}
        >
          <div className="mb-4 mt-2 flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-tight text-white/80 drop-shadow-md sm:text-base">
              Categories
            </h2>
            {isMobile && showCloseButton && (
              <button
                onClick={onBack}
                className="rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="custom-scrollbar flex flex-col gap-1 overflow-y-auto pb-20">
            {channelGroups?.map((group, index) => {
              if (!group) return null;

              const isGroupFocused =
                focusedColumn === 'groups' && focusedGroupIndex === index;
              const isGroupSelected = selectedGroup?.id === group.id;

              return (
                <div
                  key={group.id || index}
                  data-focusable="true"
                  onClick={() => handleGroupClick(group, index)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold transition-all duration-200 sm:text-sm ${
                    isGroupFocused
                      ? 'scale-[1.01] bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : isGroupSelected
                        ? 'bg-white/15 text-white shadow-inner'
                        : 'text-gray-400 hover:bg-white/10 hover:text-gray-100'
                  }`}
                >
                  <span className="truncate drop-shadow-sm">{group.title}</span>
                  {(isGroupFocused || isGroupSelected) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 opacity-70"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {}
        <div
          ref={channelListRef}
          className={`custom-scrollbar no-scrollbar-mobile relative z-10 h-full flex-1 overflow-y-auto bg-gray-900/30 p-2 sm:p-3 ${
            isMobile
              ? showChannelsList
                ? 'slide-enter-active block'
                : 'hidden'
              : 'block'
          }`}
        >
          {isMobile && (
            <div className="sticky top-0 z-20 mb-2 flex w-full items-center justify-between rounded-b-2xl border-b border-white/10 bg-gray-900/90 p-3 shadow-md backdrop-blur-xl sm:p-4">
              <button
                onClick={() => setShowChannelsList(false)}
                className="flex flex-1 items-center text-white/90 transition-colors hover:text-white"
              >
                <div className="mr-3 rounded-full bg-white/10 p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </div>
                <span className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                  {selectedGroup?.title || 'Channels'}
                </span>
              </button>
              <button
                onClick={onBack}
                className="ml-2 rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {!isMobile && (
            <div className="mb-6 px-3">
              <h1 className="text-3xl font-black tracking-tight text-white/90 drop-shadow-md">
                {selectedGroup?.title || 'Channels'}
              </h1>
              <p className="mt-1 text-gray-400">
                {filteredChannels.length} channels available
              </p>
            </div>
          )}

          <div className="flex flex-col gap-0.5 pb-32">
            {filteredChannels.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-4 h-16 w-16 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
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
                    focusedColumn === 'channels' &&
                    focusedChannelIndex === index
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
);

TvChannelList.displayName = 'TvChannelList';

export default TvChannelList;
