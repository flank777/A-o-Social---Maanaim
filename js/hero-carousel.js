/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Ação Social — js/hero-carousel.js  v3.0                            ║
  ║  Carrossel de mídias da hero/capa — vídeo HTML5 limpo               ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  ⚠️  IMPORTANTE — POR QUE NÃO USAMOS IFRAME DO YOUTUBE?            ║
  ║                                                                      ║
  ║  O YouTube NÃO permite remover 100% da interface do player via       ║
  ║  iframe — título, botão de play, logo e barra sempre aparecem em    ║
  ║  alguns momentos, mesmo com controls=0&modestbranding=1.            ║
  ║                                                                      ║
  ║  SOLUÇÃO: URLs do YouTube são convertidas automaticamente para       ║
  ║  a thumbnail HD do vídeo (maxresdefault.jpg) e exibidas como        ║
  ║  imagem na capa. Para vídeo limpo, use arquivo direto .mp4          ║
  ║  hospedado no Supabase Storage ou servidor próprio.                 ║
  ║                                                                      ║
  ║  TIPOS SUPORTADOS NA CAPA:                                          ║
  ║  • Imagem: .jpg, .png, .webp, .gif → <img>                         ║
  ║  • Vídeo direto: .mp4, .webm, .ogg, .mov → <video> sem controles   ║
  ║  • YouTube: converte para thumbnail HD → <img>                      ║
  ║                                                                      ║
  ║  FEATURES:                                                           ║
  ║  • Autoplay muted loop playsinline sem controles                    ║
  ║  • poster/imagem de capa enquanto o vídeo carrega                   ║
  ║  • Fallback para imagem se o vídeo falhar                           ║
  ║  • IntersectionObserver: pausa vídeo quando hero sai da tela        ║
  ║  • Troca automática por timer (multi-slide)                         ║
  ╚══════════════════════════════════════════════════════════════════════╝

  DEPENDÊNCIAS (devem ser carregados antes):
    js/vendor/supabase.min.js
    js/services/supabase.js  → DoaVidaSync
*/

