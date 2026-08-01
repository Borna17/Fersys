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

      includeAssets: [
        'favicon.ico',
        'favicon-32x32.png',
        'favicon-64x64.png',
        'apple-touch-icon.png',
      ],

      manifest: {
        name: 'FERSYS',
        short_name: 'FERSYS',

        description:
          'Poslovna aplikacija za upravljanje servisnom tvrtkom.',

        theme_color: '#020617',
        background_color: '#020617',

        display: 'standalone',

        start_url: '/',
        scope: '/',

        orientation: 'portrait-primary',

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
      },

      workbox: {
        navigateFallback: '/index.html',

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff2}',
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
