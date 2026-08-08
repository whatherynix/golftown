// Self-cleaning Service Worker to resolve PWA Cache Poisoning and stale React assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[ServiceWorker] Deleting cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Unregistering self...');
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        if (client.url) {
          console.log('[ServiceWorker] Reloading client:', client.url);
          client.navigate(client.url);
        }
      });
    })
  );
});

// Pass-through for any remaining fetch events during unregistration
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
