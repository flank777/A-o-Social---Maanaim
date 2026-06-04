# PROMPT COMPLETO DO PROJETO — DoaVida

> Documento técnico-executivo gerado a partir de auditoria completa do código.
> Destinado a onboarding de novos desenvolvedores e a uso como **prompt mestre para IAs de programação**.
> Última atualização: 24/04/2026

---

## 1. TÍTULO E IDENTIDADE DO PROJETO

**Nome:** DoaVida
**Subtítulo:** Plataforma de Doações de Alimentos
**Responsáveis institucionais:** Ação Social Semear + Comunidade Evangélica Maanaim
**Localização operacional:** Belém — Pará — Brasil
**Domínio do projeto:** Doações, voluntariado, gestão comunitária, impacto social
**Natureza:** Sistema web estático com backend serverless (Supabase)
**Público-alvo:**
- **Doadores/visitantes:** membros da comunidade e público geral interessado em doar
- **Voluntários:** pessoas que se cadastram para ajudar
- **Famílias beneficiadas:** cadastradas pelo admin
- **Administração:** coordenação da missão social (acesso autenticado por senha)

---

## 2. RESUMO EXECUTIVO

DoaVida é um **site + painel administrativo** construído em **HTML5 + CSS3 + JavaScript vanilla** (sem framework, sem bundler, sem build step), conectado ao **Supabase** como única camada de backend (banco, storage e realtime).

O projeto resolve três problemas:
1. **Doação simplificada** — formulário de 3 passos com comprovante PNG gerado via Canvas.
2. **Captação e gestão de voluntários** — formulário público + painel de triagem por status.
3. **Gestão operacional da missão** — admin controla alimentos, doações, famílias, galeria, orações, tarefas e configurações globais via um painel único.

**Estado de maturidade:**
- ✅ Núcleo funcional estável (doações, voluntariado, galeria, estatísticas em tempo real).
- ⚠️ Dívida técnica relevante em sincronização de imagens (parcialmente corrigida).
- ❌ Integrações externas (WhatsApp real, PIX, exports) inacabadas.

---

## 3. OBJETIVO DO SISTEMA

Viabilizar, com o **mínimo de fricção operacional**, o fluxo de arrecadação de alimentos e o engajamento de voluntários de uma organização social local, oferecendo:

1. **Canal público profissional** para doar e se voluntariar.
2. **Comprovante digital** (PNG) compartilhável via WhatsApp.
3. **Painel admin unificado** que permite editar praticamente todo o conteúdo do site (imagens, textos, banners, cards) sem deploy.
4. **Sincronização cross-device** — conteúdo editado em um dispositivo deve aparecer em todos.

---

## 4. STACK TÉCNICA

### 4.1 Frontend
| Camada | Tecnologia |
|---|---|
| Linguagem | HTML5, CSS3, JavaScript (ES5/ES6 híbrido) |
| Framework UI | **Nenhum** — vanilla JS puro |
| Build tool | **Nenhum** — arquivos estáticos servidos diretamente |
| Fontes | Google Fonts: Playfair Display (display), DM Sans (body), Space Mono (mono) |
| Ícones | Font Awesome 6.5.0 (CDN) + Lucide (em alguns pontos) |
| Animações | CSS keyframes + transitions + `IntersectionObserver` |
| Gráficos | Chart.js 4.4.0 (CDN) — usado no admin e dashboard |
| Canvas | API nativa do browser — geração do recibo PNG |

### 4.2 Backend (Supabase)
| Recurso | Uso |
|---|---|
| Database (PostgreSQL) | Todas as tabelas operacionais |
| Storage | Bucket `galeria` (público) |
| Realtime (WebSocket) | Atualizações ao vivo de estatísticas no index/dashboard |
| Auth | **Não utilizado** — autenticação é por senha única em tabela |
| Edge Functions | Não utilizadas |

**Credenciais:**
- `SUPABASE_URL`: `https://yjcugowvfwkuxjeoauao.supabase.co` (em `js/services/supabase.js:40`)
- `SUPABASE_ANON_KEY`: JWT `anon` exposto em `js/services/supabase.js:43` (**esperado** — chave anon é pública por design; segurança é via RLS)
- `service_role`: **não existe no repositório** (correto)

### 4.3 Dependências de Runtime (CDN)
- `@supabase/supabase-js@2`
- `chart.js@4.4.0`
- `fontawesome/6.5.0`
- Google Fonts (Playfair Display, DM Sans, Space Mono)

### 4.4 Deploy/Hospedagem
Qualquer serviço de arquivos estáticos: Netlify, Vercel (static), GitHub Pages, Cloudflare Pages, ou até servidor HTTP simples (ex: Live Server em `127.0.0.1:5501`).

---

## 5. ARQUITETURA

### 5.1 Modelo arquitetural
```
┌────────────────────────────────────────────────────┐
│          BROWSER (HTML + CSS + JS vanilla)         │
│                                                    │
│  ┌──────────┐  ┌───────────┐  ┌────────────────┐   │
│  │ index    │  │ admin     │  │ form /         │   │
│  │ voluntar │  │  (senha)  │  │ voluntario-fmt │   │
│  └────┬─────┘  └─────┬─────┘  └────────┬───────┘   │
│       │              │                 │           │
│       └──────────┬───┴─────────────────┘           │
│                  ▼                                 │
│      ┌────────────────────────────┐                │
│      │ js/services/supabase.js    │                │
│      │ (DoaVidaSync + DoaVida     │                │
│      │  Supabase facades)         │                │
│      └──────────┬─────────────────┘                │
└─────────────────│──────────────────────────────────┘
                  ▼
       ╔══════════════════════════╗
       ║       SUPABASE           ║
       ║  ┌────────────────────┐  ║
       ║  │ PostgreSQL (9+2 t) │  ║
       ║  │ Storage (bucket    │  ║
       ║  │   "galeria")       │  ║
       ║  │ Realtime WS        │  ║
       ║  └────────────────────┘  ║
       ╚══════════════════════════╝
```

### 5.2 Princípios arquiteturais presentes
- **Monorepositório estático** — nenhuma etapa de build ou SSR.
- **Single source of truth (parcial)** — Supabase é canônico; `localStorage` serve como cache rápido + fallback offline.
- **Injeção de componentes** — `components/navbar.html` e `components/footer.html` são carregados via `fetch()` por `app.js`, reutilizados em todas as páginas.
- **Camada de dados encapsulada** — todas as chamadas ao Supabase passam por `js/services/supabase.js` (objeto global `DoaVidaSync`).

### 5.3 Anti-patterns e débitos arquiteturais
- **Dupla abstração:** `api.js` (`DoaVidaAPI`, legado localStorage) coexiste com `supabase.js` (`DoaVidaSync`). Algumas funções ainda consultam `DoaVidaAPI` — migração incompleta.
- **Estado disperso:** certas configurações (banners, pilares, missão) têm caminhos duplos — gravam em `localStorage` *e* em Supabase, mas a leitura nem sempre prioriza Supabase.
- **HTML monolítico:** `admin.html` tem ~868 KB e ~9.000 linhas — seções poderiam ser extraídas via `fetch` de partials.

---

## 6. ESTRUTURA DE PASTAS

```
doavida-novo-edit/
├── CLAUDE.md                          ← instruções permanentes do projeto
├── PROMPT_COMPLETO_DO_PROJETO.md      ← este arquivo
├── package.json                       ← apenas tslib (não utilizado de fato)
│
├── *.html                             ← 6 páginas públicas (ver §7)
│
├── /components/
│   ├── navbar.html                    ← navbar injetada em todas as páginas
│   └── footer.html                    ← rodapé compartilhado
│
├── /js/
│   ├── app.js              (1.413 L)  ← utilidades globais (navbar, loader, toast)
│   ├── api.js              (1.664 L)  ← LEGADO: localStorage layer
│   ├── admin.js            (7.109 L)  ← painel admin completo
│   ├── form.js             (1.560 L)  ← formulário 3 passos
│   ├── voluntario.js         (905 L)  ← form voluntário
│   ├── comprovante-canvas.js (394 L)  ← gerador PNG do recibo
│   ├── gerar-comprovante.js  (421 L)  ← LEGADO (quase não usado)
│   ├── carousel.js           (451 L)  ← carrossel
│   ├── gallery.js            (267 L)  ← filtro galeria
│   ├── banner-config.js       (10 L)  ← fallback estático do banner
│   ├── dona-assuncao.js      (555 L)  ← seção "missão/pilar"
│   └── /services/
│       └── supabase.js     (1.058 L)  ← ÚNICA integração com backend
│
├── /css/
│   ├── global.css          (2.182 L)  ← core: vars, navbar, footer, modal
│   ├── admin.css           (3.673 L)  ← painel admin
│   ├── admin-dark.css        (554 L)  ← tema escuro (parcial, usado no mobile)
│   ├── form.css            (1.857 L)  ← formulário doação
│   ├── dashboard-analytics.css (513 L)← dashboard público
│   ├── dona-assuncao.css     (418 L)  ← seção missão
│   ├── carousel.css          (308 L)  ← carrossel
│   └── gallery.css           (422 L)  ← galeria
│
├── /db/
│   ├── schema.sql                     ← 9 tabelas principais + seed
│   ├── schema_cestas.sql              ← 2 tabelas do módulo "cestas básicas"
│   ├── rls_policies.sql               ← policies de RLS
│   ├── fix_rls_configuracao.sql       ← hotfix RLS configuracao (UPDATE)
│   └── tabelas_sql.sql                ← listagem informativa
│
├── /img/                              ← imagens estáticas (logos, backgrounds)
│
└── patch-*.js / fix-*.js / restore-*.js
    └── scripts históricos de correção — REMOVÍVEIS
```

---

## 7. PÁGINAS E ROTAS

Como não há roteador, cada rota equivale a um arquivo `.html` acessado diretamente pelo servidor estático.

| Rota | Arquivo | Propósito | Integrações | Estado |
|---|---|---|---|---|
| `/` | `index.html` | Landing: hero, pilares, carrossel memes, doações recentes, galeria, contato | Supabase (Realtime), Chart apenas em dashboard | ✅ Estável |
| `/form.html` | `form.html` | Formulário de doação em 3 passos (itens → dados → recibo) | Supabase: `alimentos`, `doacoes`; Canvas API | ✅ Estável |
| `/voluntario.html` | `voluntario.html` | Página institucional de voluntariado: hero + "Por que ser voluntário" (3 cards) + "Como contribuir" (4 cards) + links para formulário | Supabase: `configuracao` (banners/imagens) | ⚠️ Sync de imagens instável (ver §14) |
| `/voluntario-form.html` | `voluntario-form.html` | Formulário voluntário: tipo → dados | Supabase: `voluntarios`, `configuracao` | ⚠️ Não captura `?tipo=X` da URL |
| `/admin.html` | `admin.html` | Painel admin com 12 abas (ver §9) | Supabase: tudo | ⚠️ Mobile nav incompleto (corrigido em 24/04) |
| `/dashboard.html` | `dashboard.html` | Painel público de transparência: metas, totais, gráficos | Supabase (read-only) | ✅ Estável |
| `/gallery.html` | `gallery.html` | Galeria pública com filtros por categoria | Supabase: `galeria` | ✅ Estável |

**Observações:**
- Navegação entre páginas é via links `<a href>` tradicionais — sem SPA.
- `app.js` injeta a navbar em todas as páginas via `fetch('components/navbar.html')`.

---

## 8. COMPONENTES PRINCIPAIS

### 8.1 Navbar (`components/navbar.html`)
- Injetada em todas as páginas via `app.js` → `injetarNavbar()`.
- Logos Semear (retrato) + Maanaim (circular).
- Links para as seções principais, com destaque visual no ativo.
- Hamburger menu no mobile.

### 8.2 Loader (`css/global.css` + `app.js`)
- Logo Semear pulsante + anel giratório + barra de progresso.
- Mostra no primeiro carregamento de cada página (≥ 400 ms ou até `DOMContentLoaded`).

### 8.3 Toast (`app.js` → `showToast(msg, tipo)`)
- Notificação flutuante, tipos: `success | error | info | warning`.
- Usado amplamente no admin para feedback de salvamento.

### 8.4 Modal (`css/global.css` — `.modal-overlay`, `.modal-box`)
- Padrão reutilizado em admin para editar alimento, família, voluntário, foto, tarefa.
- Fecha ao clicar no overlay ou no botão `×`.

### 8.5 Recibo/Comprovante (`js/comprovante-canvas.js`)
- Gera PNG 2× via Canvas puro.
- Header bipartido com logos Semear + Maanaim, protocolo em destaque, tabela de itens, rodapé com versículo.
- Exporta via `canvas.toBlob()` → `navigator.share({files})` no mobile, download + WhatsApp Web no desktop.

### 8.6 Carrossel (`js/carousel.js`)
- Carrossel touch-first com swipe nativo, usado no index.

### 8.7 Galeria (`js/gallery.js`)
- Filtro por `categoria` (evento, distribuição, voluntarios, outros) e `visibilidade` (pública/privada).

---

## 9. PAINEL ADMINISTRATIVO

### 9.1 Autenticação
- **Modelo:** senha única global armazenada em `configuracao.senha_admin` (Supabase) + cache em `localStorage('doavida_senha')`.
- **Senha padrão:** `2025` (seed em `db/schema.sql:253`).
- **Fluxo:** modal `#login-screen` bloqueia o painel até a senha bater.
- **Fallback:** se Supabase estiver offline, compara com `localStorage`.
- **Logout:** não implementado — apenas recarregar a página.
- **Limitações:** não há usuários individuais, níveis de permissão, ou auditoria.

### 9.2 Navegação
- **Desktop:** sidebar vertical `.adm-sidebar` (todas as abas).
- **Mobile:** barra inferior `.adm-mobile-nav` horizontal com scroll (12 botões).
  - 🔧 **Historicamente buggy:** a barra mobile tinha só 5 abas fixas (faltavam Galeria, Dashboard, Famílias, Cestas, Orações, Tarefas, WhatsApp). Corrigido em 24/04/2026 adicionando os 7 botões faltantes e `overflow-x: auto`.

### 9.3 Abas do Painel (12 no total)

| # | Aba | CRUD | Upload | Tabela Supabase | Observações |
|---|---|---|---|---|---|
| 1 | **Visão Geral** (`overview`) | R | ❌ | todas (agregação) | Cards de estatísticas + gráfico pizza + últimas doações |
| 2 | **Dashboard** (`dashboard-panel`) | R | ❌ | todas (analytics) | Painel de análise integrado |
| 3 | **Galeria** (`gallery`) | CRUD | ✅ Storage + URL | `galeria` + bucket `galeria` | Upload file OU URL, visibilidade pública/privada |
| 4 | **Alimentos** (`foods`) | CRUD | URL/Unsplash | `alimentos` | Nome, emoji, meta em kg, imagem, peso unitário |
| 5 | **Doações** (`donations`) | CRU(D) | ❌ | `doacoes` | Filtro por status; toggle pendente → confirmado → entregue |
| 6 | **Famílias** (`families`) | CRUD | ❌ | `familias` | Integração WhatsApp (abre link externo) |
| 7 | **Voluntários** (`voluntarios`) | CRUD | ❌ | `voluntarios` | Status: novo, em-contato, confirmado, participando, finalizado |
| 8 | **Cestas** (`cestas`) | ⚠️ Parcial | ❌ | `modelo_cesta_itens`, `cestas_formadas` | Módulo implementado mas sem UI completa |
| 9 | **Orações** (`oracoes`) | CRU(D) | ❌ | `oracoes` | Status: precisa-oracao → orando |
| 10 | **Tarefas** (`tarefas`) | CRUD | ❌ | `tarefas` | CRUD simples; WhatsApp manual |
| 11 | **WhatsApp** (`whatsapp`) | Config | ❌ | `configuracao`, `historico_whatsapp` | Template editor, envio em massa — **API real não implementada** |
| 12 | **Config** (`settings`) | U | URL | `configuracao` | Senha admin, números WhatsApp, banners, fotos voluntário, fotos "Por que / Como contribuir" |

### 9.4 Edição de conteúdo público pelo admin
O admin controla **quase todo conteúdo visual** do site via aba **Config**:
- Banner do hero (index)
- Banner do hero (voluntário)
- Imagens das 3 seções da página voluntário:
  - **Capa** (`doavida_vol_capa`)
  - **"Por que ser voluntário"** — 3 cards (`doavida_vol_why`: `w1`, `w2`, `w3`)
  - **"Como contribuir"** — 4 cards (`doavida_vol_contrib`: `c1`, `c2`, `c3`, `c4`)
  - **Cards do formulário** — 4 cards (`doavida_vol_cards`: `card1`–`card4`)
- Pilares da home (em `localStorage` — ainda não migrado para Supabase)
- Fotos da missão, fotos de contribuição (em localStorage — legado)

---

## 10. BANCO DE DADOS / SUPABASE

### 10.1 Tabelas (esquema completo)

#### `alimentos`
Catálogo dos alimentos-meta da campanha.
| Coluna | Tipo | Default | Observação |
|---|---|---|---|
| id | UUID PK | `uuid_generate_v4()` | |
| name | TEXT | — | Nome (ex: "Arroz") |
| emoji | TEXT | '🥫' | |
| img | TEXT | — | URL da imagem |
| goal | INT | 0 | Meta em kg |
| kg | INT | 0 | Acumulado (atualiza a cada doação confirmada) |
| families | INT | 0 | |
| peso | NUMERIC | 1 | Peso unitário (kg por unidade) |
| created_at, updated_at | TIMESTAMPTZ | NOW() | |

#### `doacoes`
Registro de todas as doações.
| Coluna | Tipo | Observação |
|---|---|---|
| id | UUID PK | |
| name | TEXT | Doador |
| phone | TEXT | |
| food | TEXT | Resumo textual |
| amount | INT | Qtd de itens |
| total_kg | NUMERIC | |
| delivery | TEXT | 'retirada' \| 'igreja' |
| observacao | TEXT | |
| status | TEXT | 'pendente' \| 'confirmado' \| 'entregue' |
| itens | JSONB | Array `[{id, name, qty, peso}]` |
| created_at, updated_at | TIMESTAMPTZ | |

#### `familias`
Cadastro de famílias beneficiadas (somente admin gerencia).
Colunas: `id`, `name`, `phone`, `endereco`, `pessoas`, `obs`, timestamps.

#### `voluntarios`
Cadastrados via `voluntario-form.html`.
Colunas: `id`, `nome`, `telefone`, `tipo`, `tipo_label`, `status` (`novo|em-contato|confirmado|participando|finalizado`), `dados` (JSONB com disponibilidade), timestamps.

#### `oracoes`
Pedidos de oração enviados pelo público.
Colunas: `id`, `nome` (default 'Anônimo'), `categoria`, `mensagem`, `status`, timestamps.

#### `tarefas`
Gestão interna de tarefas do admin.
Colunas: `id`, `titulo`, `descricao`, `responsavel`, `responsavel_tel`, `status`, `vencimento`, timestamps.
⚠️ **Sem FK para `voluntarios.id`** — `responsavel` é texto livre.

#### `galeria`
Fotos públicas.
Colunas: `id`, `url`, `legenda`, `categoria`, `visibilidade` ('publica' \| 'privada'), timestamps.

#### `configuracao`
Tabela chave/valor de configuração.
Colunas: `chave` (PK TEXT), `valor` (TEXT), `descricao`, `updated_at`.
Chaves conhecidas (ver §11):
- `senha_admin`
- `banner_hero`, `banner_voluntario`
- `whatsapp_apikey`, `whatsapp_phones`, `whatsapp_ativo`
- `nome_sistema`
- `doavida_vol_capa`, `doavida_vol_cards`, `doavida_vol_why`, `doavida_vol_contrib`
- `doavida_pillars`, `doavida_missao_fotos` (planejadas, ainda em localStorage)

#### `historico_whatsapp`
Log de mensagens enviadas.
⚠️ **RLS habilitada mas sem policies definidas** — tabela inacessível via chave anon.

#### `modelo_cesta_itens` e `cestas_formadas` (módulo Cestas)
Catálogo dos itens por cesta e registro de cestas formadas. RLS totalmente pública.

### 10.2 Row-Level Security (RLS)
**Modelo atual:** todas as tabelas com **policies permissivas** (`USING true` / `WITH CHECK true`) para SELECT/INSERT/UPDATE/DELETE.
**Justificativa:** não há auth; a proteção é apenas por **obscuridade da URL**. Apropriado para MVP comunitário; **impróprio** se for aberto ao público geral.

**Bug conhecido (corrigido via `db/fix_rls_configuracao.sql`):**
A policy `atualizacao_publica_configuracao` foi criada originalmente com apenas `USING (true)`, sem `WITH CHECK (true)`. Isso quebra o `upsert` (INSERT ON CONFLICT DO UPDATE) do Supabase-JS: a primeira gravação funciona (INSERT), mas a segunda em diante é silenciosamente bloqueada. Correção obrigatória a ser executada no SQL Editor do Supabase.

**Pendências de segurança:**
- `historico_whatsapp` sem policies → inacessível (por acidente, não por design)
- Sem auditoria (`audit_log`) de ações do admin
- Sem rate limiting

### 10.3 Realtime
Habilitado em algumas tabelas para atualização ao vivo de estatísticas no `index.html` (últimas doações, pedidos de oração).

---

## 11. STORAGE E IMAGENS

### 11.1 Bucket Supabase
- **Nome:** `galeria`
- **Público:** sim (`public = true`)
- **Policies:**
  - `galeria_leitura_publica` (SELECT)
  - `galeria_upload_publico` (INSERT)
  - `galeria_delete_publico` (DELETE)

### 11.2 Fluxo de upload (aba Galeria do admin)
```js
const { data, error } = await supabase
  .storage.from('galeria')
  .upload(`foto_${Date.now()}.jpg`, arquivo);

const { data: { publicUrl } } = supabase
  .storage.from('galeria')
  .getPublicUrl(data.path);

// publicUrl é salva em galeria.url
```

### 11.3 Imagens configuráveis pelo admin (resumo)

