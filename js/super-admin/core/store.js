/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/store.js                                        ║
  ║  Estado central + pub/sub + toast. Vanilla JS, ES5-friendly.        ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  /* ── Estado central ────────────────────────────────────────────── */
  var state = {
    booted: false,
    session: null,         // { user, profile }
    route:   { name: 'overview', params: {} },
    drafts:  {},           // { entity_type+id: payload em edição }
    pending: 0             // contagem global de operações async
  };

  /* ── Pub/Sub ───────────────────────────────────────────────────── */
  var listeners = {};      // { eventName: [fn, fn] }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (f) { return f !== fn; });
    };
  }

  function emit(event, payload) {
    var arr = listeners[event] || [];
    for (var i = 0; i < arr.length; i++) {
      try { arr[i](payload); }
      catch (e) { console.error('[SA store] listener de "' + event + '" lançou:', e); }
    }
  }

  /* ── Mutations seguras ─────────────────────────────────────────── */
  function get(key) { return key ? state[key] : state; }

  function set(partial) {
    Object.keys(partial).forEach(function (k) { state[k] = partial[k]; });
    emit('state:change', state);
  }

  function setDraft(entityType, id, payload) {
    var key = entityType + ':' + id;
    state.drafts[key] = payload;
    emit('draft:change', { entityType: entityType, id: id, payload: payload });
  }

  function clearDraft(entityType, id) {
    var key = entityType + ':' + id;
    delete state.drafts[key];
    emit('draft:change', { entityType: entityType, id: id, payload: null });
  }

  function hasDrafts() {
    return Object.keys(state.drafts).length > 0;
  }

  /* ── Pending counter (para spinners globais, se quisermos) ─────── */
  function startPending() { state.pending++; emit('pending:change', state.pending); }
  function endPending()   { state.pending = Math.max(0, state.pending - 1); emit('pending:change', state.pending); }

  /* ── Toast (UI mínima — não depende de view) ───────────────────── */
  var toastIcons = {
    ok:   'fa-circle-check',
    err:  'fa-circle-exclamation',
    info: 'fa-circle-info'
  };

  function toast(message, kind, opts) {
    kind = kind || 'info';
    opts = opts || {};
    var stack = document.getElementById('sa-toast-stack');
    if (!stack) return;

    var el = document.createElement('div');
    el.className = 'sa-toast sa-toast--' + kind;
    el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    el.innerHTML =
      '<i class="fa-solid ' + (toastIcons[kind] || toastIcons.info) + '" aria-hidden="true"></i>' +
      '<span class="sa-toast__msg"></span>';
    el.querySelector('.sa-toast__msg').textContent = String(message || '');

    stack.appendChild(el);

    var ttl = typeof opts.ttl === 'number' ? opts.ttl : (kind === 'err' ? 6000 : 3500);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, ttl);
  }

  /* ── Body state helper ─────────────────────────────────────────── */
  function setBodyState(s) {
    var b = document.body;
    if (b) b.setAttribute('data-state', s);
  }

  /* ── Export ────────────────────────────────────────────────────── */
  window.SA = window.SA || {};
  window.SA.store = {
    get: get,
    set: set,
    on: on,
    emit: emit,
    setDraft: setDraft,
    clearDraft: clearDraft,
    hasDrafts: hasDrafts,
    startPending: startPending,
    endPending: endPending,
    toast: toast,
    setBodyState: setBodyState
  };
})();
