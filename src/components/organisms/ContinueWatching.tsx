/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  /** Refresh trigger — pass a counter that increments to force the list to reload */
  refreshKey?: number;
}

interface ProgressEntry {
  mediaId: string;
  itemId?: string;
  type: string;   // keep as string so 'tv' guard compiles without overlap error
  title: string;
  name?: string;
  episodeTitle?: string;
  screenshot_uri?: string;
  is_series?: number;
  cmd?: string;
  series_number?: number;
  currentTime: number;
  duration: number;
  progressPercent: number;
  timestamp: number;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick, refreshKey }) => {
  const [inProgressItems, setInProgressItems] = useState<MediaItem[]>([]);

  const loadItems = useCallback(() => {
    const inProgressKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('video-in-progress-')
    );

    const items: MediaItem[] = [];
    const addedIds = new Set<string>();

    // Sort by most recently watched
    const sortedKeys = inProgressKeys.sort((a, b) => {
      const dataA = JSON.parse(localStorage.getItem(a) || '{}');
      const dataB = JSON.parse(localStorage.getItem(b) || '{}');
      return (dataB.timestamp || 0) - (dataA.timestamp || 0);
    });

    for (const key of sortedKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const entry: ProgressEntry = JSON.parse(raw);

        // Skip TV items
        if (entry.type === 'tv') continue;

        // Determine the display id: series episode uses itemId, movie uses mediaId
        const displayId = entry.itemId && entry.itemId !== entry.mediaId
          ? entry.itemId
          : entry.mediaId;

        if (!displayId || addedIds.has(displayId)) continue;

        // Skip if also marked as completed
        if (localStorage.getItem(`video-completed-${displayId}`)) continue;

        const isSeries = (entry.is_series ?? 0) === 1;

        items.push({
          id: displayId,
          // series_id helps handleItemClick recognise it as a series episode
          series_id: isSeries ? entry.mediaId : undefined,
          title: isSeries
            ? `${entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
            : entry.title,
          name: isSeries
            ? `${entry.name || entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
            : (entry.name || entry.title),
          screenshot_uri: entry.screenshot_uri,
          // Reconstruct flags so handleItemClick routes correctly
          is_series: 0,         // Don't drill into series list again
          is_season: 0,
          is_episode: isSeries ? 1 : 0,
          is_playable_movie: !isSeries,
          is_continue_watching: true,
          cmd: entry.cmd,
          series_number: entry.series_number,
          progressPercent: entry.progressPercent,
        });
        addedIds.add(displayId);
      } catch (err) {
        console.error(`Failed to parse CW entry for key ${key}`, err);
      }
    }
    setInProgressItems(items);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems, refreshKey]);

  const handleDismiss = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    // Remove all keys for this item
    localStorage.removeItem(`video-in-progress-${itemId}`);
    // Also try to remove the mediaId key (they can differ for series)
    // Scan all CW keys to find any that reference this itemId
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('video-in-progress-')) {
        try {
          const entry: ProgressEntry = JSON.parse(localStorage.getItem(key) || '{}');
          if (entry.itemId === itemId || entry.mediaId === itemId) {
            localStorage.removeItem(key);
          }
        } catch (_) { /* ignore */ }
      }
    });
    loadItems();
  }, [loadItems]);

  if (inProgressItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl">Continue Watching</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
        {inProgressItems.map((item) => (
          <div key={item.id} className="relative">
            {/* Dismiss button */}
            <button
              className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
              style={{ lineHeight: 1 }}
              onClick={(e) => handleDismiss(e, item.id)}
              title="Remove from Continue Watching"
              aria-label="Remove"
            >
              ×
            </button>
            <MediaCard
              item={item}
              onClick={onClick}
              progressPercent={item.progressPercent}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContinueWatching;