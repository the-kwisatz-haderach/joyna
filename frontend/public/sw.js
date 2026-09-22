const CACHE_NAME = 'joyna-cache-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only cache same-origin, non-API GET requests - API responses are
  // per-session and shouldn't be served stale from a shared cache.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/').then((cached) => cached ?? Response.error())))
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached ?? network
    }),
  )
})

self.addEventListener('push', (event) => {
  let payload = { title: 'Joyna', body: '' }
  try {
    payload = event.data ? event.data.json() : payload
  } catch {
    // Non-JSON push payload - fall back to the default above.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Joyna', {
      body: payload.body ?? '',
      icon: '/favicon.svg',
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const existing = clientsList.find((client) => new URL(client.url).pathname === url)
      if (existing) {
        return existing.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
