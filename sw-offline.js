/* SocialPages — mode hors connexion (chargé par sw.js avec importScripts('sw-offline.js')).
   Ne touche pas aux notifications : ce fichier ajoute seulement la mise en cache.
   - Page de l'application : réseau d'abord (toujours la dernière version), copie de secours si pas d'Internet.
   - Bibliothèques, polices et modèles d'IA (CDN) : gardés après le premier téléchargement.
   - Supabase (comptes, messages, produits) : jamais mis en cache. */
const SPO_V = 'v1', SPO_APP = 'sp-app-' + SPO_V, SPO_CDN = 'sp-cdn-' + SPO_V, SPO_IMG = 'sp-img-' + SPO_V;
const SPO_CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'storage.googleapis.com', 'cdnjs.cloudflare.com', 'unpkg.com']; // les modèles Hugging Face sont déjà gardés par transformers.js lui-même
self.addEventListener('install', e => { e.waitUntil(caches.open(SPO_APP).then(c => c.addAll(['./', './manifest.webmanifest', './icon-192.png', './icon-512.png']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => /^sp-(app|cdn|img)-/.test(k) && !k.endsWith('-' + SPO_V)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'spo-ping') e.source?.postMessage({ spo: SPO_V }); });
function spoTimeout(p, ms) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, err => { clearTimeout(t); rej(err); }); }); }
async function spoPage(req) { const c = await caches.open(SPO_APP);
  try { const r = await spoTimeout(fetch(req), 8000); if (r && r.ok) c.put('./', r.clone()).catch(() => {}); return r; }
  catch (e) { return (await c.match('./')) || (await c.match(req)) || new Response('<meta charset="utf-8"><body style="font-family:sans-serif;padding:30px;text-align:center"><h2>📴 Pas de connexion</h2><p>Ouvrez SocialPages une fois avec Internet pour l’utiliser ensuite sans connexion.</p></body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); } }
async function spoCdn(req) { const c = await caches.open(SPO_CDN), hit = await c.match(req); if (hit) return hit;
  const r = await fetch(req); if (r && (r.ok || r.type === 'opaque') && !(r.headers.get('content-type') || '').includes('text/html')) c.put(req, r.clone()).catch(() => {}); return r; }
async function spoStatic(req) { const c = await caches.open(SPO_APP), hit = await c.match(req), net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null); return hit || (await net) || Response.error(); }
self.addEventListener('fetch', e => { const req = e.request; if (req.method !== 'GET' || req.headers.has('range')) return; let u; try { u = new URL(req.url); } catch (err) { return; }
  if (/supabase\.(co|in)$/.test(u.hostname) || u.protocol !== 'https:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return;
  if (u.origin === self.location.origin) {
    if (req.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('/index.html')) return e.respondWith(spoPage(req));
    if (/\.(png|jpg|jpeg|svg|webp|ico|webmanifest|woff2?)$/i.test(u.pathname)) return e.respondWith(spoStatic(req));
    return; }
  if (SPO_CDN_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) return e.respondWith(spoCdn(req)); });
