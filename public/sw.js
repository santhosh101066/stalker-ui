const CACHE_NAME = 'stalker-vod-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/stalker-icon.svg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // For HTML navigation requests, use Network First, falling back to cache.
    // This ensures users always get the latest version if they have an internet connection.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // If the user is offline, serve the HTML from cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For other assets (JS, CSS, images), use Stale-While-Revalidate.
    // It returns the cached version instantly, but updates the cache in the background.
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                const networkFetch = fetch(event.request).then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        if (response.status === 200) {
                            cache.put(event.request, responseClone);
                        }
                    });
                    return response;
                }).catch(() => {
                    // Ignore network errors for background updates
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || networkFetch;
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
