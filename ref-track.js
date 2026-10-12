/**
 * NyXia — tracking promoteur pour TOUT l'écosystème *.nyxia.top
 * À déposer à la racine de CHAQUE portail + sur nyxia.top.
 * Le code promoteur (?ref=) est capté puis conservé 90 jours, et suit
 * AUTOMATIQUEMENT d'un sous-domaine à l'autre grâce au cookie .nyxia.top.
 */
(function () {
  var KEY = 'nyxia_ref';
  var params = new URLSearchParams(location.search);
  var ref = (params.get('ref') || params.get('code') || params.get('r') || '').trim().toUpperCase();

  var explicitRef=ref;
  if (ref) {
    try {
      localStorage.setItem(KEY, ref);
      // Cookie partagé sur tout *.nyxia.top (avant : host-only)
      document.cookie = KEY + '=' + encodeURIComponent(ref) + '; path=/; domain=.nyxia.top; max-age=' + (90 * 24 * 3600) + '; SameSite=Lax';
    } catch (e) {}
  } else {
    try { ref = localStorage.getItem(KEY) || ''; } catch (e) { ref = ''; }
    if (!ref) {
      var m = document.cookie.match(/(?:^|;\s*)nyxia_ref=([^;]+)/);
      if (m) try { ref = decodeURIComponent(m[1]); } catch (e) {}
    }
  }

  window.__NYXIA_REF = ref || null;

  function withRef(url) {
    if (!ref || !url) return url;
    try {
      var u = new URL(url, location.origin);
      if (!u.searchParams.get('ref')) u.searchParams.set('ref', ref);
      return u.toString();
    } catch (e) {
      if (String(url).indexOf('ref=') >= 0) return url;
      return url + (String(url).indexOf('?') >= 0 ? '&' : '?') + 'ref=' + encodeURIComponent(ref);
    }
  }

  window.nyxiaWithRef = withRef;
  window.nyxiaGetRef = function () { return window.__NYXIA_REF; };

  if (!ref) return;

  // Attribution conservée ; compter uniquement une arrivée par un lien explicite.
  var navigation = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var sameSite=false;
  try { if(document.referrer) { var host=new URL(document.referrer).hostname; sameSite=host==='nyxia.top'||host.endsWith('.nyxia.top'); } } catch(e) {}
  var eventId=params.get('nx_visit') || '';
  if (explicitRef && /^[A-Z0-9_-]{3,32}$/.test(explicitRef) && (!navigation || navigation.type==='navigate') && (!sameSite || eventId)) {
    if (!eventId) eventId=window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'visit_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
    try {
      fetch('/api/ref-ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:explicitRef,eventId:eventId})}).catch(function(){});
    } catch(e) {}
  }

  // Ajoute ?ref= sur les CTA de paiement : id, classe, data-ref-link, systeme.io, publication-web
  function apply() {
    document.querySelectorAll('a#ctaPay, a.cta-pay, a.card-cta, a.btn-buy, a[data-ref-link], a[href*="publication-web.com"], a[href*="systeme.io"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      a.setAttribute('href', withRef(href));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
