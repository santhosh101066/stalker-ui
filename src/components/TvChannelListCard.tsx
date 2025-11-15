import React from 'react';
import { URL_PATHS } from '../api/api';
import type { MediaItem } from '../types';

interface TvChannelListCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  isFocused: boolean;
}

const TvChannelListCard: React.FC<TvChannelListCardProps> = ({
  item,
  onClick,
  isFocused,
}) => {
  const displayTitle = item.name || item.title || 'Unknown Channel';
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${URL_PATHS.HOST}/api/images${item.screenshot_uri}`
    : null;

  return (
    <div
      className={`flex items-center p-2 transition-colors duration-150 rounded-md ${ // Added rounded-md for a softer look
        isFocused
          ? 'bg-blue-600/50' // Solid blue when focused
          : 'bg-transparent hover:bg-white/10' // Transparent, with a slight white highlight on hover
      }`}
      onClick={() => onClick(item)}
      data-focusable="true"
      tabIndex={-1}
    >
      <span className="w-12 pr-2 text-left text-sm font-medium text-gray-400">
        {item.number}
      </span>
      <div className="mr-3 flex h-12 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-gray-700">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs text-gray-500">No Logo</span>
        )}
      </div>
      <h3 className="truncate text-base font-semibold text-white">
        {displayTitle}
      </h3>
    </div>
  );
};

export default TvChannelListCard;
