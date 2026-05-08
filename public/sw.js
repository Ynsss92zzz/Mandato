// Mandato Service Worker — PWA offline cache + Web Push notifications

const CACHE_NAME = 'mandato-v1'
const OFFLINE_URLS = ['/dashboard', '/leads', '/conversations', '/appointments']

// Install: pre-cache shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => {})
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first with offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r ?? caches.match('/dashboard'))
    )
  )
})

// Push: show notification
self.addEventListener('push', (event) => {
  let data = { title: 'Mandato', body: 'Vous avez une nouvelle notification', url: '/dashboard' }
  try {
    data = { ...data, ...event.data?.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'mandato-notification',
      renotify: true,
      data: { url: data.url },
    })
  )
})

// Notification click: open the app at the right URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return clients.openWindow(url)
      })
  )
})
