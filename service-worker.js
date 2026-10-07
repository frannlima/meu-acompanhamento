const CACHE="meu-acompanhamento-v10";
const ASSETS=[
  "./",
  "./index.html",
  "./styles.css?v=9",
  "./enhancements-v9.css?v=2",
  "./app.js?v=10",
  "./enhancements-v9.js?v=2",
  "./manifest.webmanifest",
  "./assets/riachuelo-logo-vertical.svg"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==self.location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});