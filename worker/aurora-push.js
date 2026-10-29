/* Aurora push — Cloudflare Worker (free plan is enough)
 *
 * What it does: Aurora on your iPhone sends the upcoming reminders (title + time) here.
 * Every minute (Cron Trigger "* * * * *") this worker sends the ones that are due as a
 * Web Push notification to your phone. Nothing else is stored.
 *
 * Setup (Cloudflare dashboard):
 *   1. Workers & Pages → Create → Worker → name "aurora-push" → Deploy
 *   2. Edit code → replace everything with this file → Deploy
 *   3. Storage & Databases → KV → Create namespace "aurora"
 *   4. Worker → Settings → Bindings → Add → KV namespace: variable name AURORA, namespace "aurora"
 *   5. Worker → Settings → Triggers → Cron Triggers → Add: * * * * *
 *   6. Copy the worker URL (https://aurora-push.<you>.workers.dev) into Aurora → Settings → Notifications
 *
 * Optional variable ALLOWED_ORIGIN (e.g. https://you.github.io) limits who may call it.
 * The VAPID key pair is generated automatically on first use and kept in KV.
 */

const enc = new TextEncoder();
const b64u = {
  enc(buf) { const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { let s = String(str).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; },
};
const concat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0); const o = new Uint8Array(n); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

/* ---------- VAPID keys (created once, kept in KV) ---------- */
async function vapid(env, origin) {
  let v = await env.AURORA.get('vapid', 'json');
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const pub = b64u.enc(await crypto.subtle.exportKey('raw', kp.publicKey));
    v = { jwk, pub, subject: origin ? origin : 'mailto:aurora@example.com' };
    await env.AURORA.put('vapid', JSON.stringify(v));
  } else if (origin && (!v.subject || v.subject.startsWith('mailto:aurora@example'))) {
    v.subject = origin; await env.AURORA.put('vapid', JSON.stringify(v));
  }
  return v;
}
async function vapidAuth(v, endpoint) {
  const aud = new URL(endpoint).origin;
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: v.subject || 'mailto:aurora@example.com' })));
  const key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return 'vapid t=' + head + '.' + body + '.' + b64u.enc(sig) + ', k=' + v.pub;
}

/* ---------- RFC 8291 payload encryption (aes128gcm) ---------- */
async function hkdf(salt, ikm, info, bits) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bits));
}
async function encryptPayload(sub, text) {
  const uaPub = b64u.dec(sub.keys.p256dh); const auth = b64u.dec(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 96);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
async function sendPush(env, sub, msg, origin) {
  const v = await vapid(env, origin);
  const body = await encryptPayload(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(v, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'high', ...(msg.tag ? { Topic: String(msg.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}) },
    body,
  });
  return r.status;
}

/* ---------- storage ---------- */
const devKey = id => 'dev:' + id;
async function getDevs(env) { return (await env.AURORA.get('devs', 'json')) || []; }
async function auth(env, id, secret) {
  if (!id || !secret || typeof id !== 'string' || id.length > 80) return null;
  const d = await env.AURORA.get(devKey(id), 'json');
  return d && d.secret === secret ? d : null;
}

/* ---------- HTTP API ---------- */
function cors(env, req) {
  const allow = env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN.split(',').map(s => s.trim()) : null;
  const o = req.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': allow ? (allow.includes(o) ? o : allow[0]) : '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (h, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...h, 'content-type': 'application/json' } });

