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
        '/firebase-messaging-sw.js',
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

        importScripts: [
          '/firebase-messaging-sw.js',
        ],

        navigateFallback:
          '/index.html',

        /*
         * HTML/CSS i statičke slike možemo precacheati, ali route JS chunkove
         * namjerno ne precacheamo. Nakon deploya mobilni PWA mora uvijek moći
         * dohvatiti aktualni hash modula.
         */
        globPatterns: [
          '**/*.{html,css,ico,png,svg,webp,woff,woff2}',
        ],

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.mode === 'navigate',

            /*
             * NetworkFirst je važan za PWA: novi index.html prvo dolazi s
             * mreže, a cache je samo offline fallback. StaleWhileRevalidate
             * je mogao vratiti stari index koji referencira obrisane chunkove.
             */
            handler: 'NetworkFirst',

            options: {
              cacheName:
                'fersys-pages-v4',
              networkTimeoutSeconds: 5,

              expiration: {
                maxEntries: 30,
                maxAgeSeconds:
                  60 * 60 * 24,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'worker',

            /*
             * Vite asseti imaju hash u imenu. CacheFirst je siguran za isti
             * hash i, za razliku od StaleWhileRevalidate, ne može vratiti
             * zastarjeli odgovor za aktualni zahtjev. Nova verzija ima novi
             * URL/hash pa se automatski preuzima.
             */
            handler: 'CacheFirst',

            options: {
              cacheName:
                'fersys-js-v4',

              expiration: {
                maxEntries: 160,
                maxAgeSeconds:
                  60 * 60 * 24 * 14,
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
              cacheName:
                'fersys-images-v4',

              expiration: {
                maxEntries: 120,
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
              cacheName:
                'fersys-fonts-v4',

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

  build: {
    chunkSizeWarningLimit: 500,

    rolldownOptions: {
      checks: {
        ineffectiveDynamicImport:
          false,
      },

      output: {
        codeSplitting: {
          groups: [
            {
              name:
                'react-core',
              test:
                /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              priority: 120,
            },

            {
              name:
                'supabase',
              test:
                /node_modules[\\/]@supabase[\\/]/,
              priority: 110,
            },

            {
              name:
                'jspdf',
              test:
                /node_modules[\\/]jspdf[\\/]/,
              priority: 100,
              maxSize:
                240 * 1024,
            },

            {
              name:
                'html2canvas',
              test:
                /node_modules[\\/]html2canvas[\\/]/,
              priority: 100,
              maxSize:
                240 * 1024,
            },

            {
              name:
                'xlsx',
              test:
                /node_modules[\\/]xlsx[\\/]/,
              priority: 100,
              maxSize:
                240 * 1024,
            },
          ],
        },
      },
    },
  },
})
