import React, { useMemo, useEffect, useRef, useState } from 'react';
import type { ChannelGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface CategorySelectorProps {
  categories: ChannelGroup[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string, categoryTitle: string) => void;
  contentType: 'movie' | 'series';
  providerKey: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  contentType,
  providerKey,
}) => {
  const { user, updatePreferences } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showAllOverlay, setShowAllOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const key = `${providerKey}_${contentType}`;
  const pinnedIds = useMemo(() => {
    return user?.preferences?.pinnedCategories?.[key] || [];
  }, [user, key]);

  // Parse and sort categories based on recency + alphabetical order
  const sortedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const recents = user?.preferences?.recentCategories?.[key] || [];
    const recentIds = recents.filter((id) => id !== '*');

    // Separate categories
    const allCategory = categories.find((cat) => cat.id === '*');
    const remainingCategories = categories.filter((cat) => cat.id !== '*');

    // Sort remaining categories alphabetically first
    const alphabetical = [...remainingCategories].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    // Now split the alphabetical list into recents and others
    const recentItems: ChannelGroup[] = [];
    const otherItems: ChannelGroup[] = [];

    alphabetical.forEach((cat) => {
      if (recentIds.includes(cat.id)) {
        recentItems.push(cat);
      } else {
        otherItems.push(cat);
      }
    });

    recentItems.sort((a, b) => {
      const indexA = recentIds.indexOf(a.id);
      const indexB = recentIds.indexOf(b.id);
      return indexA - indexB;
    });

    const finalCategories: ChannelGroup[] = [];
    if (allCategory) {
      finalCategories.push(allCategory);
    } else {
      finalCategories.push({ id: '*', title: 'ALL' });
    }

    const combined = [...finalCategories, ...recentItems, ...otherItems];

    // Filter adult categories and push them to the end
    const cleanCategories = combined.filter(
      (cat) => !cat.title.toLowerCase().includes('adult')
    );
    const adultCategories = combined.filter(
      (cat) => cat.title.toLowerCase().includes('adult')
    );

    return [...cleanCategories, ...adultCategories];
  }, [categories, key, user]);

  // Determine what is listed "outside" (the horizontal bar)
  const outsideCategories = useMemo(() => {
    if (pinnedIds.length === 0) {
      // Default to showing all categories if none are pinned
      return sortedCategories;
    }
    // If pinned categories exist, show "ALL" + the pinned categories
    const allCategory = sortedCategories.find((cat) => cat.id === '*') || { id: '*', title: 'ALL' };
    const pinnedItems = sortedCategories.filter((cat) => pinnedIds.includes(cat.id));
    return [allCategory, ...pinnedItems];
  }, [sortedCategories, pinnedIds]);

  // Filtered categories for the full search list inside overlay
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return sortedCategories;
    return sortedCategories.filter((cat) =>
      cat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedCategories, searchQuery]);

  // Toggle pinning a category
  const handleTogglePin = async (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    if (catId === '*') return; // Cannot pin/unpin 'ALL'

    let newPinned: string[];
    if (pinnedIds.includes(catId)) {
      newPinned = pinnedIds.filter((id: string) => id !== catId);
    } else {
      newPinned = [...pinnedIds, catId];
    }

    const currentPinnedRecord = user?.preferences?.pinnedCategories || {};
    await updatePreferences({
      pinnedCategories: {
        ...currentPinnedRecord,
        [key]: newPinned,
      },
    });
  };

  // Select category
  const handleSelect = (catId: string, catTitle: string) => {
    const updatedLastSelected = {
      ...(user?.preferences?.lastSelectedCategory || {}),
      [key]: catId,
    };
    const updatedLastSelectedTitle = {
      ...(user?.preferences?.lastSelectedCategoryTitle || {}),
      [key]: catTitle,
    };

    let updatedRecentCategories = user?.preferences?.recentCategories || {};
    if (catId !== '*') {
      const currentRecents = updatedRecentCategories[key] || [];
      const newRecents = [catId, ...currentRecents.filter((id) => id !== catId)].slice(0, 5);
      updatedRecentCategories = {
        ...updatedRecentCategories,
        [key]: newRecents,
      };
    }

    updatePreferences({
      lastSelectedCategory: updatedLastSelected,
      lastSelectedCategoryTitle: updatedLastSelectedTitle,
      recentCategories: updatedRecentCategories,
    });
    onSelectCategory(catId, catTitle);
    setShowAllOverlay(false);
    setSearchQuery('');
  };

  const handleClearAllPins = async () => {
    const currentPinnedRecord = user?.preferences?.pinnedCategories || {};
    await updatePreferences({
      pinnedCategories: {
        ...currentPinnedRecord,
        [key]: [],
      },
    });
  };

  // Auto-scroll the active/focused category card into view
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = scrollContainerRef.current?.querySelector('.focused');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  if (!categories || categories.length <= 1) return null;

  return (
    <div className="mb-8 px-2 sm:px-0">
      <div className="flex items-center gap-3">
        <div
          ref={scrollContainerRef}
          data-focus-group="categories"
          className="hide-scrollbar flex-grow flex gap-3 overflow-x-auto px-4 py-4 scroll-smooth"
        >
          {outsideCategories.map((cat, idx) => {
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id || idx}
                data-focusable="true"
                data-selected={isActive ? "true" : "false"}
                onClick={() => handleSelect(cat.id, cat.title)}
                className={`flex h-12 shrink-0 items-center justify-center rounded-full px-6 text-center transition-all duration-300 outline-none text-sm sm:text-base ${
                  isActive
                    ? 'border-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 text-white font-extrabold shadow-lg shadow-blue-500/30'
                    : 'border-gray-800/80 bg-gray-900/30 text-gray-400 font-bold hover:border-gray-770 hover:text-gray-200'
                } focus:scale-105 focus:border-transparent focus:text-white focus:bg-gradient-to-r focus:from-sky-400 focus:to-blue-500 focus:shadow-[0_0_20px_rgba(56,189,248,0.4)] [&.focused]:scale-105 [&.focused]:!border-transparent [&.focused]:text-white [&.focused]:bg-gradient-to-r [&.focused]:from-sky-400 [&.focused]:to-blue-500 [&.focused]:shadow-[0_0_20px_rgba(56,189,248,0.4)]`}
              >
                <span className="font-extrabold whitespace-nowrap">
                  {cat.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pin / Manage Toggle Button */}
        <button
          onClick={() => setShowAllOverlay(true)}
          data-focusable="true"
          title="Add / Pin Categories"
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-gray-800/80 bg-gray-900/30 text-gray-400 font-bold hover:border-gray-750 hover:text-gray-200 hover:bg-gray-800/40 focus:scale-105 focus:border-blue-500 focus:text-white focus:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Grid Overlay Modal */}
      {showAllOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
              <div className="text-left">
                <h4 className="text-lg font-black text-white uppercase tracking-tight">Pin & Select Categories</h4>
                <p className="text-xs text-gray-500">
                  Select a category to view it, or check the pin box to pin it outside.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {pinnedIds.length > 0 && (
                  <button
                    onClick={handleClearAllPins}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900/30 hover:text-red-200 transition-all cursor-pointer"
                  >
                    Clear All Pins
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAllOverlay(false);
                    setSearchQuery('');
                  }}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full bg-gray-950 border border-gray-800 hover:border-gray-750 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Categories Grid (Scrollable) */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 max-h-[50vh]">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12 text-gray-500 italic">
                  No matching categories found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-0.5">
                  {filteredCategories.map((cat, idx) => {
                    const isActive = selectedCategory === cat.id;
                    const isPinned = pinnedIds.includes(cat.id);
                    const isAll = cat.id === '*';

                    return (
                      <div
                        key={cat.id || idx}
                        onClick={() => handleSelect(cat.id, cat.title)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm font-bold truncate transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg'
                            : 'bg-gray-950/40 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <span className="truncate pr-2">{cat.title}</span>
                        
                        {!isAll && (
                          <button
                            onClick={(e) => handleTogglePin(e, cat.id)}
                            title={isPinned ? "Unpin Category" : "Pin Category"}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isPinned
                                ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 hover:bg-sky-500/30'
                                : 'bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {/* Pin Icon */}
                            <svg
                              className="w-4 h-4"
                              fill={isPinned ? "currentColor" : "none"}
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                              />
                              <circle cx="12" cy="10.5" r="2.5" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
