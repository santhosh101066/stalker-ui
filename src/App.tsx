import React, { useState, useEffect, useCallback, useRef } from "react";
import { getMedia, getSeries, getUrl } from "./api/services";
import LoadingSpinner from "./components/LoadingSpinner";
import MediaCard from "./components/MediaCard";
import EpisodeCard from "./components/EpisodeCard";
import VideoPlayer from "./components/VideoPlayer";
import ContinueWatching from "./components/ContinueWatching";
import type { MediaItem, ContextType } from "./types";
import { BASE_URL } from "./api/api";
import { ToastContainer } from "react-toastify";
import type { PaginatedResponse } from "./api/services";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import Admin from "./components/Admin";

// --- Main Application Component ---
export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTizen = !!(window as any).tizen; // Detect Tizen environment
  const initialContext: ContextType = {
    page: 1,
    pageAtaTime: 1,
    search: "",
    category: null,
    movieId: null,
    seasonId: null,
    parentTitle: "Movies",
    focusedIndex: null,
  };
  const [context, setContext] = useState<ContextType>(initialContext);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<ContextType[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [contentType, setContentType] = useState<"movie" | "series">("movie"); // 'movie' or 'series'
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [currentSeriesItem, setCurrentSeriesItem] = useState<MediaItem | null>(
    null
  );
  const [playingMovieId, setPlayingMovieId] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const isFetchingMore = useRef(false);

  const fetchData = useCallback(
    async (newContext: ContextType, typeOverride?: "movie" | "series") => {
      const currentContentType = typeOverride || contentType;
      setLoading(true);
      setError(null);
      setPaginationError(null);
      if (newContext.page === 1) {
        setItems([]);
        setTotalItemsCount(0); // Reset total on a new search or page 1
      }

      try {
        let response: PaginatedResponse<MediaItem>;

        if (currentContentType === "movie") {
          const params = {
            page: newContext.page,
            search: newContext.search,
            pageAtaTime: 1,
            category: newContext.category,
            movieId: newContext.movieId,
            seasonId: newContext.seasonId,
          };
          response = await getMedia(params);
        } else {
          // This is series mode
          if (newContext.movieId) {
            response = await getSeries({ movieId: newContext.movieId });
          } else if (newContext.seasonId) {
            response = await getSeries({
              seasonId: newContext.seasonId,
              page: newContext.page,
              pageAtaTime: 1,
            });
          } else {
            const params = {
              page: newContext.page,
              search: newContext.search,
              pageAtaTime: 1,
              category: newContext.category,
            };
            response = await getSeries(params);
          }
        }
        const data = response.data || [];
        setItems((prevItems) =>
          newContext.page === 1 ? data : [...prevItems, ...data]
        );
        setContext(newContext);
        if (response.total_items) {
          setTotalItemsCount(response.total_items);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch data:", err);

        // --- START: RETRY LOGIC ---
        if (newContext.page > 1) {
          // Failure was on a *subsequent* page
          setPaginationError("Could not load more content. Please try again.");
        } else {
          // Failure was on the *first* page
          setError("Could not load content. Please try again later.");
        }
      } finally {
        setLoading(false);
        isFetchingMore.current = false;
      }
    },
    [contentType, totalItemsCount]
  );

  useEffect(() => {
    fetchData(initialContext);
  }, []);

  const handleItemClick = async (item: MediaItem) => {
    setHistory((prev) => [
      ...prev,
      { ...context, focusedIndex: focusedIndex ?? 0 },
    ]);
    const displayTitle = item.title || item.name || "";

    const isInsideMovieCategory =
      contentType === "movie" && context.category !== null;
    console.log(item, isInsideMovieCategory);

    if (item.is_series == 1) {
      setCurrentSeriesItem(item);
      console.log(item);

      fetchData({
        ...initialContext,
        category: context.category || "*",
        movieId: item.id,
        parentTitle: displayTitle,
      });
    } else if (item.is_season) {
      fetchData({
        ...initialContext,
        category: context.category,
        movieId: context.movieId,
        seasonId: item.id,
        parentTitle: displayTitle,
      });
    } else if (item.is_episode) {
      setLoading(true);
      setCurrentItem(item);
      try {
        let episodeFiles: MediaItem[] = [];
        if (contentType === "series") {
          // --- FIX: Destructure the 'data' property from the response ---
          const response = await getSeries({
            movieId: context.movieId,
            seasonId: context.seasonId,
            episodeId: item.id,
          });
          episodeFiles = response.data;
        } else {
          // --- FIX: Destructure the 'data' property from the response ---
          const response = await getMedia({
            movieId: context.movieId,
            seasonId: context.seasonId,
            episodeId: item.id,
            category: "*",
          });
          episodeFiles = response.data;
        }

        if (episodeFiles && episodeFiles.length > 0) {
          const episodeFile = episodeFiles[0];
          if (episodeFile.id !== undefined) {
            const urlParams: Record<string, string | number | undefined> = {
              id: episodeFile.id,
            };
            if (item.series_number !== undefined) {
              urlParams.series = item.series_number;
            }

            const linkData = await getUrl(urlParams);
            const cmd =
              (linkData && linkData.js && linkData.js.cmd) ||
              (linkData && linkData.cmd);

            if (typeof cmd === "string") {
              setRawStreamUrl(cmd);
              setStreamUrl(`${BASE_URL}/proxy?url=${btoa(cmd)}`);
              setCurrentItemId(item.id);
            } else {
              throw new Error("Episode stream URL (cmd) not found.");
            }
          } else {
            throw new Error("Episode details (id) missing.");
          }
        } else {
          throw new Error("Could not fetch episode details.");
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Could not fetch stream URL.");
        setHistory((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    } else if (isInsideMovieCategory || item.is_playable_movie) {
      setLoading(true);
      try {
        // --- FIX: Destructure the 'data' property from the response ---
        const response = await getMedia({
          movieId: item.id,
          category: context.category || "*",
        });
        const files = response.data; // Get the array from the response object

        if (files && files.length > 0) {
          const movieFile = files[0];
          setPlayingMovieId(item.id);
          setCurrentItem(item);
          const linkData = await getUrl({ id: movieFile.id });

          if (linkData && linkData.js && typeof linkData.js.cmd === "string") {
            const rawUrl = linkData.js.cmd;
            setRawStreamUrl(rawUrl);
            setStreamUrl(`${BASE_URL}/proxy?url=${btoa(rawUrl)}`);
            setCurrentItemId(movieFile.id);
          } else {
            throw new Error("Movie stream URL not found.");
          }
        } else {
          throw new Error("Movie file could not be found.");
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Could not fetch stream URL.");
        setHistory((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    } else {
      fetchData({
        ...initialContext,
        category: item.id,
        parentTitle: displayTitle,
      });
    }
  };

  const handleBack = useCallback(() => {
    if (streamUrl) {
      setStreamUrl(null);
      setRawStreamUrl(null);
      setCurrentItemId(null);
      return;
    }

    if (history.length > 0) {
      const lastContext = history[history.length - 1]; // Get previous context
      if (!lastContext.movieId) {
        setCurrentSeriesItem(null);
      }
      setHistory((prev) => prev.slice(0, -1));
      fetchData(lastContext); // Fetch data with old context

      // --- FOCUS FIX: Restore old focused index ---
      setFocusedIndex(lastContext.focusedIndex ?? 0);
    }
  }, [streamUrl, history, fetchData]);

  const handlePageChange = useCallback(
    (direction: number) => {
      if (direction <= 0) return;

      // This block is unchanged and still has our ref lock
      if (
        isFetchingMore.current ||
        loading ||
        (totalItemsCount > 0 && items.length >= totalItemsCount)
      ) {
        return;
      }
      isFetchingMore.current = true;

      const newPage = context.page + direction;
      if (newPage < 1) {
        isFetchingMore.current = false;
        return;
      }

      fetchData({ ...context, page: newPage });
    },
    [loading, totalItemsCount, items.length, context, fetchData]
  );

  useEffect(() => {
    // Reset focus when the view changes (e.g., new category, new search)
    // ONLY reset if it's page 1.
    if (context.page === 1) {
      setFocusedIndex(null);
    }
  }, [items, showAdmin, streamUrl, context.page]);

  useEffect(() => {
    if (streamUrl) return; // Do not manage focus from App.tsx when video player is active
    if (isTizen && isSearchActive) return;
    const focusable = Array.from(
      document.querySelectorAll('[data-focusable="true"]')
    ) as HTMLElement[];
    if (focusable.length === 0) return;

    const newIndex = focusedIndex === null ? 0 : focusedIndex;
    if (newIndex >= focusable.length) {
      setFocusedIndex(focusable.length - 1);
      return;
    }

    if (focusedIndex === null) {
      setFocusedIndex(0);
    }

    focusable.forEach((el, index) => {
      if (index === newIndex) {
        el.classList.add("focused");
        el.focus();
      } else {
        el.classList.remove("focused");
      }
    });
  }, [focusedIndex, items, showAdmin, streamUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (streamUrl) return; // Do not handle key events when video player is active

      // --- START: TIZEN SEARCH LOGIC ---
      if (isTizen && isSearchActive) {
        // When search is active, only allow Enter or Back
        if (e.keyCode === 13) {
          // Enter
          // Let the 'onSubmit' (handleSearch) trigger normally
          return;
        }
        if (e.keyCode === 0 || e.keyCode === 10009 || e.keyCode === 8) {
          // Back
          e.preventDefault();
          setIsSearchActive(false);

          // Manually find and set focus back to the search input in our system
          const focusable = Array.from(
            document.querySelectorAll('[data-focusable="true"]')
          ) as HTMLElement[];
          const searchIndex = focusable.findIndex((el) =>
            el.matches('input[type="search"]')
          );
          if (searchIndex !== -1) {
            setFocusedIndex(searchIndex);
          }
        }
        // Block all other navigation (Up, Down, Left, Right)
        return;
      }
      // --- END: TIZEN SEARCH LOGIC ---

      const focusable = Array.from(
        document.querySelectorAll('[data-focusable="true"]')
      ) as HTMLElement[];
      if (focusable.length === 0) return;

      let currentIndex = focusedIndex === null ? 0 : focusedIndex;
      if (currentIndex >= focusable.length) currentIndex = focusable.length - 1;

      switch (e.keyCode) {
        case 37: // LEFT
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedIndex(currentIndex - 1);
          }
          break;
        case 39: // RIGHT
          e.preventDefault();
          if (currentIndex < focusable.length - 1) {
            setFocusedIndex(currentIndex + 1);
          }
          break;
        case 38: { // UP
          e.preventDefault();
          const grid = document.querySelector(".grid");
          if (grid) {
            const gridComputedStyle = window.getComputedStyle(grid);
            const gridColumnCount = gridComputedStyle
              .getPropertyValue("grid-template-columns")
              .split(" ").length;
            const newIndex = currentIndex - gridColumnCount;
            if (newIndex >= 0) {
              setFocusedIndex(newIndex);
            }
          } else if (currentIndex > 0) {
            setFocusedIndex(currentIndex - 1);
          }
          break;
        }
        case 40: { // DOWN
          e.preventDefault();
          const gridDown = document.querySelector(".grid");
          if (gridDown) {
            const gridComputedStyle = window.getComputedStyle(gridDown);
            const gridColumnCount = gridComputedStyle
              .getPropertyValue("grid-template-columns")
              .split(" ").length;
            const newIndex = currentIndex + gridColumnCount;

            if (newIndex < focusable.length) {
              setFocusedIndex(newIndex);
            } else {
              const lastRowStartIndex =
                focusable.length -
                (focusable.length % gridColumnCount || gridColumnCount);
              if (currentIndex >= lastRowStartIndex) {
                handlePageChange(1);
                setFocusedIndex(currentIndex);
              } else if (currentIndex < focusable.length - 1) {
                setFocusedIndex(focusable.length - 1);
              }
            }
          } else if (currentIndex < focusable.length - 1) {
            setFocusedIndex(currentIndex + 1);
          }
          break;
        }
        case 13: // OK
          e.preventDefault();
          if (focusedIndex !== null && focusable[focusedIndex]) {
            const focusedElement = focusable[focusedIndex] as HTMLElement;

            // --- START: TIZEN SEARCH ACTIVATION ---
            if (isTizen && focusedElement.matches('input[type="search"]')) {
              // It's the search bar, activate it and manually focus
              setIsSearchActive(true);
              focusedElement.focus();
            } else {
              // Default behavior for all other buttons
              focusedElement.click();
            }
            // --- END: TIZEN SEARCH ACTIVATION ---
          }
          break;
        case 0: // BACK on some devices
        case 10009: // RETURN on Tizen
        case 8: // Backspace for web
          e.preventDefault();
          handleBack();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedIndex,
    items,
    handleBack,
    showAdmin,
    streamUrl,
    isTizen,
    isSearchActive,
    context,
    handlePageChange,
  ]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const search = (
      e.target as typeof e.target & { elements: { search: { value: string } } }
    ).elements.search.value;
    if (isTizen) {
      setIsSearchActive(false);
    }
    setHistory([]);
    const newTitle = search
      ? `Results for "${search}"`
      : contentType === "movie"
      ? "Movies"
      : "Series";
    fetchData({
      ...initialContext,
      search,
      category: search ? "*" : "*", // always search all
      parentTitle: newTitle,
    });
  };

  const handleContentTypeChange = (type: "movie" | "series") => {
    if (type === contentType) return;

    const newTitle = type === "movie" ? "Movies" : "Series";
    const newContext = {
      ...initialContext,
      parentTitle: newTitle,
      category: null,
    };

    setContentType(type);
    setHistory([]);
    setStreamUrl(null);
    setRawStreamUrl(null);
    fetchData(newContext, type);
  };

  useEffect(() => {
    const handleScroll = () => {
      // Don't run this logic on Tizen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isTizen = !!(window as any).tizen;
      if (isTizen) return;

      // Check if user is scrolled 200px from the bottom
      const buffer = 200;
      const isNearBottom =
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - buffer;

      if (isNearBottom) {
        // Call our existing function.
        // It's safe because it has the ref lock and loading checks.
        handlePageChange(1);
      }
    };

    // Add the event listener for the web
    window.addEventListener("scroll", handleScroll);

    // Clean up the listener when the component unmounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handlePageChange]);

  const isEpisodeList = items && items.length > 0 && items[0].is_episode;
  const currentTitle = streamUrl
    ? "Now Playing"
    : context.parentTitle || "Browse";

  return (
    <>
      <div className="text-gray-200 min-h-screen font-sans">
        <div className="container mx-auto p-4 sm:p-6">
          <header className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 mb-6 sticky top-4 z-10 border border-gray-700/80">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center self-start">
                {(history.length > 0 || streamUrl) && !streamUrl && (
                  <button
                    onClick={handleBack}
                    className="mr-2 text-2xl text-white hover:text-blue-400 transition-colors"
                    data-focusable="true"
                    tabIndex={-1}
                  >
                    &larr;
                  </button>
                )}
                <img src="stalker-logo.svg" width={180} />
                <h1 className="text-xl sm:text-l md:text-l font-bold text-white tracking-wider">
                  {currentTitle}
                </h1>
              </div>

              {!streamUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <div className="flex justify-center space-x-2 bg-gray-900/60 p-1 rounded-full w-full sm:w-auto">
                    <button
                      onClick={() => handleContentTypeChange("movie")}
                      className={`py-2 px-4 sm:px-6 rounded-full font-semibold text-sm transition-colors duration-300 w-full ${
                        contentType === "movie"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700/50"
                      }`}
                      data-focusable="true"
                      tabIndex={-1}
                    >
                      Movies
                    </button>
                    <button
                      onClick={() => handleContentTypeChange("series")}
                      className={`py-2 px-4 sm:px-6 rounded-full font-semibold text-sm transition-colors duration-300 w-full ${
                        contentType === "series"
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700/50"
                      }`}
                      data-focusable="true"
                      tabIndex={-1}
                    >
                      Series
                    </button>
                  </div>
                  <form onSubmit={handleSearch} className="w-full sm:w-auto">
                    <input
                      type="search"
                      name="search"
                      key={context.search}
                      defaultValue={context.search}
                      placeholder="Search titles..."
                      className="bg-gray-900/50 text-white rounded-full py-2 px-4 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700/80"
                      data-focusable="true"
                      readOnly={isTizen && !isSearchActive}
                      onClick={() => {
                        if (isTizen) setIsSearchActive(true);
                      }}
                      onBlur={() => {
                        if (isTizen) setIsSearchActive(false);
                      }}
                    />
                  </form>
                  {!isTizen && (
                    <button
                      onClick={() => setShowAdmin(!showAdmin)}
                      className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                      data-focusable="true"
                      tabIndex={-1}
                    >
                      {showAdmin ? "Back to Content" : "Admin"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          <main>
            {showAdmin ? (
              <Admin />
            ) : (
              <>
                {/* --- CHANGE 1: Spinner now ONLY shows on *initial* load (no items) --- */}
                {loading && items.length === 0 && <LoadingSpinner />}

                {/* --- This error block is unchanged --- */}
                {error && (
                  <div className="text-center">
                    <p className="text-red-500">{error}</p>
                    <button
                      onClick={() => fetchData(context)}
                      className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                      data-focusable="true"
                      tabIndex={-1}
                    >
                      Reload
                    </button>
                  </div>
                )}

                {/* --- CHANGE 2: Content (Player or Grid) now renders *even if loading* --- */}
                {/* This prevents the flicker, as the grid no longer disappears. */}

                {/* --- Video Player (unchanged logic) --- */}
                {!error && streamUrl ? (
                  <VideoPlayer
                    streamUrl={streamUrl}
                    rawStreamUrl={rawStreamUrl}
                    onBack={handleBack}
                    itemId={currentItemId}
                    context={context}
                    contentType={contentType}
                    mediaId={
                      contentType === "movie"
                        ? currentSeriesItem?.id || playingMovieId
                        : context.movieId
                    }
                    item={currentSeriesItem || currentItem}
                    seriesItem={currentSeriesItem}
                  />
                ) : (
                  // --- Content Grid (now visible during load, if !error) ---
                  !error && (
                    <>
                      {context.category === null && !context.search && (
                        <ContinueWatching onClick={handleItemClick} />
                      )}

                      <div
                        className={`
                          ${
                            isEpisodeList
                              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                          }
                          ${
                            /* --- CHANGE 3: Dim grid if loading a *new* category (page 1) --- */ ""
                          }
                          ${
                            loading && items.length > 0 && context.page === 1
                              ? "opacity-50 transition-opacity duration-300 pointer-events-none"
                              : "opacity-100"
                          }
                        `}
                      >
                        {items?.map((item) =>
                          isEpisodeList ? (
                            <EpisodeCard
                              key={item.id}
                              item={item}
                              onClick={handleItemClick}
                            />
                          ) : (
                            <MediaCard
                              key={item.id}
                              item={item}
                              onClick={handleItemClick}
                            />
                          )
                        )}
                      </div>

                      {/* --- No content messages (now must check !loading) --- */}
                      {!items?.length && !loading && !context.search && (
                        <p className="text-center text-gray-400 mt-10">
                          No content found.
                        </p>
                      )}
                      {!items?.length && !loading && context.search && (
                        <p className="text-center text-gray-400 mt-10">
                          No results found for "{context.search}".
                        </p>
                      )}

                      {/* --- Pagination & Retry Logic (from previous answers) --- */}
                      {/* This block correctly handles the spinner for *infinite scrolling* */}
                      {(totalItemsCount === 0 ||
                        items.length < totalItemsCount) && (
                        <div className="col-span-full">
                          {loading && items.length > 0 && <LoadingSpinner />}

                          {!loading && paginationError && (
                            <div className="text-center py-8">
                              <p className="text-red-500">{paginationError}</p>
                              <button
                                onClick={() => handlePageChange(1)}
                                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                                data-focusable="true"
                                tabIndex={-1}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                )}
              </>
            )}
          </main>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
