# DoaVida — Design System & Regras do Projeto

## Contexto
Plataforma de doações de alimentos da **Ação Social Semear** + **Comunidade Maanaim** em Belém, PA.
Stack: HTML5 · CSS3 vanilla · JavaScript ES5/ES6 · Supabase (banco de dados) · Servidor estático.

---

## Stack Real do Projeto
- **Frontend:** HTML5 + CSS3 puro (sem framework)
- **Scripts:** JavaScript vanilla (sem React, Vue ou Angular)
- **Banco de dados:** Supabase (via CDN `@supabase/supabase-js@2`)
- **Fontes:** Google Fonts — Playfair Display, DM Sans, Space Mono
- **Ícones:** Font Awesome 6 + Lucide Icons
- **Animações:** CSS keyframes + transitions (sem Framer Motion)
- **Geração de imagens:** Canvas API nativa do browser (sem html2canvas externo quando possível)

> ⚠️ Nunca sugerir React, Vue, Next.js, Tailwind ou qualquer bundler. O projeto roda como arquivos estáticos.

---

## Paleta de Cores (Variáveis CSS — `css/global.css`)

```
--cream:   #F4F0E6   (texto principal em fundos escuros)
--gold:    #E8C96A   (destaque / CTA)
--sage:    #5A8A4A   (verde médio — bordas, acentos)
--sage2:   #7DC063   (verde claro — hover)
--muted:   #771717   (vermelho escuro — alertas)
```

### Cores de Interface
| Uso | Valor |
|-----|-------|
| Fundo navbar/loader | `#F4F8FB` (branco gelo) |
| Verde escuro (headers) | `#1A3312` |
| Verde médio | `#5A8A4A` |
| Vermelho suave | `#8A1818` |
| Texto principal | `#1A1A18` |
| Texto secundário | `#555550` |
| Bordas | `rgba(90,138,74,0.20)` |

---

## Arquivos do Projeto

```
/
├── index.html          — Landing page pública
├── form.html           — Formulário de doação (3 passos)
├── admin.html          — Painel administrativo
├── dashboard.html      — Analytics e relatórios
├── voluntario.html     — Cadastro de voluntários
├── gallery.html        — Galeria de fotos
├── components/
│   ├── navbar.html     — Navbar (injetada via app.js em todas as páginas)
│   └── footer.html     — Rodapé compartilhado
├── css/
│   ├── global.css      — Estilos base + variáveis + loader + navbar + toast
│   ├── form.css        — Estilos do formulário e recibo
│   ├── admin.css       — Painel admin
│   └── carousel.css    — Galeria carrossel
├── js/
│   ├── app.js          — Motor central: loader, navbar, toast, animações
│   ├── api.js          — LocalStorage + Supabase (camada de dados)
│   ├── form.js         — Lógica dos 3 passos do formulário
│   ├── admin.js        — Lógica do painel admin
│   └── comprovante-canvas.js — Gerador de imagem PNG do recibo (Canvas API)
├── logo-semear.jpeg    — Logo retrato da Ação Social Semear (853×1280)
└── logo-maanaim.jpeg   — Logo circular da Comunidade Maanaim (500×500)
```

---

## Padrões de Design

### Navbar
- Fundo sempre **branco gelo `#F4F8FB`** — desktop E mobile
- Logo Semear: formato **retrato** (não circular), `border-radius: 8px`
- Logo Maanaim: formato **circular** (`border-radius: 50%`)
- Hamburguer: cor `#1A3312` (verde escuro) sobre fundo claro
- Comportamento scroll: sombra aumenta ao rolar, fundo permanece branco gelo

### Loader
- Logo Semear em formato **retrato** `88×132px`, `border-radius: 14px`
- Anel externo pulsante (verde) + anel interno giratório (vermelho/verde)
- Texto "Ação Social Semear · Belém, PA" abaixo do logo
- Barra de progresso com gradiente verde → vermelho

### Recibo / Comprovante
- Cabeçalho: duas logos lado a lado (Semear retrato + Maanaim circular)
- Fonte monospace para protocolo e dados técnicos
- `html2canvas` captura o `#receipt-paper` clonado fora da tela (resolução 2×)
- Compartilhamento via `navigator.share` no mobile, download + WhatsApp Web no desktop

### Cards e Superfícies
- `background: var(--surface)` com `border: 1px solid var(--border)`
- Sombra em camadas: `box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
- `border-radius: 12px` padrão, `16px` para cards maiores
- Hover: `transform: translateY(-2px)` + sombra aumentada

### Botões
- Primário: fundo `var(--gold)`, texto escuro, hover com `brightness(1.08)`
- Outline: borda `var(--border)`, fundo transparente, hover com fundo suave
- Transição mínima: `transition: all 0.3s ease`
- Estados: `disabled` com `opacity: 0.5; cursor: not-allowed`

### Animações
- **Entrada de elementos:** `opacity: 0 → 1` + `translateY(20px → 0)` com `IntersectionObserver`
- **Micro-interações:** `transition: 0.2s–0.4s ease`
- **Loader pulse:** `@keyframes loaderPulse` — escala 1 → 1.06
- **Spin:** `@keyframes loaderRingSpin` — 360deg linear infinite

---

## Regras de Código

### JavaScript
- **ES5 compatível** onde possível (usar `var`, `function`, `.forEach`) — o código existente usa esse estilo
- Funções globais nomeadas descritivamente: `inicializarNavbar()`, `doaBuildRecibo()`
- Sem classes ES6 desnecessárias; prefira funções simples
- Comentários em português explicando o "porquê", não o "o quê"
- `console.log` de debug deve ser removido antes de entregar

### CSS
- Variáveis CSS em `:root` no `global.css` — não criar variáveis locais duplicadas
- Mobile-first quando possível; breakpoints: `480px`, `768px`, `1024px`
- `!important` apenas em overrides de media query de componentes externos
- Prefixos `-webkit-` para `backdrop-filter` e `-webkit-backdrop-filter`

### HTML
- Atributos `aria-label` em todos os botões sem texto visível
- `alt` descritivo em imagens informativas; `alt=""` em imagens decorativas
- `loading="lazy"` em imagens abaixo do fold
- IDs únicos e semânticos: `r-proto`, `r-nome`, `btn-share-wa`

---

## Funcionalidades Principais

### Formulário de Doação (3 passos)
1. **Passo 1** — Seleção de itens da cesta básica (cartões com quantidade)
2. **Passo 2** — Dados do doador (nome, WhatsApp, forma de entrega)
3. **Passo 3** — Comprovante em estilo cupom fiscal + compartilhamento

### Geração de Comprovante
- `html2canvas` captura `#receipt-paper` (clone fora da tela para evitar `display:none` no pai)
- `navigator.share({ files: [png] })` no mobile
- Download automático + WhatsApp Web no desktop
- Protocolo único: `DOA-YYYYMMDD-XXXXX`

### Admin
- Autenticação por senha local (sem OAuth)
- CRUD de itens disponíveis para doação
- Galeria de fotos (upload de URL)
- Configuração de integração WhatsApp

---

## O que NÃO fazer
- ❌ Não instalar npm packages de UI (Bootstrap, Materialize, etc.)
- ❌ Não converter para React/Vue/Angular
- ❌ Não usar `document.write()`
- ❌ Não criar arquivos `.ts` ou `.tsx`
- ❌ Não adicionar build steps (webpack, vite, parcel)
- ❌ Não duplicar CSS já definido em `global.css`
- ❌ Não criar helpers para operações únicas
- ❌ Não adicionar `console.log` em produção
- ❌ Não usar `innerHTML` com dados do usuário sem escapar (`escHtml()`)
