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
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${URL_PATHS.HOST}/api/images${item.screenshot_uri}`
    : null;

  return (
    <div
      className={`group flex items-center py-1.5 px-2 sm:py-2 sm:px-3 my-0.5 transition-all duration-200 rounded-lg cursor-pointer ${isFocused
        ? 'bg-blue-600/80 shadow-md shadow-blue-900/30 scale-[1.01] border border-blue-400/50 z-10' // Solid blue + scale + shadow when focused on TV
        : 'bg-transparent hover:bg-white/10 hover:scale-[1.01] border border-transparent' // Transparent, with a slight highlight and scale on hover desktop
        }`}
      onClick={() => onClick(item)}
      data-focusable="true"
      tabIndex={-1}
    >
      <span className={`w-8 pr-1.5 text-left text-xs sm:text-sm font-medium transition-colors sm:w-10 sm:pr-2 ${isFocused ? 'text-blue-100' : 'text-gray-400 group-hover:text-gray-300'}`}>
        {item.number}
      </span>
      <div className={`mr-2 flex h-8 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded transition-colors sm:mr-3 sm:h-10 sm:w-14 ${isFocused ? 'bg-white/20' : 'bg-gray-800/80'}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-contain drop-shadow-sm"
          />
        ) : (
          <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold tracking-wider">NO LOGO</span>
        )}
      </div>
      <h3 className={`truncate text-sm font-medium sm:text-base transition-colors ${isFocused ? 'text-white font-bold' : 'text-gray-200 group-hover:text-white'}`}>
        {displayTitle}
      </h3>
    </div>
  );
};

export default TvChannelListCard;
