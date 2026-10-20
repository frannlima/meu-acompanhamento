const CACHE="meu-acompanhamento-v172-cockpit-vendas";
const ASSETS=[
  "./flash-detail-core-v1.js?v=1",
  "./flash-details-v1.js?v=1",
  "./flash-core-v1.js?v=2",
  "./flash-pilot-v1.js?v=5",
  "./ma2-simple-v1.css?v=7",
  "./ma2-simple-v1.js?v=6",
  "./ma3-faithful-v1.css?v=3",
  "./ma3-faithful-v1.js?v=3",
  "./cockpit-vendas-v1.css?v=1",
  "./cockpit-vendas-v1.js?v=1",
  "./brand-sharecards-2025.js?v=3",
  "./brand-riachuelo-2025.css?v=3",
  "./layout-balance-v1.css?v=1",
  "./campaign-scene-v1.css?v=3",
  "./sidebar-brand-v1.css?v=1",
  "./cards-visible-preview-v1.css?v=1",
  "./campaign-music-v1.js?v=1",
  "./home-campaign-v1.css?v=2",
  "./home-campaign-v1.js?v=5",
  "./estore-operations-v3.css?v=1",
  "./estore-operations-v3.js?v=1",
  "./decision-guide-v1.css?v=1",
  "./decision-guide-v1.js?v=41",
  "./assets/olhares-brasileiros-transicao.mp4",
  "./assets/olhares-brasileiros-1.webp",
  "./assets/olhares-brasileiros-2.webp",
  "./assets/olhares-brasileiros-3.webp",
  "./",
  "./index.html",
  "./pwa-install-assistant-v1.js?v=3",
  "./pwa-install-assistant-v1.css?v=2",
  "./ria-guided-support-v5.js?v=2",
  "./ria-experience-v2.css?v=2",
  "./ria-float-safe-v5.js?v=2",
  "./styles.css?v=9",
  "./enhancements-v9.css?v=10",
  "./premium-v22.css?v=8",
  "./estore-live-v1.css?v=1",
  "./estore-integrated-v2.css?v=1",
  "./clarity-v1.css?v=5",
  "./mobile-experience-v1.css?v=4",
  "./responsive-device-v1.css?v=2",
  "./execution-v1.css?v=9",
  "./adaptive-header-v2.css?v=24",
  "./app.js?v=33",
  "./enhancements-v9.js?v=14",
  "./premium-v22.js?v=12",
  "./clarity-v1.js?v=47",
  "./mobile-experience-v1.js?v=41",
  "./responsive-device-v1.js?v=1",
  "./execution-v1.js?v=6",
  "./adaptive-header-v2.js?v=43",
  "./estore-integrated-v2.js?v=3",
  "./gg-worlds-v1.css?v=2",
  "./gg-worlds-v1.js?v=6",
  "./gg-official-performance-v2.js?v=3",
  "./gg-target-import-v1.js?v=2",
  "./late-partial-alert-v1.css?v=2",
  "./late-partial-alert-v1.js?v=2",
  "./daily-evolution-v1.css?v=5",
  "./daily-evolution-v1.js?v=4",
  "./operational-review-v32.css?v=44",
  "./operational-charts-v32.js?v=43",
  "./operational-sharing-v32.js?v=41",
  "./manifest.webmanifest",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/riachuelo-logo-vertical.svg",
  "./assets/riachuelo-logo.svg",
  "./assets/ria-logo-approved.svg",
  "./assets/ria-signature-horizontal.svg",
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
// Uma mídia indisponível não deve impedir a instalação do PWA inteiro.
self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(async url=>{
      const response=await fetch(url,{cache:"reload"});
      if(response.ok)await cache.put(url,response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("meu-acompanhamento-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
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