async function handle(req, env) {
  const h = cors(env, req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (!env.AURORA) return json(h, { error: 'KV binding AURORA missing (Settings → Bindings)' }, 500);
  const url = new URL(req.url); const p = url.pathname.replace(/\/+$/, '') || '/';
  const origin = url.origin;
  if (req.method === 'GET' && (p === '/' || p === '/key')) {
    const v = await vapid(env, origin);
    return json(h, { ok: true, app: 'aurora-push', key: v.pub });
  }
  if (req.method !== 'POST') return json(h, { error: 'not found' }, 404);
  let b; try { b = await req.json(); } catch (e) { return json(h, { error: 'bad json' }, 400); }
  if (p === '/sub') {
    if (!b.id || !b.secret || !b.sub || !b.sub.endpoint || !b.sub.keys) return json(h, { error: 'bad subscription' }, 400);
    if (!/^https:\/\//.test(b.sub.endpoint)) return json(h, { error: 'bad endpoint' }, 400);
    const old = await env.AURORA.get(devKey(b.id), 'json');
    if (old && old.secret !== b.secret) return json(h, { error: 'forbidden' }, 403);
    const d = { secret: b.secret, sub: b.sub, rem: old ? old.rem : [], sent: old ? old.sent : [], lang: b.lang || 'cs', upd: Date.now() };
    await env.AURORA.put(devKey(b.id), JSON.stringify(d));
    const devs = await getDevs(env); if (!devs.includes(b.id)) { devs.push(b.id); await env.AURORA.put('devs', JSON.stringify(devs.slice(-60))); }
    return json(h, { ok: true });
  }
  const d = await auth(env, b.id, b.secret);
  if (!d) return json(h, { error: 'forbidden' }, 403);
  if (p === '/sync') {
    const now = Date.now();
    const rem = (Array.isArray(b.rem) ? b.rem : []).filter(r => r && typeof r.at === 'number' && r.at > now - 15 * 60000 && r.at < now + 40 * 864e5).slice(0, 300)
      .map(r => ({ k: String(r.k).slice(0, 120), at: r.at, title: String(r.title || 'Aurora').slice(0, 140), body: String(r.body || '').slice(0, 200), url: String(r.url || './').slice(0, 300) }));
    d.rem = rem; d.sent = (d.sent || []).filter(k => rem.some(r => r.k === k)); d.upd = now;
    await env.AURORA.put(devKey(b.id), JSON.stringify(d));
    return json(h, { ok: true, n: rem.length });
  }
  if (p === '/test') {
    const st = await sendPush(env, d.sub, { title: String(b.title || 'Aurora').slice(0, 140), body: String(b.body || '').slice(0, 200), url: './', tag: 'test' }, origin);
    if (st === 404 || st === 410) { d.gone = true; await env.AURORA.put(devKey(b.id), JSON.stringify(d)); }
    return json(h, { ok: st >= 200 && st < 300, status: st }, st >= 200 && st < 300 ? 200 : 502);
  }
  if (p === '/unsub') {
    await env.AURORA.delete(devKey(b.id));
    const devs = (await getDevs(env)).filter(x => x !== b.id); await env.AURORA.put('devs', JSON.stringify(devs));
    return json(h, { ok: true });
  }
  return json(h, { error: 'not found' }, 404);
}

/* ---------- every minute: send what is due ---------- */
async function tick(env) {
  if (!env.AURORA) return;
  const now = Date.now(); const devs = await getDevs(env);
  for (const id of devs) {
    const d = await env.AURORA.get(devKey(id), 'json'); if (!d || d.gone || !d.sub) continue;
    const sent = new Set(d.sent || []); let changed = false;
    const due = (d.rem || []).filter(r => r.at <= now + 20000 && r.at > now - 15 * 60000 && !sent.has(r.k));
    for (const r of due) {
      try {
        const st = await sendPush(env, d.sub, { title: r.title, body: r.body, url: r.url, tag: r.k, at: r.at });
        if (st === 404 || st === 410) { d.gone = true; changed = true; break; }
        if (st >= 200 && st < 300) { sent.add(r.k); changed = true; }
      } catch (e) {}
    }
    const keep = (d.rem || []).filter(r => r.at > now - 15 * 60000);
    if (keep.length !== (d.rem || []).length) changed = true;
    if (changed) { d.rem = keep; d.sent = [...sent].filter(k => keep.some(r => r.k === k)); await env.AURORA.put(devKey(id), JSON.stringify(d)); }
  }
}

export default {
  async fetch(req, env) { try { return await handle(req, env); } catch (e) { return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } }); } },
  async scheduled(event, env, ctx) { ctx.waitUntil(tick(env)); },
};
