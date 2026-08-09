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
        'favicon-32x32.png',
        'favicon-64x64.png',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],

      manifest: {
        name: 'FERSYS',
        short_name: 'FERSYS',

        description:
          'Poslovna aplikacija za upravljanje investitorima, radnim nalozima, ponudama, računima, skladištem, zaposlenicima i kalendarom.',

        id: '/',
        start_url: '/',
        scope: '/',

        lang: 'hr',

        theme_color: '#020617',
        background_color: '#020617',

        display: 'standalone',
        display_override: [
          'window-controls-overlay',
          'standalone',
          'minimal-ui',
        ],

        orientation: 'any',

        categories: [
          'business',
          'productivity',
          'utilities',
        ],

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        shortcuts: [
          {
            name: 'Novi radni nalog',
            short_name: 'Novi nalog',
            url: '/work-orders/new',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Nova ponuda',
            short_name: 'Ponuda',
            url: '/offers/new',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Novi račun',
            short_name: 'Račun',
            url: '/invoices/new',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },

      workbox: {
        maximumFileSizeToCacheInBytes:
          5 * 1024 * 1024,

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
                maxAgeSeconds:
                  60 * 60 * 24 * 7,
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
                maxAgeSeconds:
                  60 * 60 * 24 * 30,
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
                maxAgeSeconds:
                  60 * 60 * 24 * 365,
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
