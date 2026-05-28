import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { MediaItem } from '@/types';
import '@/components/organisms/TvChannelList.css'; // Reuse glassmorphism styles

export interface EpisodeOverlayRef {
  handleKeyDown: (e: KeyboardEvent) => void;
}

interface EpisodeOverlayProps {
  episodes: MediaItem[];
  onEpisodeSelect: (item: MediaItem) => void;
  onBack: () => void;
  currentItemId: string | null | undefined;
  showCloseButton?: boolean;
}

const EpisodeOverlay = forwardRef<EpisodeOverlayRef, EpisodeOverlayProps>(
  (
    {
      episodes,
      onEpisodeSelect,
      onBack,
      currentItemId,
      showCloseButton = true,
    },
    ref
  ) => {
    const initialIndex = episodes.findIndex(
      (ep) => ep.id !== undefined && currentItemId !== undefined && String(ep.id) === String(currentItemId)
    );
    const [focusedIndex, setFocusedIndex] = useState(initialIndex !== -1 ? initialIndex : 0);
    const episodeListRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        const activeKeys = [38, 40, 13, 0, 10009, 8, 10073];
        if (!activeKeys.includes(e.keyCode)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        switch (e.keyCode) {
          case 38: // Up
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
            break;
          case 40: // Down
            setFocusedIndex((prev) =>
              prev < episodes.length - 1 ? prev + 1 : episodes.length - 1
            );
            break;
          case 13: // Enter
            onEpisodeSelect(episodes[focusedIndex]);
            break;
          case 0:
          case 10009:
          case 8: // Back
          case 10073:
            onBack();
            break;
        }
      },
      [focusedIndex, episodes, onEpisodeSelect, onBack]
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
        if (episodeListRef.current) {
          const items = episodeListRef.current.querySelectorAll(
            '[data-focusable="true"]'
          );
          const focusedItem = items[focusedIndex] as HTMLElement;

          if (focusedItem) {
            focusedItem.scrollIntoView({
              behavior: 'instant',
              block: 'center',
            });
          }
        }
      }, 10);
      return () => clearTimeout(timer);
    }, [focusedIndex]);

    return (
      <div
        className="glass-panel absolute right-0 top-0 z-40 flex h-full w-full max-w-[420px] flex-col bg-gray-950/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl border-l border-white/5 p-4 transition-all duration-300 sm:p-6"
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            onClick={onBack}
            className="absolute right-6 top-4 z-50 rounded-full p-2 text-gray-400 outline-none transition-transform hover:scale-110 hover:text-white focus:scale-110 focus:bg-white/10 focus:text-white"
            aria-label="Close"
            data-focusable="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
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

        <div className="mb-6 px-2">
          <h1 className="text-2xl font-black tracking-tight text-white/90 drop-shadow-md">
            Episodes
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {episodes.length} episodes in this season
          </p>
        </div>

        <div
          ref={episodeListRef}
          className="custom-scrollbar flex-1 overflow-y-auto pb-20 flex flex-col gap-1.5"
        >
          {episodes.map((ep, index) => {
            const isItemFocused = focusedIndex === index;
            const isItemPlaying = ep.id !== undefined && currentItemId !== undefined && String(ep.id) === String(currentItemId);
            const displayTitle = ep.name || ep.title || `Episode ${index + 1}`;

            return (
              <div
                key={ep.id || index}
                data-focusable="true"
                onClick={() => onEpisodeSelect(ep)}
                className={`group flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all duration-200 ${
                  isItemFocused
                    ? 'scale-[1.01] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 border-transparent'
                    : isItemPlaying
                      ? 'bg-blue-950/40 text-blue-400 border-blue-500/40'
                      : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold truncate ${isItemFocused ? 'text-white' : isItemPlaying ? 'text-blue-400' : 'text-gray-100'}`}>
                    {displayTitle}
                  </span>
                  {isItemPlaying && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      isItemFocused
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      Now Playing
                    </span>
                  )}
                </div>
                {ep.duration && (
                  <span className={`mt-1 text-[10px] ${isItemFocused ? 'text-white/70' : 'text-gray-500'}`}>
                    {Math.floor(ep.duration / 60) || ep.duration} mins
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

EpisodeOverlay.displayName = 'EpisodeOverlay';

export default EpisodeOverlay;
