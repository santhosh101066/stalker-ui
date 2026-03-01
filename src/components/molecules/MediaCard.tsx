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

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
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
      className="group relative transform cursor-pointer overflow-hidden rounded-lg border-2 border-transparent bg-gray-800 transition-all duration-300 hover:scale-105 hover:border-blue-500 hover:shadow-2xl"
      onClick={() => onClick(item)}
      title={displayTitle}
      data-focusable="true"
      tabIndex={-1}
    >
      {isCompleted && (
        <div className="absolute right-2 top-2 z-10 h-3 w-3 rounded-full bg-green-500"></div>
      )}

      <div className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-gray-700 sm:h-40 md:h-56">
        {isVisible && imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="bg-linear-to-br flex h-full w-full items-center justify-center from-gray-700 to-gray-800">
            <span className="select-none text-2xl font-bold text-gray-400 md:text-4xl">
              {initials}
            </span>
          </div>
        )}
        {/* Progress bar overlay at bottom of thumbnail */}
        {displayProgress !== undefined && displayProgress > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/80">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, displayProgress)}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-2 md:p-4">
        <h3 className="truncate text-sm font-bold text-white transition-colors duration-300 group-hover:text-blue-400 md:text-base">
          {displayTitle}
        </h3>
      </div>
    </div>
  );
};

export default MediaCard;
