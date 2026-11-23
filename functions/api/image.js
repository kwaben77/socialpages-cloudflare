// 🎨 Création d'illustrations par l'IA de Cloudflare (Workers AI, modèle FLUX.1 schnell).
// Réservé à l'administrateur de SocialPages (profil Supabase avec is_admin = true).
// Réglage à faire une seule fois dans Cloudflare : Workers & Pages → votre projet → Paramètres
// → Liaisons (Bindings) → Ajouter → Workers AI → nom de la variable : AI → Enregistrer, puis redéployer.
const SB = "https://ynmbzivljnyaovdppsrz.supabase.co";
const SB_KEY = "sb_publishable_N2mmzxODT7V09XFmdP2ZBA_IpX0Z-9j"; // clé publique (déjà présente dans index.html)
const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const STY = {
  cartoon: "colorful 2D animated cartoon illustration, clean bold outlines, flat bright colors, expressive friendly characters, cinematic lighting",
  kids: "cute children's picture book illustration, soft warm pastel colors, rounded shapes, gentle and joyful",
  aqua: "soft watercolor storybook illustration, delicate paper texture, gentle light, harmonious colors",
  bd: "comic book illustration, bold ink lines, vibrant saturated colors, dynamic composition",
  d3: "3D animated movie style render, soft global illumination, cute stylized characters, vibrant colors",
  afro: "vibrant contemporary African art illustration, bold patterns, warm earthy and bright colors, Central African setting",
  real: "realistic photograph, natural light, high detail, sharp focus",
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Le rôle administrateur est vérifié comme dans l'app : fonction Supabase « is_admin » (RPC),
// appelée avec le jeton de connexion de la personne. Secours : colonne profiles.is_admin.
async function isAdmin(request, env) {
  const tok = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!tok) return { ok: false, why: "jeton de connexion absent : reconnectez-vous" };
  const H = { apikey: env.SUPABASE_KEY || SB_KEY, authorization: "Bearer " + tok };
  let why = "";
  try {
    const r = await fetch(SB + "/rest/v1/rpc/is_admin", { method: "POST", headers: { ...H, "content-type": "application/json" }, body: "{}" });
    if (r.ok) { const d = await r.json(); if (d === true) return { ok: true }; why = "la fonction is_admin répond « " + JSON.stringify(d) + " »"; }
    else why = "fonction is_admin : HTTP " + r.status;
  } catch (e) { why = "Supabase injoignable"; }
  try {
    const u = await fetch(SB + "/auth/v1/user", { headers: H });
    if (!u.ok) return { ok: false, why: why + " ; connexion refusée (HTTP " + u.status + ") : déconnectez-vous puis reconnectez-vous" };
    const user = await u.json();
    const p = await fetch(`${SB}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: H });
    if (p.ok) { const rows = await p.json(); if (rows?.[0]?.is_admin === true) return { ok: true }; }
    return { ok: false, why: why + " ; compte " + (user.email || user.id) };
  } catch (e) { return { ok: false, why: why || "vérification impossible" }; }
}

async function toEn(env, s, lang) {
  s = String(s || "").trim();
  if (!s || lang === "en") return s;
  try {
    const r = await env.AI.run("@cf/meta/m2m100-1.2b", { text: s, source_lang: lang || "fr", target_lang: "en" });
    return String(r?.translated_text || "").trim() || s;
  } catch (e) { return s; }
}

function fail(e) {
  const m = String(e?.message || e || "");
  if (/neuron|quota|limit|429|exceed|capacity/i.test(m)) return json({ error: "Le quota gratuit d'images du jour est atteint. Réessayez demain (remise à zéro vers 2 h, heure de Lubumbashi).", code: "quota" }, 429);
  return json({ error: "L'IA d'images n'a pas répondu : " + m.slice(0, 160), code: "ai" }, 502);
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) return json({ error: "La liaison « AI » n'est pas encore ajoutée dans Cloudflare.", code: "noai" }, 500);
  const A = await isAdmin(request, env);
  if (!A.ok) { console.log("image: accès refusé —", A.why); return json({ error: "Outil réservé à l'administrateur (" + A.why + ").", code: "admin" }, 403); }
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "Demande invalide." }, 400); }
  const lang = ["fr", "en", "es", "pt", "sw"].includes(b.lang) ? b.lang : "fr";
  const scene = String(b.desc || b.text || "").slice(0, 700);
  if (!scene.trim()) return json({ error: "Scène vide." }, 400);
  const [sEn, cEn] = await Promise.all([toEn(env, scene, lang), toEn(env, String(b.char || "").slice(0, 300), lang)]);
  const prompt = [
    STY[b.style] || STY.cartoon,
    cEn ? "Characters (always exactly the same appearance, same clothes): " + cEn : "",
    "Scene: " + sEn,
    "original characters, no text, no letters, no words, no watermark, no logo, whole scene visible, sharp details",
  ].filter(Boolean).join(". ").slice(0, 2000);
  const W = Math.max(256, Math.min(1920, Math.round((+b.w || 1024) / 16) * 16)), Hh = Math.max(256, Math.min(1920, Math.round((+b.h || 1024) / 16) * 16));
  const refs = (Array.isArray(b.refs) ? b.refs : []).slice(0, 4).filter(r => /^data:image\/(jpeg|png|webp);base64,/.test(r));
  // 1) FLUX.2 [klein] : format au choix + images de référence (personnage, lieu)
  try {
    const form = new FormData();
    form.append("prompt", refs.length ? prompt + ". Keep the characters exactly like in the reference images." : prompt);
    form.append("width", String(W)); form.append("height", String(Hh));
    refs.forEach((r, i) => { const bin = Uint8Array.from(atob(r.split(",")[1]), c => c.charCodeAt(0)); form.append("input_image_" + i, new Blob([bin], { type: r.slice(5, r.indexOf(";")) }), "ref" + i + ".jpg"); });
    const fr = new Response(form);
    const r = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", { multipart: { body: fr.body, contentType: fr.headers.get("content-type") } });
    const img = r?.image || r?.images?.[0];
    if (img) return json({ img: String(img).startsWith("data:") || String(img).startsWith("http") ? img : "data:image/jpeg;base64," + img, prompt, model: "klein", refs: refs.length });
  } catch (e) { if (/neuron|quota|429|exceed/i.test(String(e?.message || e))) return fail(e); console.log("klein a échoué, repli schnell :", String(e?.message || e).slice(0, 200)); }
  // 2) repli : FLUX.1 schnell (carré, sans référence)
  const input = { prompt, steps: 4 };
  const seed = Number.isFinite(+b.seed) ? Math.abs(Math.floor(+b.seed)) % 2147483647 : null;
  let r;
  try { r = await env.AI.run(MODEL, seed !== null ? { ...input, seed } : input); }
  catch (e) {
    if (seed === null) return fail(e);
    try { r = await env.AI.run(MODEL, input); } catch (e2) { return fail(e2); }
  }
  if (!r?.image) return json({ error: "Aucune image reçue.", code: "ai" }, 502);
  return json({ img: "data:image/jpeg;base64," + r.image, prompt, model: "schnell" });
}

export async function onRequestGet() {
  return json({ ok: true, info: "POST uniquement (outil administrateur)." });
}
