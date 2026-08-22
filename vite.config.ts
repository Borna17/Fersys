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
         * V3:
         * Ne precacheamo sve lazy JS module.
         * Time prvi PWA install/deploy ne povlači cijelu aplikaciju.
         *
         * JS se sprema kroz runtime cache tek kada je modul
         * stvarno potreban korisniku.
         */
        globPatterns: [
          '**/*.{html,css,ico,png,svg,webp,woff,woff2}',
        ],

        runtimeCaching: [
          {
            urlPattern: ({
              request,
            }) =>
              request.mode ===
              'navigate',

            handler:
              'StaleWhileRevalidate',

            options: {
              cacheName:
                'fersys-pages-v3',

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
                'script' ||
              request.destination ===
                'worker',

            /*
             * Chunk se preuzme samo prvi put kada ga ruta/funkcija
             * stvarno zatraži. Sljedeći put dolazi iz cachea.
             */
            handler:
              'StaleWhileRevalidate',

            options: {
              cacheName:
                'fersys-js-v3',

              expiration: {
                maxEntries: 160,
                maxAgeSeconds:
                  60 *
                  60 *
                  24 *
                  14,
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
                'fersys-images-v3',

              expiration: {
                maxEntries: 120,
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
                'fersys-fonts-v3',

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
    /*
     * Ostavimo stvarni prag na 500 KB.
     * Ako ponovno nastane veliki chunk, želimo ga vidjeti.
     */
    chunkSizeWarningLimit: 500,

    rolldownOptions: {
      /*
       * Ova dva slučaja u AI engineu su već provjerena:
       * modul je namjerno statički korišten i na drugim mjestima,
       * pa dynamic import ne može stvoriti zaseban chunk.
       *
       * Ne isključujemo nikakva upozorenja o veličini bundlea.
       */
      checks: {
        ineffectiveDynamicImport:
          false,
      },

      output: {
        /*
         * V3:
         * NEMA više catch-all "vendor" grupe.
         *
         * Ona je povezivala velik broj lazy routeova u jedan
         * golemi zajednički chunk. Sada Rolldown sam zadržava
         * application-level code splitting, a mi ručno izdvajamo
         * samo stvarno velike i stabilne third-party biblioteke.
         */
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
                'firebase',
              test:
                /node_modules[\\/](firebase|@firebase)[\\/]/,
              priority: 110,
              maxSize:
                240 * 1024,
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
                'pdf-support',
              test:
                /node_modules[\\/](canvg|dompurify|fflate)[\\/]/,
              priority: 95,
              maxSize:
                220 * 1024,
            },

            {
              name:
                'excel-tools',
              test:
                /node_modules[\\/]xlsx[\\/]/,
              priority: 95,
              maxSize:
                260 * 1024,
            },

            {
              name:
                'qr-tools',
              test:
                /node_modules[\\/]qrcode[\\/]/,
              priority: 90,
            },

            {
              name:
                'icons',
              test:
                /node_modules[\\/]lucide-react[\\/]/,
              priority: 80,
              maxSize:
                180 * 1024,
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