| Imagem | Onde aparece | Chave/Local de persistência | Status |
|---|---|---|---|
| Hero index | `index.html` | `configuracao.banner_hero` | ✅ |
| Hero voluntário | `voluntario.html` | `configuracao.banner_voluntario` | ✅ |
| Capa voluntário (hero alt) | `voluntario.html` | `configuracao.doavida_vol_capa` | ✅ após fix RLS |
| 3 cards "Por que ser voluntário" | `voluntario.html` | `configuracao.doavida_vol_why` (w1/w2/w3) | ✅ após fix RLS |
| 4 cards "Como contribuir" | `voluntario.html` | `configuracao.doavida_vol_contrib` (c1..c4) | ✅ após fix RLS |
| 4 cards do formulário voluntário | `voluntario-form.html` | `configuracao.doavida_vol_cards` (card1..card4) | ✅ após fix RLS |
| Fotos da galeria | `gallery.html`, `index.html` | `galeria.url` + Storage | ✅ |
| Imagens de alimentos | `form.html` | `alimentos.img` | ✅ |
| Fotos "Missão" (home) | `index.html` | `localStorage('doavida_missao_fotos')` | ⚠️ **Legado — não sincroniza** |
| Pilares home (3 cards) | `index.html` | `localStorage('doavida_pillars')` | ⚠️ **Legado — não sincroniza** |

### 11.4 Padrão de sincronização correto (implementado)
```
┌────────────────────┐   salva   ┌──────────────┐
│ Admin (browser A)  │ ────────► │  Supabase    │
└────────────────────┘   await   │ configuracao │
                                 └──────┬───────┘
                                        │ setConfig (WITH CHECK true)
                                        ▼
                          ┌──────────────────────────┐
                          │ voluntario.html (qualquer │
                          │ dispositivo)             │
                          │  1) localStorage (rápido)│
                          │  2) getAllConfigs() ←auth│
                          │  3) atualiza localStorage│
                          └──────────────────────────┘
```

### 11.5 História dos bugs de sincronização (documentação viva)

Duas correções históricas aplicadas:

**Bug 1 — Nível aplicação (admin.js e páginas consumidoras):**
- `renderFotosVoluntario/Why/Contrib/Cards()` liam APENAS localStorage. Em outro dispositivo, carregavam valores padrão e, ao salvar, **sobrescreviam o Supabase com os defaults**.
- `salvarFotos*` chamavam `DoaVidaSync.setConfig(...)` com `.catch(() => {})`, ou seja, **fire-and-forget**. O toast "✅ salvo!" disparava antes do Supabase confirmar.
- Correção: funções convertidas para `async`, lendo Supabase como fonte autoritativa e só mostrando sucesso após `await`.

**Bug 2 — Nível banco (RLS):**
- `atualizacao_publica_configuracao` só tinha `USING (true)`, faltava `WITH CHECK (true)`.
- O `upsert` do Supabase-JS = INSERT ON CONFLICT DO UPDATE. A primeira gravação (INSERT) passava. A segunda (UPDATE por conflito) era **bloqueada silenciosamente**.
- Correção: `db/fix_rls_configuracao.sql` recria a policy com os dois cláusulas.

---

## 12. REGRAS DE NEGÓCIO

### 12.1 Doação
- Doador escolhe múltiplos itens com quantidade (passo 1).
- Informa nome, telefone, forma de entrega (passo 2).
- Recebe protocolo único `DOA-AAAAMMDD-XXXXX` e PNG compartilhável (passo 3).
- Doação inicia com status `pendente`.
- Admin confirma (→ `confirmado`) e depois marca como entregue (→ `entregue`).
- A confirmação **deveria** somar `total_kg` aos totais de `alimentos.kg`. *Não foi possível confirmar no código atual* — verificar se há trigger SQL ou se é feito no cliente admin.

### 12.2 Voluntariado
- Formulário em 2 passos: tipo (intercessão/voluntário/doação/logística) + dados.
- Campo `dados` (JSONB) armazena:
  - Para intercessão: `{dias: [...], frequencia, meiodia}`
  - Para demais: `{disponibilidade: [...]}`
- Status inicial: `novo`. Fluxo pelo admin: `novo → em-contato → confirmado → participando → finalizado`.

### 12.3 Cestas básicas (módulo parcial)
- Uma "cesta básica" é composta por N itens com quantidade definida em `modelo_cesta_itens`.
- Dado o estoque atual (`alimentos.kg / alimentos.peso`), o sistema calcula quantas cestas completas podem ser formadas.
- **Não foi possível confirmar no código atual** se o cálculo de "item limitante" está implementado no admin — as tabelas existem mas a UI está incompleta.

### 12.4 PIX e pagamentos financeiros
**Não implementado.** Nenhuma menção a chave PIX, gateway, QR code ou transações financeiras. A plataforma é exclusivamente de doações em espécie (alimentos).

### 12.5 WhatsApp
- Admin pode configurar API key, números destinatários e template (aba WhatsApp).
- **Envio real via API externa (Twilio, Meta Cloud API) não implementado.**
- Na prática, o admin usa links `https://wa.me/...` para abrir conversas manualmente.

### 12.6 Comprovantes
- Gerados 100% no browser via Canvas.
- Protocolo: `DOA-<YYYYMMDD>-<5 chars aleatórios>`.
- PNG 2× (retina) entregue via `navigator.share()` (mobile) ou download + redirecionamento WhatsApp Web (desktop).

---

## 13. FLUXOS PRINCIPAIS

### 13.1 Fluxo Doador (público)
1. Acessa `/` → vê hero + estatísticas realtime.
2. Clica "Quero Doar" → `/form.html`.
3. Passo 1: escolhe itens e quantidades.
4. Passo 2: informa nome, telefone, forma de entrega.
5. Passo 3: recebe PNG do recibo, compartilha por WhatsApp.
6. Dados gravados em `doacoes` (status `pendente`).

### 13.2 Fluxo Voluntário (público)
1. Acessa `/voluntario.html` → lê "Por que ser voluntário" e "Como contribuir".
2. Clica em um dos 4 cards → `/voluntario-form.html`.
3. Passo 1: escolhe tipo.
4. Passo 2: informa dados (nome, telefone, disponibilidade).
5. Submit → grava em `voluntarios` com status `novo`.

