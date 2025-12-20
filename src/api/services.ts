/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EPG_List, MediaItem, ChannelGroup } from '../types';
import { api, type ApiResponse } from './api';

export const API_PATHS = {
  MOVIES: '/v2/movies',
  SERIES: '/v2/series',
  MOVIE_LINK: '/v2/movie-link',
  CHANNELS: '/v2/channels', // Added
  CHANNEL_LINK: '/v2/channel-link', // Added
  EPG: '/v2/epg',
  CHANNEL_GROUPS: '/v2/groups',
  EXPIRY: '/v2/expiry',
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
  const response = (await api.get(API_PATHS.MOVIES, { params, signal })).data;
  if (!response) {
    throw new Error('No response data received from media API.');
  }

  return response;
};
export const getSeries = async (
  params: Record<string, any>,
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get(API_PATHS.SERIES, { params, signal })).data;
  if (!response) {
    throw new Error('No response data received from series API.');
  }

  return response;
};
// Added getChannels function
export const getChannels = async (signal?: AbortSignal): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get(API_PATHS.CHANNELS, { signal })).data;
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

export const getChannelGroups = async (all: boolean = false, signal?: AbortSignal): Promise<PaginatedResponse<ChannelGroup>> => {
  const params: Record<string, any> = {};
  if (all) {
    params.all = 'true';
  }

  const response = (await api.get(API_PATHS.CHANNEL_GROUPS, { params, signal })).data;
  if (!response || !Array.isArray(response)) {
    throw new Error('No response data received from channel groups API.');
  }
  // Wrap the array in a PaginatedResponse for consistency
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
export const getEPG = async (): Promise<ApiResponse<{
  timestamp: number;
  data: Record<string, EPG_List[]>;
}>> => await api.get(API_PATHS.EPG);

export const getExpiry = async (): Promise<{ success: boolean; expiry: string | null }> =>
  (await api.get(API_PATHS.EXPIRY)).data;