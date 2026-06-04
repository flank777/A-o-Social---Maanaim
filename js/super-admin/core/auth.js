/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/auth.js                                         ║
  ║  Autenticação real via Supabase Auth + checagem de role super_admin ║
  ╚══════════════════════════════════════════════════════════════════════╝
  Estratégia de segurança:
    1. Login com e-mail/senha via supabase.auth.signInWithPassword.
    2. Após login, busca profiles.role do usuário.
    3. Só libera o painel se role === 'super_admin'.
    4. RLS no banco garante que mesmo um JWT sem super_admin não consegue
       escrever — defesa em profundidade (frontend redireciona, backend recusa).
    5. onAuthStateChange mantém a sessão sincronizada (logout em outras abas etc).
*/
(function () {
  'use strict';

  function client() {
    return window.supabaseClient || null;
  }

  /* ── Carrega sessão e profile ──────────────────────────────────── */
  async function loadSession() {
    var sb = client();
    if (!sb) return null;

    var sessionRes = await sb.auth.getSession();
    var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
    if (!session || !session.user) return null;

    var profile = await fetchProfile(session.user.id);
    return { user: session.user, profile: profile };
  }

  async function fetchProfile(userId) {
    var sb = client();
    var res = await sb.from('profiles').select('*').eq('id', userId).single();
    if (res.error) {
      console.warn('[SA auth] profile não encontrado:', res.error.message);
      return null;
    }
    return res.data;
  }

  /* ── Login ─────────────────────────────────────────────────────── */
  async function signIn(email, password) {
    var sb = client();
    if (!sb) throw new Error('Supabase não inicializado.');

    var res = await sb.auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || '')
    });
    if (res.error) throw new Error(traduzErro(res.error.message));

    var profile = await fetchProfile(res.data.user.id);
    if (!profile) throw new Error('Perfil não encontrado. Avise o administrador.');
    if (profile.role !== 'super_admin') {
      await sb.auth.signOut();
      throw new Error('Esta conta não tem permissão de super_admin.');
    }
    return { user: res.data.user, profile: profile };
  }

  /* ── Logout ────────────────────────────────────────────────────── */
  async function signOut() {
    var sb = client();
    if (!sb) return;
    try { await sb.auth.signOut(); } catch (e) { /* idempotente */ }
  }

  /* ── Listener de mudanças (logout em outra aba, expiração) ─────── */
  function watchAuthChanges(onChange) {
    var sb = client();
    if (!sb) return function () {};
    var sub = sb.auth.onAuthStateChange(function (event, session) {
      onChange(event, session);
    });
    return function unsubscribe() {
      try { sub.data.subscription.unsubscribe(); } catch (e) {}
    };
  }

  /* ── Tradução de erros comuns ──────────────────────────────────── */
  function traduzErro(msg) {
    var m = String(msg || '').toLowerCase();
    if (m.indexOf('invalid login') >= 0)         return 'E-mail ou senha incorretos.';
    if (m.indexOf('email not confirmed') >= 0)   return 'Confirme seu e-mail antes de entrar.';
    if (m.indexOf('too many requests') >= 0)     return 'Muitas tentativas. Aguarde alguns minutos.';
    if (m.indexOf('user not found') >= 0)        return 'Usuário não encontrado.';
    return msg || 'Não foi possível autenticar.';
  }

  /* ── Export ────────────────────────────────────────────────────── */
  window.SA = window.SA || {};
  window.SA.auth = {
    loadSession: loadSession,
    signIn: signIn,
    signOut: signOut,
    fetchProfile: fetchProfile,
    watchAuthChanges: watchAuthChanges
  };
})();