var HeroCarousel = (function () {

  /* ─── Estado interno ──────────────────────────────────────────── */
  var _state = {
    medias:   [],
    current:  0,
    timer:    null,
    bgEl:     null,     /* <img id="hero-bg"> — fundo desktop          */
    photoEl:  null,     /* <img class="hero-photo"> — card mobile      */
    videoEl:  null,     /* <video> injetado no desktop                 */
    videoMEl: null,     /* <video> injetado no mobile                  */
    observer: null,     /* IntersectionObserver para performance        */
    interval: 6000,
    desktopSrc: null,
    mobileSrc: null,
    fallback: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3Crect fill=%22%231c2810%22 width=%221%22 height=%221%22/%3E%3C/svg%3E',
    running:  false
  };

  /* ─── Detecção de tipo de URL ─────────────────────────────────── */

  function _isYoutube(url) {
    return !!(url && /(?:youtube\.com|youtu\.be)/i.test(url));
  }

  function _youtubeId(url) {
    var m = url.match(
      /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }

  /*
    Para URLs do YouTube: extrai thumbnail HD.
    Tenta maxresdefault (1280×720); fallback automático do browser para hqdefault.
  */
  function _youtubeThumbnail(url) {
    var id = _youtubeId(url);
    return id ? ('https://img.youtube.com/vi/' + id + '/maxresdefault.jpg') : null;
  }

  function _isVideoArquivo(url) {
    return !!(url && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url));
  }

  /* 'video' | 'imagem' — YouTube nunca retorna 'video' neste contexto */
  function _tipo(item) {
    if (_isYoutube(item.url))     return 'imagem'; /* YouTube → thumbnail */
    if (item.tipo === 'video')    return 'video';
    if (_isVideoArquivo(item.url)) return 'video';
    return 'imagem';
  }

  /*
    Normaliza o item antes de renderizar.
    URLs do YouTube são silenciosamente convertidas para thumbnail.
  */
  function _resolver(item) {
    if (!_isYoutube(item.url)) return item;
    var thumb = _youtubeThumbnail(item.url);
    return {
      url:       thumb || _state.fallback,
      tipo:      'imagem',
      alt:       item.alt || item.titulo || '',
      poster_url: null
    };
  }

  /* ─── DESKTOP ─────────────────────────────────────────────────── */

  function _aplicarDesktop(item) {
    var container = _state.bgEl ? _state.bgEl.parentNode : null;
    if (!container) return;

    if (_state.desktopSrc) {
      if (_state.videoEl) {
        _state.videoEl.pause();
        _state.videoEl.style.display = 'none';
      }
      _state.bgEl.style.display = '';
      _state.bgEl.src = _state.desktopSrc;
      return;
    }

    if (_tipo(item) === 'video') {
      /* Esconde imagem de fundo */
      if (_state.bgEl) _state.bgEl.style.display = 'none';

      /* Cria <video> uma única vez */
      if (!_state.videoEl) {
        _state.videoEl = document.createElement('video');
        _state.videoEl.id       = 'hero-video-bg';
        _state.videoEl.className = 'hero-video-bg';
        /* Atributos essenciais para autoplay limpo */
        _state.videoEl.muted    = true;
        _state.videoEl.setAttribute('muted', '');       /* Safari precisa do attr */
        _state.videoEl.setAttribute('playsinline', ''); /* iOS não vai fullscreen  */
        _state.videoEl.preload  = 'metadata';           /* não bloqueia página     */
        _state.videoEl.loop     = true;
        _state.videoEl.autoplay = true;
        /* SEM controls — vídeo completamente limpo, sem barra, sem botões */
        _state.videoEl.style.cssText = [
          'position:absolute', 'inset:0', 'width:100%', 'height:100%',
          'object-fit:cover', 'z-index:0', 'display:none'
        ].join(';');
        /* Fallback: se vídeo falhar, mostra imagem de fundo */
        _state.videoEl.addEventListener('error', function () {
          _state.videoEl.style.display = 'none';
          if (_state.bgEl) {
            _state.bgEl.src = _state.medias[_state.current].poster_url || _state.fallback;
            _state.bgEl.style.display = '';
          }
        });
        container.insertBefore(
          _state.videoEl,
          _state.bgEl || container.firstChild
        );
      }

      /* Só recarrega se a URL mudou */
      if (_state.videoEl.dataset.heroSrc !== item.url) {
        _state.videoEl.dataset.heroSrc = item.url;
        _state.videoEl.src    = item.url;
        _state.videoEl.poster = item.poster_url || '';
        _state.videoEl.load();
      }
      _state.videoEl.style.display = '';
      _state.videoEl.play().catch(function () {});

    } else {
      /* Imagem */
      if (_state.videoEl) {
        _state.videoEl.pause();
        _state.videoEl.style.display = 'none';
      }
      if (_state.bgEl) {
        _state.bgEl.style.display = '';
        _state.bgEl.src = item.url || _state.fallback;
      }
    }
  }

  /* ─── MOBILE ──────────────────────────────────────────────────── */

  function _aplicarMobile(item) {
    if (!_state.photoEl) return;
    var parent = _state.photoEl.parentNode;
    if (!parent) return;

    /* Remove estado de vídeo anterior */
    function _limpar() {
      if (_state.videoMEl) {
        _state.videoMEl.pause();
        _state.videoMEl.style.display = 'none';
      }
      parent.classList.remove('hero-showing-video');
    }

    if (_state.mobileSrc) {
      _limpar();
      _state.photoEl.style.display = '';
      _state.photoEl.src = _state.mobileSrc;
      return;
    }

    if (_tipo(item) === 'video') {
      _limpar();
      _state.photoEl.style.display = 'none';

      /* Cria <video> mobile uma única vez */
      if (!_state.videoMEl) {
        _state.videoMEl = document.createElement('video');
        _state.videoMEl.className = 'hero-photo-video';
        _state.videoMEl.muted     = true;
        _state.videoMEl.setAttribute('muted', '');
        _state.videoMEl.setAttribute('playsinline', '');
        _state.videoMEl.preload   = 'metadata';
        _state.videoMEl.loop      = true;
        _state.videoMEl.autoplay  = true;
        /* SEM controls */
        _state.videoMEl.style.cssText = 'width:100%;object-fit:cover;display:block;';
        /* Fallback se vídeo mobile falhar */
        _state.videoMEl.addEventListener('error', function () {
          _state.videoMEl.style.display = 'none';
          _state.photoEl.src = _state.medias[_state.current].poster_url || _state.fallback;
          _state.photoEl.style.display = '';
          parent.classList.remove('hero-showing-video');
        });
        parent.insertBefore(_state.videoMEl, _state.photoEl);
      }

      if (_state.videoMEl.dataset.heroSrc !== item.url) {
        _state.videoMEl.dataset.heroSrc = item.url;
        _state.videoMEl.src    = item.url;
        _state.videoMEl.poster = item.poster_url || '';
        _state.videoMEl.load();
      }
      _state.videoMEl.style.display = '';
      parent.classList.add('hero-showing-video');
      _state.videoMEl.play().catch(function () {});

    } else {
      /* Imagem */
      _limpar();
      _state.photoEl.style.display = '';
      _state.photoEl.src = item.url || _state.fallback;
    }
  }

  /* ─── IntersectionObserver — pausa vídeo fora da tela ────────── */

  function _configurarVisibilidade() {
    if (!window.IntersectionObserver) return;
    var heroEl = document.getElementById('hero');
    if (!heroEl) return;

    _state.observer = new IntersectionObserver(function (entries) {
      var visivel = entries[0] && entries[0].isIntersecting;
      if (visivel) {
        if (_state.videoEl  && _state.videoEl.paused)  _state.videoEl.play().catch(function(){});
        if (_state.videoMEl && _state.videoMEl.paused) _state.videoMEl.play().catch(function(){});
      } else {
        if (_state.videoEl)  _state.videoEl.pause();
        if (_state.videoMEl) _state.videoMEl.pause();
      }
    }, { threshold: 0.1 });

    _state.observer.observe(heroEl);
  }

  /* ─── Controle do carrossel ───────────────────────────────────── */

  function _mostrar(i) {
    if (!_state.medias.length) return;
    _state.current = i % _state.medias.length;
    var item = _resolver(_state.medias[_state.current]);
    _aplicarDesktop(item);
    _aplicarMobile(item);
  }

  function _proximo() {
    _mostrar((_state.current + 1) % _state.medias.length);
  }

  function _iniciarTimer(interval) {
    _pararTimer();
    if (_state.medias.length <= 1) return;
    _state.timer = setInterval(_proximo, interval || _state.interval);
  }

  function _pararTimer() {
    if (_state.timer) { clearInterval(_state.timer); _state.timer = null; }
  }

  /* ─── Normalização dos dados ──────────────────────────────────── */

  function _normalizar(raw) {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { return [{ url: raw, tipo: 'imagem' }]; }
    }
    if (!Array.isArray(raw)) {
      var lista = [];
      ['foto1', 'foto2', 'foto3'].forEach(function (k) {
        if (raw[k]) lista.push({ url: raw[k], tipo: 'imagem' });
      });
      return lista;
    }
    return raw.filter(function (m) { return m && m.url; });
  }

  /* ─── Carregamento Supabase ───────────────────────────────────── */

  function _carregarMidias(callback) {
    /* Cache imediato do localStorage para UX rápida */
    try {
      var raw = localStorage.getItem('doavida_hero_fotos');
      if (raw) {
        var ls = _normalizar(raw);
        if (ls.length) callback(ls);
      }
    } catch (e) {}

    /* Supabase é o dado autoritativo */
    function buscarSupabase() {
      if (!window.supabaseClient) return;
      window.supabaseClient
        .from('galeria')
        .select('url, tipo, alt, poster_url, titulo, order_index')
        .eq('categoria', 'hero')
        .eq('ativo', true)
        .order('order_index', { ascending: true })
        .then(function (res) {
          if (res.error || !res.data || !res.data.length) {
            /* Tenta chave de configuração como fallback */
            return window.supabaseClient
              .from('configuracao')
              .select('valor')
              .eq('chave', 'doavida_hero_fotos')
              .single()
              .then(function (cfgRes) {
                if (!cfgRes.error && cfgRes.data && cfgRes.data.valor) {
                  var items = _normalizar(cfgRes.data.valor);
                  if (items.length) {
                    localStorage.setItem('doavida_hero_fotos', cfgRes.data.valor);
                    callback(items);
                  }
                }
              });
          }
          localStorage.setItem('doavida_hero_fotos', JSON.stringify(res.data));
          callback(res.data);
        })
        .catch(function () {});
    }

    if (window.supabaseClient) {
      buscarSupabase();
    } else {
      window.addEventListener('DoaVidaSyncPronto', buscarSupabase, { once: true });
      setTimeout(buscarSupabase, 1500);
    }
  }

  /* ─── API pública ─────────────────────────────────────────────── */

  function init(opts) {
    opts = opts || {};
    _state.bgEl     = opts.bgEl    || document.getElementById('hero-bg');
    _state.photoEl  = opts.photoEl || document.querySelector('.hero-photo');
    _state.interval = opts.interval || 6000;
    _state.desktopSrc = opts.desktopSrc || null;
    _state.mobileSrc = opts.mobileSrc || null;
    _state.fallback = opts.fallback || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3Crect fill=%22%231c2810%22 width=%221%22 height=%221%22/%3E%3C/svg%3E';
    _state.running  = true;

    _configurarVisibilidade();

    if (opts.medias && opts.medias.length) {
      _state.medias = _normalizar(opts.medias);
      _mostrar(0);
      _iniciarTimer();
      return;
    }

    _carregarMidias(function (medias) {
      _state.medias = medias;
      _mostrar(0);
      _iniciarTimer();
    });
  }

  function pause()  { _pararTimer(); }
  function resume() { _iniciarTimer(); }
  function goTo(i)  { _mostrar(i); }

  function reload() {
    _pararTimer();
    _state.medias = [];
    _carregarMidias(function (medias) {
      _state.medias = medias;
      _mostrar(0);
      _iniciarTimer();
    });
  }

  return { init: init, pause: pause, resume: resume, goTo: goTo, reload: reload };

})();

window.HeroCarousel = HeroCarousel;
