# Super Admin · Guia de Setup (Fases 0 e 1)

Painel Super Admin Premium do dono da plataforma DoaVida.

**Fase 0** entrega a fundação: tabelas-base com rascunho/publicado, RLS, versionamento, login seguro, layout responsivo e CRUD de páginas + histórico.

**Fase 1** adiciona o editor por página (lista de seções com drag-and-drop nativo, CRUD completo com slide-in panel) e o **Preview Responsivo** (iframe sandbox com 28 modelos de dispositivo + tamanho personalizado + zoom + tela cheia).

Sem quebrar nada do site atual: o painel é uma rota nova; nenhuma página existente foi alterada.

---

## 1. Aplicar as migrações

1. Abra o Supabase do projeto → **SQL Editor**.
2. Garanta que `db/schema.sql` já foi executado (deve estar — é o schema do site).
3. Execute, **nesta ordem**:
   1. **[`001_super_admin_foundation.sql`](001_super_admin_foundation.sql)** — fundação (Fase 0)
   2. **[`002_phase1_devices_and_section_types.sql`](002_phase1_devices_and_section_types.sql)** — presets de dispositivos + tipos de seção (Fase 1)
   3. **[`003_phase2_media_library.sql`](003_phase2_media_library.sql)** — biblioteca de mídia + bucket `super-admin` (Fase 2)
   4. **[`004_phase2_5_forms.sql`](004_phase2_5_forms.sql)** — Form Builder + respostas (Fase 2.5)
   5. **[`005_phase3_widgets.sql`](005_phase3_widgets.sql)** — Dashboards + widgets configuráveis (Fase 3)
   6. **[`006_phase4_animations_loading.sql`](006_phase4_animations_loading.sql)** — Animações, efeitos, 3D, transições + Loading Page (Fase 4)
   7. **[`007_phase5_identity_receipts.sql`](007_phase5_identity_receipts.sql)** — Fontes, paletas, textos globais e recibos (Fase 5)
   8. **[`008_phase6_agent.sql`](008_phase6_agent.sql)** — Agente Dona Assunção: categorias, conhecimentos, configurações, perguntas sem resposta (Fase 6)
   9. **[`009_phase7_commands.sql`](009_phase7_commands.sql)** — Comandos seguros + log de execução (Fase 7)

4. No final você verá:

   ```
   NOTICE  [Super Admin] Fundação aplicada. Páginas seed: 6
   NOTICE  [Super Admin · Fase 1] Devices: 28 · Section types: 12
   NOTICE  [Super Admin · Fase 2] site_media + bucket "super-admin" prontos.
   NOTICE  [Super Admin · Fase 2.5] site_forms + site_form_fields + site_form_submissions prontos.
   NOTICE  [Super Admin · Fase 3] admin_widgets pronto · super_admin_publish estendido para forms+widgets.
   NOTICE  [Super Admin · Fase 4] Presets: 25+ · Loading pages: 1
   NOTICE  [Super Admin · Fase 5] Fontes: 15 · Paletas: 4 · Textos globais: 13 · Recibos: 1
   NOTICE  [Super Admin · Fase 6] Categorias: 12 · Conhecimentos: 4 · Settings: 1
   NOTICE  [Super Admin · Fase 7] Comandos pré-aprovados: 14
   ```

Todas as migrações são **idempotentes** — pode rodar de novo sem efeitos colaterais.

---

## 2. Criar o usuário do dono do sistema

1. No Supabase: **Authentication → Users → Add user → Create new user**.
2. Preencha **e-mail** + **senha**. Marque **"Auto Confirm User"** para evitar passo de confirmação por e-mail.
3. **Pronto.** O *trigger* `on_auth_user_created` vai criar o `profile` correspondente e — por ser o **primeiro usuário** da tabela `profiles` — promovê-lo automaticamente para `super_admin`.

> Quer promover outro usuário depois? Rode no SQL Editor:
> ```sql
> UPDATE profiles SET role = 'super_admin'
> WHERE email = 'novo.email@dominio.com';
> ```

---

## 3. Acessar o painel

Abra o site no navegador e vá para:

```
/super-admin.html
```

Faça login com o e-mail e senha cadastrados. Se o role for `super_admin`, o painel abre.
Caso contrário, é feito *signOut* automático.

---

## 4. O que está liberado nesta entrega (Fases 0 + 1 + 2)

