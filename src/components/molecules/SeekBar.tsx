import React, { useState } from 'react';
import { formatTime } from '@/utils/helpers';
import { useVideoContext } from '@/context/video';

export const SeekBar = React.memo(() => {
  const {
    progress,
    buffered,
    isTooltipVisible,
    hoverTime,
    hoverPosition,
    handleSeekMouseDown,
    handleSeekMouseUp,
    handleSeekChange,
    handleSeekBarHover,
    setIsTooltipVisible,
    seekBarRef,
    contentType,
  } = useVideoContext();

  const [localProgress, setLocalProgress] = useState<number | null>(null);

  if (contentType === 'tv') return null;

  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(100, progress))
    : 0;
  const safeBuffered = Number.isFinite(buffered)
    ? Math.max(0, Math.min(100, buffered))
    : 0;

  const displayProgress = localProgress !== null ? localProgress : safeProgress;

  const onDragChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProgress(Number(e.target.value));
    handleSeekChange(e);
  };

  const commitSeek = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setLocalProgress(null);

    handleSeekMouseUp(
      e as unknown as React.MouseEvent<HTMLInputElement, MouseEvent>
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    commitSeek(e);
  };

  const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      commitSeek(e);
    }
  };

  return (
    <div className="group/timeline relative flex h-4 w-full cursor-pointer items-center">
      {}
      <div className="absolute left-0 right-0 h-1 overflow-hidden rounded-full bg-gray-600/50 transition-all duration-200 group-focus-within/timeline:h-1.5 group-hover/timeline:h-1.5">
        {}
        <div
          className="absolute left-0 top-0 h-full bg-gray-400/50 transition-all duration-200"
          style={{ width: `${safeBuffered}%` }}
        ></div>

        {}
        <div
          className="absolute left-0 top-0 h-full bg-blue-500"
          style={{ width: `${displayProgress}%` }}
        ></div>
      </div>

      {}
      <div
        className="pointer-events-none absolute z-10 h-3.5 w-3.5 scale-0 rounded-full bg-blue-500 shadow-md transition-transform duration-200 group-focus-within/timeline:scale-100 group-hover/timeline:scale-100"
        style={{ left: `${displayProgress}%`, transform: `translateX(-50%)` }}
      ></div>

      {}
      {isTooltipVisible && (
        <div
          className="pointer-events-none absolute bottom-full mb-3 -translate-x-1/2 transform rounded bg-black bg-opacity-75 px-2 py-1 text-xs text-white"
          style={{
            left: `${hoverPosition}px`,
          }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {}
      <input
        ref={seekBarRef}
        type="range"
        min="0"
        max="100"
        step="0.01"
        value={displayProgress}
        onMouseDown={handleSeekMouseDown}
        onMouseUp={commitSeek}
        onTouchStart={handleSeekMouseDown}
        onTouchEnd={commitSeek}
        onChange={onDragChange}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyUp={onKeyUp}
        onMouseMove={handleSeekBarHover}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
        onFocus={() => {}}
        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 focus:outline-none"
        data-focusable="true"
        data-control="seekbar"
        aria-label="Seek"
      />
    </div>
  );
});

SeekBar.displayName = 'SeekBar';
