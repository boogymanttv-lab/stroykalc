import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ExpirationPlugin } from 'workbox-expiration'

cleanupOutdatedCaches()

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST)

// Background Sync plugin for failed requests
const bgSyncPlugin = new BackgroundSyncPlugin('maistorix-sync-queue', {
  maxRetentionTime: 24 * 60, // 24 hours
})

// Supabase API — NetworkFirst + BackgroundSync
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
  })
)

// Static assets — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({ cacheName: 'images-cache' })
)

// Periodic Background Sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'maistorix-refresh') {
    event.waitUntil(async function () {
      // Notify clients to refresh data
      const clients = await self.clients.matchAll()
      clients.forEach(client => client.postMessage({ type: 'PERIODIC_SYNC' }))
    }())
  }
})

// Push Notifications
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Maistorix', {
      body: data.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: data,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('https://maistorix.com')
  )
})

// Skip waiting
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
