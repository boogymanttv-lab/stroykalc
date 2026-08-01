import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['favicon.ico', 'pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Maistorix',
        short_name: 'Maistorix',
        description: 'Създавай оферти, следи проекти и клиенти — всичко на едно място.',
        theme_color: '#4f46e5',
        background_color: '#4f46e5',
        display: 'standalone',
        display_override: ['tabbed', 'window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'bg',
        dir: 'ltr',
        categories: ['business', 'productivity', 'utilities'],
        prefer_related_applications: false,
        related_applications: [
          {
            platform: 'play',
            url: 'https://play.google.com/store/apps/details?id=com.maistorix.app',
            id: 'com.maistorix.app',
          },
        ],
        iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
        launch_handler: { client_mode: 'focus-existing' },
        scope_extensions: [
          { origin: 'https://maistorix.com' },
          { origin: 'https://www.maistorix.com' },
        ],
        edge_side_panel: { preferred_width: 400 },
        note_taking: { new_note_url: '/?shortcut=calc' },
        widgets: [
          {
            name: 'Maistorix — Бърз достъп',
            description: 'Бърз достъп до проекти и калкулатор',
            tag: 'maistorix-widget',
            template: 'codepen-default',
            ms_ac_template: 'widgets/adaptive-card.json',
            data: 'widgets/data.json',
            type: 'application/json',
            screenshots: [
              {
                src: 'screenshot-mobile.png',
                sizes: '390x844',
                label: 'Maistorix Widget',
              },
            ],
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
            auth: false,
            update: 86400,
          },
        ],
        shortcuts: [
          {
            name: 'Нов проект',
            short_name: 'Нов проект',
            description: 'Отвори калкулатора за нов проект',
            url: '/?shortcut=calc',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: 'Клиенти',
            short_name: 'Клиенти',
            description: 'Виж всички клиенти',
            url: '/?shortcut=clients',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: 'Проекти',
            short_name: 'Проекти',
            description: 'Виж всички проекти',
            url: '/?shortcut=projects',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
        ],
        file_handlers: [
          {
            action: '/',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        protocol_handlers: [
          { protocol: 'web+maistorix', url: '/?proto=%s' },
        ],
        screenshots: [
          {
            src: 'screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Maistorix — Калкулатор',
          },
          {
            src: 'screenshot-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Maistorix на телефон',
          },
        ],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
})
