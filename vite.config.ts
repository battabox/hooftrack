import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app at https://<user>.github.io/<REPO-NAME>/
// If you name the GitHub repo differently, change this (keep both slashes).
const BASE = '/hooftrack/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'HoofTrack',
        short_name: 'HoofTrack',
        description: 'Hoof trimming records and recheck reminders',
        theme_color: '#14532d',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        id: BASE,
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
  test: { environment: 'node' },
});
