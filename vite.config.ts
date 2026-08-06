import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      injectRegister: false,

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
      ],

      manifest: {
        name: 'FERSYS',
        short_name: 'FERSYS',

        description:
          'Poslovna aplikacija za upravljanje kupcima, radnim nalozima, ponudama i kalendarom.',

        theme_color: '#0f172a',
        background_color: '#0f172a',

        display: 'standalone',
        orientation: 'portrait-primary',

        start_url: '/',
        scope: '/',

        lang: 'hr',
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        navigateFallback: '/index.html',

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}',
        ],

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.mode === 'navigate',

            handler: 'NetworkFirst',

            options: {
              cacheName: 'fersys-pages',

              networkTimeoutSeconds: 5,

              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          {
            urlPattern: ({ request }) =>
              request.destination === 'image',

            handler: 'CacheFirst',

            options: {
              cacheName: 'fersys-images',

              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          {
            urlPattern: ({ request }) =>
              request.destination === 'font',

            handler: 'CacheFirst',

            options: {
              cacheName: 'fersys-fonts',

              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})