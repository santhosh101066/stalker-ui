import { api } from './api';

export const API_PATHS = {
    MOVIES: "/v2/movies",
    SERIES: "/v2/series",
    MOVIE_LINK: "/v2/movie-link",
};

export const getMedia = async (params: Record<string, any>) => {
    const response = (await api.get(API_PATHS.MOVIES, { params })).data;
    return response?.data || [];
};

export const getSeries = async (params: Record<string, any>) => {
    const response = (await api.get(API_PATHS.SERIES, { params })).data;
    return response?.data || [];
};

export const getUrl = async (params: Record<string, any> = {}) => (await api.get(API_PATHS.MOVIE_LINK, { params })).data;
