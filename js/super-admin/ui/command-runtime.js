/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · ui/command-runtime.js                                ║
  ║  Runtime de comandos seguros — defesa em profundidade.              ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  • O cliente nunca executa código livre.                            ║
  ║  • Cada `action_type` tem um handler PRÉ-APROVADO mapeado aqui.     ║
  ║  • Tipos não whitelisted são rejeitados explicitamente.             ║
  ║  • Toda execução é logada em system_command_logs via RPC            ║
  ║    SECURITY DEFINER (`log_command_execution`).                      ║
  ║                                                                      ║
  ║  USO:                                                               ║
  ║    SA.commandRuntime.execute(commandKey, context);                  ║
  ║                                                                      ║
  ║  context (opcional) carrega dados do contexto onde o comando foi    ║
  ║  disparado (ex.: { record: { id, phone, email, name } }).           ║
  ║                                                                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function client() { return window.supabaseClient; }

  function escUrl(u) {
    // Bloqueia URLs javascript:, data: etc. (defensivo)
    if (!u) return null;
    var s = String(u).trim();
    if (/^(javascript|data|vbscript):/i.test(s)) return null;
    return s;
  }

  function fillTemplate(tpl, data) {
    return String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) {
      return data && data[k] != null ? data[k] : '';
    });
  }

  function digitsOnly(s) { return String(s || '').replace(/\D/g, ''); }

  /* ── Handlers (whitelist) ──────────────────────────────────────── */
  var HANDLERS = {
    link_internal: function (cmd, ctx) {
      var path = escUrl(cmd.payload && cmd.payload.path);
      if (!path) throw new Error('Sem path configurado.');
      // Só aceita paths relativos ao site
      if (/^https?:/i.test(path) || path.indexOf('//') === 0) throw new Error('Use link_external para URLs absolutas.');
      window.location.assign(path);
      return { message: 'Redirecionando…' };
    },

    link_external: function (cmd) {
      var url = escUrl(cmd.payload && cmd.payload.url);
      if (!url) throw new Error('Sem URL configurada.');
      if (!/^https?:\/\//i.test(url)) throw new Error('URL externa precisa começar com http(s)://');
      window.open(url, '_blank', 'noopener,noreferrer');
      return { message: 'Abrindo em nova aba…' };
    },

    whatsapp_open: function (cmd, ctx) {
      var p = cmd.payload || {};
      var record = (ctx && ctx.record) || {};
      var rawNumber;
      if (p.number_field && record[p.number_field]) {
        rawNumber = record[p.number_field];
      } else if (p.number_config_key && ctx && ctx.config) {
        rawNumber = ctx.config[p.number_config_key];
      } else if (p.number) {
        rawNumber = p.number;
      }
      var num = digitsOnly(rawNumber);
      if (!num) throw new Error('Número de WhatsApp não disponível.');
      if (num.length === 11) num = '55' + num; // BR mobile
      if (num.length === 10) num = '55' + num; // BR fixo
      var msg = fillTemplate(p.template || '', record);
      var url = 'https://wa.me/' + num + (msg ? '?text=' + encodeURIComponent(msg) : '');
      window.open(url, '_blank', 'noopener,noreferrer');
      return { message: 'WhatsApp aberto' };
    },

    phone_call: function (cmd, ctx) {
      var p = cmd.payload || {};
      var record = (ctx && ctx.record) || {};
      var num = digitsOnly(p.number || (p.number_field ? record[p.number_field] : ''));
      if (!num) throw new Error('Telefone não disponível.');
      var url = 'tel:+55' + num;
      window.location.href = url;
      return { message: 'Discador aberto' };
    },

    email_compose: function (cmd, ctx) {
      var p = cmd.payload || {};
      var record = (ctx && ctx.record) || {};
      var to = p.email_field ? record[p.email_field] : p.email;
      if (!to) throw new Error('E-mail não disponível.');
      var url = 'mailto:' + encodeURIComponent(to) +
                (p.subject ? '?subject=' + encodeURIComponent(fillTemplate(p.subject, record)) : '') +
                (p.body    ? (p.subject ? '&' : '?') + 'body=' + encodeURIComponent(fillTemplate(p.body, record)) : '');
      window.location.href = url;
      return { message: 'E-mail aberto' };
    },

    modal_open: function (cmd) {
      var modalId = (cmd.payload && cmd.payload.modal_id) || '';
      if (!modalId) throw new Error('modal_id não configurado.');
      // Dispara um CustomEvent que o site/admin pode ouvir.
      window.dispatchEvent(new CustomEvent('sa:modal-open', { detail: { id: modalId } }));
      return { message: 'Evento de modal disparado' };
    },

    download_file: function (cmd) {
      var p = cmd.payload || {};
      var url = escUrl(p.url);
      if (!url) throw new Error('URL inválida ou bloqueada.');
      var a = document.createElement('a');
      a.href = url;
      a.download = p.filename || '';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { message: 'Download iniciado' };
    },

    toast_show: function (cmd) {
      var p = cmd.payload || {};
      var msg = String(p.message || cmd.success_message || 'OK');
      var kind = ['ok','err','info'].indexOf(p.kind) >= 0 ? p.kind : 'info';
      if (window.SA && window.SA.store && window.SA.store.toast) window.SA.store.toast(msg, kind);
      return { message: msg };
    },

    clipboard_copy: function (cmd, ctx) {
      var p = cmd.payload || {};
      var value;
      if (p.value)              value = p.value;
      else if (p.value_field   && ctx && ctx.record) value = ctx.record[p.value_field];
      else if (p.value_config_key && ctx && ctx.config) value = ctx.config[p.value_config_key];
      if (!value) throw new Error('Sem valor para copiar.');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(value));
      } else {
        var ta = document.createElement('textarea');
        ta.value = String(value);
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } finally { ta.remove(); }
      }
      return { message: 'Copiado: ' + String(value).slice(0, 60) };
    },

    page_publish: async function (cmd, ctx) {
      var id = (ctx && ctx.entity_id) || (cmd.payload && cmd.payload.id);
      if (!id) throw new Error('Sem id de página.');
      await window.SA.publish.publish('site_pages', id, 'Publicada via comando');
      return { message: 'Página publicada' };
    },

    section_publish: async function (cmd, ctx) {
      var id = (ctx && ctx.entity_id) || (cmd.payload && cmd.payload.id);
      if (!id) throw new Error('Sem id de seção.');
      await window.SA.publish.publish('site_sections', id, 'Publicada via comando');
      return { message: 'Seção publicada' };
    },

    widget_publish: async function (cmd, ctx) {
      var id = (ctx && ctx.entity_id) || (cmd.payload && cmd.payload.id);
      if (!id) throw new Error('Sem id de widget.');
      await window.SA.publish.publish('admin_widgets', id, 'Publicado via comando');
      return { message: 'Widget publicado' };
    },

    form_publish: async function (cmd, ctx) {
      var id = (ctx && ctx.entity_id) || (cmd.payload && cmd.payload.id);
      if (!id) throw new Error('Sem id de formulário.');
      await window.SA.publish.publish('site_forms', id, 'Publicado via comando');
      return { message: 'Formulário publicado' };
    },

    record_update_status: async function (cmd, ctx) {
      var p = cmd.payload || {};
      var allowed = ['doacoes','voluntarios','oracoes','site_form_submissions'];
      if (allowed.indexOf(p.table) < 0) throw new Error('Tabela "' + p.table + '" não permitida.');
      var id = (ctx && ctx.record && ctx.record.id) || p.id;
      if (!id) throw new Error('Sem id do registro.');
      var status = p.status_value || (ctx && ctx.status);
      if (!status) throw new Error('Sem status definido.');
      var sb = client();
      var r = await sb.from(p.table).update({ status: status }).eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return { message: 'Status atualizado para "' + status + '"' };
    },

    record_soft_delete: async function (cmd, ctx) {
      var p = cmd.payload || {};
      var allowed = ['site_pages','site_sections','site_cards','site_media','site_forms','admin_widgets','agent_knowledge'];
      if (allowed.indexOf(p.table) < 0) throw new Error('Tabela "' + p.table + '" não permitida para soft delete.');
      var id = (ctx && ctx.record && ctx.record.id) || p.id;
      if (!id) throw new Error('Sem id do registro.');
      var sb = client();
      var r = await sb.from(p.table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return { message: 'Registro marcado como excluído' };
    },

    export_report: async function (cmd) {
      var p = cmd.payload || {};
      var allowed = ['doacoes','voluntarios','familias','oracoes','alimentos','site_form_submissions','agent_knowledge'];
      if (allowed.indexOf(p.table) < 0) throw new Error('Tabela "' + p.table + '" não permitida.');
      var sb = client();
      var r = await sb.from(p.table).select('*').limit(p.limit || 5000);
      if (r.error) throw new Error(r.error.message);
      var rows = r.data || [];
      if (!rows.length) return { message: 'Nada para exportar.' };
      // CSV simples (campos básicos sem escape de quebras de linha avançadas)
      var headers = Object.keys(rows[0]);
      var csv = [
        headers.join(','),
        rows.map(function (row) {
          return headers.map(function (h) {
            var v = row[h] == null ? '' : (typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h]));
            v = v.replace(/"/g, '""');
            return '"' + v + '"';
          }).join(',');
        }).join('\n')
      ].join('\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = p.table + '-' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      return { message: rows.length + ' linhas exportadas' };
    }
  };

  /* ── execute(commandKey, context) — entry point ────────────────── */
  async function execute(commandKey, context) {
    var sb = client();
    if (!sb) throw new Error('Supabase não inicializado.');
    var rRes = await sb.from('system_commands').select('*').eq('command_key', commandKey).single();
    if (rRes.error || !rRes.data) {
      await logExec(null, commandKey, '?', 'error', 'Comando não encontrado', {});
      throw new Error('Comando "' + commandKey + '" não encontrado.');
    }
    var cmd = rRes.data;
    if (cmd.status !== 'active') {
      await logExec(cmd.id, cmd.command_key, cmd.action_type, 'denied', 'Comando desativado', {});
      throw new Error('Comando "' + commandKey + '" está desativado.');
    }
    var handler = HANDLERS[cmd.action_type];
    if (!handler) {
      await logExec(cmd.id, cmd.command_key, cmd.action_type, 'error', 'Tipo de ação não suportado: ' + cmd.action_type, {});
      throw new Error('Tipo de ação não suportado: ' + cmd.action_type);
    }
    try {
      var out = await handler(cmd, context || {});
      await logExec(cmd.id, cmd.command_key, cmd.action_type, 'ok', (out && out.message) || cmd.success_message, cmd.payload);
      return out || { message: cmd.success_message || 'OK' };
    } catch (e) {
      await logExec(cmd.id, cmd.command_key, cmd.action_type, 'error', e.message || cmd.error_message, cmd.payload);
      throw e;
    }
  }

  async function logExec(id, key, action, result, message, payload) {
    try {
      var sb = client();
      await sb.rpc('log_command_execution', {
        p_command_id: id, p_command_key: key, p_action_type: action,
        p_result: result, p_message: message || '', p_payload: payload || {}
      });
    } catch (e) { /* silencioso — log é best-effort */ }
  }

  function listHandlers() { return Object.keys(HANDLERS); }

  window.SA = window.SA || {};
  window.SA.commandRuntime = {
    execute:       execute,
    listHandlers:  listHandlers
  };
})();
