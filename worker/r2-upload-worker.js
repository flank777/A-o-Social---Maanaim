/*
  DoaVida — Cloudflare Worker para upload de mídia no R2
  Deploy: wrangler deploy (ver wrangler.toml)

  Endpoints:
    POST /upload        { file: File, folder?: string }  → { url, key, tipo, size, name }
    DELETE /delete?key= <chave R2>                       → { ok, key }
    GET /               health check                     → { ok, service }

  Variáveis de ambiente (wrangler.toml / secrets):
    R2_BUCKET   — binding do bucket R2
    PUBLIC_URL  — URL pública do bucket (ex: https://pub-XXX.r2.dev)
    UPLOAD_TOKEN — token secreto para autenticação (opcional mas recomendado)
*/

var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Upload-Token",
  "Access-Control-Max-Age": "86400",
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, CORS),
  });
}

function safeFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    /* Autenticação via token (X-Upload-Token header) */
    if (env.UPLOAD_TOKEN) {
      var token = request.headers.get("X-Upload-Token") || "";
      if (token !== env.UPLOAD_TOKEN) {
        return json({ error: "Acesso negado. Token inválido." }, 401);
      }
    }

    var url = new URL(request.url);
    var path = url.pathname;

    /* ── POST /upload ──────────────────────────────────────────── */
    if (request.method === "POST" && path === "/upload") {
      try {
        var formData = await request.formData();
        var file = formData.get("file");
        var folder = (formData.get("folder") || "media").replace(/[^a-zA-Z0-9_-]/g, "-");

        if (!file || !file.name) {
          return json({ error: "Nenhum arquivo enviado." }, 400);
        }

        var ext = file.name.split(".").pop().toLowerCase() || "bin";
        var safeName = safeFileName(file.name.replace(/\.[^.]+$/, ""));
        var key = folder + "/" + Date.now() + "-" + safeName + "." + ext;
        var contentType = file.type || "application/octet-stream";

        await env.R2_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: contentType },
        });

        var publicUrl = (env.PUBLIC_URL || "").replace(/\/$/, "") + "/" + key;
        var tipo = contentType.startsWith("video/") ? "video" : "imagem";

        return json({ url: publicUrl, key: key, tipo: tipo, size: file.size, name: file.name });
      } catch (e) {
        return json({ error: e.message || "Erro interno no upload." }, 500);
      }
    }

    /* ── DELETE /delete?key=<chave> ────────────────────────────── */
    if (request.method === "DELETE" && path === "/delete") {
      var key = url.searchParams.get("key");
      if (!key) {
        return json({ error: "Parâmetro 'key' ausente." }, 400);
      }
      try {
        await env.R2_BUCKET.delete(key);
        return json({ ok: true, key: key });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    /* ── GET /list?folder=<pasta>&limit=<n> ────────────────────── */
    if (request.method === "GET" && path === "/list") {
      try {
        var folder = url.searchParams.get("folder") || "";
        var limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
        var listed = await env.R2_BUCKET.list({ prefix: folder ? folder + "/" : "", limit: limit });
        var base = (env.PUBLIC_URL || "").replace(/\/$/, "");
        var items = listed.objects.map(function (obj) {
          return { key: obj.key, url: base + "/" + obj.key, size: obj.size, uploaded: obj.uploaded };
        });
        return json({ items: items, truncated: listed.truncated });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    /* ── Health check ──────────────────────────────────────────── */
    return json({ ok: true, service: "DoaVida R2 Upload Worker", ts: Date.now() });
  },
};
