/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  refreshKey?: number;
}

interface ProgressEntry {
  id?: string; // ID fix kaga ithu mattum add aagirukku
  mediaId: string;
  itemId?: string;
  type: string;
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

        if (entry.type === 'tv') continue;

        // ID problem varama irukka intha line mattum update aagirukku
        const displayId = entry.id || entry.itemId || entry.mediaId;

        if (!displayId || addedIds.has(displayId.toString())) continue;
        if (localStorage.getItem(`video-completed-${displayId}`)) continue;

        const isSeries = (entry.is_series ?? 0) === 1;

        items.push({
          id: displayId.toString(),
          series_id: isSeries ? entry.mediaId : undefined,
          season_id: isSeries ? (entry as any).seasonId || undefined : undefined,
          // Pazhaiya title & name logic apdiye irukku
          title: isSeries
            ? `${entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
            : entry.title,
          name: isSeries
            ? `${entry.name || entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
            : (entry.name || entry.title),
          // Pazhaiya screenshot_uri apdiye irukku
          screenshot_uri: entry.screenshot_uri,

          is_series: 0,
          is_season: 0,
          is_episode: isSeries ? 1 : 0,
          is_playable_movie: !isSeries,
          is_continue_watching: true,
          cmd: entry.cmd,
          series_number: entry.series_number,
          progressPercent: entry.progressPercent,
          // Carry the exact file ID used for getMovieUrl so CW resume plays the correct video
          playbackFileId: (entry as any).playbackFileId || entry.itemId || entry.mediaId,
          // Preserve original contentType and category for correct back-nav context in movie-section series
          cw_content_type: entry.type,
          cw_category_id: (entry as any).categoryId || null,
          // Episode card ID: used to re-fetch the episode file during CW resume (avoids stale file IDs)
          cw_episode_card_id: (entry as any).episodeCardId || entry.itemId || null,
        } as any);
        addedIds.add(displayId.toString());
      } catch (err) {
        console.error(`Failed to parse CW entry for key ${key}`, err);
      }
    }
    setInProgressItems(items);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems, refreshKey]);

  const handleDismiss = useCallback((e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    localStorage.removeItem(`video-in-progress-${targetId}`);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('video-in-progress-')) {
        try {
          const entry: ProgressEntry = JSON.parse(localStorage.getItem(key) || '{}');
          if (entry.id === targetId || entry.itemId === targetId || entry.mediaId === targetId) {
            localStorage.removeItem(key);
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          <div key={item.id} className="relative group">
            <button
              className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
              style={{ lineHeight: 1 }}
              onClick={(e) => handleDismiss(e, item.id)}
              title="Remove from Continue Watching"
              aria-label="Remove"
              data-focusable="true"
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