import React from 'react';

export interface HeaderProps {
    currentTitle: string;
    isTizen: boolean;
    contentType: 'movie' | 'series' | 'tv';
    handleContentTypeChange: (type: 'movie' | 'series' | 'tv') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    handleSearch: (e?: React.FormEvent<HTMLFormElement>) => void;
    isSearchActive: boolean;
    setIsSearchActive: (active: boolean) => void;
    isSearchTyping: boolean;
    setIsSearchTyping: (typing: boolean) => void;
    sort: string | null | undefined;
    cycleSort: () => void;
    showAdmin: boolean;
    setShowAdmin: (show: boolean) => void;
    handleClearWatched: () => void;
    streamUrl: string | null;
    historyLength: number;
    handleBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    currentTitle,
    isTizen,
    contentType,
    handleContentTypeChange,
    searchTerm,
    setSearchTerm,
    handleSearch,
    isSearchActive,
    setIsSearchActive,
    isSearchTyping,
    setIsSearchTyping,
    sort,
    cycleSort,
    showAdmin,
    setShowAdmin,
    handleClearWatched,
    streamUrl,
    historyLength,
    handleBack,
}) => {
    return (
        <header className="sticky top-0 sm:top-4 z-20 mb-2 sm:mb-6 border-b sm:rounded-xl sm:border border-gray-700/80 bg-gray-800/90 sm:bg-gray-800/50 p-2 sm:p-4 backdrop-blur-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                {/* Top Row on Mobile: Logo and Icons */}
                <div className="flex w-full items-center justify-between sm:w-auto">
                    <div className="flex items-center">
                        {(historyLength > 0 || streamUrl) && !streamUrl && (
                            <button
                                onClick={handleBack}
                                className="mr-2 text-white transition-colors hover:text-blue-400"
                                data-focusable="true"
                                tabIndex={-1}
                                aria-label="Back"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                        )}
                        <img src="stalker-logo.svg" className="w-24 sm:w-28 md:w-44" alt="Stalker Logo" />
                        <h1 className="ml-2 hidden sm:block text-sm sm:text-lg md:text-xl font-bold tracking-wider text-white">
                            {currentTitle}
                        </h1>
                    </div>

                    {/* Admin and Clear buttons on Mobile right side */}
                    {!streamUrl && (
                        <div className="flex items-center gap-2 sm:hidden">
                            <button
                                onClick={handleClearWatched}
                                title="Clear History"
                                className="flex items-center justify-center rounded-full p-1.5 transition-colors duration-300 bg-gray-800 text-gray-300 hover:bg-gray-700"
                                data-focusable="true"
                                tabIndex={-1}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            {!isTizen && (
                                <button
                                    onClick={() => setShowAdmin(!showAdmin)}
                                    className={`flex items-center justify-center rounded-full p-1.5 transition-colors duration-300 ${showAdmin ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                    data-focusable="true"
                                    tabIndex={-1}
                                    title={showAdmin ? 'Close Admin' : 'Admin Settings'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Desktop Admin/Clear items handled inside the main flex box now, remove this intermediate one */}

                {!streamUrl && (
                    <div className="flex w-full flex-col sm:w-auto sm:flex-row gap-2 sm:gap-4 items-center">
                        <div className="flex w-full sm:w-auto justify-between space-x-1 sm:space-x-2 rounded-full border border-gray-700/50 bg-gray-900/70 p-1 backdrop-blur-md transition-all duration-300">
                            <button
                                onClick={() => handleContentTypeChange('movie')}
                                className={`flex flex-1 sm:flex-none justify-center items-center rounded-full px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${contentType === 'movie'
                                    ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                data-focusable="true"
                                tabIndex={-1}
                                title="Movies"
                            >
                                <span className="sm:hidden mr-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                    </svg>
                                </span>
                                <span>Movies</span>
                            </button>
                            <button
                                onClick={() => handleContentTypeChange('series')}
                                className={`flex flex-1 sm:flex-none justify-center items-center rounded-full px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${contentType === 'series'
                                    ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                data-focusable="true"
                                tabIndex={-1}
                                title="Series"
                            >
                                <span className="sm:hidden mr-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </span>
                                <span>Series</span>
                            </button>
                            <button
                                onClick={() => handleContentTypeChange('tv')}
                                className={`flex flex-1 sm:flex-none justify-center items-center rounded-full px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${contentType === 'tv'
                                    ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                                data-focusable="true"
                                tabIndex={-1}
                                title="TV"
                            >
                                <span className="sm:hidden mr-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <span>TV</span>
                            </button>

                            {/* Desktop Admin/Clear Button */}
                            {!streamUrl && (
                                <div className="hidden sm:flex items-center gap-2">
                                    <button
                                        onClick={handleClearWatched}
                                        title="Clear History"
                                        className="flex items-center justify-center rounded-full p-2 transition-colors duration-300 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                                        data-focusable="true"
                                        tabIndex={-1}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    {!isTizen && (
                                        <button
                                            onClick={() => setShowAdmin(!showAdmin)}
                                            className={`flex items-center justify-center rounded-full p-2 transition-colors duration-300 ${showAdmin
                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                }`}
                                            data-focusable="true"
                                            tabIndex={-1}
                                            title={showAdmin ? 'Close Admin' : 'Admin Settings'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Search + Sort */}
                        <div className="flex w-full sm:w-auto gap-2 items-center">
                            <form onSubmit={handleSearch} className="flex-grow">
                                <input
                                    type="search"
                                    name="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search titles..."
                                    className="w-full rounded-full border border-gray-700/50 bg-gray-900/70 px-4 py-2 text-sm sm:text-base text-white shadow-sm backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-800/90 sm:w-64"
                                    data-focusable="true"
                                    readOnly={isTizen ? !isSearchActive : !isSearchTyping}
                                    onClick={() => {
                                        if (isTizen) setIsSearchActive(true);
                                        if (!isTizen) setIsSearchTyping(true);
                                    }}
                                    onBlur={() => {
                                        if (isTizen) setIsSearchActive(false);
                                        setIsSearchTyping(false);
                                    }}
                                />
                            </form>
                            <button
                                onClick={cycleSort}
                                className="flex-shrink-0 flex items-center justify-center rounded-full border border-gray-700/50 bg-gray-900/70 p-2 text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-gray-800/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                                data-focusable="true"
                                data-control="sort"
                                title={`Sort: ${sort === 'alphabetic' ? 'A-Z' : sort === 'oldest' ? 'Oldest' : 'Latest'}`}
                            >
                                {(!sort || sort === 'latest') && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                                    </svg>
                                )}
                                {sort === 'oldest' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                    </svg>
                                )}
                                {sort === 'alphabetic' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
