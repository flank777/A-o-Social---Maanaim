# Como fazer deploy do Worker R2

## Pré-requisitos

1. Conta no Cloudflare (gratuita): https://dash.cloudflare.com
2. Node.js instalado
3. Instalar Wrangler CLI:
   ```
   npm install -g wrangler
   ```

---

## Passo 1 — Login no Cloudflare

```bash
wrangler login
```

---

## Passo 2 — Criar o bucket R2

```bash
wrangler r2 bucket create doavida-media
```

> Depois de criar, vá no dashboard Cloudflare → R2 → bucket `doavida-media`
> → aba **Settings** → habilite **Public access** (R2.dev subdomain)
> Copie a URL pública: `https://pub-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.r2.dev`

---

## Passo 3 — Editar wrangler.toml

Abra `worker/wrangler.toml` e substitua:

```toml
PUBLIC_URL = "https://pub-COLOQUE_SEU_HASH_AQUI.r2.dev"
```

pelo URL real copiado no passo anterior.

---

## Passo 4 — Fazer deploy

```bash
cd worker
wrangler deploy
```

O URL do Worker aparecerá no terminal, ex:
```
https://doavida-media.SEU_USUARIO.workers.dev
```

---

## Passo 5 — Configurar token de segurança (recomendado)

Gere um token aleatório:
```bash
# Linux/Mac:
openssl rand -hex 32

# Windows PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Configure como secret no Worker:
```bash
wrangler secret put UPLOAD_TOKEN
# Cole o token gerado quando solicitado
```

---

## Passo 6 — Configurar o frontend

Abra `js/services/cloudflare-r2.js` e substitua:

```js
var WORKER_URL   = "https://doavida-media.SEU_USUARIO.workers.dev";
var UPLOAD_TOKEN = "";
```

pelos valores reais:
```js
var WORKER_URL   = "https://doavida-media.SEU_USUARIO_REAL.workers.dev";
var UPLOAD_TOKEN = "TOKEN_GERADO_NO_PASSO_5";
```

---

## Verificação

Acesse o painel admin → Galeria → **Adicionar mídia**
Selecione um arquivo — ele será enviado ao R2 e a URL pública aparecerá na galeria.

---

## Estrutura de pastas no R2

| Pasta         | Conteúdo                              |
|---------------|---------------------------------------|
| `galeria/`    | Imagens e vídeos da galeria pública   |
| `alimentos/`  | Fotos dos itens do estoque            |
| `banners/`    | Imagens de banner do site             |
| `voluntarios/`| Fotos dos voluntários                 |
| `media/`      | Uploads genéricos                     |
