import React, { useState, useEffect } from 'react';
import { URL_PATHS } from '@/services/api';
import type { MediaItem } from '@/types';

interface EpisodeCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ item, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const displayTitle = item.title || item.name;
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const initials = displayTitle
    ? displayTitle.substring(0, 2).toUpperCase()
    : '??';
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`
    : null;

  useEffect(() => {
    setImageError(false);
  }, [item.screenshot_uri]);

  useEffect(() => {
    const completed = localStorage.getItem(`video-completed-${item.id}`);
    setIsCompleted(!!completed);
  }, [item.id]);

  return (
    <div
      className="group relative flex w-full transform cursor-pointer items-center overflow-hidden rounded-xl border border-stalker-light/20 bg-[#0f1f3d] transition-all duration-300 hover:-translate-y-0.5 hover:border-stalker-light/50 hover:bg-[#0f1f3d] hover:shadow-lg hover:shadow-stalker-dark/30"
      onClick={() => onClick(item)}
      data-focusable="true"
      tabIndex={-1}
    >
      {isCompleted && (
        <div className="absolute right-2 top-2 z-10 h-3 w-3 rounded-full bg-green-500"></div>
      )}

      <div className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden bg-black/20 sm:h-16 sm:w-24">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
            <span className="select-none text-lg font-bold text-white/30 sm:text-xl">
              {initials}
            </span>
          </div>
        )}
      </div>
      <div className="overflow-hidden p-3 sm:p-4">
        <h3 className="truncate text-sm font-semibold text-white transition-colors duration-300 group-hover:text-stalker-light sm:text-base">
          {displayTitle}
        </h3>
      </div>
    </div>
  );
};

export default EpisodeCard;
