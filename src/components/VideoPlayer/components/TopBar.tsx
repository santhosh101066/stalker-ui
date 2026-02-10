import React from 'react';
import { useVideoContext } from '../context';

interface TopBarProps {
    onBack: () => void;
}

export const TopBar = React.memo<TopBarProps>(({ onBack }) => {
    const { handleCopyLink, copied, useProxy, setUseProxy, isTizen } = useVideoContext();

    return (
        <div className="pointer-events-auto absolute left-0 right-0 top-0 p-4">
            <div className="flex items-center space-x-4">
                <button
                    data-focusable="true"
                    onClick={onBack}
                    className="flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-4 py-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95"
                >
                    <svg
                        className="h-5 w-5 sm:mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        ></path>
                    </svg>
                    <span className="hidden sm:inline">Back</span>
                </button>

                {!isTizen && (
                    <button
                        data-focusable="true"
                        onClick={handleCopyLink}
                        className="relative flex items-center rounded-lg border border-gray-700/50 bg-gray-900/70 px-4 py-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md active:scale-95"
                    >
                        <svg
                            className="h-5 w-5 sm:mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            ></path>
                        </svg>
                        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                )}

                <label
                    htmlFor="proxy-switch"
                    className="flex cursor-pointer items-center"
                    data-focusable="true"
                >
                    <span className="mr-2 text-white">Use Proxy</span>
                    <div className="relative">
                        <input
                            id="proxy-switch"
                            type="checkbox"
                            className="peer sr-only"
                            checked={useProxy}
                            onChange={() => setUseProxy(!useProxy)}
                        />
                        <div className="h-6 w-10 rounded-full bg-gray-600 peer-checked:bg-blue-500"></div>
                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-full"></div>
                    </div>
                </label>
            </div>
        </div>
    );
});

TopBar.displayName = 'TopBar';