### 13.3 Fluxo Admin
1. Acessa `/admin.html` → modal de senha bloqueia.
2. Digita senha (default 2025, ou o valor atual em `configuracao.senha_admin`).
3. Navega entre as 12 abas via sidebar (desktop) ou barra inferior (mobile).
4. Todas as alterações gravam **direto no Supabase** (com fallback em localStorage).
5. Realtime atualiza outras abas abertas no mesmo ou em outro device.

---

## 14. BUGS CONHECIDOS

### 14.1 Sincronização de imagens — cards da página voluntário
- **Sintoma:** admin altera a imagem de um card, salva, recarrega → imagem volta ao default em outro dispositivo.
- **Causa raiz 1:** RLS `UPDATE` em `configuracao` sem `WITH CHECK (true)`.
- **Causa raiz 2:** Funções `render*()` liam só localStorage; funções `salvar*()` eram fire-and-forget.
- **Status:** ✅ **CORRIGIDO** no código. **Requer execução manual** de `db/fix_rls_configuracao.sql` no Supabase.

### 14.2 Mobile admin — abas ausentes
- **Sintoma:** no mobile, várias abas (Galeria, Dashboard, Famílias, Cestas, Orações, Tarefas, WhatsApp) não apareciam.
- **Causa raiz:** `.adm-mobile-nav` tinha apenas 5 botões hardcoded; `.admin-tabs` (12 abas) era ocultada via `display:none !important` no mobile.
- **Status:** ✅ **CORRIGIDO** em `admin.html` (adicionados 7 botões) e `css/admin-dark.css` (scroll horizontal).

### 14.3 `historico_whatsapp` inacessível
- **Sintoma:** tabela existe mas cliente anon não consegue ler/escrever.
- **Causa:** RLS habilitada sem policies.
- **Status:** ❌ Pendente. Requer SQL:
  ```sql
  CREATE POLICY "leitura_historico_wa" ON historico_whatsapp FOR SELECT USING (true);
  CREATE POLICY "escrita_historico_wa" ON historico_whatsapp FOR INSERT WITH CHECK (true);
  ```

### 14.4 Pilares da home e fotos da missão só em localStorage
- **Sintoma:** se o admin editar pilares em um device e abrir o site em outro, não sincroniza.
- **Causa:** gravação exclusivamente em `localStorage`.
- **Status:** ❌ Pendente. Requer migração para `configuracao` seguindo padrão de `doavida_vol_*`.

### 14.5 Voluntario-form.html não captura `?tipo=X`
- **Sintoma:** ao clicar em "Apoio Espiritual" em `voluntario.html`, o form abre mas começa no passo 1 genérico.
- **Causa:** URL param não é lido.
- **Status:** ❌ Pendente. Requer `URLSearchParams(location.search).get('tipo')` no script do form.

### 14.6 Dupla abstração de dados (`DoaVidaAPI` vs `DoaVidaSync`)
- **Sintoma:** confusão em onboarding; risco de ler/escrever em lugares diferentes.
- **Status:** ❌ Débito técnico. `api.js` deve ser desativado gradualmente.

### 14.7 Scripts de patch históricos (`patch-*.js`, `fix-*.js`)
- **Sintoma:** ruído no repositório, risco de execução acidental.
- **Status:** ❌ Remover.

### 14.8 Confirmação de doação não atualiza `alimentos.kg`
- *Não foi possível confirmar no código atual* — precisa verificar se há trigger SQL em schema.sql ou lógica JS no admin que propague `doacoes.itens[].qty * alimentos.peso` para `alimentos.kg` ao mudar status para `confirmado`.

### 14.9 UI da aba Cestas incompleta
- **Sintoma:** tabelas `modelo_cesta_itens` e `cestas_formadas` existem; UI pouco desenvolvida.
- **Status:** ❌ Incompleto.

### 14.10 Sem logout
- **Sintoma:** admin permanece logado até limpar localStorage manualmente.
- **Status:** ❌ Pendente. Requer botão "Sair" que limpe `doavida_senha` e recarregue.

---

## 15. PRIORIDADES DE CORREÇÃO (ordem sugerida)

1. 🔴 **Executar `db/fix_rls_configuracao.sql` no Supabase** (se ainda não foi).
2. 🔴 **Validar que imagens da voluntario.html persistem cross-device** após o fix.
3. 🟠 **Migrar `doavida_pillars` e `doavida_missao_fotos` de localStorage para `configuracao`** (mesmo padrão do `doavida_vol_*`).
4. 🟠 **Implementar captura de `?tipo=X` em voluntario-form.html.**
5. 🟠 **Criar policies de RLS para `historico_whatsapp`.**
6. 🟡 **Confirmar/implementar propagação de `doacoes confirmadas → alimentos.kg`** (trigger SQL é preferível).
7. 🟡 **Remover scripts de patch históricos** do repositório.
8. 🟡 **Completar UI da aba Cestas** no admin.
9. 🟢 **Consolidar `DoaVidaAPI` em `DoaVidaSync`.**
10. 🟢 **Adicionar logout no admin.**
11. 🟢 **Adicionar `audit_log` para operações críticas** (delete, alteração de senha).

---

## 16. PADRÃO VISUAL / UX

### 16.1 Paleta oficial (variáveis CSS em `css/global.css`)
- `--cream: #F4F0E6` — texto principal sobre fundos escuros
- `--gold: #E8C96A` — destaque, CTA
- `--sage: #5A8A4A` — verde médio (bordas, acentos)
- `--sage2: #7DC063` — verde claro (hover)
- `--muted: #771717` — vermelho escuro (alertas)

### 16.2 Cores de interface
- Fundo navbar/loader: `#F4F8FB` (branco gelo)
- Verde escuro (headers): `#1A3312`
- Verde médio: `#5A8A4A`
- Vermelho suave: `#8A1818`
- Texto principal: `#1A1A18`
- Texto secundário: `#555550`
- Bordas: `rgba(90,138,74,0.20)`

