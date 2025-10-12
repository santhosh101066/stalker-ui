import React, { useState, useEffect } from 'react';
import { URL_PATHS } from '../api/api';
import type { MediaItem } from '../types';

interface EpisodeCardProps {
    item: MediaItem;
    onClick: (item: MediaItem) => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ item, onClick }) => {
    const [imageError, setImageError] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isInProgress, setIsInProgress] = useState(false);
    const displayTitle = item.title || item.name;
    const initials = displayTitle ? displayTitle.substring(0, 2).toUpperCase() : '??';
    const imageUrl = item.screenshot_uri ? (item.screenshot_uri.startsWith("http") ? item.screenshot_uri : `${URL_PATHS.HOST}/api/images${item.screenshot_uri}`) : null;

    useEffect(() => {
        setImageError(false);
    }, [item.screenshot_uri]);

    useEffect(() => {
        const completed = localStorage.getItem(`video-completed-${item.id}`);
        setIsCompleted(!!completed);

        if (!completed) {
            const progress = localStorage.getItem(`video-in-progress-${item.id}`);
            setIsInProgress(!!progress);
        }
    }, [item.id]);

    return (
         <div
            className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer flex items-center transform transition-all duration-300 hover:bg-gray-700 hover:shadow-lg hover:border-blue-500 border-2 border-transparent w-full group relative"
            onClick={() => onClick(item)}
            data-focusable="true"
            tabIndex={-1}
        >
            {isCompleted && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full z-10"></div>
            )}
            {!isCompleted && isInProgress && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full z-10"></div>
            )}
            <div className="relative w-32 h-20 bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={displayTitle}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-700 to-gray-800">
                        <span className="text-2xl font-bold text-gray-400 select-none">{initials}</span>
                    </div>
                )}
            </div>
            <div className="p-4 overflow-hidden">
                <h3 className="text-white text-md font-semibold truncate transition-colors duration-300 group-hover:text-blue-400">{displayTitle}</h3>
            </div>
        </div>
    );
};

export default EpisodeCard;