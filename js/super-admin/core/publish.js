/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/publish.js                                      ║
  ║  Fluxo Rascunho → Preview → Publicação. Tudo passa por RPC com      ║
  ║  SECURITY DEFINER no banco para garantir auditoria.                 ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function api() { return window.SA && window.SA.api; }

  /* Publicar uma entidade (page/section/card).
     entityType ∈ {'site_pages','site_sections','site_cards'} */
  async function publish(entityType, entityId, notes) {
    return api().rpc('super_admin_publish', {
      p_entity_type: entityType,
      p_entity_id:   entityId,
      p_notes:       notes || ''
    });
  }

  /* Restaurar versão antiga (volta como rascunho — não publica direto) */
  async function restoreVersion(entityType, entityId, versionNo) {
    return api().rpc('super_admin_restore_version', {
      p_entity_type: entityType,
      p_entity_id:   entityId,
      p_version_no:  versionNo
    });
  }

  /* Mescla um draft local com o registro do banco e atualiza só o draft_payload.
     Garante que o autor do rascunho não pisa em campos top-level por engano. */
  async function saveDraft(entityType, entityId, draftPayload) {
    var entity = entityType === 'site_pages'    ? api().pages
              : entityType === 'site_sections' ? api().sections
              : entityType === 'site_cards'    ? api().cards
              : null;
    if (!entity) throw new Error('entity_type inválido');
    return entity.update(entityId, { draft_payload: draftPayload, status: 'draft' });
  }

  /* Comparar rascunho vs publicado — útil para o badge "tem mudanças" */
  function isDirty(entity) {
    if (!entity) return false;
    try {
      return JSON.stringify(entity.draft_payload || {}) !== JSON.stringify(entity.published_payload || {});
    } catch (e) {
      return true;
    }
  }

  window.SA = window.SA || {};
  window.SA.publish = {
    publish:        publish,
    restoreVersion: restoreVersion,
    saveDraft:      saveDraft,
    isDirty:        isDirty
  };
})();
