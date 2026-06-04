/*
  DoaVida — js/services/cloudinary.js
  Integração com Cloudinary para upload de imagens e vídeos.
  Plano gratuito: 25GB — sem cartão de crédito — nunca pausa.
*/

var DoaVidaCloudinary = {

  CLOUD_NAME:    'djye7d3yl',
  UPLOAD_PRESET: 'ml_default',

  /* URL base para exibição de imagens */
  _urlBase: function () {
    return 'https://res.cloudinary.com/djye7d3yl/';
  },

  /*
    Faz upload de um arquivo (imagem ou vídeo) para o Cloudinary.
    @param {File}   arquivo    — arquivo do <input type="file">
    @param {string} tipo       — 'image' | 'video'
    @param {Function} onProgresso — callback(porcentagem) opcional
    @returns {Promise<Object>} — { url, public_id, tipo, largura, altura }
  */
  upload: function (arquivo, tipo, onProgresso) {
    var self = this;
    tipo = tipo || (arquivo.type.startsWith('video/') ? 'video' : 'image');

    return new Promise(function (resolve, reject) {
      if (!self.UPLOAD_PRESET) {
        reject(new Error('Upload preset não configurado. Configure DoaVidaCloudinary.UPLOAD_PRESET'));
        return;
      }

      var formData = new FormData();
      formData.append('file',           arquivo);
      formData.append('upload_preset',  self.UPLOAD_PRESET);
      formData.append('folder',         'doavida');

      var xhr = new XMLHttpRequest();
      var endpoint = 'https://api.cloudinary.com/v1_1/' + self.CLOUD_NAME + '/' + tipo + '/upload';

      xhr.open('POST', endpoint, true);

      /* Progresso do upload */
      if (onProgresso && xhr.upload) {
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            onProgresso(Math.round((e.loaded / e.total) * 100));
          }
        };
      }

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var resp = JSON.parse(xhr.responseText);
            resolve({
              url:       resp.secure_url,
              public_id: resp.public_id,
              tipo:      tipo,
              largura:   resp.width  || 0,
              altura:    resp.height || 0,
              duracao:   resp.duration || 0,   /* para vídeos */
              formato:   resp.format  || '',
            });
          } catch (e) {
            reject(new Error('Resposta inválida do Cloudinary'));
          }
        } else {
          try {
            var erro = JSON.parse(xhr.responseText);
            reject(new Error(erro.error && erro.error.message ? erro.error.message : 'Erro no upload'));
          } catch (_) {
            reject(new Error('Erro HTTP ' + xhr.status));
          }
        }
      };

      xhr.onerror = function () {
        reject(new Error('Falha de conexão com o Cloudinary'));
      };

      xhr.send(formData);
    });
  },

  /*
    Gera URL otimizada para exibição de imagem.
    @param {string} publicId  — public_id retornado pelo upload
    @param {Object} opcoes    — { largura, altura, qualidade, formato }
    @returns {string} URL otimizada
  */
  urlImagem: function (publicId, opcoes) {
    opcoes = opcoes || {};
    var transformacoes = [];

    if (opcoes.largura)    transformacoes.push('w_' + opcoes.largura);
    if (opcoes.altura)     transformacoes.push('h_' + opcoes.altura);
    if (opcoes.qualidade)  transformacoes.push('q_' + opcoes.qualidade);
    else                   transformacoes.push('q_auto');
    if (opcoes.formato)    transformacoes.push('f_' + opcoes.formato);
    else                   transformacoes.push('f_auto');
    if (opcoes.crop)       transformacoes.push('c_' + opcoes.crop);

    var t = transformacoes.length > 0 ? transformacoes.join(',') + '/' : '';
    return this._urlBase() + 'image/upload/' + t + publicId;
  },

  /*
    Gera thumbnail de vídeo.
    @param {string} publicId — public_id do vídeo
    @param {number} segundo  — segundo do vídeo para capturar (padrão: 0)
    @returns {string} URL do thumbnail
  */
  thumbnailVideo: function (publicId, segundo) {
    var so = typeof segundo === 'number' ? segundo : 0;
    return this._urlBase() + 'video/upload/so_' + so + ',w_400,h_300,c_fill,q_auto,f_jpg/' + publicId;
  },

  /*
    Verifica se um arquivo é suportado para upload.
    @param {File} arquivo
    @returns {{ ok: boolean, erro: string }}
  */
  validar: function (arquivo) {
    var TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    var TIPOS_VIDEO  = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
    var LIMITE_IMG   = 10 * 1024 * 1024;   /* 10 MB */
    var LIMITE_VID   = 100 * 1024 * 1024;  /* 100 MB */

    var ehImagem = TIPOS_IMAGEM.indexOf(arquivo.type) !== -1;
    var ehVideo  = TIPOS_VIDEO.indexOf(arquivo.type)  !== -1;

    if (!ehImagem && !ehVideo) {
      return { ok: false, erro: 'Formato não suportado. Use JPG, PNG, WebP, MP4 ou WebM.' };
    }
    if (ehImagem && arquivo.size > LIMITE_IMG) {
      return { ok: false, erro: 'Imagem muito grande. Máximo 10 MB.' };
    }
    if (ehVideo && arquivo.size > LIMITE_VID) {
      return { ok: false, erro: 'Vídeo muito grande. Máximo 100 MB.' };
    }

    return { ok: true, erro: '' };
  },
};

window.DoaVidaCloudinary = DoaVidaCloudinary;
console.log('[DoaVida] cloudinary.js carregado — cloud: djye7d3yl');
