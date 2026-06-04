/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/receipts.js                                    ║
  ║  Editor visual do template de recibo + config de comprovantes.      ║
  ║  2 abas: Recibo (template) · Comprovante (fluxo Pix).               ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  var st = { receipt: null, proof: null, tab: 'receipt' };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Recibos & Comprovantes</h2>' +
          '<p class="sa-view__sub">Personalize o recibo gerado para cada doação e o fluxo de envio de comprovante Pix.</p>' +
        '</div>' +
      '</header>' +

      '<div role="tablist" style="display:inline-flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:10px;border:1px solid var(--sa-line);margin-bottom:14px">' +
        '<button class="sa-btn sa-btn--ghost" data-tab="receipt" style="border:0" aria-current="true"><i class="fa-solid fa-receipt"></i><span>Recibo</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="proof"   style="border:0"><i class="fa-solid fa-paperclip"></i><span>Comprovante</span></button>' +
      '</div>' +

      // ── Aba Recibo ─────────────────────────────────────────
      '<section id="rc-tab-receipt" class="rc-grid">' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Configuração do recibo</h3>' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Nome interno</span><input id="rc-name" class="sa-field__input" maxlength="80" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Cor primária</span><input id="rc-color" type="color" class="sa-field__input" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Família da fonte</span><input id="rc-font" class="sa-field__input" placeholder="DM Sans" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Prefixo do protocolo</span><input id="rc-prefix" class="sa-field__input" maxlength="10" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Título do recibo</span><input id="rc-title" class="sa-field__input" maxlength="80" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Nome da organização</span><input id="rc-org" class="sa-field__input" maxlength="120" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Subtítulo da organização</span><input id="rc-org-sub" class="sa-field__input" maxlength="160" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Logo esquerda (URL)</span><input id="rc-logo-l" class="sa-field__input" placeholder="logo-semear.jpeg" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Logo direita (URL)</span><input id="rc-logo-r" class="sa-field__input" placeholder="logo-maanaim.jpeg" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Mensagem de agradecimento</span><textarea id="rc-thanks" class="sa-field__input" rows="2" maxlength="280"></textarea></label>' +
            '<label class="sa-field"><span class="sa-field__label">Rótulo da assinatura</span><input id="rc-sig" class="sa-field__input" maxlength="120" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Texto do rodapé</span><input id="rc-footer" class="sa-field__input" maxlength="160" /></label>' +
          '</div>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">' +
            '<button class="sa-btn sa-btn--soft" id="rc-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar e publicar</span></button>' +
          '</div>' +
        '</section>' +

        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Pré-visualização do recibo</h3>' +
          '<div id="rc-preview" class="rc-preview-wrap"></div>' +
          '<p style="color:var(--sa-text-mute);font-size:12.5px;margin:10px 0 0">Dados de exemplo para visualização. O recibo real é gerado no momento da doação.</p>' +
        '</section>' +
      '</section>' +

      // ── Aba Comprovante ────────────────────────────────────
      '<section id="rc-tab-proof" hidden>' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Fluxo de comprovante Pix</h3>' +
          '<div class="sa-row">' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Chave Pix exibida ao doador</span><input id="pf-pix" class="sa-field__input" placeholder="Ex.: 91999999999 ou e-mail" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Texto explicativo (intro)</span><textarea id="pf-intro" class="sa-field__input" rows="2" maxlength="400"></textarea></label>' +
            '<label class="sa-field"><span class="sa-field__label">Texto do botão "enviar"</span><input id="pf-btn" class="sa-field__input" maxlength="60" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Tamanho máx. (MB)</span><input id="pf-size" type="number" class="sa-field__input" min="1" max="50" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Mensagem WhatsApp automática</span><textarea id="pf-wa" class="sa-field__input" rows="2" maxlength="400" placeholder="Olá! Acabei de enviar o comprovante."></textarea></label>' +
            '<label class="sa-field"><span class="sa-field__label">Status: pendente</span><input id="pf-pending" class="sa-field__input" maxlength="160" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Status: aprovado</span><input id="pf-approved" class="sa-field__input" maxlength="160" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Status: recusado</span><input id="pf-rejected" class="sa-field__input" maxlength="160" /></label>' +
          '</div>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">' +
            '<button class="sa-btn sa-btn--primary" id="pf-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar configuração</span></button>' +
          '</div>' +
        '</section>' +
      '</section>';
  }

  function fillReceipt(r) {
    document.getElementById('rc-name').value     = r.name || '';
    document.getElementById('rc-color').value    = r.primary_color || '#4a8a39';
    document.getElementById('rc-font').value     = r.font_family || 'DM Sans';
    document.getElementById('rc-prefix').value   = r.protocol_prefix || 'DOA';
    document.getElementById('rc-title').value    = r.receipt_title || 'Recibo de Doação';
    document.getElementById('rc-org').value      = r.org_name || '';
    document.getElementById('rc-org-sub').value  = r.org_subtitle || '';
    document.getElementById('rc-logo-l').value   = r.logo_left_url || '';
    document.getElementById('rc-logo-r').value   = r.logo_right_url || '';
    document.getElementById('rc-thanks').value   = r.thanks_message || '';
    document.getElementById('rc-sig').value      = r.signature_label || '';
    document.getElementById('rc-footer').value   = r.footer_text || '';
  }

  function readReceipt() {
    return {
      template_key:    'default',
      name:            document.getElementById('rc-name').value.trim() || 'Padrão',
      primary_color:   document.getElementById('rc-color').value,
      font_family:     document.getElementById('rc-font').value.trim() || 'DM Sans',
      protocol_prefix: document.getElementById('rc-prefix').value.trim() || 'DOA',
      receipt_title:   document.getElementById('rc-title').value.trim() || 'Recibo de Doação',
      org_name:        document.getElementById('rc-org').value.trim(),
      org_subtitle:    document.getElementById('rc-org-sub').value.trim(),
      logo_left_url:   document.getElementById('rc-logo-l').value.trim(),
      logo_right_url:  document.getElementById('rc-logo-r').value.trim(),
      thanks_message:  document.getElementById('rc-thanks').value.trim(),
      signature_label: document.getElementById('rc-sig').value.trim(),
      footer_text:     document.getElementById('rc-footer').value.trim(),
      status:          'published'
    };
  }

  function refreshReceiptPreview() {
    var r = readReceipt();
    var now = new Date();
    var protocol = r.protocol_prefix + '-' + now.getFullYear() + (now.getMonth()+1+'').padStart(2,'0') + (now.getDate()+'').padStart(2,'0') + '-XXXXX';
    var pv = document.getElementById('rc-preview');
    pv.innerHTML = '<div class="rc-paper" style="font-family:\'' + escHtml(r.font_family) + '\', sans-serif;border-top:6px solid ' + escHtml(r.primary_color) + '">' +
      '<div class="rc-paper__head">' +
        (r.logo_left_url  ? '<img src="' + escHtml(r.logo_left_url)  + '" alt="" />' : '<span></span>') +
        '<div class="rc-paper__org">' +
          '<strong style="color:' + escHtml(r.primary_color) + '">' + escHtml(r.org_name || '—') + '</strong>' +
          (r.org_subtitle ? '<small>' + escHtml(r.org_subtitle) + '</small>' : '') +
        '</div>' +
        (r.logo_right_url ? '<img src="' + escHtml(r.logo_right_url) + '" alt="" style="border-radius:50%" />' : '<span></span>') +
      '</div>' +
      '<h3 class="rc-paper__title">' + escHtml(r.receipt_title) + '</h3>' +
      '<dl class="rc-paper__data">' +
        '<dt>Protocolo</dt><dd><code>' + escHtml(protocol) + '</code></dd>' +
        '<dt>Data</dt><dd>' + escHtml(now.toLocaleDateString('pt-BR')) + '</dd>' +
        '<dt>Doador</dt><dd>Maria da Silva (exemplo)</dd>' +
        '<dt>Item</dt><dd>Cesta básica · 2 unidades</dd>' +
        '<dt>Entrega</dt><dd>Retirada na Comunidade</dd>' +
      '</dl>' +
      (r.thanks_message ? '<p class="rc-paper__thanks">' + escHtml(r.thanks_message) + '</p>' : '') +
      '<div class="rc-paper__signature"><span></span><small>' + escHtml(r.signature_label || '') + '</small></div>' +
      (r.footer_text ? '<p class="rc-paper__footer">' + escHtml(r.footer_text) + '</p>' : '') +
    '</div>';
  }

  async function saveReceipt() {
    try {
      st.receipt = await window.SA.api.receipts.upsertDefault(readReceipt());
      window.SA.store.toast('Recibo publicado', 'ok');
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  /* ── Comprovante ───────────────────────────────────────────────── */
  function fillProof(p) {
    document.getElementById('pf-pix').value      = p.proof_pix_key      || '';
    document.getElementById('pf-intro').value    = p.proof_intro        || '';
    document.getElementById('pf-btn').value      = p.proof_btn_label    || 'Enviar comprovante';
    document.getElementById('pf-size').value     = p.proof_max_size_mb  || 5;
    document.getElementById('pf-wa').value       = p.proof_whatsapp_text|| '';
    document.getElementById('pf-pending').value  = p.proof_pending_msg  || '';
    document.getElementById('pf-approved').value = p.proof_approved_msg || '';
    document.getElementById('pf-rejected').value = p.proof_rejected_msg || '';
  }
  function readProof() {
    return {
      proof_pix_key:      document.getElementById('pf-pix').value.trim(),
      proof_intro:        document.getElementById('pf-intro').value.trim(),
      proof_btn_label:    document.getElementById('pf-btn').value.trim(),
      proof_max_size_mb:  parseInt(document.getElementById('pf-size').value, 10) || 5,
      proof_whatsapp_text:document.getElementById('pf-wa').value.trim(),
      proof_pending_msg:  document.getElementById('pf-pending').value.trim(),
      proof_approved_msg: document.getElementById('pf-approved').value.trim(),
      proof_rejected_msg: document.getElementById('pf-rejected').value.trim()
    };
  }
  async function saveProof() {
    try { await window.SA.api.proofs.saveAll(readProof()); window.SA.store.toast('Configuração salva', 'ok'); }
    catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  /* ── Tabs ──────────────────────────────────────────────────────── */
  function showTab(name) {
    st.tab = name;
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.removeAttribute('aria-current'); });
    var btn = view.querySelector('[data-tab="' + name + '"]');
    if (btn) btn.setAttribute('aria-current', 'true');
    document.getElementById('rc-tab-receipt').hidden = (name !== 'receipt');
    document.getElementById('rc-tab-proof').hidden   = (name !== 'proof');
  }

  async function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Recibos & Comprovantes', strong: true }]);
    bindStyles();

    try { st.receipt = await window.SA.api.receipts.get('default'); }
    catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 5 não aplicada</div><div>Execute <code>db/super-admin/007_phase5_identity_receipts.sql</code>.</div></div>';
        return;
      }
    }
    try { st.proof = await window.SA.api.proofs.getAll(); } catch (e) { st.proof = {}; }

    fillReceipt(st.receipt || {
      name: 'Padrão', primary_color: '#4a8a39', font_family: 'DM Sans',
      protocol_prefix: 'DOA', receipt_title: 'Recibo de Doação',
      org_name: 'Ação Social Semear', org_subtitle: 'Comunidade Maanaim · Belém, PA',
      logo_left_url: 'logo-semear.jpeg', logo_right_url: 'logo-maanaim.jpeg',
      thanks_message: 'Que sua generosidade alimente esperança.',
      signature_label: 'Coordenação · Ação Social Semear',
      footer_text: 'Belém · Pará · 2026'
    });
    fillProof(st.proof || {});

    refreshReceiptPreview();

    // Bindings
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });
    ['rc-name','rc-color','rc-font','rc-prefix','rc-title','rc-org','rc-org-sub','rc-logo-l','rc-logo-r','rc-thanks','rc-sig','rc-footer'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', refreshReceiptPreview);
    });
    document.getElementById('rc-save').addEventListener('click', saveReceipt);
    document.getElementById('pf-save').addEventListener('click', saveProof);
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return; stylesInjected = true;
    var css = '' +
      '.rc-grid { display: grid; gap: 16px; grid-template-columns: minmax(0,1fr) minmax(0,1fr); align-items: start; }' +
      '@media (max-width: 1100px) { .rc-grid { grid-template-columns: 1fr; } }' +
      '.rc-preview-wrap { padding: 14px; background: #f7f4ed; border: 1px solid var(--sa-line); border-radius: 12px; }' +
      '.rc-paper { background: #fff; color: #1c1814; padding: 22px; border-radius: 10px; box-shadow: 0 12px 28px rgba(0,0,0,.18); max-width: 480px; margin: 0 auto; }' +
      '.rc-paper__head { display: grid; grid-template-columns: 56px 1fr 56px; align-items: center; gap: 10px; }' +
      '.rc-paper__head img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; }' +
      '.rc-paper__org { text-align: center; }' +
      '.rc-paper__org strong { display: block; font-size: 16px; line-height: 1.1; }' +
      '.rc-paper__org small { color: #555; font-size: 11.5px; }' +
      '.rc-paper__title { text-align: center; margin: 14px 0 10px; font-family: "Playfair Display", Georgia, serif; font-size: 22px; }' +
      '.rc-paper__data { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; padding: 12px; background: #f9f7f1; border-radius: 8px; font-size: 13px; }' +
      '.rc-paper__data dt { color: #777; font-weight: 600; }' +
      '.rc-paper__data dd { margin: 0; color: #333; }' +
      '.rc-paper__thanks { margin: 14px 0; font-style: italic; text-align: center; color: #555; }' +
      '.rc-paper__signature { display: grid; gap: 4px; margin-top: 24px; text-align: center; }' +
      '.rc-paper__signature span { display: block; height: 1px; background: rgba(0,0,0,.2); width: 60%; margin: 0 auto; }' +
      '.rc-paper__signature small { color: #777; font-size: 11.5px; }' +
      '.rc-paper__footer { margin: 14px 0 0; text-align: center; font-size: 11px; color: #888; }';
    var el = document.createElement('style'); el.id = 'sa-receipts-styles'; el.textContent = css; document.head.appendChild(el);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.receipts = { render: render };
})();
