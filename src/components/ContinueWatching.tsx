import React, { useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import type { MediaItem } from '../types';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  contentType: "movie" | "series" | "tv";
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick,contentType }) => {
  const [inProgressItems, setInProgressItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    const inProgressKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('video-in-progress-')
    );
    const items: MediaItem[] = [];
    const addedIds = new Set<string>();

    for (const key of inProgressKeys) {
      const progressData = localStorage.getItem(key);
      if (progressData) {
        try {
          const itemData = JSON.parse(progressData);
          if (itemData.type !== contentType) {
            continue; // Skip if it's not the right content type
          }
          if (!addedIds.has(itemData.mediaId)) {
            items.push({
              id: itemData.mediaId,
              title: itemData.title,
              name: itemData.name,
              screenshot_uri: itemData.screenshot_uri,
              is_series: itemData.is_series,
              is_season: 0,
              is_episode: 0,
              is_playable_movie:
                itemData.type === 'movie' && itemData.is_series != 1,
            });
            addedIds.add(itemData.mediaId);
          }
        } catch (error) {
          console.error(
            `Failed to parse in-progress item for key ${key}`,
            error
          );
        }
      }
    }
    setInProgressItems(items);
  }, [contentType]);

  if (inProgressItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-2xl font-bold text-white">Continue Watching</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
        {inProgressItems.map((item) => (
          <MediaCard key={item.id} item={item} onClick={onClick} />
        ))}
      </div>
    </div>
  );
};

export default ContinueWatching;
