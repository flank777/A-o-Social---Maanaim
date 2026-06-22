/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DoaVida — js/comprovante-canvas.js                                  ║
 * ║  Geração de imagem PNG do comprovante via Canvas API do browser      ║
 * ║  Ação Social Semear + Maanaim — Belém, PA                           ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  SEM DEPENDÊNCIAS EXTERNAS — usa apenas o Canvas nativo do browser  ║
 * ║  Chamado por form.js no lugar do html2canvas                         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
(function () {
  "use strict";

  /* ══════════════════════════════════════════════════════
     PALETA — mesma do site: branco gelo, verde escuro, vermelho suave
  ══════════════════════════════════════════════════════ */
  var C = {
    fundo:       "#F4F8FB",
    card:        "#FFFFFF",
    headerVerde: "#1a3312",
    headerVerde2:"#2e5520",
    verde:       "#5a8a4a",
    vermelho:    "#8a1818",
    textoPrinc:  "#1a1a18",
    textoSecund: "#555550",
    textoMuted:  "#888880",
    linha:       "#E8EDF2",
    totalBg:     "#EEF5E8",
    borda:       "rgba(90,138,74,0.20)",
  };

  var LARGURA = 800;
  var PADDING = 44;
  var CARD_X  = 28;

  /* ── helpers de desenho ──────────────────────────── */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function txtC(ctx, t, cx, y) {
    ctx.fillText(t, cx - ctx.measureText(t).width / 2, y);
  }

  /* ── lê o DOM do recibo e extrai os dados ─────────── */
  function lerDadosRecibo() {
    function t(id) {
      var el = document.getElementById(id);
      return el ? el.textContent.trim() : "";
    }

    /* lê os itens do #r-items */
    var itens = [];
    var rows = document.querySelectorAll("#r-items .rcpt-item-row");
    rows.forEach(function (row) {
      var desc  = row.querySelector(".rcpt-item-desc");
      var qty   = row.querySelector(".rcpt-item-qty");
      var total = row.querySelector(".rcpt-item-total");
      if (desc) {
        itens.push({
          nome:    desc.textContent.trim(),
          qty:     qty  ? qty.textContent.trim()   : "",
          totalKg: total ? total.textContent.trim() : "",
        });
      }
    });

    /* observação/oração */
    var obsRow = document.getElementById("r-msg-row");
    var obs    = "";
    if (obsRow && obsRow.style.display !== "none") {
      var obsTxt = document.getElementById("r-msg-text");
      if (obsTxt) obs = obsTxt.textContent.trim();
    }

    return {
      protocolo: t("r-proto"),
      data:      t("r-data"),
      hora:      t("r-hora"),
      nome:      t("r-nome"),
      tel:       t("r-tel"),
      entrega:   t("r-entrega"),
      totalKg:   t("r-total-kg"),
      itens:     itens,
      obs:       obs,
    };
  }

  /* ═══════════════════════════════════════════════════
     FUNÇÃO PRINCIPAL — desenha o recibo num <canvas> e retorna um Blob PNG via callback
  ═══════════════════════════════════════════════════ */
  function gerarImagemRecibo(callback) {
    var d = lerDadosRecibo();

    /* ── alturas de cada bloco ─────────────────────── */
    var H_HEADER     = 124;
    var H_TITULO     = 52;
    var H_PROTO      = 56;
    var H_INFO_LINHA = 36;
    var N_INFO       = d.tel ? 4 : 3;   /* protocolo/data+hora/nome/tel/entrega */
    var H_INFO       = H_INFO_LINHA * N_INFO;
    var H_TAB_HEAD   = 44;
    var H_ITEM       = 46;
    var H_TOTAL      = 54;
    var H_OBS        = d.obs ? (60 + Math.ceil(d.obs.length / 55) * 22) : 0;
    var H_RODAPE     = 110;
    var GAP          = 16;

    var ALTURA =
      PADDING +
      H_HEADER + GAP +
      H_TITULO + 8 +
      H_PROTO + 8 +
      H_INFO + GAP +
      H_TAB_HEAD +
      d.itens.length * H_ITEM +
      H_TOTAL + GAP +
      H_OBS +
      H_RODAPE +
      PADDING;

    var canvas = document.createElement("canvas");
    canvas.width  = LARGURA;
    canvas.height = ALTURA;
    var ctx = canvas.getContext("2d");

    var CARD_W = LARGURA - CARD_X * 2;
    var IX     = CARD_X + PADDING;   /* x interno do conteúdo */
    var IW     = CARD_W - PADDING * 2; /* largura interna */
    var CX     = CARD_X + CARD_W / 2; /* centro horizontal */

    var y = 0;

    /* 1 ── FUNDO ─────────────────────────────────── */
    ctx.fillStyle = C.fundo;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    /* Cartão com sombra */
    ctx.shadowColor   = "rgba(0,0,0,0.10)";
    ctx.shadowBlur    = 22;
    ctx.shadowOffsetY = 5;
    rrect(ctx, CARD_X, 16, CARD_W, ALTURA - 32, 18);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = C.borda; ctx.lineWidth = 1.5; ctx.stroke();

    y = 16;

    /* 2 ── CABEÇALHO VERDE ───────────────────────── */
    rrect(ctx, CARD_X, y, CARD_W, H_HEADER, 18);
    var grd = ctx.createLinearGradient(CARD_X, y, CARD_X + CARD_W, y + H_HEADER);
    grd.addColorStop(0, C.headerVerde);
    grd.addColorStop(1, C.headerVerde2);
    ctx.fillStyle = grd;
    ctx.fill();

    /* círculo decorativo */
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.arc(CARD_X + CARD_W - 54, y + H_HEADER / 2, 48, 0, Math.PI * 2);
    ctx.fill();

    /* nome da organização */
    ctx.textBaseline = "middle";
    ctx.fillStyle    = "#ffffff";
    ctx.font         = "bold 28px Arial";
    txtC(ctx, "COMPROVANTE DE DOAÇÃO", CX, y + 46);

    ctx.font      = "15px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.80)";
    txtC(ctx, "Ação Social Semear    Comunidade Maanaim    Belém, PA", CX, y + 82);

    /* faixa vermelha inferior */
    ctx.fillStyle = C.vermelho;
    ctx.fillRect(CX - 48, y + H_HEADER - 6, 96, 5);

    y += H_HEADER + GAP;

    /* 3 ── PROTOCOLO (destaque) ──────────────────── */
    rrect(ctx, IX, y, IW, H_PROTO, 10);
    ctx.fillStyle = "rgba(138,24,24,0.06)"; ctx.fill();
    ctx.strokeStyle = "rgba(138,24,24,0.22)"; ctx.lineWidth = 1; ctx.stroke();

    ctx.textBaseline = "top";
    ctx.fillStyle = C.vermelho;
    ctx.font      = "bold 12px Arial";
    ctx.fillText("PROTOCOLO", IX + 18, y + 10);

    ctx.fillStyle = C.headerVerde;
    ctx.font      = "bold 20px 'Courier New'";
    ctx.fillText(d.protocolo, IX + 18, y + 28);

    /* data/hora no canto direito */
    ctx.textBaseline = "top";
    ctx.fillStyle    = C.textoSecund;
    ctx.font         = "12px Arial";
    var dtStr = d.data + " às " + d.hora;
    ctx.fillText(dtStr, IX + IW - ctx.measureText(dtStr).width - 18, y + 20);

    y += H_PROTO + 8;

    /* 4 ── BLOCO DE INFORMAÇÕES ──────────────────── */
    function infoLinha(rotulo, valor, corVal) {
      ctx.textBaseline = "middle";
      var mY = y + H_INFO_LINHA / 2;

      ctx.fillStyle = C.textoSecund;
      ctx.font      = "12px Arial";
      ctx.fillText(rotulo, IX, mY);

      ctx.fillStyle = corVal || C.textoPrinc;
      ctx.font      = "bold 15px Arial";
      ctx.fillText(valor, IX + 180, mY);

      ctx.beginPath();
      ctx.moveTo(IX, y + H_INFO_LINHA);
      ctx.lineTo(IX + IW, y + H_INFO_LINHA);
      ctx.strokeStyle = C.linha; ctx.lineWidth = 0.8; ctx.stroke();

      y += H_INFO_LINHA;
    }

    infoLinha("DOADOR",          d.nome);
    if (d.tel) infoLinha("WHATSAPP",       "+" + d.tel);
    infoLinha("FORMA DE ENTREGA", d.entrega, C.verde);

    y += GAP;

    /* 5 ── TABELA DE ITENS ───────────────────────── */

    /* cabeçalho da tabela */
    rrect(ctx, IX, y, IW, H_TAB_HEAD, 8);
    ctx.fillStyle = C.headerVerde; ctx.fill();

    ctx.textBaseline = "middle";
    ctx.fillStyle    = "#ffffff";
    ctx.font         = "bold 13px Arial";
    var cQty   = IX + IW * 0.62;
    var cUnit  = IX + IW * 0.74;
    var cTotal = IX + IW * 0.88;

    ctx.fillText("ITEM",     IX + 14,  y + H_TAB_HEAD / 2);
    ctx.fillText("QTD",      cQty,     y + H_TAB_HEAD / 2);
    ctx.fillText("PESO UN.", cUnit,    y + H_TAB_HEAD / 2);
    ctx.fillText("TOTAL",    cTotal,   y + H_TAB_HEAD / 2);

    y += H_TAB_HEAD;

    /* linhas de itens */
    d.itens.forEach(function (item, idx) {
      /* fundo alternado */
      ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#F6FAF3";
      ctx.fillRect(IX, y, IW, H_ITEM);

      /* separador */
      ctx.beginPath();
      ctx.moveTo(IX, y + H_ITEM);
      ctx.lineTo(IX + IW, y + H_ITEM);
      ctx.strokeStyle = C.linha; ctx.lineWidth = 0.5; ctx.stroke();

      var mY = y + H_ITEM / 2;
      ctx.textBaseline = "middle";

      /* nome */
      ctx.fillStyle = C.textoPrinc;
      ctx.font      = "bold 14px Arial";
      ctx.fillText(item.nome, IX + 14, mY);

      /* qty */
      ctx.fillStyle = C.textoSecund;
      ctx.font      = "14px Arial";
      ctx.fillText(item.qty, cQty, mY);

      /* peso unit — extrair do totalKg ÷ qty (se numérico) */
      var totalNum = parseFloat(item.totalKg) || 0;
      var qtyNum   = parseInt(item.qty) || 1;
      var unitNum  = qtyNum > 0 ? (totalNum / qtyNum).toFixed(1) + " kg" : "—";
      ctx.fillText(unitNum, cUnit, mY);

      /* total */
      ctx.fillStyle = C.verde;
      ctx.font      = "bold 14px Arial";
      ctx.fillText(item.totalKg, cTotal, mY);

      y += H_ITEM;
    });

    /* 6 ── TOTAL ──────────────────────────────────── */
    rrect(ctx, IX, y, IW, H_TOTAL, 0);
    ctx.fillStyle = C.totalBg; ctx.fill();

    ctx.textBaseline = "middle";
    var totalMY = y + H_TOTAL / 2;

    ctx.fillStyle = C.headerVerde;
    ctx.font      = "bold 15px Arial";
    ctx.fillText("TOTAL DE ALIMENTOS DOADOS", IX + 14, totalMY);

    ctx.font      = "bold 22px Arial";
    var tw = ctx.measureText(d.totalKg).width;
    ctx.fillText(d.totalKg, IX + IW - tw - 14, totalMY);

    y += H_TOTAL + GAP;

    /* 7 ── OBSERVAÇÃO / PEDIDO DE ORAÇÃO ─────────── */
    if (d.obs) {
      ctx.fillStyle = C.textoSecund;
      ctx.font      = "bold 12px Arial";
      ctx.textBaseline = "top";
      ctx.fillText("PEDIDO DE ORAÇÃO:", IX, y);
      y += 20;

      ctx.fillStyle = C.textoPrinc;
      ctx.font      = "italic 13px Georgia";
      /* quebra de linha manual */
      var palavras  = d.obs.split(" ");
      var linhaObs  = "";
      var maxW      = IW - 10;
      palavras.forEach(function (p) {
        var teste = linhaObs ? linhaObs + " " + p : p;
        if (ctx.measureText(teste).width > maxW && linhaObs) {
          ctx.fillText(linhaObs, IX, y);
          y += 22;
          linhaObs = p;
        } else {
          linhaObs = teste;
        }
      });
      if (linhaObs) { ctx.fillText(linhaObs, IX, y); y += 22; }
      y += 12;
    }

    /* 8 ── RODAPÉ ────────────────────────────────── */

    /* linha gradiente */
    var grdRod = ctx.createLinearGradient(IX, y, IX + IW, y);
    grdRod.addColorStop(0,   "transparent");
    grdRod.addColorStop(0.3, C.verde);
    grdRod.addColorStop(0.7, C.vermelho);
    grdRod.addColorStop(1,   "transparent");
    ctx.strokeStyle = grdRod; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(IX, y); ctx.lineTo(IX + IW, y); ctx.stroke();
    y += 20;

    ctx.textAlign    = "center";
    ctx.textBaseline = "top";

    /* versículo */
    ctx.fillStyle = C.textoSecund;
    ctx.font      = "italic 13px Georgia";
    ctx.fillText('"Pois tive fome e me destes de comer..." — Mt 25:35', CX, y);
    y += 22;

    /* mensagem de bênção */
    ctx.fillStyle = C.headerVerde;
    ctx.font      = "bold italic 16px Georgia";
    ctx.fillText('"Que Deus abençoe sua generosidade!"', CX, y);
    y += 28;

    /* nome da organização */
    ctx.fillStyle = C.textoSecund;
    ctx.font      = "13px Arial";
    ctx.fillText("Ação Social Semear + Maanaim — Belém, PA", CX, y);
    y += 22;

    /* protocolo no rodapé */
    ctx.fillStyle = C.textoMuted;
    ctx.font      = "11px 'Courier New'";
    ctx.fillText("doavida  ·  " + d.protocolo, CX, y);

    ctx.textAlign = "left";

    /* ── Converte para Blob PNG e entrega via callback ─ */
    canvas.toBlob(function (blob) {
      callback(null, blob);
    }, "image/png");
  }

  /* Expõe no escopo global para uso em form.js */
  window.gerarImagemRecibo = gerarImagemRecibo;

})();
