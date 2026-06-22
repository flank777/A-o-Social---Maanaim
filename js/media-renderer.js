/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Ação Social — js/media-renderer.js                                 ║
  ║  Renderizador universal de mídia (imagem ou vídeo)                  ║
  ║  Usado em: hero, cards, galeria, voluntário, banners                ║
  ╚══════════════════════════════════════════════════════════════════════╝

  USO:
    var el = renderMedia({
      url:        'https://...',
      tipo:       'imagem' | 'video',
      alt:        'Descrição acessível',
      poster:     'https://...',  // só para vídeo
      objectFit:  'cover' | 'contain',
      autoplay:   true | false,
      loop:       true | false,
      controls:   false | true,
      loading:    'lazy' | 'eager',
      className:  'hero-photo',
      onError:    function() { ... }  // callback ao falhar
    });
    container.appendChild(el);

  RETORNA: elemento DOM (<img> ou <video>) já configurado.
*/

var MediaRenderer = (function () {

  /* SVG neutro 1×1 — sem foto antiga como fallback */
  var FALLBACK_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3Crect fill=%22%231c2810%22 width=%221%22 height=%221%22/%3E%3C/svg%3E';

  /* Tipos MIME de imagem aceitos */
  var MIME_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  /* Tipos MIME de vídeo aceitos */
  var MIME_VIDEO  = ['video/mp4', 'video/webm', 'video/ogg'];

  /*
    Detecta o tipo (imagem | video) pela URL quando `tipo` não é fornecido.
    Não é infalível — serve como heurística para URLs sem Content-Type.
  */
  function _detectarTipo(url) {
    if (!url) return 'imagem';
    var u = url.toLowerCase().split('?')[0];
    if (/\.(mp4|webm|ogg|mov|avi)$/.test(u)) return 'video';
    return 'imagem';
  }

  /*
    Cria e retorna um elemento <img> configurado.
    @param {Object} opts — opções do renderizador
    @returns {HTMLImageElement}
  */
  function _criarImagem(opts) {
    var img = document.createElement('img');
    img.src     = opts.url || FALLBACK_IMG;
    img.alt     = opts.alt || '';
    img.loading = opts.loading || 'lazy';
    img.decoding = 'async';

    if (opts.className)  img.className = opts.className;
    if (opts.objectFit)  img.style.objectFit = opts.objectFit;
    if (opts.width)      img.style.width  = opts.width;
    if (opts.height)     img.style.height = opts.height;

    img.onerror = function () {
      if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
      if (typeof opts.onError === 'function') opts.onError(img);
    };

    return img;
  }

  /*
    Cria e retorna um elemento <video> configurado.
    Segue as boas práticas de performance móvel:
      - muted (obrigatório para autoplay)
      - playsinline (evita fullscreen forçado no iOS)
      - preload="metadata" (não baixa o vídeo inteiro)
    @param {Object} opts — opções do renderizador
    @returns {HTMLVideoElement}
  */
  function _criarVideo(opts) {
    var video = document.createElement('video');

    /* Atributos de mídia */
    video.src          = opts.url || '';
    video.muted        = true;
    video.playsInline  = true;
    video.preload      = 'metadata';
    video.loop         = opts.loop !== false;
    video.autoplay     = opts.autoplay !== false;
    video.controls     = opts.controls === true;

    if (opts.poster)     video.poster    = opts.poster;
    if (opts.className)  video.className = opts.className;
    if (opts.objectFit)  video.style.objectFit = opts.objectFit;
    if (opts.width)      video.style.width  = opts.width;
    if (opts.height)     video.style.height = opts.height;

    /* Atributos booleanos via setAttribute (compatibilidade ES5) */
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    /* Fallback: se o vídeo não carregar, mostra a imagem poster */
    video.onerror = function () {
      if (opts.poster) {
        var img = _criarImagem({ url: opts.poster, alt: opts.alt, className: opts.className, objectFit: opts.objectFit });
        if (video.parentNode) video.parentNode.replaceChild(img, video);
      }
      if (typeof opts.onError === 'function') opts.onError(video);
    };

    return video;
  }

  /*
    Função pública principal.
    @param {Object} opts — configurações da mídia
    @returns {HTMLElement} — <img> ou <video> */
  function render(opts) {
    if (!opts || !opts.url) {
      return _criarImagem({ url: FALLBACK_IMG, alt: opts && opts.alt || '', className: opts && opts.className || '' });
    }

    var tipo = opts.tipo || _detectarTipo(opts.url);

    if (tipo === 'video') {
      return _criarVideo(opts);
    }
    return _criarImagem(opts);
  }

  /*
    Substitui o conteúdo de um container pelo elemento de mídia.
    Garante que não haverá vídeos "fantasma" consumindo recursos.
    @param {HTMLElement} container
    @param {Object}      opts
  */
  function renderInto(container, opts) {
    if (!container) return;

    /* Para vídeos anteriores antes de remover */
    var antigos = container.querySelectorAll('video');
    antigos.forEach(function (v) { v.pause(); v.src = ''; v.load(); });

    container.innerHTML = '';
    container.appendChild(render(opts));
  }

  /* Expõe API pública */
  return {
    render:     render,
    renderInto: renderInto
  };

})();

window.MediaRenderer = MediaRenderer;
