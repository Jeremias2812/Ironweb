
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple cache-first for GET navigations
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.open('iron-mvp-v1').then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      const resp = await fetch(req);
      cache.put(req, resp.clone());
      return resp;
    })
  );
});