| Área | Estado |
|---|---|
| Login Supabase Auth + verificação de role | ✅ |
| Layout responsivo (sidebar, topbar, breadcrumbs) | ✅ |
| Visão Geral com métricas reais do banco | ✅ |
| Páginas — listar / criar / editar / reordenar / publicar / soft-delete | ✅ |
| Editor por página — abrir uma página e gerenciar suas seções | ✅ Fase 1 |
| Seções — criar / editar / reordenar (drag-and-drop nativo + setas) / publicar / excluir | ✅ Fase 1 |
| Preview Responsivo — iframe com 28 modelos de dispositivo + custom + zoom + tela cheia | ✅ Fase 1 |
| **Editor de Cards** — abrir uma seção e gerenciar seus cards (CRUD + DnD + media picker) | ✅ Fase 2 |
| **Biblioteca de Mídia** — upload (Supabase Storage) + busca + filtro por tipo/categoria + edição de metadados | ✅ Fase 2 |
| **Renderizador dinâmico** (`js/site-content.js`) — site público pode ler do banco, com fallback para HTML estático | ✅ Fase 2 (opt-in) |
| **Preview de rascunho** — `super-admin-preview.html?page=:slug&mode=draft` mostra o RASCUNHO em tempo real | ✅ Fase 2 |
| **Form Builder** — criar formulários com 11 tipos de campo, drag-and-drop, validação e mensagens | ✅ Fase 2.5 |
| **Submit funcional** — formulários renderizados pelo `site-content.js` enviam para `site_form_submissions` | ✅ Fase 2.5 |
| **Caixa de respostas** — visualizar submissões, marcar como lida/respondida/arquivada | ✅ Fase 2.5 |
| **Dashboards** — cada página admin é uma dashboard com widgets · grid Bento responsiva · drag-and-drop | ✅ Fase 3 |
| **Widgets** — KPI · progress · lista · tabela · 6 tipos de gráfico (bar, line, area, pie, doughnut, radar via Chart.js) · custom HTML | ✅ Fase 3 |
| **Editor visual de widget** — fonte de dados (allowlist), agregação (count/sum/avg), groupBy, filtros JSON, período (últimos N dias), cores, ícone, prefixo/sufixo, meta · pré-visualização ao vivo | ✅ Fase 3 |
| **Biblioteca de presets** — animações, efeitos, 3D, transições, fundos, texto · paginada (preparada p/ 500 por categoria) · busca + filtros + preview ao vivo · CSS livre por preset | ✅ Fase 4 |
| **Editor de Loading Page** — logo, anel, barra, mensagens rotativas, cores, durações · pré-visualização ao vivo | ✅ Fase 4 |
| **Aplicação automática** no site público via `data-sa-anim="<chave>"` (carregamento sob demanda dos presets ativos) | ✅ Fase 4 |
| **Biblioteca de Fontes** — Google Fonts paginadas, com filtro por categoria/nível e preview ao vivo da família | ✅ Fase 5 |
| **Cores & Paletas** — paletas reutilizáveis com tokens semânticos (primary, secondary, accent, background, surface, text, text_soft, border) + paleta padrão | ✅ Fase 5 |
| **Textos globais** — chave/valor com locales (pt-BR, en) + 17 áreas (botões, modais, recibos, e-mails, vazios, erros…) | ✅ Fase 5 |
| **Recibos & Comprovantes** — editor visual do template de recibo com preview ao vivo + configuração do fluxo Pix | ✅ Fase 5 |
| **Dona Assunção** — base de conhecimento aprovada (CRUD + busca + 12 categorias seed) · 5 tons de voz · instruções permanentes · limites · simulador de conversa com matching local determinístico (palavras-chave + prioridade + sem IA externa) | ✅ Fase 6 |
| **Caixa de perguntas sem resposta** — visitantes geram entradas; super_admin transforma em conhecimento com 1 clique | ✅ Fase 6 |
| **Comandos seguros** — whitelist de 16 tipos de ação · runtime client-side validado · 14 comandos pré-aprovados (WhatsApp, ligar, e-mail, modal, copiar Pix, publicar, aprovar/recusar, exportar CSV, soft delete) · log auditável de toda execução | ✅ Fase 7 |
| **Histórico avançado** — filtros (entidade, ação, busca) + tab de Versões com **diff JSON** chave-a-chave (vermelho/verde/amarelo) + restauração com 1 clique | ✅ Fase 7 |
| Versionamento (auto a cada `publish`) | ✅ |
| Restauração de versão anterior (RPC `super_admin_restore_version`) | ✅ via API; UI dedicada nas próximas fases |
| Dashboards · Gráficos editáveis | ⏳ Fase 3 |
| Animações · Efeitos · 3D · Loading Page | ⏳ Fase 4 |
| Recibos · Comprovantes · Mensagens globais | ⏳ Fase 5 |
| Agente Dona Assunção · Comandos seguros | ⏳ Fases 6–7 |

---

## 5. Arquitetura criada

