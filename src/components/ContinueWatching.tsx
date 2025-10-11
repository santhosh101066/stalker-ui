import React, { useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import type { MediaItem } from '../types';

interface ContinueWatchingProps {
    onClick: (item: MediaItem) => void;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick }) => {
    const [inProgressItems, setInProgressItems] = useState<MediaItem[]>([]);

    useEffect(() => {
        const inProgressKeys = Object.keys(localStorage).filter(key => key.startsWith('video-in-progress-'));
        const items: MediaItem[] = [];

        for (const key of inProgressKeys) {
            const progressData = localStorage.getItem(key);
            if (progressData) {
                try {
                    const itemData = JSON.parse(progressData);
                    items.push({
                        id: itemData.mediaId,
                        title: itemData.title,
                        name: itemData.name,
                        screenshot_uri: itemData.screenshot_uri,
                        is_series: itemData.type === 'series' ? 1 : 0,
                        is_season: 0,
                        is_episode: 0,
                        is_playable_movie: itemData.type === 'movie',
                    });
                } catch (error) {
                    console.error(`Failed to parse in-progress item for key ${key}`, error);
                }
            }
        }
        setInProgressItems(items);
    }, []);

    if (inProgressItems.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Continue Watching</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {inProgressItems.map(item => (
                    <MediaCard key={item.id} item={item} onClick={onClick} />
                ))}
            </div>
        </div>
    );
};

export default ContinueWatching;