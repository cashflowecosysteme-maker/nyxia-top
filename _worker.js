/**
 * nyxia.top — Worker domaine entier
 * - Sert les pages statiques (tes pages de vente)
 * - Injecte ref-track.js sur CHAQUE page HTML (pas besoin de l'ajouter à la main)
 * - API compteur ref
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ref-ping' && request.method === 'POST') {
      try {
        const body = await request.json();
        const ref = String(body.ref || '').trim().toUpperCase().slice(0, 32);
        if (!ref) return json({ ok: false }, 400);
        if (env.CASHFLOW_KV) {
          const day = new Date().toISOString().slice(0, 10);
          const key = 'ref_click:' + ref + ':' + day;
          const prev = parseInt((await env.CASHFLOW_KV.get(key)) || '0', 10) || 0;
          await env.CASHFLOW_KV.put(key, String(prev + 1), { expirationTtl: 120 * 24 * 3600 });
        }
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false }, 400);
      }
    }

    if (url.pathname === '/api/ref-stats' && request.method === 'GET') {
      const ref = (url.searchParams.get('ref') || '').trim().toUpperCase();
      if (!ref || !env.CASHFLOW_KV) return json({ clicks: 0 });
      const day = new Date().toISOString().slice(0, 10);
      const n = parseInt((await env.CASHFLOW_KV.get('ref_click:' + ref + ':' + day)) || '0', 10) || 0;
      return json({ ref, day, clicks: n });
    }

    // Assets (ne pas injecter dans js/css/images)
    let res = await env.ASSETS.fetch(request);

    const ct = (res.headers.get('Content-Type') || '').toLowerCase();
    const isHtml = ct.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '';

    if (!isHtml || request.method !== 'GET') {
      return res;
    }

    // Injecte le script de tracking avant </body> sur toutes les pages HTML du domaine
    let html = await res.text();
    if (!html.includes('ref-track.js')) {
      const tag = '<script src="/ref-track.js" defer></script>';
      if (html.includes('</body>')) {
        html = html.replace('</body>', tag + '\n</body>');
      } else {
        html += tag;
      }
    }

    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(html, { status: res.status, headers });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
