/* ══════════════════════════════════════════════════════════════════════
   gallery.js — Lógica da página de Galeria (/gallery.html)
   DoaVida · Ação Social Semear + Comunidade Evangélica Maanaim

   Este arquivo controla:
   ✅ Carregamento dos itens da galeria via DoaVidaAPI
   ✅ Três layouts: Grid, Masonry e Hero
   ✅ Modal com título, descrição, contexto e data
   ✅ Estado vazio quando não há itens
   ✅ Auto-refresh a cada 30 segundos
   ══════════════════════════════════════════════════════════════════════ */

/* ─── 1. ESTADO GLOBAL ────────────────────────────────────────────── */
/* Objeto que mantém o estado da galeria durante a sessão */
var GaleriaState = {
  items: [],              /* array com todos os itens carregados */
  layoutAtual: 'grid',    /* layout ativo: 'grid' | 'masonry' | 'hero' */
  intervalId: null         /* ID do setInterval para auto-refresh */
};

/* ─── 2. INICIALIZAÇÃO ────────────────────────────────────────────── */
/* Executa quando o DOM está completamente carregado */
document.addEventListener('DOMContentLoaded', function () {

  /* Verifica se estamos na página da galeria (guard clause) */
  var container = document.getElementById('gallery-container');
  if (!container) return; /* não é a página da galeria, sai */

  /* Carrega os itens da galeria pela primeira vez */
  carregarGaleria();

  /* Auto-refresh: recarrega a cada 30 segundos para pegar novos itens */
  GaleriaState.intervalId = setInterval(carregarGaleria, 30000);

  /* ── Listeners dos botões de layout ── */
  var botoesLayout = document.querySelectorAll('.layout-btn');
  botoesLayout.forEach(function (btn) {
    btn.addEventListener('click', function () {
      /* Remove classe 'active' de todos os botões */
      botoesLayout.forEach(function (b) { b.classList.remove('active'); });
      /* Adiciona 'active' no botão clicado */
      btn.classList.add('active');
      /* Atualiza o layout no estado e re-renderiza */
      GaleriaState.layoutAtual = btn.getAttribute('data-layout');
      renderizarGaleria();
    });
  });

  /* ── Fechar modal com botão X ── */
  var btnFechar = document.getElementById('gallery-modal-close');
  if (btnFechar) {
    btnFechar.addEventListener('click', fecharModalGaleria);
  }

  /* ── Fechar modal clicando no overlay ── */
  var overlay = document.getElementById('gallery-modal');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      /* Só fecha se clicou no overlay, não no conteúdo */
      if (e.target === overlay) fecharModalGaleria();
    });
  }

  /* ── Fechar modal com tecla Escape ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharModalGaleria();
  });
});

/* ─── 3. CARREGAR GALERIA ─────────────────────────────────────────── */
/* Busca itens da API e filtra apenas os públicos da categoria 'galeria' */
function carregarGaleria() {
  try {
    /* Busca todos os itens públicos da galeria */
    var todos = DoaVidaAPI.getGaleria(true);

    /* Filtra apenas itens da categoria 'galeria' (não 'home' nem 'logo') */
    GaleriaState.items = todos.filter(function (item) {
      return (item.category || item.tipo || 'galeria') === 'galeria';
    });

    /* Renderiza na tela */
    renderizarGaleria();
  } catch (erro) {
    console.error('Erro ao carregar galeria:', erro);
  }
}

/* ─── 4. RENDERIZAR GALERIA ───────────────────────────────────────── */
/* Despacha a renderização para o layout correto */
function renderizarGaleria() {
  var container = document.getElementById('gallery-container');
  var estadoVazio = document.getElementById('gallery-empty');
  if (!container) return;

  /* Se não há itens, mostra estado vazio */
  if (GaleriaState.items.length === 0) {
    container.innerHTML = '';
    if (estadoVazio) estadoVazio.classList.add('active');
    return;
  }

  /* Esconde estado vazio */
  if (estadoVazio) estadoVazio.classList.remove('active');

  /* Escolhe o layout com base no estado */
  switch (GaleriaState.layoutAtual) {
    case 'masonry':
      renderGaleriaMasonry(container);
      break;
    case 'hero':
      renderGaleriaHero(container);
      break;
    default:
      renderGaleriaGrid(container);
  }
}

/* ─── 5. LAYOUT GRID ─────────────────────────────────────────────── */
/* Renderiza itens em grade CSS (layout padrão) */
function renderGaleriaGrid(container) {
  var html = '<div class="gallery-grid">'; /* abre container grid */

  GaleriaState.items.forEach(function (item, i) {
    html += criarItemHTML(item, i); /* cria HTML de cada item */
  });

  html += '</div>'; /* fecha container */
  container.innerHTML = html; /* injeta no DOM */
}

/* ─── 6. LAYOUT MASONRY ──────────────────────────────────────────── */
/* Renderiza itens em colunas estilo Pinterest */
function renderGaleriaMasonry(container) {
  var html = '<div class="gallery-masonry">'; /* abre container masonry */

  GaleriaState.items.forEach(function (item, i) {
    html += criarItemHTML(item, i); /* cria HTML de cada item */
  });

  html += '</div>'; /* fecha container */
  container.innerHTML = html; /* injeta no DOM */
}