```
/super-admin.html                          ← rota do painel (estática, fora das rotas atuais)

/db/super-admin/
  001_super_admin_foundation.sql           ← TODA a Fase 0 numa migração idempotente
  README.md                                ← este guia

/css/super-admin.css                       ← design system isolado do painel (prefixo .sa-)

/js/super-admin/
  bootstrap.js                             ← entry point: auth → boot → router
  core/
    store.js                               ← estado central + pub/sub + toast
    auth.js                                ← Supabase Auth + checagem de role
    api.js                                 ← CRUD genérico das tabelas do painel
    publish.js                             ← rascunho → publicado (RPC)
    history.js                             ← logs e versões (RPC)
    router.js                              ← hash router (#/overview, #/pages, etc.)
  ui/
    layout.js                              ← sidebar + topbar + breadcrumbs
  views/
    overview.js                            ← métricas reais do banco
    pages.js                               ← editor CRUD de páginas
    history.js                             ← histórico paginado
```

### Tabelas criadas

| Tabela | Função |
|---|---|
| `profiles` | Espelho de `auth.users` com coluna `role` (`super_admin`/`admin`/`user`) |
| `site_pages` | Páginas (públicas e admin) com `draft_payload` + `published_payload` |
| `site_sections` | Seções dentro de cada página |
| `site_cards` | Cards dentro de cada seção |
| `system_versions` | Snapshot completo a cada publicação (rollback) |
| `system_change_logs` | Log de toda ação do painel (auditoria) |

### Funções (RPC)

| RPC | Para quê |
|---|---|
| `is_super_admin()` | Helper de RLS |
| `is_admin_or_above()` | Helper de RLS |
| `super_admin_publish` | `draft → published` + cria versão + log |
| `super_admin_restore_version` | Volta uma versão antiga como `draft` |
| `super_admin_reorder` | Reordenação em lote (drag-and-drop) |
| `super_admin_soft_delete` | Soft delete + log |

Toda RPC é **`SECURITY DEFINER`** com `is_super_admin()` no topo — garante que mesmo um JWT inválido recusa.

### RLS resumido

| Tabela | `SELECT` | Escrita |
|---|---|---|
| `site_pages`, `site_sections`, `site_cards` | público lê `status='published' AND deleted_at IS NULL`; super_admin lê tudo | apenas `super_admin` |
| `profiles` | usuário lê o próprio; admin lê todos | apenas `super_admin` atualiza |
| `system_versions`, `system_change_logs` | apenas `super_admin` | escrita só via RPC `SECURITY DEFINER` |

---

## 6. Como o site público vai consumir esses dados (próximas fases)

A Fase 1 trará um *content loader* leve em `js/site-content.js` que:

1. Tenta ler de `site_pages → site_sections → site_cards` o `published_payload`.
2. Se vazio (primeira execução / banco offline), **renderiza o HTML/CSS estático atual como fallback** — zero risco de quebrar produção.
3. Suporta cache local com `localStorage` + revalidação no fundo.

Por isso `index.html`, `admin.html`, `form.html` etc. **permanecem intocados** nesta Fase 0.

---

## 7. Solução de problemas

| Sintoma | Provável causa | Como resolver |
|---|---|---|
| `Falha ao carregar as métricas` na Visão Geral | Migração ainda não aplicada | Rode `001_super_admin_foundation.sql` |
| `Esta conta não tem permissão de super_admin` | Não é o primeiro usuário, ou role ficou como `admin` | Rode `UPDATE profiles SET role='super_admin' WHERE email='...';` |
| `E-mail ou senha incorretos` mesmo correto | Usuário criado sem "Auto Confirm" | Em **Authentication → Users → Edit**, marque como confirmado |
| Painel mostra `Supabase não configurado` | `js/services/supabase.js` sem URL/anon key | Já está configurado neste projeto — ignore |
| Páginas listadas só mostram quem tem `status=published` | Você está acessando como `anon` (sem login) | Faça login no painel — `super_admin` enxerga drafts e arquivados |

---

## 8. O que vem depois

Próximas fases (na ordem):

1. **Fase 1** — Editor de seções + Preview Responsivo (iframe + 30 modelos de dispositivo + custom + fullscreen)
2. **Fase 2** — Cards · Botões · Formulários · Mídia
3. **Fase 3** — Dashboards e Gráficos editáveis
4. **Fase 4** — Animações · Efeitos · 3D · Transições · Loading Page
5. **Fase 5** — Recibos · Comprovantes · Mensagens · Textos Globais
6. **Fase 6** — Agente Dona Assunção
7. **Fase 7** — Comandos Seguros + Histórico avançado com diff visual

Cada fase é entregável independente, testável e segura. Nenhuma quebra a anterior.
