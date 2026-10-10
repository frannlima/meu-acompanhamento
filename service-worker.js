const CACHE="meu-acompanhamento-v65";
const ASSETS=[
  "./",
  "./index.html",
  "./styles.css?v=9",
  "./enhancements-v9.css?v=10",
  "./premium-v22.css?v=6",
  "./clarity-v1.css?v=4",
  "./mobile-experience-v1.css?v=2",
  "./responsive-device-v1.css?v=1",
  "./execution-v1.css?v=8",
  "./adaptive-header-v2.css?v=14",
  "./app.js?v=25",
  "./enhancements-v9.js?v=8",
  "./premium-v22.js?v=9",
  "./clarity-v1.js?v=19",
  "./mobile-experience-v1.js?v=3",
  "./responsive-device-v1.js?v=1",
  "./execution-v1.js?v=4",
  "./adaptive-header-v2.js?v=10",
  "./manifest.webmanifest",
  "./assets/riachuelo-logo-vertical.svg",
  "./assets/riachuelo-logo.svg",
  "./assets/ria-logo-approved.svg",
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

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const all=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of all){
      if("focus" in client){
        // Reaproveitar a tela aberta: navigate("./") recarregava o PWA e
        // descartava a aba em que o usuário estava trabalhando.
        await client.focus();
        return;
      }
    }
    if(self.clients.openWindow) await self.clients.openWindow("./");
  })());
});
