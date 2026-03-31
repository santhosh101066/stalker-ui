import React from 'react';
import { useVideoContext } from '@/context/video';
import { BackArrowIcon, CopyLinkIcon } from '@/components/atoms/Icons';

interface TopBarProps {
  onBack: () => void;
}

export const TopBar = React.memo<TopBarProps>(({ onBack }) => {
  const { handleCopyLink, copied, isTizen } = useVideoContext();

  if (isTizen) return null;
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
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';
