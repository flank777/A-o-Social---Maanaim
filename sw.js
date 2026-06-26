/*
  DoaVida — sw.js
  Service Worker: habilita instalação do site como app no celular
  (PWA) e dá acesso offline ao "casco" do site (HTML/CSS/JS/ícones).

  Estratégia:
  - Navegação (HTML): network-first com fallback em cache (sempre
    busca a versão mais nova; se estiver offline, mostra a última
    versão salva).
  - Estáticos (CSS/JS/img do próprio site): stale-while-revalidate
    (responde rápido com o cache, atualiza em segundo plano).
  - Tudo que não é GET, ou que é de outra origem (Supabase, CDNs,
    fontes), nunca é interceptado — passa direto para a rede.
  - Área administrativa (admin.html, dashboard.html e seus JS/CSS):
    nunca é cacheada. Não precisa funcionar offline, e cachear gerava
    o bug de continuar mostrando a versão antiga do admin depois de
    cada deploy, mesmo trocando o CACHE_NAME.
*/
const CACHE_NAME = "doavida-v6";

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "css/global.css",
  "css/carousel.css",
  "js/app.js",
  "js/api.js",
  "img/icons/icon-192.png",
  "img/icons/icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (nomes) {
        return Promise.all(
          nomes
            .filter(function (nome) {
              return nome !== CACHE_NAME;
            })
            .map(function (nome) {
              return caches.delete(nome);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;

  /* Nunca intercepta POST/PUT (formulários) nem requisições de outra origem
     (Supabase, Google Fonts, Font Awesome CDN, backend da Dona Assunção) */
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Área administrativa: sempre direto pra rede, nunca cacheada. */
  if (/\/(admin|dashboard)/i.test(url.pathname)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copia = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, copia);
          });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || caches.match("index.html");
          });
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      var emRede = fetch(req)
        .then(function (res) {
          if (res && res.status === 200) {
            var copia = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, copia);
            });
          }
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || emRede;
    }),
  );
});
