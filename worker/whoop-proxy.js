/* ============================================================
   whoop-proxy.js — Cloudflare Worker als Vermittler zu Whoop

   Wozu: Whoop verlangt beim Tausch des Anmeldecodes ein Client-Secret.
   Ein Secret darf nicht in eine öffentliche Web-App — dieser Worker
   hält es stattdessen und reicht nur das Ergebnis durch.

   Er speichert nichts. Die Token liegen in der App; der Worker fügt
   beim Tausch das Secret hinzu und leitet API-Aufrufe weiter (nötig,
   weil die Whoop-API keine Browser-Aufrufe von fremden Adressen
   zulässt).

   ------------------------------------------------------------
   Einrichtung
   ------------------------------------------------------------
   1. App anlegen auf https://developer.whoop.com
      Redirect-URI: die Adresse deiner App, z. B.
      https://artonkrasniqi.github.io/Life-Planner/
      Scopes: read:recovery read:cycles read:sleep read:profile offline

   2. Worker anlegen (https://dash.cloudflare.com → Workers):
      Diesen Code einfügen, dann unter Settings → Variables setzen:
        WHOOP_CLIENT_ID      (kein Geheimnis)
        WHOOP_CLIENT_SECRET  (als "Secret" anlegen)
        ALLOWED_ORIGIN       z. B. https://artonkrasniqi.github.io
        APP_KEY              (optional, frei gewähltes Kennwort)

   3. Die Worker-Adresse in der App unter System → Verbindungen
      eintragen.
   ============================================================ */

const DEFAULT_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const DEFAULT_API_BASE = 'https://api.prod.whoop.com/developer';

// Über Variablen überschreibbar — so lässt sich der Worker gegen ein
// Testdoppel prüfen, ohne echte Whoop-Zugangsdaten zu brauchen.
const tokenUrl = (env) => env.WHOOP_TOKEN_URL || DEFAULT_TOKEN_URL;
const apiBase = (env) => env.WHOOP_API_BASE || DEFAULT_API_BASE;

function cors(env, extra = {}) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-App-Key',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

function json(env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(env, { 'Content-Type': 'application/json' }),
  });
}

/** Optionaler Riegel, damit nicht Fremde den Worker mitbenutzen. */
function authorized(request, env) {
  if (!env.APP_KEY) return true;
  return request.headers.get('X-App-Key') === env.APP_KEY;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (path === '/' || path === '/health') {
      return json(env, {
        ok: true,
        service: 'life-os whoop proxy',
        configured: Boolean(env.WHOOP_CLIENT_ID && env.WHOOP_CLIENT_SECRET),
      });
    }

    if (!authorized(request, env)) {
      return json(env, { error: 'Nicht autorisiert.' }, 401);
    }

    if (!env.WHOOP_CLIENT_ID || !env.WHOOP_CLIENT_SECRET) {
      return json(env, { error: 'Worker unvollständig eingerichtet: WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET fehlen.' }, 500);
    }

    /* --- Anmeldecode oder Refresh-Token gegen Zugriffstoken --- */
    if (path === '/token' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json(env, { error: 'Ungültiger Request-Body.' }, 400); }

      const form = new URLSearchParams();
      form.set('client_id', env.WHOOP_CLIENT_ID);
      form.set('client_secret', env.WHOOP_CLIENT_SECRET);

      if (body.code) {
        form.set('grant_type', 'authorization_code');
        form.set('code', body.code);
        form.set('redirect_uri', body.redirect_uri || '');
        if (body.code_verifier) form.set('code_verifier', body.code_verifier);
      } else if (body.refresh_token) {
        form.set('grant_type', 'refresh_token');
        form.set('refresh_token', body.refresh_token);
        form.set('scope', 'offline');
      } else {
        return json(env, { error: 'Weder code noch refresh_token übergeben.' }, 400);
      }

      const res = await fetch(tokenUrl(env), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const text = await res.text();
      if (!res.ok) {
        return json(env, { error: `Whoop lehnte den Token-Tausch ab (${res.status})`, detail: text.slice(0, 400) }, res.status);
      }
      let data;
      try { data = JSON.parse(text); } catch { return json(env, { error: 'Whoop antwortete nicht mit JSON.' }, 502); }
      return json(env, data);
    }

    /* --- Weiterleitung an die Whoop-API ----------------------- */
    if (path.startsWith('/api/')) {
      const auth = request.headers.get('Authorization');
      if (!auth) return json(env, { error: 'Authorization-Header fehlt.' }, 401);

      const target = new URL(apiBase(env) + path.slice(4) + url.search);
      const res = await fetch(target, {
        headers: { Authorization: auth, Accept: 'application/json' },
      });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: cors(env, { 'Content-Type': res.headers.get('Content-Type') || 'application/json' }),
      });
    }

    return json(env, { error: 'Unbekannter Pfad.', path }, 404);
  },
};
