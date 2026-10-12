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
      const eventId=crypto.randomUUID();
      await nyxRecordClick(env,code,eventId);
      return Response.redirect(url.origin+'/?ref='+encodeURIComponent(code)+'&nx_visit='+encodeURIComponent(eventId),302);
    }

    if (url.pathname === '/api/ref-ping' && request.method === 'POST') {
      try {
        const body = await request.json();
        const ref=String(body.ref || '').trim().toUpperCase();
        const eventId=String(body.eventId || '');
        if (!/^[A-Z0-9_-]{3,32}$/.test(ref) || !/^[A-Za-z0-9_-]{16,100}$/.test(eventId)) return json({ok:false},400);
        await nyxRecordClick(env,ref,eventId);
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

async function nyxRecordClick(env,code,eventId) {
  if (!env.CASHFLOW_KV) return;
  await env.CASHFLOW_KV.put('ref_click:'+code+':event:'+eventId,'1',{expirationTtl:120*24*3600});
}