### 16.3 Tipografia
- `--ff-display: 'Playfair Display', Georgia, serif` — títulos
- `--ff-body: 'DM Sans', system-ui` — corpo
- `--ff-mono: 'Space Mono', 'Courier New', monospace` — números, protocolos

### 16.4 Componentes
- **Cards:** `background: var(--surface); border: 1px solid var(--border); border-radius: 12–16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08)`.
- **Botões primários:** fundo `--gold`, texto escuro, hover `brightness(1.08)`.
- **Modais:** overlay escuro, box branco, radius 20px, fecha ao clicar overlay.
- **Animações:** `transition: 0.2s–0.4s ease`; entrada de elementos via `IntersectionObserver` (opacity + translateY).

### 16.5 Breakpoints
`480px`, `768px`, `1024px` — mobile-first.

### 16.6 Regras visuais rígidas (do `CLAUDE.md`)
- Navbar sempre `#F4F8FB` (desktop e mobile).
- Logo Semear é **retrato** (radius 8px). Logo Maanaim é **circular** (radius 50%).
- Cards sem scroll horizontal no mobile — converter em empilhamento vertical.
- Loader mostra "Ação Social Semear · Belém, PA".

---

## 17. PADRÃO DE CÓDIGO

### 17.1 JavaScript
- **ES5 compatível** onde possível (usar `var`, `function`, `.forEach`).
- Funções globais nomeadas descritivamente em português: `inicializarNavbar()`, `doaBuildRecibo()`.
- Sem classes ES6 desnecessárias — prefira funções simples.
- Comentários em português explicando **o porquê**, não o quê.
- `console.log` de debug deve ser removido antes do commit.
- Integração Supabase **sempre via `DoaVidaSync`** — nunca chamar `supabaseClient` diretamente fora de `supabase.js`.

### 17.2 CSS
- Variáveis em `:root` no `global.css` — não criar locais duplicadas.
- Mobile-first.
- `!important` apenas em overrides de media query de componentes externos.
- Prefixos `-webkit-` para `backdrop-filter`.

### 17.3 HTML
- `aria-label` em botões sem texto visível.
- `alt` descritivo em imagens informativas; `alt=""` em decorativas.
- `loading="lazy"` em imagens abaixo do fold.
- IDs únicos e semânticos: `r-proto`, `r-nome`, `btn-share-wa`.

### 17.4 Commit / mudanças
- Sempre aplicar a correção **de menor alteração segura**.
- Nunca quebrar layout existente sem justificativa explícita.
- Nunca adicionar build step, framework ou bundler.

---

## 18. SEGURANÇA

### 18.1 Modelo atual
- **Auth:** senha única compartilhada — apropriado para equipe pequena da missão, **não escala** para múltiplos admins.
- **RLS:** todas as tabelas com policies totalmente públicas (`true`).
- **Supabase anon key:** exposta no client (correto — é pública por design).
- **service_role key:** ausente do repositório (correto).

### 18.2 Riscos
- **R1** — Qualquer pessoa que descubra a URL do Supabase pode manipular todos os dados. Mitigação: URL não é pública; admin é por obscuridade.
- **R2** — Bucket `galeria` permite DELETE por qualquer requisição. Mitigação: nenhum delete crítico está exposto em UI pública.
- **R3** — Senha admin em texto puro em `configuracao`. Mitigação aceitável dado o escopo; se escalar, migrar para `supabase.auth`.

### 18.3 Recomendações para endurecimento (roadmap futuro)
1. Migrar para Supabase Auth (email + senha ou magic link).
2. Adicionar policies condicionadas a `auth.uid()` nas tabelas sensíveis.
3. Criar tabela `audit_log` com trigger SQL.
4. Rate limiting via Edge Function.
5. CSP no servidor estático (Netlify/Vercel headers).

---

## 19. CHECKLIST DE CONTINUIDADE

**Ao pegar este projeto para trabalhar, faça nesta ordem:**

- [ ] Leia `CLAUDE.md` na raiz (instruções do projeto).
- [ ] Leia este `PROMPT_COMPLETO_DO_PROJETO.md` na íntegra.
- [ ] Execute `db/fix_rls_configuracao.sql` no SQL Editor do Supabase.
- [ ] Verifique no Supabase que existem 4 policies em `configuracao` (SELECT, INSERT, UPDATE, DELETE) com `qual=true` e/ou `with_check=true`.
- [ ] Adicione policies para `historico_whatsapp`.
- [ ] Abra `admin.html` com senha `2025` (ou a atual).
- [ ] Teste: salve uma imagem em "Fotos → Seja Voluntário → Por que ser Voluntário", recarregue em outro navegador e confirme persistência.
- [ ] Teste: em um mobile, abra `admin.html` e confirme que todas as 12 abas estão acessíveis na barra inferior (com scroll horizontal).
- [ ] Teste: faça uma doação em `form.html` e confirme que o PNG é gerado corretamente.
- [ ] Para qualquer bug: abra DevTools, reproduza, anexe log do console e da aba Network.
- [ ] Antes de commitar: remova `console.log` de debug, scripts `patch-*.js`/`fix-*.js` descartáveis.
- [ ] Nunca altere `package.json` para adicionar bundler/framework.
- [ ] Nunca salve imagens apenas em localStorage — sempre via `DoaVidaSync.setConfig()` ou Storage.

---

## 20. PROMPT MESTRE PARA CONTINUAR ESTE PROJETO

> **Copie a seção abaixo e cole no início de qualquer sessão de IA de programação que for trabalhar neste projeto.**

