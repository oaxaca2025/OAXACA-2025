const CACHE_NAME = 'planner-stable-v4b';
const ASSETS = ['./','./index.html','./planner.html','./style.css','./viewer.css','./viewer.js','./attachments-indexeddb.js','./script.js','./manifest.json'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); });
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))); });
