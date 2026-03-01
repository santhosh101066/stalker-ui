import React, { useState, useEffect } from 'react';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  contentType: "movie" | "series" | "tv";
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick, contentType }) => {
  const [inProgressItems, setInProgressItems] = useState<MediaItem[]>([]);

  useEffect(() => {
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
      const progressData = localStorage.getItem(key);
      if (progressData) {
        try {
          const itemData = JSON.parse(progressData);
          
          if (itemData.type !== contentType) {
            continue; 
          }

          const targetId = itemData.type === 'movie' ? itemData.mediaId : (itemData.itemId || itemData.mediaId);

          if (!addedIds.has(targetId)) {
            items.push({
              id: targetId, 
              series_id: itemData.is_series ? itemData.mediaId : undefined,
              title: itemData.title,
              name: itemData.name || itemData.title,
              screenshot_uri: itemData.screenshot_uri,
              is_series: itemData.is_series,
              is_season: 0,
              is_episode: itemData.is_series ? 1 : 0, 
              is_playable_movie: !itemData.is_series,
              is_continue_watching: true,
              cmd: itemData.cmd, 
              series_number: itemData.series_number,
            });
            addedIds.add(targetId);
          }
        } catch (error) {
          console.error(`Failed to parse in-progress item for key ${key}`, error);
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