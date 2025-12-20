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
  has_files?: number;
  cmd?: string;
  number?: number;
  tv_genre_id?: string;
  stream_icon?: string;
  num?: string | number;
  stream_id?: string | number;
  runtime?: number;
  duration?: number;
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
  contentType: 'movie' | 'series' | 'tv';
  sort?: string;
}

export interface EPG_List {
  start_timestamp: string;
  stop_timestamp: string;
  name: string;
  description?: string;
}

export interface ChannelGroup {
  id: string;
  title: string;
}
