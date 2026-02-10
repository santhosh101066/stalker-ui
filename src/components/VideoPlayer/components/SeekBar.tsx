import React from 'react';
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

    if (contentType === 'tv') return null;

    return (
        <div className="relative w-full group/timeline flex items-center h-4 cursor-pointer">
            {/* Visual Track Container */}
            <div className="absolute left-0 right-0 h-1 group-hover/timeline:h-1.5 group-focus-within/timeline:h-1.5 transition-all duration-200 bg-gray-600/50 rounded-full overflow-hidden">
                {/* Buffer Bar */}
                <div
                    className="absolute top-0 left-0 h-full bg-gray-400/50 transition-all duration-200"
                    style={{ width: `${buffered}%` }}
                ></div>
                {/* Progress Bar */}
                <div
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Thumb (Visual Only) */}
            <div
                className="absolute h-3.5 w-3.5 bg-blue-500 rounded-full shadow-md scale-0 group-hover/timeline:scale-100 group-focus-within/timeline:scale-100 transition-transform duration-200 pointer-events-none z-10"
                style={{ left: `${progress}%`, transform: `translateX(-50%)` }}
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
                value={progress}
                onMouseDown={handleSeekMouseDown}
                onMouseUp={handleSeekMouseUp}
                onTouchStart={handleSeekMouseDown}
                onTouchEnd={handleSeekTouchEnd}
                onChange={handleSeekChange}
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
