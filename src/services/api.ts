export const URL_PATHS = {
  HOST: import.meta.env.VITE_API_HOST || 'http://localhost:3000',
};

export const BASE_URL = URL_PATHS.HOST === '/' ? '/api' : `${URL_PATHS.HOST}/api`;

export interface ApiResponse<T = unknown> {
  data: T;
}

interface Api {
  get<T = unknown>(
    path: string,
    config?: { params?: Record<string, unknown>; signal?: AbortSignal }
  ): Promise<ApiResponse<T>>;
  post<T = unknown>(
    path: string,
    body?: Record<string, unknown>,
    config?: { signal?: AbortSignal }
  ): Promise<ApiResponse<T>>;
  put<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    config?: { signal?: AbortSignal }
  ): Promise<ApiResponse<T>>;
  delete<T = unknown>(
    path: string,
    config?: { signal?: AbortSignal }
  ): Promise<ApiResponse<T>>;
}

export const api: Api = {
  get: async <T = unknown>(
    path: string,
    { params, signal }: { params?: Record<string, unknown>; signal?: AbortSignal } = {}
  ): Promise<ApiResponse<T>> => {
    const fullUrl = `${BASE_URL}${path}`;
    const url =
      URL_PATHS.HOST === '' || URL_PATHS.HOST === '/'
        ? new URL(fullUrl, window.location.origin)
        : new URL(fullUrl);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), { signal });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Network or API error:', error);
      throw error;
    }
  },
  post: async <T = unknown>(
    path: string,
    body: Record<string, unknown> = {},
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<ApiResponse<T>> => {
    const fullUrl = `${BASE_URL}${path}`;
    const url =
      URL_PATHS.HOST === '' || URL_PATHS.HOST === '/'
        ? new URL(fullUrl, window.location.origin)
        : new URL(fullUrl);
    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Network or API error:', error);
      throw error;
    }
  },
  put: async <T = unknown>(
    path: string,
    body: Record<string, unknown>,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<ApiResponse<T>> => {
    const fullUrl = `${BASE_URL}${path}`;
    const url =
      URL_PATHS.HOST === '' || URL_PATHS.HOST === '/'
        ? new URL(fullUrl, window.location.origin)
        : new URL(fullUrl);
    try {
      const response = await fetch(url.toString(), {
        method: 'PUT',
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Network or API error:', error);
      throw error;
    }
  },
  delete: async <T = unknown>(
    path: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<ApiResponse<T>> => {
    const fullUrl = `${BASE_URL}${path}`;
    const url =
      URL_PATHS.HOST === '' || URL_PATHS.HOST === '/'
        ? new URL(fullUrl, window.location.origin)
        : new URL(fullUrl);
    try {
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Network or API error:', error);
      throw error;
    }
  },
};

