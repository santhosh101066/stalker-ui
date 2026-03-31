import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        navigateFallbackDenylist: [
          /^\/api/,
          /^\/proxy/,
          /^\/live\.m3u8/,
          /^\/player/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              return (
                url.pathname.startsWith('/api') ||
                url.pathname.startsWith('/proxy') ||
                url.pathname.startsWith('/player') ||
                url.pathname.includes('.m3u8') ||
                url.pathname.includes('.ts') ||
                url.pathname.includes('.mp4')
              );
            },
            handler: 'NetworkOnly',
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
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
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
