/**
 * nyxia.top — Worker domaine
 * /r/CODE → /?ref=CODE  (lien promoteur / admin)
 * Injecte ref-track.js sur les pages HTML
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // https://nyxia.top/r/EPUV39MT
    const m = url.pathname.match(/^\/r\/([A-Za-z0-9_-]{3,32})\/?$/i);
    if (m && request.method === 'GET') {
      const code = m[1].toUpperCase();
      try {
        if (env.CASHFLOW_KV) {
          const day = new Date().toISOString().slice(0, 10);
          const key = 'ref_click:' + code + ':' + day;
          const prev = parseInt((await env.CASHFLOW_KV.get(key)) || '0', 10) || 0;
          await env.CASHFLOW_KV.put(key, String(prev + 1), { expirationTtl: 120 * 24 * 3600 });
        }
      } catch (_) {}
      return Response.redirect(url.origin + '/?ref=' + encodeURIComponent(code), 302);
    }

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

    let res = await env.ASSETS.fetch(request);
    const ct = (res.headers.get('Content-Type') || '').toLowerCase();
    const isHtml = ct.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '';
    if (!isHtml || request.method !== 'GET') return res;

    let html = await res.text();
    if (!html.includes('ref-track.js')) {
      const tag = '<script src="/ref-track.js" defer></script>';
      html = html.includes('</body>') ? html.replace('</body>', tag + '\n</body>') : html + tag;
    }
    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(html, { status: res.status, headers });
  }
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
