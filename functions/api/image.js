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

const ADMIN_EMAILS = ["peternondo912@gmail.com"]; // secours si la lecture du profil échoue
async function isAdmin(request, env) {
  const tok = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!tok) return { ok: false, why: "jeton de connexion absent : reconnectez-vous" };
  const H = { apikey: env.SUPABASE_KEY || SB_KEY, authorization: "Bearer " + tok };
  let user;
  try {
    const u = await fetch(SB + "/auth/v1/user", { headers: H });
    if (!u.ok) return { ok: false, why: "connexion refusée par Supabase (HTTP " + u.status + ") : déconnectez-vous puis reconnectez-vous" };
    user = await u.json();
  } catch (e) { return { ok: false, why: "Supabase injoignable : " + String(e?.message || e).slice(0, 80) }; }
  if (!user?.id) return { ok: false, why: "compte introuvable" };
  const mail = String(user.email || "").toLowerCase(), extra = String(env.ADMIN_EMAILS || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
  try {
    const p = await fetch(`${SB}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: H });
    if (p.ok) {
      const rows = await p.json();
      if (rows?.[0]?.is_admin === true) return { ok: true };
      if (ADMIN_EMAILS.includes(mail) || extra.includes(mail)) return { ok: true };
      return { ok: false, why: rows?.length ? "ce compte (" + (mail || user.id) + ") n'a pas is_admin = true" : "profil introuvable pour " + (mail || user.id) };
    }
    if (ADMIN_EMAILS.includes(mail) || extra.includes(mail)) return { ok: true };
    return { ok: false, why: "lecture du profil refusée (HTTP " + p.status + ") pour " + (mail || user.id) };
  } catch (e) {
    if (ADMIN_EMAILS.includes(mail) || extra.includes(mail)) return { ok: true };
    return { ok: false, why: "lecture du profil impossible" };
  }
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
    cEn ? "Main character (always the same): " + cEn : "",
    "Scene: " + sEn,
    "original characters, no text, no letters, no words, no watermark, no logo, whole scene visible, centered composition",
  ].filter(Boolean).join(". ").slice(0, 2000);
  const input = { prompt, steps: 4 };
  const seed = Number.isFinite(+b.seed) ? Math.abs(Math.floor(+b.seed)) % 2147483647 : null;
  let r;
  try { r = await env.AI.run(MODEL, seed !== null ? { ...input, seed } : input); }
  catch (e) {
    if (seed === null) return fail(e);
    try { r = await env.AI.run(MODEL, input); } catch (e2) { return fail(e2); }
  }
  if (!r?.image) return json({ error: "Aucune image reçue.", code: "ai" }, 502);
  return json({ img: "data:image/jpeg;base64," + r.image, prompt });
}

export async function onRequestGet() {
  return json({ ok: true, info: "POST uniquement (outil administrateur)." });
}
