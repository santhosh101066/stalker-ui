import React from 'react';
import { useVideoContext } from '@/context/video';
import { BackArrowIcon, CopyLinkIcon } from '@/components/atoms/Icons';

interface TopBarProps {
  onBack: () => void;
}

export const TopBar = React.memo<TopBarProps>(({ onBack }) => {
  const { handleCopyLink, copied, useProxy, setUseProxy, isTizen } =
    useVideoContext();

  return (
    <div className="pointer-events-auto absolute left-0 right-0 top-0 p-2 md:p-4">
      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          data-focusable="true"
          onClick={onBack}
          className="flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-3 py-1.5 text-sm text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95 md:px-4 md:py-2 md:text-base"
        >
          <BackArrowIcon className="h-4 w-4 md:mr-2 md:h-5 md:w-5" />
          <span className="hidden md:inline">Back</span>
        </button>

        {!isTizen && (
          <button
            data-focusable="true"
            onClick={handleCopyLink}
            className="relative flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-3 py-1.5 text-sm text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95 md:px-4 md:py-2 md:text-base"
          >
            <CopyLinkIcon className="h-4 w-4 md:mr-2 md:h-5 md:w-5" />
            <span className="hidden md:inline">
              {copied ? 'Copied!' : 'Copy Link'}
            </span>
          </button>
        )}

        <label
          htmlFor="proxy-switch"
          className="flex cursor-pointer items-center"
          data-focusable="true"
        >
          <span className="mr-2 text-sm text-white md:text-base">
            Use Proxy
          </span>
          <div className="relative">
            <input
              id="proxy-switch"
              type="checkbox"
              className="peer sr-only"
              checked={useProxy}
              onChange={() => setUseProxy(!useProxy)}
            />
            <div className="h-5 w-8 rounded-full bg-gray-600 transition-colors peer-checked:bg-blue-500 md:h-6 md:w-10"></div>
            <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform peer-checked:translate-x-full md:h-4 md:w-4"></div>
          </div>
        </label>
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';
