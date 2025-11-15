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
  const initials = displayTitle
    ? displayTitle.substring(0, 2).toUpperCase()
    : '??';
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${URL_PATHS.HOST}/api/images${item.screenshot_uri}`
    : null;

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
      className="group relative flex w-full transform cursor-pointer items-center overflow-hidden rounded-lg border-2 border-transparent bg-gray-800 transition-all duration-300 hover:border-blue-500 hover:bg-gray-700 hover:shadow-lg"
      onClick={() => onClick(item)}
      data-focusable="true"
      tabIndex={-1}
    >
      {isCompleted && (
        <div className="absolute right-2 top-2 z-10 h-3 w-3 rounded-full bg-green-500"></div>
      )}
      {!isCompleted && isInProgress && (
        <div className="absolute right-2 top-2 z-10 h-3 w-3 rounded-full bg-yellow-500"></div>
      )}
      <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden bg-gray-700">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="bg-linear-to-br flex h-full w-full items-center justify-center from-gray-700 to-gray-800">
            <span className="select-none text-2xl font-bold text-gray-400">
              {initials}
            </span>
          </div>
        )}
      </div>
      <div className="overflow-hidden p-4">
        <h3 className="text-md truncate font-semibold text-white transition-colors duration-300 group-hover:text-blue-400">
          {displayTitle}
        </h3>
      </div>
    </div>
  );
};

export default EpisodeCard;
