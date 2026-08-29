/* A.R.I. service worker — app shell, cache-first, relative to its scope */
const CACHE = 'ari-v111';
const BASE = new URL('./', self.location.href).pathname;
const SHELL = [
  BASE,
  BASE + 'index.html',
  BASE + 'ari-v108.js',
  BASE + 'manifest.webmanifest',
  BASE + 'apple-touch-icon.png',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'icon-maskable-192.png',
  BASE + 'icon-maskable-512.png',
  BASE + 'favicon-32.png',
  BASE + 'favicon-16.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const PREPAINT = `<style id="ari-prepaint">
#stage{cursor:default!important}
#gAri,#trackname,header h1 a[href*="github.com"]{cursor:pointer!important}
body:not(.ari-v108-ready) #devPanel{visibility:hidden!important;opacity:0!important;transition:none!important}
</style>`;

async function cachedOrNetwork(request) {
  const hit = await caches.match(request);
  if (hit) return hit;

  const res = await fetch(request);
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
  return res;
}

async function navigationResponse(request) {
  const res = await cachedOrNetwork(request);
  if (!res) return res;

  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  let html = await res.text();
  if (!html.includes('id="ari-prepaint"')) {
    html = html.replace('</head>', `${PREPAINT}</head>`);
  }

  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');

  return new Response(html, {
    status: res.status,
    statusText: res.statusText,
    headers
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(navigationResponse(e.request).catch(() => fetch(e.request)));
    return;
  }

  e.respondWith(
    cachedOrNetwork(e.request).catch(() => caches.match(e.request))
  );
});
