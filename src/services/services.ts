/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EPG_List, MediaItem, ChannelGroup } from '@/types';
import { api, type ApiResponse } from '@/services/api';

export const API_PATHS = {
  MOVIES: '/v2/movies',
  SERIES: '/v2/series',
  MOVIE_LINK: '/v2/movie-link',
  CHANNELS: '/v2/channels',
  CHANNEL_LINK: '/v2/channel-link',
  EPG: '/v2/epg',
  CHANNEL_GROUPS: '/v2/groups',
  EXPIRY: '/v2/expiry',
  CAROUSEL: '/carousel',
  MOVIE_GROUPS: '/v2/movie-groups',
  SERIES_GROUPS: '/v2/series-groups',
};

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total_items: number;
  isPortal?: boolean;
}

export const getMedia = async (
  params: Record<string, any>,
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (
    await api.get<PaginatedResponse<MediaItem>>(API_PATHS.MOVIES, {
      params,
      signal,
    })
  ).data;
  if (!response) {
    throw new Error('No response data received from media API.');
  }

  return response;
};
export const getSeries = async (
  params: Record<string, any>,
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (
    await api.get<PaginatedResponse<MediaItem>>(API_PATHS.SERIES, {
      params,
      signal,
    })
  ).data;
  if (!response) {
    throw new Error('No response data received from series API.');
  }

  return response;
};

export const getChannels = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get<MediaItem[]>(API_PATHS.CHANNELS, { signal }))
    .data;
  if (!response || !Array.isArray(response)) {
    throw new Error('No response data received from channels API.');
  }

  return {
    data: response,
    page: 1,
    total_items: response.length,
  };
};

export const getChannelGroups = async (
  all: boolean = false,
  signal?: AbortSignal
): Promise<PaginatedResponse<ChannelGroup>> => {
  const params: Record<string, any> = {};
  if (all) {
    params.all = 'true';
  }

  const response = (
    await api.get<ChannelGroup[]>(API_PATHS.CHANNEL_GROUPS, { params, signal })
  ).data;
  if (!response || !Array.isArray(response)) {
    throw new Error('No response data received from channel groups API.');
  }

  return {
    data: response,
    page: 1,
    total_items: response.length,
  };
};

export const getMovieCategories = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<ChannelGroup>> => {
  const response = (
    await api.get<any>(API_PATHS.MOVIE_GROUPS, {
      signal,
    })
  ).data;
  if (!response) {
    throw new Error('No response data received from movie groups API.');
  }
  const rawData = response.data || response;
  const groupsList = Array.isArray(rawData) ? rawData : [];
  return {
    data: groupsList.map((g: any) => ({
      id: String(g.id),
      title: String(g.title || g.name || ''),
    })),
    page: 1,
    total_items: groupsList.length,
  };
};

export const getSeriesCategories = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<ChannelGroup>> => {
  const response = (
    await api.get<any>(API_PATHS.SERIES_GROUPS, {
      signal,
    })
  ).data;
  if (!response) {
    throw new Error('No response data received from series groups API.');
  }
  const rawData = response.data || response;
  const groupsList = Array.isArray(rawData) ? rawData : [];
  return {
    data: groupsList.map((g: any) => ({
      id: String(g.id),
      title: String(g.title || g.name || ''),
    })),
    page: 1,
    total_items: groupsList.length,
  };
};

export interface CarouselSlide {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  tabletImageUrl?: string;
  actionType: 'none' | 'play' | 'details';
  mediaType?: 'movie' | 'series' | 'tv';
  mediaId?: string;
  order: number;
}

export const getCarouselSlides = async (
  signal?: AbortSignal
): Promise<CarouselSlide[]> => {
  const response = (await api.get<CarouselSlide[]>(API_PATHS.CAROUSEL, { signal }))
    .data;
  return response || [];
};

export const saveCarouselSlides = async (
  slides: CarouselSlide[]
): Promise<{ success: boolean; message?: string }> => {
  const response = (
    await api.post<{ success: boolean; message?: string }>(
      API_PATHS.CAROUSEL,
      slides
    )
  ).data;
  return response;
};

export const getMovieUrl = async (params: Record<string, any> = {}) =>
  (await api.get(API_PATHS.MOVIE_LINK, { params })).data;
export const getChannelUrl = async (cmd: string) =>
  (await api.get(API_PATHS.CHANNEL_LINK, { params: { cmd } })).data;
export const getEPG = async (): Promise<
  ApiResponse<{
    timestamp: number;
    data: Record<string, EPG_List[]>;
  }>
> => await api.get(API_PATHS.EPG);

export const getExpiry = async (): Promise<{
  success: boolean;
  expiry: string | null;
}> =>
  (await api.get<{ success: boolean; expiry: string | null }>(API_PATHS.EXPIRY))
    .data;

export const uploadFile = async (
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    // Ippo clean-aa unga api pattern mapping direct fallback execute aagum! 🚀
    const response = await api.post<{ success: boolean; url?: string; error?: string }>(
      '/upload', 
      formData
    );
    
    return response.data;
  } catch (err: any) {
    console.error('File upload failed:', err);
    return { 
      success: false, 
      error: err.message || 'Upload failed' 
    };
  }
};

export interface ProgressRecord {
  userId?: number;
  mediaId: string;
  progress: number;
  completed: boolean;
  meta: Record<string, any>;
  updatedAt?: string;
}

export const getUserProgress = async (): Promise<ProgressRecord[]> => {
  const response = await api.get<ProgressRecord[]>('/user/progress');
  return response.data || [];
};

export const saveUserProgress = async (
  mediaId: string,
  progress: number,
  completed: boolean,
  meta?: Record<string, any>
): Promise<{ success: boolean }> => {
  const response = await api.put<{ success: boolean }>('/user/progress', {
    mediaId,
    progress,
    completed,
    meta,
  });
  return response.data;
};

export const deleteUserProgress = async (
  mediaId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(`/user/progress/${encodeURIComponent(mediaId)}`);
  return response.data;
};

export const clearUserProgress = async (): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>('/user/clear-history');
  return response.data;
};