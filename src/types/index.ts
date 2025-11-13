export interface MediaItem {
    id: string;
    title?: string;
    name?: string;
    screenshot_uri?: string;
    is_series?: number;
    is_season?: boolean | number;
    is_episode?: boolean | number;
    series_number?: number;
    is_playable_movie?: boolean;
    has_files?: number
}

export interface ContextType {
    page: number;
    pageAtaTime: number;
    search: string;
    category: string | null;
    movieId: string | null;
    seasonId: string | null;
    parentTitle: string;
    focusedIndex?: number | null;
}
