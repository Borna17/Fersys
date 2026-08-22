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

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}',
        ],

        runtimeCaching: [
          {
            urlPattern: ({
              request,
            }) =>
              request.mode ===
              'navigate',

            /*
             * Instant PWA shell:
             * prvo koristi lokalni cache, a novu verziju
             * provjerava u pozadini.
             */
            handler:
              'StaleWhileRevalidate',

            options: {
              cacheName:
                'fersys-pages-v2',

              expiration: {
                maxEntries: 30,
                maxAgeSeconds:
                  60 *
                  60 *
                  24 *
                  3,
              },

              cacheableResponse: {
                statuses: [
                  0,
                  200,
                ],
              },
            },
          },

          {
            urlPattern: ({
              request,
            }) =>
              request.destination ===
              'image',

            handler:
              'CacheFirst',

            options: {
              cacheName:
                'fersys-images',

              expiration: {
                maxEntries: 100,
                maxAgeSeconds:
                  60 *
                  60 *
                  24 *
                  30,
              },

              cacheableResponse: {
                statuses: [
                  0,
                  200,
                ],
              },
            },
          },

          {
            urlPattern: ({
              request,
            }) =>
              request.destination ===
              'font',

            handler:
              'CacheFirst',

            options: {
              cacheName:
                'fersys-fonts',

              expiration: {
                maxEntries: 30,
                maxAgeSeconds:
                  60 *
                  60 *
                  24 *
                  365,
              },

              cacheableResponse: {
                statuses: [
                  0,
                  200,
                ],
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-core',
              test:
                /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              priority: 100,
            },
            {
              name: 'supabase',
              test:
                /node_modules[\\/](@supabase)[\\/]/,
              priority: 90,
            },
            {
              name: 'firebase',
              test:
                /node_modules[\\/](firebase|@firebase)[\\/]/,
              priority: 90,
            },
            {
              name: 'jspdf',
              test:
                /node_modules[\\/]jspdf[\\/]/,
              priority: 85,
            },
            {
              name: 'html2canvas',
              test:
                /node_modules[\\/]html2canvas[\\/]/,
              priority: 85,
            },
            {
              name: 'pdf-support',
              test:
                /node_modules[\\/](canvg|dompurify|fflate)[\\/]/,
              priority: 80,
              maxSize:
                220 * 1024,
            },
            {
              name: 'excel-tools',
              test:
                /node_modules[\\/]xlsx[\\/]/,
              priority: 80,
            },
            {
              name: 'icons',
              test:
                /node_modules[\\/]lucide-react[\\/]/,
              priority: 70,
            },
            {
              name: 'qr-tools',
              test:
                /node_modules[\\/]qrcode[\\/]/,
              priority: 70,
            },
            {
              name: 'vendor',
              test:
                /node_modules[\\/]/,
              entriesAware: true,
              entriesAwareMergeThreshold:
                20 * 1024,
              maxSize:
                220 * 1024,
              priority: 10,
            },
          ],
        },
      },
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
