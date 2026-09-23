// Service worker del visor de especies.
// Guarda la página para que abra sin conexión y conserva las imágenes
// del mapa que ya se han visto o descargado con el botón de guardar zona.

const APP = "visor-v1";
const MAPAS = "mapas-v1";
const BASICOS = ["./", "index.html", "manifest.json", "icono-180.png", "icono-512.png"];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(APP)
      .then(c => Promise.allSettled(BASICOS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== APP && k !== MAPAS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const esTesela = url =>
  /(^|\.)ign\.es$/.test(url.hostname) || /tile\.openstreetmap\.org$/.test(url.hostname);

self.addEventListener("fetch", ev => {
  if (ev.request.method !== "GET") return;
  const url = new URL(ev.request.url);

  // Imágenes del mapa: primero lo guardado, y si no hay, la red (y se guarda).
  if (esTesela(url)){
    ev.respondWith(
      caches.open(MAPAS).then(c =>
        c.match(ev.request).then(guardada =>
          guardada || fetch(ev.request).then(res => {
            if (res && (res.ok || res.type === "opaque")) c.put(ev.request, res.clone());
            return res;
          })
        )
      ).catch(() => Response.error())
    );
    return;
  }

  // La propia página: red si la hay, y si no, la copia guardada.
  if (url.origin === location.origin){
    ev.respondWith(
      fetch(ev.request)
        .then(res => {
          const copia = res.clone();
          caches.open(APP).then(c => c.put(ev.request, copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(ev.request).then(r => r || caches.match("index.html")))
    );
  }
});
