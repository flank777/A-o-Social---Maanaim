/*
  DoaVida — js/services/cloudflare-r2.js
  Upload e gestão de mídia via Cloudflare R2 (via Worker proxy)

  CONFIGURAÇÃO:
  1. Faça deploy do Worker: cd worker && wrangler deploy
  2. Copie o URL do Worker (ex: https://doavida-media.SEU_USUARIO.workers.dev)
  3. Substitua WORKER_URL abaixo pelo URL real
  4. Configure o token: wrangler secret put UPLOAD_TOKEN
  5. Cole o mesmo token em UPLOAD_TOKEN abaixo

  PASTAS padrão no bucket R2:
    galeria/     — imagens e vídeos da galeria pública
    alimentos/   — fotos dos itens de doação
    banners/     — imagens de banner do site
    voluntarios/ — fotos dos voluntários
    media/       — uploads genéricos
*/

var DoaVidaR2 = (function () {

  /* ─── Configure aqui após o deploy ────────────────────────────────────── */
  var WORKER_URL   = "https://doavida-media.SEU_USUARIO.workers.dev";
  var UPLOAD_TOKEN = "";
  /* ──────────────────────────────────────────────────────────────────────── */

  function extraHeaders() {
    var h = {};
    if (UPLOAD_TOKEN) h["X-Upload-Token"] = UPLOAD_TOKEN;
    return h;
  }

  function isConfigured() {
    return WORKER_URL.indexOf("SEU_USUARIO") < 0 && WORKER_URL.length > 10;
  }

  return {

    /* Permite configurar em runtime (ex: a partir de configurações do Firebase) */
    configure: function (opts) {
      if (opts && opts.workerUrl)  WORKER_URL   = String(opts.workerUrl).replace(/\/$/, "");
      if (opts && opts.token != null) UPLOAD_TOKEN = String(opts.token);
    },

    /* true se o Worker está com URL real configurado */
    configurado: isConfigured,

    /* URL do Worker (leitura) */
    get workerUrl() { return WORKER_URL; },

    /*
      Upload de um File para o R2.
      @param {File}   arquivo  — objeto File do browser
      @param {string} pasta    — subpasta no bucket (ex: "galeria", "alimentos")
      @returns Promise<{ url, key, tipo, size, name }>
    */
    upload: function (arquivo, pasta) {
      if (!isConfigured()) {
        return Promise.reject(new Error(
          "Cloudflare R2 não configurado. Defina WORKER_URL em js/services/cloudflare-r2.js."
        ));
      }
      pasta = pasta || "media";
      var fd = new FormData();
      fd.append("file", arquivo);
      fd.append("folder", pasta);
      return fetch(WORKER_URL + "/upload", {
        method: "POST",
        headers: extraHeaders(),
        body: fd,
      }).then(function (resp) {
        if (!resp.ok) {
          return resp.json().then(function (e) {
            throw new Error(e.error || ("Falha no upload R2: " + resp.status));
          });
        }
        return resp.json();
      });
    },

    /*
      Remove um objeto do R2 pela chave.
      @param {string} key — chave R2 (ex: "galeria/1234567890-foto.jpg")
      @returns Promise<{ ok, key }>
    */
    delete: function (key) {
      if (!isConfigured()) return Promise.resolve({ ok: false, error: "R2 não configurado." });
      return fetch(WORKER_URL + "/delete?key=" + encodeURIComponent(key), {
        method: "DELETE",
        headers: extraHeaders(),
      }).then(function (resp) { return resp.json(); });
    },

    /*
      Lista objetos de uma pasta no bucket.
      @param {string} pasta  — prefixo da pasta (ex: "galeria")
      @param {number} limite — máximo de itens (padrão 50)
      @returns Promise<{ items: [{key, url, size, uploaded}], truncated }>
    */
    listar: function (pasta, limite) {
      if (!isConfigured()) return Promise.resolve({ items: [], truncated: false });
      var qs = "?folder=" + encodeURIComponent(pasta || "") + "&limit=" + (limite || 50);
      return fetch(WORKER_URL + "/list" + qs, {
        method: "GET",
        headers: extraHeaders(),
      }).then(function (resp) { return resp.json(); });
    },

    /*
      Constrói URL pública a partir de uma chave R2.
      Útil quando a chave está salva no Firestore mas a URL pública mudou.
    */
    urlPublica: function (key, publicUrlBase) {
      var base = (publicUrlBase || WORKER_URL).replace(/\/$/, "");
      return base + "/" + key;
    },
  };
})();

window.DoaVidaR2 = DoaVidaR2;
