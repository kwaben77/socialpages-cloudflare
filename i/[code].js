// Aperçu d'une INVITATION partagée : /i/<code>
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

const KINDS = { mariage: "Mariage", dot: "Dot", anniv: "Anniversaire", bapteme: "Baptême", diplome: "Remise de diplôme", deuil: "Faire-part", levee: "Levée de deuil", inaug: "Inauguration", conf: "Événement", autre: "Fête" };
export async function onRequestGet({ params, request }) {
  const c = String(params.code || "").toLowerCase();
  const origin = new URL(request.url).origin;
  const target = `${origin}/#/i/${encodeURIComponent(c)}`;
  let title = "💌 Vous êtes invité(e) !", desc = "Ouvrez l'invitation et confirmez votre présence sur SocialPages.", image = "";
  if (/^[a-z0-9]{6,10}$/.test(c)) {
    try {
      const rows = await rest(`/rest/v1/invitations?id=eq.${c}&select=kind,data,event_at`);
      const r = rows && rows[0];
      if (r) {
        const d = r.data || {};
        let when = "";
        try { when = new Date(r.event_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lubumbashi" }); } catch (e) {}
        title = `💌 ${KINDS[r.kind] || "Invitation"} – ${cut(clean(d.names), 70)}`;
        const place = (d.venues || []).map((v) => v.place).filter(Boolean)[0] || "";
        desc = cut(`${when ? "📅 " + when + (d.time ? " à " + String(d.time).replace(":", "h") : "") + ". " : ""}${place ? "📍 " + place + ". " : ""}Vous êtes invité(e) : ouvrez l'invitation et confirmez votre présence.`, 200);
        image = d.photo || "";
      }
    } catch (e) {}
  }
  return html(page({ title, desc, image, url: request.url, target }));
}
