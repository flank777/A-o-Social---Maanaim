/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · content-manifest.js                                  ║
  ║  Mapa estático de TUDO que já existe no projeto DoaVida.            ║
  ║  Usado pelo Editor Manual para importar, exibir e editar conteúdo  ║
  ║  que estava hardcoded no HTML/JS antes do painel existir.           ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  window.SA = window.SA || {};

  window.SA.manifest = {
    version: '1.0.0',

    /* ── Páginas & Seções ──────────────────────────────────────────── */
    pages: [
      /* ── Página Inicial ─────────────────────────────────────────── */
      {
        key:         'index',
        slug:        'index',
        file:        'index.html',
        route:       '/',
        title:       'Página Inicial',
        area_type:   'site_publico',
        order_index: 1,
        canHide:     false,
        canDelete:   false,
        description: 'Landing page principal — hero, missão, como funciona, CTA.',
        sections: [
          {
            key:           'hero',
            internal_name: 'hero_principal',
            name:          'Hero Principal',
            type:          'hero',
            order_index:   1,
            title:         'Transformamos doações em esperança real.',
            subtitle:      '',
            description:   'A Ação Social Semear e a Comunidade Maanaim unem esforços para transformar doações em cestas que chegam a quem mais precisa.',
            buttons: [
              { key: 'hero_cta_primary', text: 'Fazer uma Doação', link: 'form.html',  type: 'primary' },
              { key: 'hero_cta_ghost',   text: 'Como Funciona',    link: '#how',        type: 'ghost'   }
            ],
            images: [
              { key: 'hero_bg', alt: 'Cesta básica de alimentos', url: '', where: 'Fundo do hero' }
            ],
            texts: [
              { key: 'hero_badge',      label: 'Badge localidade',    value: 'Belém, Pará — Brasil' },
              { key: 'hero_title',      label: 'Título principal',     value: 'Transformamos doações em esperança real.' },
              { key: 'hero_desc',       label: 'Descrição',            value: 'A Ação Social Semear e a Comunidade Maanaim unem esforços para transformar doações em cestas que chegam a quem mais precisa.' },
              { key: 'hero_float',      label: 'Card flutuante',       value: '+1.200 cestas entregues este mês' },
              { key: 'hero_btn_primary',label: 'Botão primário',       value: 'Fazer uma Doação' },
              { key: 'hero_btn_ghost',  label: 'Botão secundário',     value: 'Como Funciona' }
            ]
          },
          {
            key:           'mission',
            internal_name: 'missao',
            name:          'Nossa Missão',
            type:          'text',
            order_index:   2,
            title:         'Por que existimos',
            subtitle:      '',
            description:   'A fome não espera. Por isso, a Semear e a Maanaim se unem para conectar quem quer ajudar com quem precisa de apoio, transformando gestos simples em impacto real.',
            images: [
              { key: 'missao_foto1', alt: 'Ação social foto 1', url: '', where: 'Stack fotos missão — 1ª imagem' },
              { key: 'missao_foto2', alt: 'Ação social foto 2', url: '', where: 'Stack fotos missão — 2ª imagem' }
            ],
            cards: [
              { key: 'pilar_missao',         title: 'Nossa Missão',        icon: 'fa-heart',          description: 'Conectar doadores a famílias em situação de vulnerabilidade alimentar em Belém.' },
              { key: 'pilar_impacto',         title: 'Impacto Real',         icon: 'fa-hand-holding-heart', description: '100% das doações chegam diretamente às famílias, sem desvios.' },
              { key: 'pilar_transparencia',   title: 'Transparência Total',  icon: 'fa-chart-bar',      description: 'Acompanhe os dados em tempo real e saiba exatamente onde sua doação foi.' },
              { key: 'pilar_raizes',          title: 'Raízes em Belém',      icon: 'fa-map-marker-alt', description: 'Conhecemos cada família pessoalmente. Atuamos com respeito e dignidade.' }
            ],
            texts: [
              { key: 'mission_label', label: 'Label seção',  value: 'Nossa Missão' },
              { key: 'mission_title', label: 'Título',        value: 'Por que existimos' },
              { key: 'mission_desc',  label: 'Descrição',     value: 'A fome não espera. Por isso, a Semear e a Maanaim se unem para conectar quem quer ajudar com quem precisa de apoio.' }
            ]
          },
          {
            key:           'how',
            internal_name: 'como_funciona',
            name:          'Como Funciona',
            type:          'steps',
            order_index:   3,
            title:         'Como funciona',
            subtitle:      '',
            description:   'Passo a passo visual do processo de doação — desde a escolha dos itens até a entrega à família.',
            texts: [
              { key: 'how_title', label: 'Título seção', value: 'Como funciona' }
            ]
          },
          {
            key:           'cta',
            internal_name: 'cta_principal',
            name:          'CTA Principal',
            type:          'cta',
            order_index:   4,
            title:         'Sua doação alimenta esperança',
            subtitle:      'Cada cesta muda uma vida',
            description:   'Junte-se a centenas de doadores que já transformaram realidades em Belém do Pará.',
            buttons: [
              { key: 'cta_btn', text: 'Quero Ajudar', link: 'form.html', type: 'primary' }
            ],
            texts: [
              { key: 'cta_title',  label: 'Título CTA',      value: 'Sua doação alimenta esperança' },
              { key: 'cta_sub',    label: 'Subtítulo CTA',   value: 'Cada cesta muda uma vida' },
              { key: 'cta_btn',    label: 'Botão CTA',       value: 'Quero Ajudar' }
            ]
          }
        ]
      },

      /* ── Formulário de Doação ────────────────────────────────────── */
      {
        key:         'form',
        slug:        'form',
        file:        'form.html',
        route:       '/form.html',
        title:       'Formulário de Doação',
        area_type:   'site_publico',
        order_index: 2,
        canHide:     false,
        canDelete:   false,
        description: 'Formulário de 3 passos: seleção de itens, dados do doador e comprovante.',
        sections: [
          {
            key:           'form_step1',
            internal_name: 'selecao_itens',
            name:          'Seleção de Itens',
            type:          'form',
            order_index:   1,
            title:         'Escolha os itens que deseja doar',
            description:   'Passo 1 — cards de alimentos com quantidade selecionável.',
            texts: [
              { key: 'form_s1_title',    label: 'Título passo 1',     value: 'Escolha os itens que deseja doar' },
              { key: 'form_s1_search',   label: 'Placeholder busca',  value: 'Buscar alimento…' }
            ]
          },
          {
            key:           'form_step2',
            internal_name: 'dados_doador',
            name:          'Dados do Doador',
            type:          'form',
            order_index:   2,
            title:         'Seus dados para contato',
            description:   'Passo 2 — nome, WhatsApp, forma de entrega.',
            texts: [
              { key: 'form_s2_title',    label: 'Título passo 2',     value: 'Seus dados para contato' },
              { key: 'form_s2_name',     label: 'Label nome',         value: 'Seu nome completo' },
              { key: 'form_s2_phone',    label: 'Label WhatsApp',     value: 'WhatsApp' },
              { key: 'form_s2_delivery', label: 'Label entrega',      value: 'Como prefere entregar?' }
            ]
          },
          {
            key:           'form_step3',
            internal_name: 'comprovante',
            name:          'Comprovante',
            type:          'custom',
            order_index:   3,
            title:         'Doação confirmada!',
            description:   'Passo 3 — comprovante estilo cupom fiscal com compartilhamento.',
            texts: [
              { key: 'form_s3_title',   label: 'Título confirmação',      value: 'Doação confirmada!' },
              { key: 'form_s3_share_wa',label: 'Botão compartilhar WA',   value: 'Compartilhar no WhatsApp' },
              { key: 'form_s3_download',label: 'Botão download',          value: 'Baixar comprovante' }
            ]
          }
        ]
      },

      /* ── Voluntários ─────────────────────────────────────────────── */
      {
        key:         'voluntario',
        slug:        'voluntario',
        file:        'voluntario.html',
        route:       '/voluntario.html',
        title:       'Voluntários',
        area_type:   'site_publico',
        order_index: 3,
        canHide:     true,
        canDelete:   false,
        description: 'Cadastro e listagem de voluntários da Ação Social Semear.',
        sections: [
          {
            key:           'vol_hero',
            internal_name: 'hero_voluntarios',
            name:          'Hero Voluntários',
            type:          'hero',
            order_index:   1,
            title:         'Seja um voluntário',
            description:   'Junte-se à missão de transformar vidas em Belém do Pará.',
            images: [
              { key: 'vol_hero_bg', alt: 'Voluntários em ação', url: '', where: 'Fundo hero voluntários' }
            ],
            texts: [
              { key: 'vol_hero_title', label: 'Título hero voluntários', value: 'Seja um voluntário' },
              { key: 'vol_hero_desc',  label: 'Descrição',               value: 'Junte-se à missão de transformar vidas em Belém do Pará.' }
            ]
          },
          {
            key:           'vol_types',
            internal_name: 'tipos_voluntariado',
            name:          'Tipos de Voluntariado',
            type:          'cards',
            order_index:   2,
            title:         'Como você pode ajudar',
            description:   'Cards com tipos de trabalho voluntário disponíveis.',
            texts: [
              { key: 'vol_types_title', label: 'Título seção tipos', value: 'Como você pode ajudar' }
            ]
          },
          {
            key:           'vol_form',
            internal_name: 'formulario_inscricao',
            name:          'Formulário de Inscrição',
            type:          'form',
            order_index:   3,
            title:         'Quero ser voluntário',
            texts: [
              { key: 'vol_form_title', label: 'Título formulário', value: 'Quero ser voluntário' },
              { key: 'vol_form_btn',   label: 'Botão enviar',      value: 'Enviar inscrição' }
            ]
          }
        ]
      },

      /* ── Galeria ─────────────────────────────────────────────────── */
      {
        key:         'gallery',
        slug:        'galeria',
        file:        'gallery.html',
        route:       '/gallery.html',
        title:       'Galeria de Fotos',
        area_type:   'site_publico',
        order_index: 4,
        canHide:     true,
        canDelete:   false,
        description: 'Galeria de fotos das ações e eventos — grid responsivo com modal lightbox.',
        sections: [
          {
            key:           'gallery_grid',
            internal_name: 'galeria_fotos',
            name:          'Grade de Fotos',
            type:          'gallery',
            order_index:   1,
            title:         'Nossa Galeria',
            description:   'Grid responsivo com lightbox e filtros por categoria.',
            texts: [
              { key: 'gallery_title', label: 'Título galeria', value: 'Nossa Galeria' },
              { key: 'gallery_empty', label: 'Mensagem vazia', value: 'Nenhuma foto ainda.' }
            ]
          }
        ]
      },

      /* ── Admin (área interna) ────────────────────────────────────── */
      {
        key:         'admin',
        slug:        'admin',
        file:        'admin.html',
        route:       '/admin.html',
        title:       'Painel Admin',
        area_type:   'admin',
        order_index: 1,
        canHide:     false,
        canDelete:   false,
        description: 'Painel administrativo com doações, alimentos, famílias, voluntários e gráficos.',
        sections: [
          { key: 'admin_overview',    internal_name: 'visao_geral',    name: 'Visão Geral',    type: 'custom', order_index: 1, title: 'Visão Geral Admin',     description: 'Cards de resumo — total de doações, famílias e alimentos.' },
          { key: 'admin_doacoes',     internal_name: 'doacoes',         name: 'Doações',        type: 'custom', order_index: 2, title: 'Gestão de Doações',     description: 'Lista, filtro e edição de registros de doações.' },
          { key: 'admin_alimentos',   internal_name: 'alimentos',       name: 'Alimentos',      type: 'custom', order_index: 3, title: 'Gestão de Alimentos',   description: 'CRUD de itens disponíveis para doação.' },
          { key: 'admin_familias',    internal_name: 'familias',        name: 'Famílias',       type: 'custom', order_index: 4, title: 'Gestão de Famílias',    description: 'Cadastro e acompanhamento de famílias atendidas.' },
          { key: 'admin_voluntarios', internal_name: 'voluntarios_adm', name: 'Voluntários',    type: 'custom', order_index: 5, title: 'Gestão de Voluntários', description: 'Lista e aprovação de inscrições de voluntários.' },
          { key: 'admin_graficos',    internal_name: 'graficos_admin',  name: 'Gráficos',       type: 'custom', order_index: 6, title: 'Gráficos Admin',        description: 'Gráficos de barras e linhas Chart.js.' }
        ]
      },

      /* ── Dashboard / Analytics ───────────────────────────────────── */
      {
        key:         'dashboard',
        slug:        'dashboard',
        file:        'dashboard.html',
        route:       '/dashboard.html',
        title:       'Analytics',
        area_type:   'admin',
        order_index: 2,
        canHide:     true,
        canDelete:   false,
        description: 'Dashboard público de métricas — kg doados, famílias atendidas, doações totais.',
        sections: [
          {
            key:           'dash_metrics',
            internal_name: 'metricas',
            name:          'Métricas',
            type:          'stats',
            order_index:   1,
            title:         'Métricas em Tempo Real',
            cards: [
              { key: 'dash_kg',       title: 'Kg Doados',          icon: 'fa-weight-scale', description: 'Total de kg de alimentos doados.' },
              { key: 'dash_familias', title: 'Famílias Atendidas',  icon: 'fa-people-roof',  description: 'Famílias que já receberam cestas.' },
              { key: 'dash_doacoes',  title: 'Doações Registradas', icon: 'fa-gift',         description: 'Total de registros de doação.' },
              { key: 'dash_alimentos',title: 'Tipos de Alimento',   icon: 'fa-apple-whole',  description: 'Variedade de alimentos no sistema.' }
            ],
            texts: [
              { key: 'dash_title', label: 'Título dashboard', value: 'Métricas em Tempo Real' }
            ]
          },
          {
            key:           'dash_charts',
            internal_name: 'graficos_dashboard',
            name:          'Gráficos',
            type:          'custom',
            order_index:   2,
            title:         'Progresso das Doações',
            description:   'Gráficos de progresso e distribuição.'
          }
        ]
      }
    ],

    /* ── Componentes globais ───────────────────────────────────────── */
    global: {
      navbar: {
        key:   'navbar',
        name:  'Barra de Navegação',
        file:  'components/navbar.html',
        links: [
          { key: 'nav_inicio',     text: 'Início',         href: 'index.html' },
          { key: 'nav_acao',       text: 'Nossa Ação',     href: '#mission' },
          { key: 'nav_como',       text: 'Como Funciona',  href: '#how' },
          { key: 'nav_voluntario', text: 'Voluntário',     href: 'voluntario.html' }
        ],
        cta: { key: 'nav_cta', text: 'Quero Doar', href: 'form.html' },
        texts: [
          { key: 'nav_cta_label',  label: 'Botão CTA navbar',  value: 'Quero Doar' },
          { key: 'nav_link_inicio',label: 'Link Início',        value: 'Início' },
          { key: 'nav_link_acao',  label: 'Link Nossa Ação',    value: 'Nossa Ação' },
          { key: 'nav_link_como',  label: 'Link Como Funciona', value: 'Como Funciona' },
          { key: 'nav_link_vol',   label: 'Link Voluntário',    value: 'Voluntário' }
        ]
      },
      footer: {
        key:   'footer',
        name:  'Rodapé',
        file:  'components/footer.html',
        links: [
          { key: 'foot_voluntario', text: 'Seja um Voluntário', href: 'voluntario.html' }
        ],
        texts: [
          { key: 'foot_copy',       label: 'Copyright',          value: '© Ação Social Semear · Comunidade Maanaim' },
          { key: 'foot_vol_link',   label: 'Link voluntário',    value: 'Seja um Voluntário' }
        ]
      }
    },

    /* ── Gráficos existentes ───────────────────────────────────────── */
    charts: [
      { key: 'chart_doacoes_mes',  name: 'Doações por Mês',      page: 'admin',     type: 'bar',  file: 'js/admin-charts-premium.js',   description: 'Barras — total de doações por mês.' },
      { key: 'chart_status_pie',   name: 'Status das Doações',   page: 'admin',     type: 'pie',  file: 'js/admin-charts-premium.js',   description: 'Pizza — distribuição por status (pendente/confirmado).' },
      { key: 'chart_kg_linha',     name: 'Kg Doados (Linha)',     page: 'dashboard', type: 'line', file: 'dashboard.html',               description: 'Linha de progresso total de kg ao longo do tempo.' },
      { key: 'chart_familias_bar', name: 'Famílias Atendidas',   page: 'dashboard', type: 'bar',  file: 'dashboard.html',               description: 'Barras — famílias atendidas por período.' }
    ],

    /* ── Mídias fixas existentes ───────────────────────────────────── */
    media: [
      { key: 'logo_semear',  name: 'Logo Ação Social Semear',    file: 'logo-semear.jpeg',  type: 'image', where: 'Navbar + Loader + Recibo', canReplace: true },
      { key: 'logo_maanaim', name: 'Logo Comunidade Maanaim',    file: 'logo-maanaim.jpeg', type: 'image', where: 'Navbar + Recibo',           canReplace: true }
    ]
  };

  /* ── Helpers de leitura do manifest ───────────────────────────── */
  window.SA.manifest.getPage = function (key) {
    return this.pages.find(function (p) { return p.key === key; }) || null;
  };

  window.SA.manifest.getPageBySlug = function (slug) {
    return this.pages.find(function (p) { return p.slug === slug; }) || null;
  };

  window.SA.manifest.allTexts = function () {
    var out = [];
    this.pages.forEach(function (page) {
      (page.sections || []).forEach(function (sec) {
        (sec.texts || []).forEach(function (t) {
          out.push(Object.assign({}, t, {
            page_slug:    page.slug,
            section_key:  sec.key,
            page_title:   page.title,
            section_name: sec.name
          }));
        });
      });
    });
    var gNav = (this.global.navbar.texts || []).map(function (t) {
      return Object.assign({}, t, { page_slug: '_navbar', section_key: 'navbar', page_title: 'Global', section_name: 'Barra de Navegação' });
    });
    var gFoot = (this.global.footer.texts || []).map(function (t) {
      return Object.assign({}, t, { page_slug: '_footer', section_key: 'footer', page_title: 'Global', section_name: 'Rodapé' });
    });
    return out.concat(gNav, gFoot);
  };

  window.SA.manifest.allMedia = function () {
    var out = this.media.slice();
    this.pages.forEach(function (page) {
      (page.sections || []).forEach(function (sec) {
        (sec.images || []).forEach(function (img) {
          out.push(Object.assign({}, img, {
            type:         'image',
            page_slug:    page.slug,
            section_key:  sec.key,
            page_title:   page.title,
            section_name: sec.name,
            canReplace:   true
          }));
        });
      });
    });
    return out;
  };
})();
