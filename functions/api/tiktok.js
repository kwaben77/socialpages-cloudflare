// Conversion d'un lien court TikTok (vm.tiktok.com / vt.tiktok.com) en identifiant de vidéo.
// Remplace les relais publics (corsproxy, allorigins, codetabs). Seuls les domaines TikTok sont acceptés.
const ALLOWED = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": status === 200 ? "public, max-age=86400" : "no-store" } });

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get("url") || "";
  let host;
  try { host = new URL(u).hostname.toLowerCase(); } catch (e) { return json({ error: "lien invalide" }, 400); }
  if (!ALLOWED.has(host)) return json({ error: "domaine non autorisé" }, 400);
  const UA = { "User-Agent": "Mozilla/5.0 (compatible; SocialPagesBot/1.0)" };
  // 1) oEmbed officiel de TikTok
  try {
    const r = await fetch("https://www.tiktok.com/oembed?url=" + encodeURIComponent(u), { headers: UA });
    if (r.ok) {
      const j = await r.json();
      const id = j.embed_product_id || (j.html || "").match(/data-video-id="(\d+)"/)?.[1];
      if (id) return json({ id, url: j.author_url ? j.author_url.replace(/\/$/, "") + "/video/" + id : "https://www.tiktok.com/v/" + id });
    }
  } catch (e) {}
  // 2) Suivre la redirection du lien court et lire l'adresse finale
  try {
    const r = await fetch(u, { headers: UA, redirect: "follow" });
    const m = r.url.match(/tiktok\.com\/(@[\w.-]+)\/video\/(\d{10,})/);
    if (m) return json({ id: m[2], url: `https://www.tiktok.com/${m[1]}/video/${m[2]}` });
    const txt = await r.text();
    const m2 = txt.match(/tiktok\.com\/(@[\w.-]+)\/video\/(\d{10,})/) || txt.match(/"(?:videoId|itemId)":"(\d{10,})"/);
    if (m2) return json(m2.length > 2 ? { id: m2[2], url: `https://www.tiktok.com/${m2[1]}/video/${m2[2]}` } : { id: m2[1], url: "https://www.tiktok.com/v/" + m2[1] });
  } catch (e) {}
  return json({ error: "vidéo introuvable" }, 404);
}
