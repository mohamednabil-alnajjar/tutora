/* ذاكرلي service worker: cache-first app shell; AI API calls always go to the network. */

const CACHE = 'nova-v10';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './fonts/cairo.css'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return; // AI API and fonts: network only
    event.respondWith(
        caches.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
            if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            }
            return res;
        })),
    );
});
