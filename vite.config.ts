import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // App-oda UI files (js, css, html, images) mattum cache pannu
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // API & Media paths-a service worker bypass pannida sollurom
        navigateFallbackDenylist: [/^\/api/, /^\/proxy/, /^\/live\.m3u8/, /^\/player/],
        runtimeCaching: [
          {
            // Strict Network Only for everything except UI assets
            urlPattern: ({ url }) => {
              return (
                url.pathname.startsWith('/api') ||
                url.pathname.startsWith('/proxy') ||
                url.pathname.startsWith('/player') ||
                url.pathname.includes('.m3u8') ||
                url.pathname.includes('.ts') ||
                url.pathname.includes('.mp4') // Added mp4 safety
              );
            },
            handler: 'NetworkOnly', 
          },
          {
            // For other assets, use NetworkFirst so it always checks for new versions
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 0,
                maxAgeSeconds: 0,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Stalker VOD',
        short_name: 'Stalker',
        start_url: '.',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2015',
  },
  base: './',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/live.m3u8': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/player': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});