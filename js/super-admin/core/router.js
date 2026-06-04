/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/router.js                                       ║
  ║  Hash router minimalista. Rotas internas do painel — não troca      ║
  ║  página, só a "view" central.                                       ║
  ╚══════════════════════════════════════════════════════════════════════╝
  Formato de hash:
    #/overview
    #/pages
    #/pages/site_publico
    #/pages/site_publico/<page_id>
    #/history

  Cada rota é registrada por nome → função render(params).
*/
(function () {
  'use strict';

  var routes = {};        // { name: { match: RegExp, paramKeys: [], render: fn } }
  var byName = {};        // { name: { pattern: '...' } }
  var fallbackRoute = 'overview';
  var current = null;

  function register(name, pattern, renderFn) {
    // pattern: '/overview' ou '/pages/:area' ou '/pages/:area/:id'
    var keys = [];
    var regexPattern = pattern.replace(/:[^/]+/g, function (m) {
      keys.push(m.slice(1));
      return '([^/]+)';
    });
    routes[name] = {
      pattern: pattern,
      regex:   new RegExp('^' + regexPattern + '$'),
      keys:    keys,
      render:  renderFn
    };
    byName[name] = pattern;
  }

  function go(name, params) {
    var pattern = byName[name];
    if (!pattern) { console.warn('[SA router] rota desconhecida:', name); return; }
    var hash = pattern.replace(/:([^/]+)/g, function (_, k) {
      return encodeURIComponent((params || {})[k] || '');
    });
    var nextHash = '#' + hash;
    if (location.hash === nextHash) {
      // Mesma rota — força re-render manualmente (hashchange não dispara)
      dispatch();
    } else {
      location.hash = nextHash;
    }
  }

  function parse() {
    var hash = (location.hash || '').replace(/^#/, '') || '/' + fallbackRoute;
    var names = Object.keys(routes);
    for (var i = 0; i < names.length; i++) {
      var route = routes[names[i]];
      var m = route.regex.exec(hash);
      if (m) {
        var params = {};
        route.keys.forEach(function (k, idx) {
          params[k] = decodeURIComponent(m[idx + 1] || '');
        });
        return { name: names[i], params: params, render: route.render };
      }
    }
    return null;
  }

  function dispatch() {
    var match = parse();
    if (!match) {
      go(fallbackRoute, {});
      return;
    }
    current = match;
    if (window.SA && window.SA.store) {
      window.SA.store.set({ route: { name: match.name, params: match.params } });
    }
    try {
      match.render(match.params);
    } catch (e) {
      console.error('[SA router] erro ao renderizar', match.name, e);
      if (window.SA && window.SA.store) {
        window.SA.store.toast('Falha ao carregar a tela. Veja o console.', 'err');
      }
    }
  }

  function start() {
    window.addEventListener('hashchange', dispatch);
    if (!location.hash) {
      go(fallbackRoute, {});
    } else {
      dispatch();
    }
  }

  window.SA = window.SA || {};
  window.SA.router = {
    register: register,
    go:       go,
    start:    start,
    current:  function () { return current; }
  };
})();
