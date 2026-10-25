/* MAGNiFICA · проміжний сервер для push-сповіщень (Cloudflare Workers, безкоштовно).
   Приймає від застосунку POST { token, subs:[…] }, перевіряє, що token — справжній Firebase ID-токен
   проєкту magnifica-21e68, і надсилає кожній підписці порожній Web Push, підписаний ключем VAPID.
   Секрети задаються в налаштуваннях Worker: VAPID_PUBLIC, VAPID_PRIVATE (опційно SUBJECT, ORIGIN). */

const PROJECT = 'magnifica-21e68';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

const enc = new TextEncoder();
const b64uToBytes = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)); };
const bytesToB64u = (b) => { let s = ''; new Uint8Array(b).forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const jsonPart = (s) => JSON.parse(new TextDecoder().decode(b64uToBytes(s)));

/* перевірка Firebase ID-токена (RS256) за публічними ключами Google */
export async function verifyFirebaseToken(token, jwks, now = Math.floor(Date.now() / 1000)) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  let head, body;
  try { head = jsonPart(parts[0]); body = jsonPart(parts[1]); } catch (e) { return null; }
  if (head.alg !== 'RS256') return null;
  const jwk = (jwks.keys || []).find((k) => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { ...jwk, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  if (body.aud !== PROJECT || body.iss !== 'https://securetoken.google.com/' + PROJECT) return null;
  if (!body.sub || body.exp < now || body.iat > now + 300) return null;
  return body;
}

/* VAPID JWT (ES256) для адреси push-сервісу */
export async function vapidAuth(endpoint, env, now = Math.floor(Date.now() / 1000)) {
  const pub = b64uToBytes(env.VAPID_PUBLIC);
  const jwk = { kty: 'EC', crv: 'P-256', x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)), d: env.VAPID_PRIVATE, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = bytesToB64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: now + 12 * 3600, sub: env.SUBJECT || 'mailto:admin@example.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return 'vapid t=' + head + '.' + body + '.' + bytesToB64u(sig) + ', k=' + env.VAPID_PUBLIC;
}

const okEndpoint = (ep) => { try { const u = new URL(ep); return u.protocol === 'https:' && PUSH_HOSTS.some((r) => r.test(u.hostname)); } catch (e) { return false; } };

let jwksCache = { at: 0, v: null };
async function getJwks() {
  if (jwksCache.v && Date.now() - jwksCache.at < 3600e3) return jwksCache.v;
  const r = await fetch(JWKS_URL);
  jwksCache = { at: Date.now(), v: await r.json() };
  return jwksCache.v;
}

export default {
  async fetch(req, env) {
    const origin = env.ORIGIN || 'https://roomikm.github.io';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply({ ok: true, service: 'magnifica-push' });
    if (req.headers.get('Origin') && req.headers.get('Origin') !== origin) return reply({ error: 'origin' }, 403);
    if (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return reply({ error: 'not configured' }, 500);
    let data;
    try { data = await req.json(); } catch (e) { return reply({ error: 'json' }, 400); }
    const user = await verifyFirebaseToken(data.token, await getJwks());
    if (!user) return reply({ error: 'auth' }, 401);
    const subs = (Array.isArray(data.subs) ? data.subs : []).filter((s) => s && okEndpoint(s.endpoint)).slice(0, 10);
    const gone = []; let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        const r = await fetch(s.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(s.endpoint, env), TTL: '86400', Urgency: 'high', 'Content-Length': '0' } });
        if (r.status === 404 || r.status === 410) gone.push(s.endpoint); else if (r.ok) sent++;
      } catch (e) { /* пропускаємо */ }
    }));
    return reply({ ok: true, sent, gone });
  }
};
