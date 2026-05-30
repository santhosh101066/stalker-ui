import React, { useMemo, useEffect, useRef } from 'react';
import type { ChannelGroup } from '@/types';

interface CategorySelectorProps {
  categories: ChannelGroup[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string, categoryTitle: string) => void;
  contentType: 'movie' | 'series';
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  contentType,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Parse and sort categories based on recency + alphabetical order
  const sortedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    let recents: string[] = [];
    try {
      const stored = localStorage.getItem(`recent_categories_${contentType}`);
      if (stored) {
        recents = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse recent categories from localStorage', e);
    }

    // Filter out duplicates and invalid IDs
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

    // Sort the recent items according to their order in recentIds (first in list = most recent)
    recentItems.sort((a, b) => {
      const indexA = recentIds.indexOf(a.id);
      const indexB = recentIds.indexOf(b.id);
      return indexA - indexB;
    });

    // Combine: [ALL, ...recents, ...others]
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
  }, [categories, contentType]);

  // Save selected category to recents list
  const handleSelect = (catId: string, catTitle: string) => {
    try {
      localStorage.setItem(`last_selected_category_${contentType}`, catId);
      localStorage.setItem(`last_selected_category_title_${contentType}`, catTitle);
    } catch (e) {
      console.error('Failed to save last selected category to localStorage', e);
    }

    if (catId !== '*') {
      try {
        const key = `recent_categories_${contentType}`;
        const stored = localStorage.getItem(key);
        let recents: string[] = stored ? JSON.parse(stored) : [];

        // Put the newly selected category at the front
        recents = [catId, ...recents.filter((id) => id !== catId)];
        
        // Cap the size of recents (e.g. max 5 categories for quick selections)
        localStorage.setItem(key, JSON.stringify(recents.slice(0, 5)));
      } catch (e) {
        console.error('Failed to save recent category to localStorage', e);
      }
    }
    onSelectCategory(catId, catTitle);
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
      {/* <h2 className="mb-4 text-center text-xl font-black text-white sm:text-left sm:text-2xl">
        Categories
      </h2> */}
      <div
        ref={scrollContainerRef}
        data-focus-group="categories"
        className="hide-scrollbar flex gap-3 overflow-x-auto px-4 py-4 scroll-smooth"
      >
        {sortedCategories.map((cat, idx) => {
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
                  : 'border-gray-800/80 bg-gray-900/30 text-gray-400 font-bold hover:border-gray-700 hover:text-gray-200'
              } focus:scale-105 focus:border-transparent focus:text-white focus:bg-gradient-to-r focus:from-sky-400 focus:to-blue-500 focus:shadow-[0_0_20px_rgba(56,189,248,0.4)] [&.focused]:scale-105 [&.focused]:!border-transparent [&.focused]:text-white [&.focused]:bg-gradient-to-r [&.focused]:from-sky-400 [&.focused]:to-blue-500 [&.focused]:shadow-[0_0_20px_rgba(56,189,248,0.4)]`}
            >
              <span className="font-extrabold whitespace-nowrap">
                {cat.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
