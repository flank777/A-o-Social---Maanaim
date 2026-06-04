/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DoaVida — js/gerar-comprovante.js                                  ║
 * ║  Ação Social Semear + Maanaim — Belém, PA                          ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Gera uma imagem PNG de comprovante de doação formatada como recibo ║
 * ║  profissional, pronta para envio via WhatsApp.                      ║
 * ║                                                                      ║
 * ║  DEPENDÊNCIAS:                                                       ║
 * ║    npm install canvas                                                ║
 * ║                                                                      ║
 * ║  USO (Node.js):                                                      ║
 * ║    const { gerarComprovante } = require('./js/gerar-comprovante');   ║
 * ║    const buffer = await gerarComprovante(dadosDoacao);               ║
 * ║    // buffer = Buffer PNG pronto para enviar pela API do WhatsApp    ║
 * ║                                                                      ║
 * ║  EXEMPLO DE dadosDoacao:                                             ║
 * ║    {                                                                 ║
 * ║      protocolo: 'DOA-20260416-4ATB9',                               ║
 * ║      data: '16/04/2026 às 11:32',                                   ║
 * ║      doador: 'FLANK KAUÃ SANTOS',                                   ║
 * ║      whatsapp: '55919861410',                                        ║
 * ║      entrega: 'ENTREGA NA IGREJA',                                  ║
 * ║      itens: [                                                        ║
 * ║        { nome: 'Leite em pó', quantidade: 2, peso: 2.0 },           ║
 * ║        { nome: 'Bolacha',     quantidade: 1, peso: 1.0 },           ║
 * ║        { nome: 'Café',        quantidade: 1, peso: 1.0 }            ║
 * ║      ]                                                               ║
 * ║    }                                                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

"use strict";

const { createCanvas } = require("canvas");

/* ══════════════════════════════════════════════════════════════════════
   PALETA DE CORES
   Consistente com o design do site: branco gelo, verde escuro, vermelho suave.
   ══════════════════════════════════════════════════════════════════════ */
const CORES = {
  fundo:        "#F4F8FB",   /* Branco gelo — fundo do comprovante */
  fundoCard:    "#FFFFFF",   /* Branco puro — área do recibo */
  verdePrimario:"#1a3312",   /* Verde escuro — cabeçalho, rótulos */
  verdeSecund:  "#5a8a4a",   /* Verde médio — bordas, acentos */
  vermelho:     "#8a1818",   /* Vermelho suave — destaque protocolo */
  textoPrinc:   "#1a1a18",   /* Quase preto — texto principal */
  textoSecund:  "#555550",   /* Cinza médio — subtítulos */
  textoMuted:   "#888880",   /* Cinza claro — rodapé, info extra */
  linhaTabela:  "#E8EDF2",   /* Linha separadora da tabela */
  totalBg:      "#EEF5E8",   /* Fundo linha de total */
  bordaCartao:  "rgba(90,138,74,0.20)",
};

/* ══════════════════════════════════════════════════════════════════════
   DIMENSÕES
   Largura fixa para WhatsApp (compressão boa em 800px).
   ══════════════════════════════════════════════════════════════════════ */
const LARGURA = 800;

/* ══════════════════════════════════════════════════════════════════════
   FUNÇÕES AUXILIARES DE DESENHO
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Desenha um retângulo com bordas arredondadas.
 */
