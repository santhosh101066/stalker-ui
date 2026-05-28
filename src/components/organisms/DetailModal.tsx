import React, { useMemo } from 'react';
import { X, Play, Clock, Star, Calendar, Globe2 } from 'lucide-react';
import type { MediaItem, EPG_List } from '@/types';
import { URL_PATHS } from '@/services/api';

interface DetailModalProps {
  item: MediaItem;
  epgData?: Record<string, EPG_List[]>;
  onClose: () => void;
  onPlay: (item: MediaItem, startTime?: number, endTime?: number) => void;
}

const formatTime = (timestampStr: string): string => {
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return '';
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const DetailModal: React.FC<DetailModalProps> = ({
  item,
  epgData = {},
  onClose,
  onPlay,
}) => {
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const displayTitle = item.title || item.name || 'Details';

  const imageUrl = useMemo(() => {
    if (!item.screenshot_uri) return null;
    return item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`;
  }, [item.screenshot_uri, baseUrl]);

  // Determine if this is a TV channel
  const isTvChannel = !!item.tv_genre_id;

  // Retrieve EPG list for this channel
  const programs = useMemo(() => {
    if (!isTvChannel || !item.id) return [];
    return epgData[item.id] || [];
  }, [isTvChannel, item.id, epgData]);

  const currentUnix = Math.floor(Date.now() / 1000);

  // Group EPG into past (catchup), current (live), and future
  const parsedEPG = useMemo(() => {
    return programs.map((prog) => {
      const start = parseInt(prog.start_timestamp, 10);
      const stop = parseInt(prog.stop_timestamp, 10);
      let status: 'past' | 'live' | 'future' = 'future';

      if (stop < currentUnix) {
        status = 'past';
      } else if (start <= currentUnix && stop >= currentUnix) {
        status = 'live';
      }

      return {
        ...prog,
        start,
        stop,
        status,
      };
    });
  }, [programs, currentUnix]);

  // Handle key navigation (Escape / Back key to close modal)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA');

      if (isInput) return;

      if (
        e.key === 'Escape' ||
        e.keyCode === 27 ||
        e.keyCode === 10009 ||
        e.keyCode === 8 ||
        e.keyCode === 0
      ) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // Use capture phase to intercept the key event before other global keydown handlers run
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div className="detail-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md transition-all duration-300">
      <div className="custom-scrollbar relative flex max-h-[85vh] w-full max-w-4xl flex-col gap-6 overflow-y-auto rounded-3xl border border-white/10 bg-[#071329]/95 p-6 text-gray-200 shadow-2xl backdrop-blur-xl md:flex-row md:gap-8 md:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="z-55 absolute right-4 top-4 rounded-full bg-white/5 p-2 text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
          data-focusable="true"
        >
          <X size={20} />
        </button>

        {/* Poster Column */}
        <div className="flex w-full flex-shrink-0 flex-col items-center justify-start md:w-1/3">
          <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl md:w-full">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                <span className="select-none text-4xl font-extrabold text-white/20">
                  {displayTitle.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            {/* Play Button on Poster for Movies/Episodes */}
            {!isTvChannel && (
              <button
                onClick={() => onPlay(item)}
                className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95"
                data-focusable="true"
              >
                <Play size={24} className="ml-1 fill-current" />
              </button>
            )}
          </div>

          {/* Main Action Button below poster */}
          <div className="mt-4 flex w-full flex-col gap-2">
            <button
              onClick={() => onPlay(item)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:bg-blue-500 active:scale-95"
              data-focusable="true"
              data-default-focus="true"
            >
              <Play size={18} className="fill-current" />
              <span>
                {isTvChannel
                  ? 'Watch Live Channel'
                  : item.is_episode
                    ? 'Play Episode'
                    : 'Play Movie'}
              </span>
            </button>
          </div>
        </div>

        {/* Meta / Details Column */}
        <div className="flex flex-1 flex-col gap-4 text-left">
          <div>
            {isTvChannel && item.number && (
              <span className="mb-2 inline-block rounded bg-blue-500/20 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-blue-400">
                CH {item.number}
              </span>
            )}
            <h1 className="text-2xl font-black leading-none tracking-tight text-white md:text-4xl">
              {displayTitle}
            </h1>
            {item.director && (
              <p className="mt-1 text-sm text-gray-400">
                Directed by{' '}
                <span className="font-semibold text-gray-300">
                  {item.director}
                </span>
              </p>
            )}
          </div>

          {/* Rating Badges and Info */}
          <div className="flex flex-wrap items-center gap-2.5 border-y border-white/5 py-3 text-xs text-gray-300 sm:gap-4 sm:text-sm">
            {parseFloat(String(item.rating_imdb)) > 0 && (
              <div className="flex items-center gap-1 rounded bg-yellow-400/10 px-2 py-1 font-bold text-yellow-400">
                <Star size={14} className="fill-current" />
                <span>{item.rating_imdb} / 10</span>
              </div>
            )}
            {item.year && (
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar size={14} />
                <span>{item.year}</span>
              </div>
            )}
            {item.country && (
              <div className="flex items-center gap-1 text-gray-400">
                <Globe2 size={14} />
                <span>{item.country}</span>
              </div>
            )}
            {item.duration && (
              <div className="flex items-center gap-1 text-gray-400">
                <Clock size={14} />
                <span>
                  {Math.floor(item.duration / 60) || item.duration} mins
                </span>
              </div>
            )}
            {item.rating_mpaa && (
              <div className="rounded border border-gray-600 px-1.5 py-0.5 text-[10px] font-black text-gray-400">
                {item.rating_mpaa}
              </div>
            )}
          </div>

          {/* Genres */}
          {item.genres_str && (
            <div className="flex flex-wrap gap-1.5">
              {item.genres_str.split(',').map((genre, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300"
                >
                  {genre.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Description — hidden for live TV channels */}
          {!isTvChannel && item.description && (
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Description
              </h3>
              <p className="text-sm font-medium leading-relaxed text-gray-300 md:text-base">
                {item.description}
              </p>
            </div>
          )}

          {/* Actors */}
          {item.actors && (
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Main Cast
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {item.actors}
              </p>
            </div>
          )}

          {/* TV channel EPG schedule */}
          {isTvChannel && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-300">
                  TV Guide & Archive
                </h3>
                {item.enable_tv_archive === 1 && (
                  <span className="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-green-400">
                    Catchup Supported
                  </span>
                )}
              </div>

              {parsedEPG.length === 0 ? (
                <p className="py-2 text-sm italic text-gray-500">
                  No program guide available for this channel.
                </p>
              ) : (
                <div className="custom-scrollbar flex max-h-60 flex-col gap-2 overflow-y-auto pr-2">
                  {parsedEPG.map((prog, index) => {
                    const isLive = prog.status === 'live';
                    const isPast = prog.status === 'past';
                    const canPlayCatchup =
                      isPast && item.enable_tv_archive === 1;

                    return (
                      <div
                        key={index}
                        className={`flex flex-col items-start justify-between gap-2 rounded-xl border border-white/5 p-2.5 transition-all duration-200 sm:flex-row sm:items-center ${
                          isLive
                            ? 'border-blue-500/30 bg-blue-900/20'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">
                              {formatTime(prog.start_timestamp)} -{' '}
                              {formatTime(prog.stop_timestamp)}
                            </span>
                            {isLive && (
                              <span className="animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                                LIVE
                              </span>
                            )}
                          </div>
                          <h4 className="mt-0.5 truncate text-sm font-bold text-white">
                            {prog.name}
                          </h4>
                          {prog.description && (
                            <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                              {prog.description}
                            </p>
                          )}
                        </div>

                        {/* Interactive Play actions for EPG items */}
                        <div className="w-full flex-shrink-0 sm:w-auto">
                          {isLive ? (
                            <button
                              onClick={() => onPlay(item)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-500 active:scale-95 sm:w-auto"
                              data-focusable="true"
                            >
                              <Play size={12} className="fill-current" />
                              <span>Watch Live</span>
                            </button>
                          ) : canPlayCatchup ? (
                            <button
                              onClick={() =>
                                onPlay(item, prog.start, prog.stop)
                              }
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-700/50 bg-green-900/30 px-3 py-1.5 text-xs font-bold text-green-400 transition-all hover:bg-green-800/40 active:scale-95 sm:w-auto"
                              data-focusable="true"
                            >
                              <Clock size={12} />
                              <span>Play Catchup</span>
                            </button>
                          ) : (
                            <span className="block select-none px-3 py-1.5 text-center text-xs text-gray-500 sm:text-right">
                              {isPast ? 'Ended' : 'Upcoming'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
