/* Cache versionado no deploy; nunca bloquear a ativacao com video ou arquivos grandes. */
const CACHE = "meu-acompanhamento-__BUILD_ID__";
const OFFLINE_SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./assets/app-icon-192.png",
  "./assets/riachuelo-logo.svg"
];
const APP_SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(OFFLINE_SHELL.map(async path => {
      const response = await fetch(new Request(path, {cache:"no-store"}));
      if(response.ok) await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith("meu-acompanhamento-") && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE)) return;

  // A navegacao deve buscar sempre o HTML mais recente, inclusive no PWA instalado.
  // Cache somente como contingencia quando o usuario estiver sem conexao.
  if(request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, {cache:"no-store"});
        if(response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {}));
        }
        return response;
      } catch (_) {
        return (await caches.match("./index.html", {ignoreSearch:true})) || Response.error();
      }
    })());
    return;
  }

  // Evita JS/CSS de releases anteriores mesmo quando a URL original nao mudou.
  // Imagens e video seguem o cache HTTP normal e nao atrasam o ciclo do PWA.
  if(/\.(?:js|css|webmanifest|json)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, {cache:"no-store"});
        if(response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {}));
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    for(const client of all) {
      if("focus" in client) {
        await client.focus();
        return;
      }
    }
    if(self.clients.openWindow) await self.clients.openWindow("./");
  })());
});
