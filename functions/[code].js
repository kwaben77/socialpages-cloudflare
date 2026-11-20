// Aperçu d'une CARTE EN LIGNE « Services pro » partagée : /c/<code>
const SB = "https://ynmbzivljnyaovdppsrz.supabase.co";
const KEY = "sb_publishable_N2mmzxODT7V09XFmdP2ZBA_IpX0Z-9j"; // clé publique (déjà visible dans le site)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = (t) => String(t ?? "").replace(/\s*\[\[(?:p|m):[^\]]*\]\]/g, "").replace(/\s+/g, " ").trim();
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

// Page minimale : les réseaux sociaux lisent les balises d'aperçu, les visiteurs sont redirigés vers l'app.
function page({ title, desc, image, url, target }) {
  const go = JSON.stringify(target).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SocialPages">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:image" content="${esc(image)}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/icon-192.png">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F2F5F3;color:#111}a{color:#15803D;font-weight:700}</style>
</head><body><p>Ouverture de SocialPages… <a href="${esc(target)}">Continuer</a></p>
<script>location.replace(${go});</script></body></html>`;
}
const html = (body) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
async function rest(path, init = {}) {
  const r = await fetch(SB + path, { ...init, headers: { apikey: KEY, Accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) return null;
  return r.json();
}

export async function onRequestGet({ params, request }) {
  const c = String(params.code || "").toLowerCase();
  const origin = new URL(request.url).origin;
  const target = `${origin}/#/c/${encodeURIComponent(c)}`;
  let title = "🪪 Carte de visite en ligne", desc = "Services, tarifs, documents et contacts sur SocialPages.", image = "";
  if (/^[a-z0-9]{6,10}$/.test(c)) {
    try {
      const rows = await rest(`/rest/v1/pro_cards?id=eq.${c}&select=data`);
      const d = (rows && rows[0] && rows[0].data) || null;
      if (d) {
        title = `🪪 ${cut(clean(d.name), 50)}${d.title ? " – " + cut(clean(d.title), 40) : ""}`;
        const sv = (d.sv || []).map((s) => clean(s.n)).filter(Boolean).slice(0, 4).join(", ");
        desc = cut([d.co && "🏢 " + clean(d.co), d.slogan && clean(d.slogan), sv && "🛠️ " + sv, d.addr && "📍 " + clean(d.addr)].filter(Boolean).join(" · ") || desc, 200);
        image = d.logo && /^https:/.test(d.logo) ? d.logo : "";
      }
    } catch (e) {}
  }
  return html(page({ title, desc, image, url: request.url, target }));
}
