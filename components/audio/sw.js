const CACHE_NAME = 'audio-cache-v1';

self.addEventListener('fetch', event => {
  if (event.request.url.endsWith('.mp3')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
