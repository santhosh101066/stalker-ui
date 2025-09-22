import React, { useState, useEffect, useCallback } from "react";
import { getMedia, getSeries, getUrl } from "./api/services";
import LoadingSpinner from "./components/LoadingSpinner";
import MediaCard from "./components/MediaCard";
import EpisodeCard from "./components/EpisodeCard";
import VideoPlayer from "./components/VideoPlayer";
import Admin from "./components/Admin"; // Import Admin component
import type { MediaItem, ContextType } from "./types";
import { BASE_URL } from "./api/api";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Main Application Component ---
export default function App() {
  const initialContext: ContextType = {
    page: 1,
    pageAtaTime: 1,
    search: "",
    category: null,
    movieId: null,
    seasonId: null,
    parentTitle: "Movies",
  };
  const [context, setContext] = useState<ContextType>(initialContext);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<ContextType[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"movie" | "series">("movie"); // 'movie' or 'series'
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (newContext: ContextType, typeOverride?: "movie" | "series") => {
      const currentContentType = typeOverride || contentType;
      setLoading(true);
      setError(null);
      setItems([]);

      try {
        let data: MediaItem[] = [];

        if (currentContentType === "movie") {
          const params = {
            page: newContext.page,
            search: newContext.search,
            pageAtaTime: 1,
            category: newContext.category,
            movieId: newContext.movieId,
            seasonId: newContext.seasonId,
          };
          data = await getMedia(params);
        } else {
          // This is series mode
          if (newContext.movieId) {
            data = await getSeries({ movieId: newContext.movieId });
          } else if (newContext.seasonId) {
            data = await getSeries({
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
            data = await getSeries(params);
          }
        }

        setItems(data);
        setContext(newContext);
      } catch (err: unknown) {
        console.error("Failed to fetch data:", err);
        setError("Could not load content. Please try again later.");
      } finally {
        setLoading(false);
      }
    },
    [contentType]
  );

  useEffect(() => {
    fetchData(initialContext);
  }, []);

  const handleItemClick = async (item: MediaItem) => {
    setHistory((prev) => [...prev, context]);
    const displayTitle = item.title || item.name || "";

    const isInsideMovieCategory =
      contentType === "movie" && context.category !== null;

    if (item.is_series == 1) {
      fetchData({
        ...initialContext,
        category: context.category,
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
      try {
        let episodeFiles: MediaItem[] = [];
        if (contentType === "series") {
          episodeFiles = await getSeries({
            movieId: context.movieId,
            seasonId: context.seasonId,
            episodeId: item.id,
          });
        } else {
          episodeFiles = await getMedia({
            movieId: context.movieId,
            seasonId: context.seasonId,
            episodeId: item.id,
            category: "*",
          });
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
    } else if (isInsideMovieCategory) {
      setLoading(true);
      try {
        const files = await getMedia({
          movieId: item.id,
          category: context.category,
        });
        if (files && files.length > 0) {
          const movieFile = files[0];
          const linkData = await getUrl({ id: movieFile.id });

          if (linkData && linkData.js && typeof linkData.js.cmd === "string") {
            const rawUrl = linkData.js.cmd;
            setRawStreamUrl(rawUrl);
            setStreamUrl(`${BASE_URL}/proxy?url=${btoa(rawUrl)}`);
            setCurrentItemId(item.id);
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

  const handleBack = () => {
    if (streamUrl) {
      setStreamUrl(null);
      setRawStreamUrl(null);
      setCurrentItemId(null);
      return;
    }

    if (history.length > 0) {
      const lastContext = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      fetchData(lastContext);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const search = (
      e.target as typeof e.target & { elements: { search: { value: string } } }
    ).elements.search.value;
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

  const handlePageChange = (direction: number) => {
    const newPage = context.page + direction;
    if (newPage < 1) return;
    fetchData({ ...context, page: newPage });
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
                  >
                    &larr;
                  </button>
                )}
                <img src="stalker-logo.svg" width={180}/>
                <h1 className="text-xl sm:text-l md:text-l font-bold text-white tracking-wider">
                  {currentTitle}
                </h1>
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  {showAdmin ? "Back to Content" : "Admin"}
                </button>
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
                    />
                  </form>
                </div>
              )}
            </div>
          </header>

          <main>
            {showAdmin ? (
              <Admin />
            ) : (
              <>
                {loading && <LoadingSpinner />}

                {error && (
                  <div className="text-center">
                    <p className="text-red-500">{error}</p>
                    <button
                      onClick={() => fetchData(context)}
                      className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Reload
                    </button>
                  </div>
                )}

                {!loading && !error && (
                  <>
                    {streamUrl ? (
                      <VideoPlayer
                        streamUrl={streamUrl}
                        rawStreamUrl={rawStreamUrl}
                        onBack={handleBack}
                        itemId={currentItemId}
                      />
                    ) : (
                      <>
                        <div
                          className={
                            isEpisodeList
                              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                          }
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

                        {/* No content messages */}
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

                        {/* Pagination */}
                        {items?.length > 0 &&
                          ((!context.movieId && !context.seasonId) ||
                            context.seasonId) && (
                            <div className="flex justify-center items-center mt-12 space-x-4">
                              <button
                                onClick={() => handlePageChange(-1)}
                                disabled={context.page <= 1}
                                className="bg-gray-800 py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                              >
                                Previous
                              </button>
                              <span className="text-lg font-semibold">
                                {context.page}
                              </span>
                              <button
                                onClick={() => handlePageChange(1)}
                                className="bg-gray-800 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                Next
                              </button>
                            </div>
                          )}
                      </>
                    )}
                  </>
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