/* ─── 7. LAYOUT HERO ─────────────────────────────────────────────── */
/* Primeiro item grande (hero), restante em grid normal */
function renderGaleriaHero(container) {
  var html = '<div class="gallery-hero">'; /* abre container hero */

  GaleriaState.items.forEach(function (item, i) {
    html += criarItemHTML(item, i); /* cria HTML de cada item */
  });

  html += '</div>'; /* fecha container */
  container.innerHTML = html; /* injeta no DOM */
}

/* ─── 8. CRIAR HTML DE UM ITEM (DRY) ────────────────────────────── */
/* Função reutilizável que gera o HTML de um item individual */
function criarItemHTML(item, index) {
  /* Usa escHtml (de app.js) para prevenir XSS nos textos */
  var esc = window.escHtml || function (t) { return t; };

  /* Título: usa campo novo 'title' ou legado 'titulo' */
  var titulo = esc(item.title || item.titulo || '');
  /* Descrição: usa campo novo 'description' ou legado 'desc' */
  var descricao = esc(item.description || item.desc || '');
  /* Contexto do item */
  var contexto = esc(item.context || '');
  /* Tipo de mídia */
  var ehVideo = (item.mediaType || '').toLowerCase() === 'video';
  /* URL da mídia */
  var url = item.url || '';

  /* Monta o HTML do item */
  var html = '';
  html += '<div class="gallery-item" onclick="abrirModalGaleria(' + index + ')" role="button" tabindex="0" aria-label="' + (titulo || 'Imagem da galeria') + '">';

  /* Imagem ou placeholder de vídeo */
  if (ehVideo) {
    html += '<img src="' + url + '" alt="' + titulo + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%232a2a25%22 width=%22400%22 height=%22300%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23c9a84c%22 text-anchor=%22middle%22 font-size=%2240%22>▶</text></svg>\'">';
    html += '<span class="gallery-item-badge"><i class="fas fa-play"></i></span>';
  } else {
    html += '<img src="' + url + '" alt="' + titulo + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%232a2a25%22 width=%22400%22 height=%22300%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23c9a84c%22 text-anchor=%22middle%22 font-size=%2220%22>Sem imagem</text></svg>\'">';
  }

  /* Overlay com título e descrição (aparece no hover) */
  if (titulo || descricao) {
    html += '<div class="gallery-item-overlay">';
    if (titulo) html += '<h3>' + titulo + '</h3>';
    if (descricao) html += '<p>' + descricao.substring(0, 80) + (descricao.length > 80 ? '...' : '') + '</p>';
    html += '</div>';
  }

  html += '</div>'; /* fecha gallery-item */
  return html;
}

/* ─── 9. ABRIR MODAL ─────────────────────────────────────────────── */
/* Abre o modal com os detalhes completos de um item */
function abrirModalGaleria(index) {
  var item = GaleriaState.items[index];
  if (!item) return; /* item não encontrado */

  var esc = window.escHtml || function (t) { return t; };
  var modal = document.getElementById('gallery-modal');
  var mediaEl = document.getElementById('modal-media');
  var titleEl = document.getElementById('modal-title');
  var descEl = document.getElementById('modal-description');
  var ctxEl = document.getElementById('modal-context');
  var dateEl = document.getElementById('modal-date');

  if (!modal || !mediaEl) return;

  /* Determina se é vídeo ou imagem */
  var ehVideo = (item.mediaType || '').toLowerCase() === 'video';

  /* Popula a área de mídia */
  if (ehVideo) {
    mediaEl.innerHTML = '<video src="' + (item.url || '') + '" controls autoplay style="width:100%;max-height:500px;"></video>';
  } else {
    mediaEl.innerHTML = '<img src="' + (item.url || '') + '" alt="' + esc(item.title || item.titulo || '') + '">';
  }

  /* Popula os textos */
  if (titleEl) titleEl.textContent = item.title || item.titulo || '';
  if (descEl) descEl.textContent = item.description || item.desc || '';
  if (ctxEl) ctxEl.textContent = item.context || '';

  /* Formata a data */
  if (dateEl) {
    var dataStr = item.date || item.createdAt || '';
    if (dataStr) {
      try {
        var d = new Date(dataStr);
        dateEl.textContent = d.toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric'
        });
      } catch (e) {
        dateEl.textContent = dataStr;
      }
    } else {
      dateEl.textContent = '';
    }
  }

  /* Mostra o modal */
  modal.classList.add('active');
  /* Trava o scroll do body */
  document.body.style.overflow = 'hidden';
}

/* ─── 10. FECHAR MODAL ────────────────────────────────────────────── */
/* Fecha o modal e limpa a mídia */
function fecharModalGaleria() {
  var modal = document.getElementById('gallery-modal');
  if (!modal) return;

  modal.classList.remove('active');

  /* Limpa a mídia (para parar vídeos) */
  var mediaEl = document.getElementById('modal-media');
  if (mediaEl) mediaEl.innerHTML = '';

  /* Restaura scroll do body */
  document.body.style.overflow = '';
}
