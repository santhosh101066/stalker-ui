export const URL_PATHS = {
    HOST: import.meta.env.DEV ? 'http://localhost:3000' : ''
};

export const BASE_URL = `${URL_PATHS.HOST}/api`;

interface ApiResponse<T = any> {
    data: T;
}

interface Api {
    get<T = any>(path: string, config?: { params?: Record<string, any> }): Promise<ApiResponse<T>>;
    post<T = any>(path: string, body: Record<string, any>): Promise<ApiResponse<T>>;
}

export const api: Api = {
    get: async <T = any>(path: string, { params }: { params?: Record<string, any> } = {}): Promise<ApiResponse<T>> => {
        const fullUrl = `${BASE_URL}${path}`;
        const url = URL_PATHS.HOST === '' ? new URL(fullUrl, window.location.origin) : new URL(fullUrl);
        if (params) {
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.append(key, params[key]);
                }
            });
        }

        try {
            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            console.error("Network or API error:", error);
            throw error;
        }
    },
    post: async <T = any>(path: string, body: Record<string, any>): Promise<ApiResponse<T>> => {
        const fullUrl = `${BASE_URL}${path}`;
        const url = URL_PATHS.HOST === '' ? new URL(fullUrl, window.location.origin) : new URL(fullUrl);
        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            console.error("Network or API error:", error);
            throw error;
        }
    }
};
