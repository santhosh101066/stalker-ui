import React, { useState } from 'react';
import { formatTime } from '../../../utils/helpers';
import { useVideoContext } from '../context/useVideoContext';

export const SeekBar = React.memo(() => {
    const {
        progress,
        buffered,
        isTooltipVisible,
        hoverTime,
        hoverPosition,
        handleSeekMouseDown,
        handleSeekMouseUp,
        handleSeekTouchEnd,
        handleSeekChange,
        handleSeekBarHover,
        setIsTooltipVisible,
        seekBarRef,
        contentType,
    } = useVideoContext();

    // Drag pannumbodhu mattum video time-a override panna indha local state!
    const [localProgress, setLocalProgress] = useState<number | null>(null);

    if (contentType === 'tv') return null;

    const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
    const safeBuffered = Number.isFinite(buffered) ? Math.max(0, Math.min(100, buffered)) : 0;

    // Local drag nadantha adha eduthuko, illana video progress ah eduthuko
    const displayProgress = localProgress !== null ? localProgress : safeProgress;

    // Custom Handlers for smooth dragging
    const onDragChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalProgress(Number(e.target.value)); // Visual track-a instant ah update pannum
        handleSeekChange(e); // Context-a update pannum
    };

    const onMouseDragEnd = (e: React.MouseEvent<HTMLInputElement>) => {
        setLocalProgress(null); // Drag mudinjadhum local state-a clear panni video kaila kuduthudrom
        handleSeekMouseUp(e);
    };

    const onTouchDragEnd = (e: React.TouchEvent<HTMLInputElement>) => {
        setLocalProgress(null);
        handleSeekTouchEnd(e);
    };

    return (
        <div className="relative w-full group/timeline flex items-center h-4 cursor-pointer">
            {/* Visual Track Container */}
            <div className="absolute left-0 right-0 h-1 group-hover/timeline:h-1.5 group-focus-within/timeline:h-1.5 transition-all duration-200 bg-gray-600/50 rounded-full overflow-hidden">
                {/* Buffer Bar */}
                <div
                    className="absolute top-0 left-0 h-full bg-gray-400/50 transition-all duration-200"
                    style={{ width: `${safeBuffered}%` }}
                ></div>
                
                {/* Progress Bar (Blue Line) - Ippo idhu lag aagama unga koodave varum! */}
                <div
                    className="absolute top-0 left-0 h-full bg-blue-500"
                    style={{ width: `${displayProgress}%` }}
                ></div>
            </div>

            {/* Thumb (Visual Only) */}
            <div
                className="absolute h-3.5 w-3.5 bg-blue-500 rounded-full shadow-md scale-0 group-hover/timeline:scale-100 group-focus-within/timeline:scale-100 transition-transform duration-200 pointer-events-none z-10"
                style={{ left: `${displayProgress}%`, transform: `translateX(-50%)` }}
            ></div>

            {/* Hover Time Tooltip */}
            {isTooltipVisible && (
                <div
                    className="absolute bottom-full mb-3 rounded bg-black bg-opacity-75 px-2 py-1 text-xs text-white transform -translate-x-1/2 pointer-events-none"
                    style={{
                        left: `${hoverPosition}px`,
                    }}
                >
                    {formatTime(hoverTime)}
                </div>
            )}

            {/* Interaction Layer (Invisible Input) */}
            <input
                ref={seekBarRef}
                type="range"
                min="0"
                max="100"
                step="0.01"
                value={displayProgress}
                onMouseDown={handleSeekMouseDown}
                onMouseUp={onMouseDragEnd}
                onTouchStart={handleSeekMouseDown}
                onTouchEnd={onTouchDragEnd}
                onChange={onDragChange}
                onMouseMove={handleSeekBarHover}
                onMouseEnter={() => setIsTooltipVisible(true)}
                onMouseLeave={() => setIsTooltipVisible(false)}
                onFocus={() => { }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 focus:outline-none"
                data-focusable="true"
                data-control="seekbar"
                aria-label="Seek"
            />
        </div>
    );
});

SeekBar.displayName = 'SeekBar';