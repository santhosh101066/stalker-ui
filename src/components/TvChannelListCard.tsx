import React from 'react';
import { URL_PATHS } from '../api/api';
import type { MediaItem } from '../types';

interface TvChannelListCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  isFocused: boolean;
}

const TvChannelListCard: React.FC<TvChannelListCardProps> = ({ item, onClick, isFocused }) => {
  const displayTitle = item.name || item.title || 'Unknown Channel';
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith("http")
      ? item.screenshot_uri
      : `${URL_PATHS.HOST}/api/images${item.screenshot_uri}`
    : null;

  return (
    <div
      className={`flex items-center p-2 transition-colors duration-150 ${
        isFocused ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
      }`}
      onClick={() => onClick(item)}
      data-focusable="true"
      tabIndex={-1}
    >
      <span className="text-gray-400 w-12 text-left text-sm font-medium pr-2">
        {item.number}
      </span>
      <div className="flex-shrink-0 w-16 h-12 bg-gray-700 flex items-center justify-center rounded-sm overflow-hidden mr-3">
        {imageUrl ? (
          <img src={imageUrl} alt={displayTitle} className="w-full h-full object-contain" />
        ) : (
          <span className="text-gray-500 text-xs">No Logo</span>
        )}
      </div>
      <h3 className="text-white text-base font-semibold truncate">
        {displayTitle}
      </h3>
    </div>
  );
};

export default TvChannelListCard;