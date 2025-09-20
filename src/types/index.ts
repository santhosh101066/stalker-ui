export interface MediaItem {
    id: string;
    title?: string;
    name?: string;
    screenshot_uri?: string;
    is_series?: number;
    is_season?: boolean;
    is_episode?: boolean;
    series_number?: number;
}

export interface ContextType {
    page: number;
    pageAtaTime: number;
    search: string;
    category: string | null;
    movieId: string | null;
    seasonId: string | null;
    parentTitle: string;
}
