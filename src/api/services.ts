/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MediaItem } from '../types';
import { api } from './api';

export const API_PATHS = {
  MOVIES: '/v2/movies',
  SERIES: '/v2/series',
  MOVIE_LINK: '/v2/movie-link',
  CHANNELS: '/v2/channels', // Added
  CHANNEL_LINK: '/v2/channel-link', // Added
};
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total_items: number;
}

export const getMedia = async (
  params: Record<string, any>
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get(API_PATHS.MOVIES, { params })).data;
  if (!response) {
    throw new Error('No response data received from media API.');
  }

  return response;
};
export const getSeries = async (
  params: Record<string, any>
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get(API_PATHS.SERIES, { params })).data;
  if (!response) {
    throw new Error('No response data received from series API.');
  }

  return response;
};

// Added getChannels function
export const getChannels = async (): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get(API_PATHS.CHANNELS)).data;
  if (!response || !Array.isArray(response)) {
    throw new Error('No response data received from channels API.');
  }
  // Wrap the array in a PaginatedResponse for consistency in App.tsx
  return {
    data: response,
    page: 1,
    total_items: response.length,
  };
};

// Renamed getUrl to getMovieUrl and added getChannelUrl
export const getMovieUrl = async (params: Record<string, any> = {}) =>
  (await api.get(API_PATHS.MOVIE_LINK, { params })).data;

export const getChannelUrl = async (cmd: string) =>
  (await api.get(API_PATHS.CHANNEL_LINK, { params: { cmd } })).data;
