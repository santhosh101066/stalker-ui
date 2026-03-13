import React, { useState, useEffect } from 'react';
import { URL_PATHS } from '@/services/api';
import type { MediaItem } from '@/types';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  progressPercent?: number;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onClick, progressPercent }) => {
  const [imageError, setImageError] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [isVisible, setIsVisible] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

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

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const currentCardRef = cardRef.current;
    if (currentCardRef) {
      observer.observe(currentCardRef);
    }

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, []);

  useEffect(() => {
    const completed = localStorage.getItem(`video-completed-${item.id}`);
    if (completed) {
      try {
        const completedData = JSON.parse(completed);
        if (completedData && completedData.mediaId === item.id) {
          setIsCompleted(true);
        }
      } catch (error) {
        // For backward compatibility
        if (completed === 'true') {
          setIsCompleted(true);
        }
        console.error(error);
      }
    }
  }, [item.id]);

  // Use prop progress if passed (CW row), otherwise fall back to item field
  const displayProgress = progressPercent ?? item.progressPercent;

  return (
    <div
      ref={cardRef}
      className="group relative transform cursor-pointer overflow-hidden rounded-xl border border-stalker-light/20 bg-[#0f1f3d] transition-all duration-300 hover:scale-[1.03] hover:border-stalker-light/50 hover:bg-[#0f1f3d] hover:shadow-2xl hover:shadow-stalker-dark/30"
      onClick={() => onClick(item)}
      title={displayTitle}
      data-focusable="true"
      tabIndex={-1}
    >
      {isCompleted && (
        <div className="absolute right-2 top-2 z-10 h-3 w-3 rounded-full bg-green-500"></div>
      )}

      <div className="relative flex w-full aspect-[2/3] md:aspect-auto md:h-56 items-center justify-center overflow-hidden bg-black/20">
        {isVisible && imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
            <span className="select-none text-2xl font-bold text-white/30 md:text-4xl">
              {initials}
            </span>
          </div>
        )}
        {/* Progress bar overlay at bottom of thumbnail */}
        {displayProgress !== undefined && displayProgress > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/80">
            <div
              className="h-full bg-gradient-to-r from-stalker-light to-stalker-dark transition-all duration-300"
              style={{ width: `${Math.min(100, displayProgress)}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-3 md:p-4 flex items-center justify-center">
        <h3 className="truncate text-center text-sm font-bold text-white transition-colors duration-300 group-hover:text-stalker-light md:text-base w-full">
          {displayTitle}
        </h3>
      </div>
    </div>
  );
};

export default MediaCard;
