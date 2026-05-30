import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CarouselSlide } from '@/services/services';

interface WelcomeCarouselProps {
  slides: CarouselSlide[];
  onAction: (slide: CarouselSlide) => void;
}

export const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({
  slides,
  onAction,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay functionality
  useEffect(() => {
    if (slides.length <= 1 || isFocused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(nextSlide, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, nextSlide, isFocused]);

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[activeIndex];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAction(currentSlide);
    } else if (e.key === 'ArrowLeft' && slides.length > 1) {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight' && slides.length > 1) {
      e.preventDefault();
      nextSlide();
    }
  };

  return (
    <div
      className={`relative mb-8 h-[240px] w-full overflow-hidden rounded-3xl border transition-all duration-300 sm:h-[340px] md:h-[400px] ${
        isFocused
          ? 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.4)] scale-[1.005]'
          : 'border-gray-800 shadow-2xl'
      }`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={() => onAction(currentSlide)}
      data-focusable="true"
      data-control="welcome-carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Background Slides */}
      {slides.map((slide, idx) => {
        const isActive = idx === activeIndex;
        return (
          <div
            key={slide.id || idx}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
          >
            {/* Slide Backdrop */}
            <div className="absolute inset-0">
              <picture>
                {slide.mobileImageUrl && (
                  <source srcSet={slide.mobileImageUrl} media="(max-width: 640px)" />
                )}
                {slide.tabletImageUrl && (
                  <source srcSet={slide.tabletImageUrl} media="(max-width: 1024px)" />
                )}
                <img
                  src={slide.imageUrl || slide.tabletImageUrl || slide.mobileImageUrl}
                  alt={slide.title || 'Carousel slide image'}
                  className="h-full w-full object-cover object-center"
                />
              </picture>
            </div>
          </div>
        );
      })}

      {/* Content Container */}
      {(currentSlide.title || currentSlide.description || currentSlide.actionType !== 'none') && (
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-12 flex flex-col justify-end max-w-2xl text-left z-10">
          {currentSlide.mediaType && (
            <span
              className="mb-2 inline-block rounded-full bg-blue-600/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100 border border-blue-500/40 backdrop-blur-sm self-start shadow-md"
              style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)' }}
            >
              Featured {currentSlide.mediaType === 'tv' ? 'TV Channel' : currentSlide.mediaType}
            </span>
          )}
          {currentSlide.title && (
            <h1
              className="text-2xl font-black tracking-tight text-white sm:text-4xl md:text-5xl line-clamp-2"
              style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 4px 24px rgba(0, 0, 0, 0.95)' }}
            >
              {currentSlide.title}
            </h1>
          )}
          {currentSlide.description && (
            <p
              className="mt-2 text-xs font-semibold text-gray-100 sm:mt-4 sm:text-sm md:text-base line-clamp-2 md:line-clamp-3"
              style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 4px 20px rgba(0, 0, 0, 0.95)' }}
            >
              {currentSlide.description}
            </p>
          )}

          {/* Buttons / Controls */}
          <div className="mt-4 flex items-center gap-4 sm:mt-6">
            {currentSlide.actionType !== 'none' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(currentSlide);
                }}
                tabIndex={-1}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all duration-300 ${
                  isFocused
                    ? 'bg-blue-600 shadow-blue-500/20 ring-2 ring-white scale-105'
                    : 'bg-blue-600/90 shadow-blue-600/10 hover:bg-blue-600'
                }`}
              >
                {currentSlide.actionType === 'play' ? (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>Watch Now</span>
                  </>
                ) : (
                  <>
                    <Info size={14} />
                    <span>More Info</span>
                  </>
                )}
              </button>
            )}

            {/* Dots Indicator */}
            {slides.length > 1 && (
              <div className="flex items-center gap-1.5 ml-2">
                {slides.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeIndex
                        ? 'w-6 bg-blue-500 shadow-sm'
                        : 'w-2 bg-gray-400/80 shadow-sm'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide Navigation Arrows */}
      {slides.length > 1 && (
        <div className="absolute right-6 bottom-6 z-10 flex gap-2 sm:right-10 sm:bottom-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            tabIndex={-1}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 bg-gray-950/40 text-gray-400 backdrop-blur-md transition-all duration-200 hover:border-gray-600 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            tabIndex={-1}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-800 bg-gray-950/40 text-gray-400 backdrop-blur-md transition-all duration-200 hover:border-gray-600 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
