import type { MediaItem } from '../types';
import { api } from './api';

export const API_PATHS = {
    MOVIES: "/v2/movies",
    SERIES: "/v2/series",
    MOVIE_LINK: "/v2/movie-link",
};
export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    total_items: number;
    // Add any other properties you might need from the response
}

export const getMedia = async (params: Record<string, any>): Promise<PaginatedResponse<MediaItem>> => {
   const response = (await api.get(API_PATHS.MOVIES, { params })).data;
    
    if (!response) {
        throw new Error("No response data received from media API.");
    }
    
    return response;
};

export const getSeries = async (params: Record<string, any>): Promise<PaginatedResponse<MediaItem>> => {
    const response = (await api.get(API_PATHS.SERIES, { params })).data;
    
    if (!response) {
        throw new Error("No response data received from series API.");
    }

    return response;
};

export const getUrl = async (params: Record<string, any> = {}) => (await api.get(API_PATHS.MOVIE_LINK, { params })).data;
