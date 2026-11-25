/* NOVA service worker: network-first للصفحات (عشان التحديثات توصل فورًا)، cache-first للأصول الثابتة.
   طلبات الـ AI دايمًا نت مباشرة. */

const CACHE = 'nova-v15';
const SHELL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png', './fonts/cairo.css'];

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
    if (url.origin !== self.location.origin) return; // AI API: network only

    /* الصفحات (index.html والتنقل): الشبكة أولًا عشان أي تحديث يظهر فورًا، والكاش fallback أوفلاين */
    if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
        event.respondWith(
            fetch(event.request).then((res) => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
                }
                return res;
            }).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./'))),
        );
        return;
    }

    /* الأصول الثابتة (js/css/خطوط/أيقونات): الكاش أولًا مع تحديث خلفي */
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
