/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/history.js                                      ║
  ║  Acesso ao histórico (system_change_logs + system_versions).        ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function api() { return window.SA && window.SA.api; }

  async function recentLogs(limit) {
    return api().logs.list({ limit: limit || 50 });
  }

  async function logsFor(entityType, entityId, limit) {
    return api().logs.list({ entity_type: entityType, limit: limit || 100 });
  }

  async function versionsFor(entityType, entityId) {
    return api().versions.listFor(entityType, entityId);
  }

  function actionLabel(action) {
    switch (action) {
      case 'create':  return 'Criou';
      case 'update':  return 'Editou';
      case 'delete':  return 'Excluiu';
      case 'restore': return 'Restaurou versão';
      case 'publish': return 'Publicou';
      case 'reorder': return 'Reordenou';
      default:        return action;
    }
  }

  function entityLabel(entityType) {
    switch (entityType) {
      case 'site_pages':    return 'Página';
      case 'site_sections': return 'Seção';
      case 'site_cards':    return 'Card';
      default:              return entityType;
    }
  }

  window.SA = window.SA || {};
  window.SA.history = {
    recentLogs:   recentLogs,
    logsFor:      logsFor,
    versionsFor:  versionsFor,
    actionLabel:  actionLabel,
    entityLabel:  entityLabel
  };
})();
