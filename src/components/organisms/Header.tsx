import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownAZ, SortDesc, SortAsc, LogOut, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/context/useSocket';

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
  handleClearWatched: () => void;
  streamUrl: string | null;
  historyLength: number;
  handleBack: () => void;
  showAdmin?: boolean; // legacy compatibility
  setShowAdmin?: (show: boolean) => void; // legacy compatibility
}

export const Header: React.FC<HeaderProps> = React.memo(
  ({
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
    handleClearWatched,
    streamUrl,
    historyLength,
    handleBack,
  }) => {
    const { user, logout } = useAuth();
    const { activeUserCount } = useSocket();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
      <header className="sticky top-0 z-20 mb-2 border-b border-stalker-light/20 bg-[#0f1f3d]/90 p-2 shadow-lg shadow-black/40 backdrop-blur-xl sm:top-4 sm:mb-6 sm:rounded-xl sm:bg-[#0f1f3d]/80 sm:p-4 animate-in fade-in duration-300">
  <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-3 w-full">
    
    {/* Left Block: Navigation Back, Logo, Title */}
    <div className="flex w-full items-center justify-between sm:w-auto">
      <div className="flex items-center gap-3">
        {(historyLength > 0 || streamUrl) && !streamUrl && (
          <button
            onClick={handleBack}
            className="mr-2 text-white transition-colors hover:text-blue-400"
            data-focusable="true"
            tabIndex={-1}
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
        )}
        <img
          src="stalker-logo.svg"
          className="w-24 sm:w-28 md:w-44 cursor-pointer"
          alt="Stalker Logo"
          onClick={() => navigate('/')}
        />
        <span className="text-slate-600 hidden sm:inline text-lg select-none pointer-events-none">|</span>
        <h1 className="hidden text-sm font-extrabold tracking-wider text-white sm:block sm:text-base md:text-lg lg:text-xl uppercase bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm self-center">
          {currentTitle}
        </h1>
      </div>
    </div>

    {/* Right Block: Content Controls & Actions */}
    {!streamUrl && (
      <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
        
        {/* Content Type Toggles */}
        <div className="flex w-full justify-between space-x-1 rounded-full border border-white/10 bg-[#0b1120]/60 p-1 backdrop-blur-md transition-all duration-300 sm:w-auto sm:space-x-2">
          <button
            onClick={() => handleContentTypeChange('movie')}
            className={`flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 sm:flex-none sm:px-4 sm:py-2 sm:text-sm ${
              contentType === 'movie'
                ? 'bg-gradient-to-r from-stalker-light to-stalker-dark text-white shadow-lg shadow-stalker-dark/50'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            data-focusable="true"
            tabIndex={-1}
            title="Movies"
          >
            <span className="mr-1 sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </span>
            <span>Movies</span>
          </button>
          <button
            onClick={() => handleContentTypeChange('series')}
            className={`flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 sm:flex-none sm:px-4 sm:py-2 sm:text-sm ${
              contentType === 'series'
                ? 'bg-gradient-to-r from-stalker-light to-stalker-dark text-white shadow-lg shadow-stalker-dark/50'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            data-focusable="true"
            tabIndex={-1}
            title="Series"
          >
            <span className="mr-1 sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <span>Series</span>
          </button>
          <button
            onClick={() => handleContentTypeChange('tv')}
            className={`flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 sm:flex-none sm:px-4 sm:py-2 sm:text-sm ${
              contentType === 'tv'
                ? 'bg-gradient-to-r from-stalker-light to-stalker-dark text-white shadow-lg shadow-stalker-dark/50'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            data-focusable="true"
            tabIndex={-1}
            title="TV"
          >
            <span className="mr-1 sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <span>TV</span>
          </button>
        </div>

        {/* Action Controls Container */}
        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
          
          {/* Search Input Form */}
          <form onSubmit={handleSearch} className="flex-grow sm:flex-grow-0">
            <div className="relative w-full">
              <input
                type="search"
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search titles..."
                className="w-full rounded-full border border-white/10 bg-[#0b1120]/60 px-4 py-2 pr-10 text-sm text-gray-200 placeholder-gray-500 shadow-sm backdrop-blur-md transition-all duration-300 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-stalker-light sm:w-40 md:w-48 lg:w-64 sm:text-base"
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
                onKeyDown={(e) => {
                  if (isSearchTyping && e.key === 'Enter') {
                    handleSearch();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors duration-200 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
          
          {/* Sort Button */}
          <button
            onClick={cycleSort}
            className="flex flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0b1120]/60 p-2.5 text-gray-300 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-1 focus:ring-stalker-light active:scale-95"
            data-focusable="true"
            data-control="sort"
            title={`Sort: ${sort === 'alphabetic' ? 'A-Z' : sort === 'oldest' ? 'Oldest' : 'Latest'}`}
          >
            {(!sort || sort === 'latest') && <SortDesc className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.5} />}
            {sort === 'oldest' && <SortAsc className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.5} />}
            {sort === 'alphabetic' && <ArrowDownAZ className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.5} />}
          </button>

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full overflow-hidden bg-indigo-600 text-white font-extrabold text-sm shadow-md transition-all duration-300 hover:bg-indigo-500 focus:outline-none focus:ring-1 focus:ring-stalker-light select-none cursor-pointer"
                data-focusable="true"
                data-control="profile"
                tabIndex={-1}
                title="User Profile"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name ? user.name[0].toUpperCase() : 'U'
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-800 bg-[#0e1726] p-2 shadow-2xl shadow-black/90 animate-in fade-in slide-in-from-top-2 duration-250 z-50">
                  <div className="px-3 py-2.5 border-b border-slate-800 text-left">
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                    <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                      {user.role}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {user.role === 'admin' && (
                      <button
                        onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                        className="flex w-full items-center space-x-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors duration-250 cursor-pointer"
                        data-focusable="true"
                        tabIndex={-1}
                      >
                        <Shield className="h-4 w-4 text-indigo-400" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setDropdownOpen(false); handleClearWatched(); }}
                      className="flex w-full items-center space-x-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors duration-250 cursor-pointer"
                      data-focusable="true"
                      tabIndex={-1}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                      <span>Clear History</span>
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); logout(); }}
                      className="flex w-full items-center space-x-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors duration-250 cursor-pointer"
                      data-focusable="true"
                      tabIndex={-1}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact Device Count Badge */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 select-none bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full flex-shrink-0" title={`${activeUserCount || 1} device${(activeUserCount || 1) !== 1 ? 's' : ''} online`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>{activeUserCount || 1}</span>
          </div>

        </div>
      </div>
    )}
  </div>
</header>
    );
  }
);
