/* ══════════════════════════════════════════════════════════════════════
   DoaVida — js/carousel.js
   Novo Sistema de Carrossel v2.0

   ✅ Lê fotos do localStorage (doavida_gallery)
   ✅ Suporte ilimitado de fotos
   ✅ Lazy loading com IntersectionObserver
   ✅ Navegação: setas, dots, thumbnails, teclado
   ✅ Swipe / touch (mobile)
   ✅ Autoplay com pausa no hover
   ✅ Sem dependências externas — Vanilla JS puro
   ══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Constantes ──────────────────────────────────────────────────── */
  var STORAGE_KEY  = 'doavida_gallery'; /* mesma chave do admin.js      */
  var AUTOPLAY_MS  = 5000;              /* intervalo do autoplay (5s)   */

  /* ── Estado interno ─────────────────────────────────────────────── */
  var _items        = [];   /* array de fotos carregadas               */
  var _current      = 0;   /* índice do slide atual                   */
  var _timer        = null; /* id do setInterval do autoplay           */
  var _touchStartX  = 0;   /* posição X do início do toque            */
  var _touchStartT  = 0;   /* timestamp do início do toque            */
  var _observer     = null; /* IntersectionObserver para lazy loading  */
  var _initialized  = false;

  /* ── Referências DOM ─────────────────────────────────────────────── */
  var _root, _viewport, _track, _btnPrev, _btnNext,
      _dotsEl, _counterEl, _thumbsEl, _skeletonEl, _emptyEl;

  /* ─────────────────────────────────────────────────────────────────
     1. UTILITÁRIOS
  ──────────────────────────────────────────────────────────────── */
  function _$ (id) { return document.getElementById(id); }

  /* Escapa HTML para prevenir XSS */
  function _esc(str) {
    return String(str || '')
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  /* Verifica se URL é vídeo */
  function _isVideo(url) {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || '');
  }

  /* ─────────────────────────────────────────────────────────────────
     2. CARREGAMENTO DE DADOS
  ──────────────────────────────────────────────────────────────── */
  function _loadPhotos() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      /* Apenas fotos públicas */
      var publicas = raw.filter(function (i) {
        return i.isPublic !== false;
      });

      /* Preferência: fotos marcadas para carrossel; fallback: todas */
      var carrossel = publicas.filter(function (i) {
        return i.carousel === true;
      });

      return carrossel.length > 0 ? carrossel : publicas;
    } catch (e) {
      console.warn('[DoaVidaCarousel] Erro ao ler localStorage:', e);
      return [];
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     3. LIGAÇÃO COM O DOM
  ──────────────────────────────────────────────────────────────── */
  function _bindDOM() {
    _root       = _$('dvc-root');
    _viewport   = _$('dvc-viewport');
    _track      = _$('dvc-track');
    _btnPrev    = _$('dvc-prev');
    _btnNext    = _$('dvc-next');
    _dotsEl     = _$('dvc-dots');
    _counterEl  = _$('dvc-counter');
    _thumbsEl   = _$('dvc-thumbs');
    _skeletonEl = _$('dvc-skeleton');
    _emptyEl    = _$('dvc-empty');
  }

  /* ─────────────────────────────────────────────────────────────────
     4. RENDERIZAÇÃO
  ──────────────────────────────────────────────────────────────── */
  function _render() {
    _items = _loadPhotos();

    /* Esconde skeleton */
    if (_skeletonEl) _skeletonEl.hidden = true;

    if (_items.length === 0) {
      /* Estado vazio */
      if (_root)    _root.hidden = true;
      if (_emptyEl) _emptyEl.hidden = false;
      return;
    }

    /* Há fotos — monta o carrossel */
    if (_emptyEl) _emptyEl.hidden = true;
    if (_root)    _root.hidden = false;

    _buildSlides();
    _buildDots();
    _buildThumbs();
    _goTo(0, false);   /* posiciona no primeiro slide sem animação */
    _bindEvents();
    _setupLazyLoad();
    _startAutoplay();
  }

  /* ── Slides ─────────────────────────────────────────────────────── */
  function _buildSlides() {
    if (!_track) return;
    _track.innerHTML = '';

    _items.forEach(function (item, i) {
      var slide = document.createElement('div');
      slide.className  = 'dvc-slide';
      slide.setAttribute('role', 'tabpanel');
      slide.setAttribute('aria-label', 'Slide ' + (i + 1) + ' de ' + _items.length);
      slide.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');

      var mediaHtml = '';
      if (_isVideo(item.url)) {
        /* Vídeo: carrega direto (não faz lazy load de vídeo) */
        mediaHtml =
          '<video class="dvc-slide__media dvc-loaded"' +
          ' src="' + _esc(item.url) + '"' +
          ' muted loop playsinline' +
          ' aria-label="' + _esc(item.title || 'Vídeo') + '">' +
          '</video>';
      } else {
        /*
          Imagem:
          - Slide 0: carrega imediatamente (src)
          - Slides 1+: lazy via data-src + IntersectionObserver
        */
        var srcAttr = i === 0 ? 'src' : 'data-src';
        mediaHtml =
          '<img class="dvc-slide__media' + (i === 0 ? ' dvc-loaded' : ' dvc-lazy') + '"' +
          ' ' + srcAttr + '="' + _esc(item.url) + '"' +
          ' alt="' + _esc(item.title || 'Foto da ação social') + '"' +
          ' loading="lazy" />';
      }

      /* Legenda (só se tiver título) */
      var captionHtml = item.title
        ? '<div class="dvc-slide__caption">' +
            '<h3 class="dvc-slide__title">' + _esc(item.title) + '</h3>' +
          '</div>'
        : '';

      slide.innerHTML = mediaHtml + captionHtml;
      _track.appendChild(slide);
    });
  }

  /* ── Dots de navegação ──────────────────────────────────────────── */
  function _buildDots() {
    if (!_dotsEl) return;
    _dotsEl.innerHTML = '';

    /* Sem dots para muitas fotos (> 12) — o counter e os thumbs bastam */
    if (_items.length > 12) { _dotsEl.hidden = true; return; }
    _dotsEl.hidden = false;

    _items.forEach(function (_, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dvc-dot';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', 'Ir para o slide ' + (i + 1));
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.addEventListener('click', function () { _goTo(i); _resetAutoplay(); });
      _dotsEl.appendChild(btn);
    });
  }

  /* ── Thumbnail strip ────────────────────────────────────────────── */
  function _buildThumbs() {
    if (!_thumbsEl) return;

    /* Sem thumbnails se houver 1 foto só */
    if (_items.length <= 1) { _thumbsEl.hidden = true; return; }
    _thumbsEl.hidden = false;
    _thumbsEl.innerHTML = '';

    _items.forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dvc-thumb' + (i === 0 ? ' dvc-thumb--active' : '');
      btn.setAttribute('aria-label', 'Ver slide ' + (i + 1));
      btn.setAttribute('role', 'listitem');

      if (_isVideo(item.url)) {
        btn.innerHTML = '<span class="dvc-thumb__play">▶</span>';
      } else {
        /* Lazy: carrega thumbnail apenas quando visível */
        btn.innerHTML =
          '<img data-src="' + _esc(item.url) + '" alt="" loading="lazy" />';
      }

      btn.addEventListener('click', function () { _goTo(i); _resetAutoplay(); });
      _thumbsEl.appendChild(btn);
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     5. NAVEGAÇÃO
  ──────────────────────────────────────────────────────────────── */
  function _goTo(idx, animate) {
    if (!_track || _items.length === 0) return;
    if (animate === undefined) animate = true;

    _current = ((idx % _items.length) + _items.length) % _items.length;

    /* ─ Desloca o track ─ */
    if (!animate) {
      _track.style.transition = 'none';
      _track.style.transform  = 'translateX(-' + _current * 100 + '%)';
      /* Força reflow para a transição ser desativada antes do próximo frame */
      void _track.offsetHeight;
      _track.style.transition = '';
    } else {
      _track.style.transform = 'translateX(-' + _current * 100 + '%)';
    }

    /* ─ Dots ─ */
    if (_dotsEl) {
      Array.from(_dotsEl.children).forEach(function (dot, i) {
        var active = i === _current;
        dot.classList.toggle('dvc-dot--active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    /* ─ Thumbnails ─ */
    if (_thumbsEl) {
      Array.from(_thumbsEl.children).forEach(function (th, i) {
        var active = i === _current;
        th.classList.toggle('dvc-thumb--active', active);
        if (active) {
          th.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    /* ─ Contador ─ */
    if (_counterEl) {
      _counterEl.textContent = (_current + 1) + ' / ' + _items.length;
    }

    /* ─ Acessibilidade: aria-hidden nos slides ─ */
    Array.from(_track.children).forEach(function (slide, i) {
      slide.setAttribute('aria-hidden', i === _current ? 'false' : 'true');
    });

    /* ─ Controla reprodução de vídeos ─ */
    _handleVideos();

    /* ─ Pré-carrega slides adjacentes ─ */
    _preloadAdjacent();
  }

  function _next() { _goTo(_current + 1); _resetAutoplay(); }
  function _prev() { _goTo(_current - 1); _resetAutoplay(); }

  /* ─────────────────────────────────────────────────────────────────
     6. AUTOPLAY
  ──────────────────────────────────────────────────────────────── */
  function _startAutoplay() {
    if (_items.length <= 1) return;
    clearInterval(_timer);
    _timer = setInterval(function () { _goTo(_current + 1); }, AUTOPLAY_MS);
  }

  function _stopAutoplay()  { clearInterval(_timer); _timer = null; }
  function _resetAutoplay() { _stopAutoplay(); _startAutoplay(); }

  /* ─────────────────────────────────────────────────────────────────
     7. VÍDEOS
  ──────────────────────────────────────────────────────────────── */
  function _handleVideos() {
    if (!_track) return;
    Array.from(_track.children).forEach(function (slide, i) {
      var vid = slide.querySelector('video');
      if (!vid) return;
      if (i === _current) {
        vid.play && vid.play().catch(function () {}); /* silencia erros de autoplay */
      } else {
        vid.pause && vid.pause();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     8. LAZY LOADING
  ──────────────────────────────────────────────────────────────── */
  function _loadEl(el) {
    if (!el || !el.dataset.src) return;
    el.src = el.dataset.src;
    delete el.dataset.src;
    el.classList.remove('dvc-lazy');
    /* Fade-in ao carregar */
    el.onload = function () { el.classList.add('dvc-loaded'); };
  }

  /* Pré-carrega os slides anterior e próximo proativamente */
  function _preloadAdjacent() {
    if (!_track || _items.length < 2) return;
    var adjacentes = [
      (_current + 1) % _items.length,
      (_current - 1 + _items.length) % _items.length
    ];
    var slides = _track.children;
    adjacentes.forEach(function (idx) {
      var img = slides[idx] && slides[idx].querySelector('img.dvc-lazy');
      if (img) _loadEl(img);
    });
  }

  function _setupLazyLoad() {
    /* Fallback para navegadores sem IntersectionObserver */
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-src]').forEach(_loadEl);
      return;
    }

    _observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          _loadEl(entry.target);
          _observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '300px 0px' }); /* carrega 300px antes de aparecer */

    /* Observa slides lazy */
    if (_track) {
      _track.querySelectorAll('img.dvc-lazy').forEach(function (img) {
        _observer.observe(img);
      });
    }
    /* Observa thumbnails */
    if (_thumbsEl) {
      _thumbsEl.querySelectorAll('img[data-src]').forEach(function (img) {
        _observer.observe(img);
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     9. EVENTOS
  ──────────────────────────────────────────────────────────────── */

  /* ── Touch / Swipe ──────────────────────────────────────────────── */
  function _bindTouch() {
    if (!_viewport) return;

    _viewport.addEventListener('touchstart', function (e) {
      _touchStartX = e.touches[0].clientX;
      _touchStartT = Date.now();
      _stopAutoplay();
    }, { passive: true });

    _viewport.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - _touchStartX;
      var dt = Date.now() - _touchStartT;

      /* Swipe válido: > 40px e < 400ms */
      if (Math.abs(dx) > 40 && dt < 400) {
        dx < 0 ? _next() : _prev();
      } else {
        _startAutoplay();
      }
    }, { passive: true });
  }

  /* ── Teclado ────────────────────────────────────────────────────── */
  function _bindKeyboard() {
    if (!_viewport) return;
    _viewport.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { _prev(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { _next(); e.preventDefault(); }
    });
  }

  /* ── Hover pause ────────────────────────────────────────────────── */
  function _bindHover() {
    if (!_viewport) return;
    _viewport.addEventListener('mouseenter', _stopAutoplay);
    _viewport.addEventListener('mouseleave', _startAutoplay);
  }

  /* ── Todos os eventos ───────────────────────────────────────────── */
  function _bindEvents() {
    if (_btnPrev) _btnPrev.addEventListener('click', _prev);
    if (_btnNext) _btnNext.addEventListener('click', _next);
    _bindTouch();
    _bindKeyboard();
    _bindHover();
  }

  /* ─────────────────────────────────────────────────────────────────
     10. INICIALIZAÇÃO
  ──────────────────────────────────────────────────────────────── */
  function init() {
    if (_initialized) return;
    _initialized = true;
    _bindDOM();
    _render();
  }

  /* Auto-inicializa quando o DOM estiver pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────────────────────────────
     11. API PÚBLICA
     Permite que outros módulos controlem o carrossel externamente.
  ──────────────────────────────────────────────────────────────── */
  global.DoaVidaCarousel = {
    /**
     * Reinicializa o carrossel do zero (ex: após salvar novas fotos).
     * Chame após `galeriaPublicar()` no admin para refletir mudanças.
     */
    reload: function () {
      _stopAutoplay();
      _initialized = false;
      init();
    },
    next:  _next,
    prev:  _prev,
    goTo:  function (idx) { _goTo(idx); _resetAutoplay(); }
  };

})(window);