```
Você é um arquiteto de software sênior e engenheiro full-stack de elite, com domínio profundo em JavaScript vanilla, Supabase, PostgreSQL (RLS, triggers, policies), Supabase Storage, UX/UI premium, e sistemas web prontos para produção. Atue com padrão máximo de qualidade, pensamento sistêmico e atenção extrema aos detalhes.

## PROJETO
DoaVida — plataforma web de doações de alimentos e voluntariado da Ação Social Semear + Comunidade Maanaim (Belém, PA). Site público + painel administrativo. Stack: HTML5 + CSS3 vanilla + JavaScript ES5/ES6 híbrido + Supabase (DB, Storage, Realtime). SEM framework, SEM bundler, SEM build step. Arquivos estáticos servidos diretamente.

## PÁGINAS
- index.html (landing + stats realtime)
- form.html (doação 3 passos + recibo PNG via Canvas)
- voluntario.html (institucional) + voluntario-form.html (cadastro)
- admin.html (painel com 12 abas, autenticação por senha única)
- dashboard.html (transparência pública)
- gallery.html (galeria com filtros)

## BACKEND
Supabase (project: yjcugowvfwkuxjeoauao). Chave anon exposta por design em js/services/supabase.js. NUNCA usar service_role no client. Todas as chamadas devem passar por DoaVidaSync (global em window).

Tabelas: alimentos, doacoes, familias, voluntarios, oracoes, tarefas, galeria, configuracao, historico_whatsapp, modelo_cesta_itens, cestas_formadas.
Bucket Storage: galeria (público).
RLS: todas as tabelas têm policies permissivas (true) — autenticação é por senha única em configuracao.senha_admin (default '2025').

## REGRAS RÍGIDAS (NÃO NEGOCIÁVEIS)
1. NÃO instalar npm packages de UI (React, Vue, Bootstrap, Tailwind, etc).
2. NÃO adicionar build steps (webpack, vite, parcel).
3. NÃO criar arquivos .ts/.tsx.
4. NÃO duplicar CSS já definido em global.css.
5. NÃO usar innerHTML com dados de usuário sem escapar (escHtml()).
6. NÃO salvar imagens APENAS em localStorage — sempre em Supabase (configuracao ou Storage).
7. NÃO quebrar o layout existente sem justificativa explícita.
8. NÃO expor service_role ou qualquer credencial sensível.
9. NÃO remover funcionalidades existentes sem autorização.
10. SEMPRE seguir o padrão de variáveis CSS em global.css.
11. SEMPRE usar ES5-compatível (var, function, .forEach) para manter consistência.
12. SEMPRE priorizar Supabase como fonte autoritativa; localStorage é apenas cache rápido.

## PADRÃO DE SINCRONIZAÇÃO DE IMAGENS (OBRIGATÓRIO)
Leitura:
  1º) localStorage (rápido, para UX imediata)
  2º) DoaVidaSync.getAllConfigs() ou getConfig(chave) — autoritativo
  3º) Atualiza localStorage com o valor do Supabase
Gravação:
  1º) await DoaVidaSync.setConfig(chave, payload) — espera confirmação
  2º) Só então: localStorage.setItem(chave, payload) + toast de sucesso
  3º) Em erro: console.error + toast de erro (NUNCA fire-and-forget)

## BUGS HISTÓRICOS CORRIGIDOS (NÃO REINTRODUZIR)
- RLS UPDATE em configuracao sem WITH CHECK (true) — quebrava upsert.
- Funções render*() que liam só localStorage — sobrescreviam Supabase com defaults.
- Funções salvar*() fire-and-forget — exibiam sucesso falso.
- Mobile admin nav com só 5 abas — faltavam 7 (Galeria, Dashboard, Famílias, Cestas, Orações, Tarefas, WhatsApp).

## PENDÊNCIAS CONHECIDAS
- Migrar doavida_pillars e doavida_missao_fotos de localStorage para configuracao.
- Capturar ?tipo=X em voluntario-form.html.
- Criar RLS policies para historico_whatsapp.
- Validar se doacao confirmada propaga kg para alimentos (trigger ou JS).
- Completar UI da aba Cestas.
- Consolidar DoaVidaAPI em DoaVidaSync.
- Adicionar logout no admin.

## PROCESSO DE TRABALHO OBRIGATÓRIO
Antes de qualquer alteração:
1. Ler CLAUDE.md e PROMPT_COMPLETO_DO_PROJETO.md na íntegra.
2. Investigar a causa raiz — nunca aplicar solução cosmética.
3. Mapear impacto nos arquivos relacionados.
4. Aplicar correção de menor alteração segura.
5. Testar desktop E mobile.
6. Validar persistência real no Supabase (não apenas localStorage).
7. Fornecer checklist de verificação ao entregar.

Ao depurar bug de salvamento, SEMPRE peça ao usuário:
- Print do Console (F12) com o erro completo
- Print do Network filtrando por 'configuracao' com status HTTP
- Confirmação de que hard-reload (Ctrl+Shift+R) foi feito

## PADRÃO VISUAL
Cores: --cream #F4F0E6, --gold #E8C96A, --sage #5A8A4A, --sage2 #7DC063, --muted #771717.
Fontes: Playfair Display (títulos), DM Sans (corpo), Space Mono (números).
Cards: radius 12–16px, sombra 0 2px 8px rgba(0,0,0,0.08), hover translateY(-2px).
Botão primário: fundo --gold, texto escuro, transição 0.3s ease.
Mobile-first, breakpoints 480/768/1024.

## OBJETIVO
Entregar soluções que impressionem pela arquitetura, acabamento, consistência, inteligência técnica e execução. Nível sênior, produção real, zero superficialidade. Cada correção deve ser robusta, elegante e sustentável.
```

---

**FIM DO DOCUMENTO**

> *Este documento é vivo. Atualize-o sempre que uma correção crítica for aplicada ou uma nova funcionalidade for adicionada, para manter a continuidade entre desenvolvedores humanos e IAs.*
