import React from 'react';
import { URL_PATHS } from '@/services/api';
import type { MediaItem } from '@/types';

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
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`
    : null;

  return (
    <div
      className={`group my-0.5 flex cursor-pointer items-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 ${
        isFocused
          ? 'z-10 scale-[1.01] border border-stalker-light/50 bg-gradient-to-r from-stalker-light to-stalker-dark shadow-md shadow-stalker-dark/30'
          : 'border border-transparent bg-transparent hover:scale-[1.01] hover:bg-white/10'
      }`}
      onClick={() => onClick(item)}
      data-focusable="true"
      tabIndex={-1}
    >
      <span
        className={`w-8 pr-1.5 text-left text-xs font-medium transition-colors sm:w-10 sm:pr-2 sm:text-sm ${isFocused ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}
      >
        {item.number}
      </span>
      <div
        className={`mr-2 flex h-8 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded transition-colors sm:mr-3 sm:h-10 sm:w-14 ${isFocused ? 'bg-white/20' : 'bg-gray-800/80'}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-contain drop-shadow-sm"
          />
        ) : (
          <span className="text-[8px] font-bold tracking-wider text-gray-500 sm:text-[10px]">
            NO LOGO
          </span>
        )}
      </div>
      <h3
        className={`truncate text-sm font-medium transition-colors sm:text-base ${isFocused ? 'font-bold text-white' : 'text-gray-200 group-hover:text-white'}`}
      >
        {displayTitle}
      </h3>
    </div>
  );
};

export default TvChannelListCard;