function retanguloArredondado(ctx, x, y, w, h, r) {
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

/**
 * Centraliza texto horizontalmente num dado x de referência.
 */
function textoCentralizado(ctx, texto, cx, y) {
  const m = ctx.measureText(texto);
  ctx.fillText(texto, cx - m.width / 2, y);
}

/**
 * Formata peso em kg com 1 casa decimal.
 */
function formatarPeso(kg) {
  return kg.toFixed(1) + " kg";
}

/* ══════════════════════════════════════════════════════════════════════
   FUNÇÃO PRINCIPAL
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Gera a imagem PNG do comprovante de doação.
 *
 * @param {Object} dados - Dados da doação (ver exemplo no cabeçalho).
 * @returns {Promise<Buffer>} Buffer PNG pronto para envio/salvamento.
 */
async function gerarComprovante(dados) {
  /* ── Valores padrão para campos opcionais ─────────────── */
  const protocolo = dados.protocolo || "DOA-SEM-PROTOCOLO";
  const dataStr   = dados.data      || new Date().toLocaleString("pt-BR");
  const doador    = (dados.doador   || "Doador Anônimo").toUpperCase();
  const whatsapp  = dados.whatsapp  || "";
  const entrega   = (dados.entrega  || "A DEFINIR").toUpperCase();
  const itens     = Array.isArray(dados.itens) ? dados.itens : [];

  /* ── Calcular total de peso ───────────────────────────── */
  const totalPeso = itens.reduce(function (acc, item) {
    return acc + (item.peso || 0) * (item.quantidade || 1);
  }, 0);

  /* ── Calcular altura dinâmica do canvas ──────────────── */
  const PADDING         = 40;
  const ALTURA_HEADER   = 120;  /* Cabeçalho verde */
  const ALTURA_TITULO   = 80;   /* "COMPROVANTE DE DOAÇÃO" */
  const ALTURA_INFO     = 170;  /* Protocolo, data, doador, etc. */
  const ALTURA_LINHA_TABELA = 48;
  const ALTURA_TABELA_HEADER = 44;
  const ALTURA_TOTAL    = 52;
  const ALTURA_RODAPE   = 90;
  const MARGEM_ENTRE    = 20;

  const ALTURA_ITENS = itens.length * ALTURA_LINHA_TABELA;

  const ALTURA_TOTAL_CANVAS =
    PADDING +
    ALTURA_HEADER +
    MARGEM_ENTRE +
    ALTURA_TITULO +
    ALTURA_INFO +
    MARGEM_ENTRE +
    ALTURA_TABELA_HEADER +
    ALTURA_ITENS +
    ALTURA_TOTAL +
    MARGEM_ENTRE +
    ALTURA_RODAPE +
    PADDING;

  /* ── Criar canvas ─────────────────────────────────────── */
  const canvas = createCanvas(LARGURA, ALTURA_TOTAL_CANVAS);
  const ctx    = canvas.getContext("2d");

  /* ── 1. FUNDO DO COMPROVANTE ─────────────────────────── */
  ctx.fillStyle = CORES.fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA_TOTAL_CANVAS);

  /* Sombra do cartão central */
  const CARD_X = 30;
  const CARD_W = LARGURA - 60;
  ctx.shadowColor   = "rgba(0,0,0,0.10)";
  ctx.shadowBlur    = 20;
  ctx.shadowOffsetY = 4;
  retanguloArredondado(ctx, CARD_X, 20, CARD_W, ALTURA_TOTAL_CANVAS - 40, 16);
  ctx.fillStyle = CORES.fundoCard;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetY = 0;

  /* Borda do cartão */
  ctx.strokeStyle = CORES.bordaCartao;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  let y = 20; /* cursor vertical */

  /* ── 2. CABEÇALHO VERDE ──────────────────────────────── */
  retanguloArredondado(ctx, CARD_X, y, CARD_W, ALTURA_HEADER, 16);
  const grad = ctx.createLinearGradient(CARD_X, y, CARD_X + CARD_W, y + ALTURA_HEADER);
  grad.addColorStop(0, "#1a3312");
  grad.addColorStop(1, "#2e5520");
  ctx.fillStyle = grad;
  ctx.fill();

  /* Ícone de coração estilizado no cabeçalho */
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(CARD_X + CARD_W - 60, y + ALTURA_HEADER / 2, 40, 0, Math.PI * 2);
  ctx.fill();

  /* Título principal no cabeçalho */
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px 'Arial'";
  ctx.textBaseline = "middle";
  textoCentralizado(ctx, "COMPROVANTE DE DOAÇÃO", CARD_X + CARD_W / 2, y + 44);

  /* Subtítulo organização */
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  textoCentralizado(ctx, "Ação Social Semear + Maanaim · Belém, PA", CARD_X + CARD_W / 2, y + 76);

  /* Linha decorativa vermelha no rodapé do cabeçalho */
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(CARD_X + CARD_W / 2 - 40, y + ALTURA_HEADER - 8, 80, 4);

  y += ALTURA_HEADER + MARGEM_ENTRE;

  /* ── 3. SEÇÃO "PROTOCOLO" ────────────────────────────── */
  const INFO_X = CARD_X + 40;
  const INFO_W = CARD_W - 80;

  /* Caixa de protocolo com destaque */
  retanguloArredondado(ctx, INFO_X, y, INFO_W, 50, 10);
  ctx.fillStyle = "rgba(138, 24, 24, 0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(138, 24, 24, 0.20)";
  ctx.lineWidth   = 1;
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.fillStyle = CORES.vermelho;
  ctx.font      = "bold 13px 'Arial'";
  ctx.fillText("PROTOCOLO", INFO_X + 20, y + 16);

  ctx.fillStyle = CORES.verdePrimario;
  ctx.font      = "bold 18px 'Courier New'";
  ctx.fillText(protocolo, INFO_X + 20, y + 36);

  y += 62;

  /* ── 4. INFORMAÇÕES DA DOAÇÃO ────────────────────────── */
  function linhaInfo(rotulo, valor, corValor) {
    ctx.textBaseline = "top";
    ctx.fillStyle = CORES.textoSecund;
    ctx.font      = "12px 'Arial'";
    ctx.fillText(rotulo.toUpperCase(), INFO_X, y);

    ctx.fillStyle = corValor || CORES.textoPrinc;
    ctx.font      = "bold 15px 'Arial'";
    ctx.fillText(valor, INFO_X + 170, y - 1);

    /* Linha separadora */
    ctx.beginPath();
    ctx.moveTo(INFO_X, y + 22);
    ctx.lineTo(INFO_X + INFO_W, y + 22);
    ctx.strokeStyle = CORES.linhaTabela;
    ctx.lineWidth   = 1;
    ctx.stroke();

    y += 32;
  }

  linhaInfo("Data e Hora",  dataStr);
  linhaInfo("Doador",       doador);
  if (whatsapp) linhaInfo("WhatsApp",  "+" + whatsapp);
  linhaInfo("Forma de Entrega", entrega, CORES.verdeSecund);

  y += 8;

  /* ── 5. TABELA DE ITENS ──────────────────────────────── */

  /* Cabeçalho da tabela */
  retanguloArredondado(ctx, INFO_X, y, INFO_W, ALTURA_TABELA_HEADER, 8);
  ctx.fillStyle = CORES.verdePrimario;
  ctx.fill();

  ctx.textBaseline = "middle";
  ctx.fillStyle    = "#ffffff";
  ctx.font         = "bold 13px 'Arial'";
  ctx.fillText("ITEM",       INFO_X + 16,             y + ALTURA_TABELA_HEADER / 2);
  ctx.fillText("QTD",        INFO_X + INFO_W * 0.60,  y + ALTURA_TABELA_HEADER / 2);
  ctx.fillText("PESO UNIT.", INFO_X + INFO_W * 0.72,  y + ALTURA_TABELA_HEADER / 2);
  ctx.fillText("SUBTOTAL",   INFO_X + INFO_W * 0.87,  y + ALTURA_TABELA_HEADER / 2);

  y += ALTURA_TABELA_HEADER;

  /* Linhas de itens */
  itens.forEach(function (item, idx) {
    const nomeProduto = item.nome || ("Item " + (idx + 1));
    const qtd         = item.quantidade || 1;
    const pesoUnit    = item.peso || 0;
    const subtotal    = qtd * pesoUnit;

    /* Fundo alternado */
    ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#F7FAF4";
    ctx.fillRect(INFO_X, y, INFO_W, ALTURA_LINHA_TABELA);

    /* Linha separadora inferior */
    ctx.beginPath();
    ctx.moveTo(INFO_X, y + ALTURA_LINHA_TABELA);
    ctx.lineTo(INFO_X + INFO_W, y + ALTURA_LINHA_TABELA);
    ctx.strokeStyle = CORES.linhaTabela;
    ctx.lineWidth   = 0.5;
    ctx.stroke();

    ctx.textBaseline = "middle";
    const mY = y + ALTURA_LINHA_TABELA / 2;

    /* Nome do item */
    ctx.fillStyle = CORES.textoPrinc;
    ctx.font      = "bold 14px 'Arial'";
    ctx.fillText(nomeProduto, INFO_X + 16, mY);

    /* Quantidade */
    ctx.fillStyle = CORES.textoSecund;
    ctx.font      = "14px 'Arial'";
    ctx.fillText("x" + qtd, INFO_X + INFO_W * 0.60, mY);

    /* Peso unitário */
    ctx.fillText(formatarPeso(pesoUnit), INFO_X + INFO_W * 0.72, mY);

    /* Subtotal */
    ctx.fillStyle = CORES.verdeSecund;
    ctx.font      = "bold 14px 'Arial'";
    ctx.fillText(formatarPeso(subtotal), INFO_X + INFO_W * 0.87, mY);

    y += ALTURA_LINHA_TABELA;
  });

  /* ── 6. LINHA DE TOTAL ───────────────────────────────── */
  retanguloArredondado(ctx, INFO_X, y, INFO_W, ALTURA_TOTAL, 0);
  ctx.fillStyle = CORES.totalBg;
  ctx.fill();

  ctx.textBaseline = "middle";
  const totalY = y + ALTURA_TOTAL / 2;

  ctx.fillStyle = CORES.verdePrimario;
  ctx.font      = "bold 15px 'Arial'";
  ctx.fillText("TOTAL DE ALIMENTOS DOADOS", INFO_X + 16, totalY);

  ctx.fillStyle = CORES.verdePrimario;
  ctx.font      = "bold 20px 'Arial'";
  const totalTxt = formatarPeso(totalPeso);
  const totalM   = ctx.measureText(totalTxt);
  ctx.fillText(totalTxt, INFO_X + INFO_W - totalM.width - 16, totalY);

  y += ALTURA_TOTAL + MARGEM_ENTRE;

  /* ── 7. RODAPÉ ───────────────────────────────────────── */

  /* Linha decorativa divisória */
  const gradRodape = ctx.createLinearGradient(INFO_X, y, INFO_X + INFO_W, y);
  gradRodape.addColorStop(0, "transparent");
  gradRodape.addColorStop(0.3, CORES.verdeSecund);
  gradRodape.addColorStop(0.7, CORES.vermelho);
  gradRodape.addColorStop(1, "transparent");
  ctx.strokeStyle = gradRodape;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(INFO_X, y);
  ctx.lineTo(INFO_X + INFO_W, y);
  ctx.stroke();

  y += 18;

  ctx.textBaseline = "top";
  ctx.textAlign    = "center";
  const cx = CARD_X + CARD_W / 2;

  /* Mensagem de bênção */
  ctx.fillStyle = CORES.verdePrimario;
  ctx.font      = "italic bold 16px 'Georgia'";
  ctx.fillText('"Que Deus abençoe sua generosidade!"', cx, y);

  y += 28;

  /* Nome da organização */
  ctx.fillStyle = CORES.textoSecund;
  ctx.font      = "13px 'Arial'";
  ctx.fillText("Ação Social Semear + Maanaim — Belém, PA", cx, y);

  y += 22;

  /* Hash/identificador técnico */
  ctx.fillStyle = CORES.textoMuted;
  ctx.font      = "11px 'Courier New'";
  ctx.fillText("doavida.local · " + protocolo, cx, y);

  ctx.textAlign = "left"; /* Restaura alinhamento padrão */

  /* ── 8. Retornar buffer PNG ──────────────────────────── */
  return canvas.toBuffer("image/png");
}

