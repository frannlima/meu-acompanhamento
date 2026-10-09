const CACHE="meu-acompanhamento-v41";
const ASSETS=[
  "./",
  "./index.html",
  "./styles.css?v=9",
  "./enhancements-v9.css?v=10",
  "./premium-v22.css?v=6",
  "./clarity-v1.css?v=3",
  "./mobile-experience-v1.css?v=1",
  "./responsive-device-v1.css?v=1",
  "./execution-v1.css?v=2",
  "./app.js?v=18",
  "./enhancements-v9.js?v=7",
  "./premium-v22.js?v=8",
  "./clarity-v1.js?v=8",
  "./mobile-experience-v1.js?v=1",
  "./responsive-device-v1.js?v=1",
  "./execution-v1.js?v=2",
  "./manifest.webmanifest",
  "./assets/riachuelo-logo-vertical.svg",
  "./assets/riachuelo-logo.svg",
  "./assets/esquadrao-cliente.svg",
  "./assets/profiles/roberta-paiva.jpg",
  "./assets/profiles/camila-barros.jpg",
  "./assets/profiles/bianca-rodrigues.jpg",
  "./assets/profiles/gabi-castro.jpg",
  "./assets/profiles/gabriela.jpg",
  "./assets/profiles/josy-rodrigues.jpg",
  "./assets/profiles/lennon-batista.jpg",
  "./assets/profiles/mariane-nogueira.jpg"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==self.location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});