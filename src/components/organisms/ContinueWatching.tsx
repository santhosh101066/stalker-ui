/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';
import { getUserProgress, deleteUserProgress } from '@/services/services';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  refreshKey?: number;
}

interface ProgressEntry {
  id?: string;
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

const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  onClick,
  refreshKey,
}) => {
  const [inProgressItems, setInProgressItems] = useState<MediaItem[]>([]);

  const loadItems = useCallback(async () => {
    try {
      const progressRecords = await getUserProgress();
      const items: MediaItem[] = [];
      const addedIds = new Set<string>();

      // Filter and sort progress records
      const sortedRecords = progressRecords
        .filter((record) => !record.completed && record.meta && record.meta.type !== 'tv')
        .sort((a, b) => {
          const timeA = a.meta.timestamp || 0;
          const timeB = b.meta.timestamp || 0;
          return timeB - timeA;
        });

      for (const record of sortedRecords) {
        try {
          const entry = record.meta as ProgressEntry;
          const displayId = entry.id || entry.itemId || entry.mediaId || record.mediaId;

          if (!displayId || addedIds.has(displayId.toString())) continue;

          // Check if there is a completed entry for this media/episode
          const isCompleted = progressRecords.some(
            (r) => r.completed && r.mediaId === displayId.toString()
          );
          if (isCompleted) continue;

          const isSeries = (entry.is_series ?? 0) === 1;

          items.push({
            id: displayId.toString(),
            series_id: isSeries ? entry.mediaId : undefined,
            season_id: isSeries
              ? (entry as any).seasonId || undefined
              : undefined,

            title: isSeries
              ? `${entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
              : entry.title,
            name: isSeries
              ? `${entry.name || entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
              : entry.name || entry.title,

            screenshot_uri: entry.screenshot_uri,

            is_series: 0,
            is_season: 0,
            is_episode: isSeries ? 1 : 0,
            is_playable_movie: !isSeries,
            is_continue_watching: true,
            cmd: entry.cmd,
            series_number: entry.series_number,
            progressPercent: entry.progressPercent,

            playbackFileId:
              (entry as any).playbackFileId || entry.itemId || entry.mediaId,

            cw_content_type: entry.type,
            cw_category_id: (entry as any).categoryId || null,

            cw_episode_card_id:
              (entry as any).episodeCardId || entry.itemId || null,
          } as any);
          addedIds.add(displayId.toString());
        } catch (err) {
          console.error(`Failed to parse CW entry for record`, record, err);
        }
      }
      setInProgressItems(items);
    } catch (err) {
      console.error('Failed to load continue watching items:', err);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems, refreshKey]);

  const handleDismiss = useCallback(
    async (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
      try {
        await deleteUserProgress(targetId);
        // Also delete progress for any record referencing this ID as its parent/itemId
        const progressRecords = await getUserProgress();
        for (const record of progressRecords) {
          const entry = record.meta as ProgressEntry;
          if (
            entry &&
            (entry.id === targetId ||
              entry.itemId === targetId ||
              entry.mediaId === targetId ||
              record.mediaId === targetId)
          ) {
            await deleteUserProgress(record.mediaId);
          }
        }
        loadItems();
      } catch (err) {
        console.error('Failed to dismiss item:', err);
      }
    },
    [loadItems]
  );

  if (inProgressItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 px-2 sm:px-0">
      <h2 className="mb-4 text-center text-xl font-bold text-white sm:text-left sm:text-2xl">
        Continue Watching
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
        {inProgressItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="group relative">
            <button
              className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 focus:opacity-100 group-hover:opacity-100"
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