/* ══════════════════════════════════════════════════════════════════════
   EXPORTAÇÃO
   ══════════════════════════════════════════════════════════════════════ */
module.exports = { gerarComprovante };

/* ══════════════════════════════════════════════════════════════════════
   EXECUÇÃO DE EXEMPLO (node js/gerar-comprovante.js)
   Gera comprovante com os dados do enunciado e salva em comprovante-exemplo.png
   ══════════════════════════════════════════════════════════════════════ */
if (require.main === module) {
  const fs   = require("fs");
  const path = require("path");

  const dadosExemplo = {
    protocolo: "DOA-20260416-4ATB9",
    data:      "16/04/2026 às 11:32",
    doador:    "FLANK KAUÃ SANTOS",
    whatsapp:  "55919861410",
    entrega:   "ENTREGA NA IGREJA",
    itens: [
      { nome: "Leite em pó", quantidade: 2, peso: 1.0 },
      { nome: "Bolacha",     quantidade: 1, peso: 1.0 },
      { nome: "Café",        quantidade: 1, peso: 1.0 },
    ],
  };

  gerarComprovante(dadosExemplo)
    .then(function (buffer) {
      const saida = path.join(__dirname, "..", "comprovante-exemplo.png");
      fs.writeFileSync(saida, buffer);
      console.log("✅ Comprovante gerado em: " + saida);
      console.log("   Tamanho: " + (buffer.length / 1024).toFixed(1) + " KB");
    })
    .catch(function (err) {
      console.error("❌ Erro ao gerar comprovante:", err.message);
    });
}
