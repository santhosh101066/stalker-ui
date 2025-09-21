import React, { useState, useEffect } from 'react';
import { URL_PATHS } from '../api/api';
import type { MediaItem } from '../types';

interface MediaCardProps {
    item: MediaItem;
    onClick: (item: MediaItem) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onClick }) => {
    const [imageError, setImageError] = useState(false);
    const displayTitle = item.title || item.name;
    const initials = displayTitle ? displayTitle.substring(0, 2).toUpperCase() : '??';
    const imageUrl = item.screenshot_uri ? (item.screenshot_uri.startsWith("http") ? item.screenshot_uri : `${URL_PATHS.HOST}/api/images${item.screenshot_uri}`) : null;

    useEffect(() => {
        setImageError(false);
    }, [item.screenshot_uri]);

    return (
        <div
            className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-blue-500 border-2 border-transparent group"
            onClick={() => onClick(item)}
        >
            <div className="relative w-full h-48 md:h-64 bg-gray-700 flex items-center justify-center overflow-hidden">
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={displayTitle}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-700 to-gray-800">
                        <span className="text-4xl font-bold text-gray-400 select-none">{initials}</span>
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-white text-lg font-bold truncate transition-colors duration-300 group-hover:text-blue-400">{displayTitle}</h3>
            </div>
        </div>
    );
};

export default MediaCard;