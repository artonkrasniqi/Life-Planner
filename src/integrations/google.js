/* ============================================================
   google.js — Google Kalender

   Läuft ohne eigenen Server. Google erlaubt Browser-Anwendungen den
   Token-Flow über "Google Identity Services": die Client-ID ist
   öffentlich, ein Client-Secret gibt es dabei nicht.

   Was das kostet: Zugriffstoken leben eine Stunde und es gibt kein
   Refresh-Token. Nach Ablauf holt die App still ein neues; klappt das
   nicht (weil Google nachfragen will), erscheint einmal ein Fenster.

   Termine werden gespiegelt, nicht übernommen: Google bleibt die
   Quelle, die App zeigt sie an. Änderungen macht man in Google.
   ============================================================ */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const API = 'https://www.googleapis.com';
export const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

/* ------------------------------------------------------------
   Anmeldung
   ------------------------------------------------------------ */

let gisPromise = null;
function loadGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error('Das Google-Anmeldeskript ließ sich nicht laden — bist du online?'));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/**
 * Holt ein Zugriffstoken.
 * @param {string} clientId
 * @param {''|'consent'|'none'} prompt  '' = nur fragen, wenn nötig
 */
export async function requestToken(clientId, prompt = '') {
  if (!clientId) throw new Error('Keine Client-ID hinterlegt.');
  await loadGIS();
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (res) => {
        if (settled) return;
        settled = true;
        if (res && res.access_token) {
          resolve({
            accessToken: res.access_token,
            expiresAt: Date.now() + (Number(res.expires_in || 3600) - 60) * 1000,
          });
        } else {
          reject(new Error(res?.error_description || res?.error || 'Google hat keinen Zugriff erteilt.'));
        }
      },
      error_callback: (err) => {
        if (settled) return;
        settled = true;
        const type = err?.type || '';
        if (type === 'popup_closed') reject(new Error('Fenster geschlossen — keine Freigabe erteilt.'));
        else if (type === 'popup_failed_to_open') reject(new Error('Google-Fenster wurde blockiert. Pop-ups für diese Seite erlauben.'));
        else reject(new Error(err?.message || 'Anmeldung fehlgeschlagen.'));
      },
    });
    client.requestAccessToken({ prompt });
  });
}

export function tokenValid(cfg) {
  return !!(cfg && cfg.accessToken && cfg.expiresAt && cfg.expiresAt > Date.now());
}

/* ------------------------------------------------------------
   API-Aufrufe
   ------------------------------------------------------------ */

async function call(cfg, path, params = {}) {
  const base = (cfg.apiBase || API).replace(/\/+$/, '');
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
    cache: 'no-store',
  });
  if (res.status === 401) throw new Error('Google-Token abgelaufen — bitte neu verbinden.');
  if (res.status === 403) throw new Error('Google verweigert den Zugriff (403). Ist die Calendar-API im Projekt aktiviert?');
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* egal */ }
    throw new Error(`Google antwortete mit ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res.json();
}

/** Alle Kalender des Kontos. */
export async function listCalendars(cfg) {
  const data = await call(cfg, '/calendar/v3/users/me/calendarList', { maxResults: 100, minAccessRole: 'reader' });
  return (data.items || []).map((c) => ({
    id: c.id,
    name: c.summaryOverride || c.summary || c.id,
    primary: !!c.primary,
    color: c.backgroundColor || null,
  }));
}

/**
 * Termine eines Kalenders im Zeitfenster. `singleEvents` löst Serien in
 * Einzeltermine auf — sonst käme nur die Regel, nicht die Termine.
 */
export async function listEvents(cfg, calendarId, from, to) {
  const out = [];
  let pageToken;
  do {
    const data = await call(cfg, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    out.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken && out.length < 1000);
  return out;
}

/* ------------------------------------------------------------
   Übersetzung ins Format der App
   ------------------------------------------------------------ */

const CATEGORY_HINTS = [
  [['arzt', 'zahnarzt', 'physio', 'therapie', 'impfung', 'vorsorge'], 'Gesundheit'],
  [['training', 'gym', 'lauf', 'sport', 'fitness', 'workout'], 'Sport'],
  [['meeting', 'standup', 'review', 'call', 'termin mit', 'kunde', 'projekt', 'interview'], 'Arbeit'],
  [['geburtstag', 'familie', 'mama', 'papa', 'oma', 'opa'], 'Familie'],
  [['flug', 'zug', 'urlaub', 'reise', 'hotel'], 'Reise'],
];

function guessCategory(title, fallback) {
  const t = String(title || '').toLowerCase();
  for (const [words, cat] of CATEGORY_HINTS) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return fallback;
}

const pad = (n) => String(n).padStart(2, '0');

function localDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Ein Google-Termin → Termin der App.
 * @returns {object|null} null bei abgesagten Terminen
 */
export function mapEvent(g, opts = {}) {
  if (!g || g.status === 'cancelled') return null;

  const allDay = !!(g.start?.date && !g.start?.dateTime);
  let date, durationMin;

  if (allDay) {
    date = g.start.date;                       // 'YYYY-MM-DD'
    durationMin = 0;
    // Google gibt bei ganztägigen Terminen ein exklusives Enddatum an.
  } else {
    const start = new Date(g.start.dateTime);
    const end = g.end?.dateTime ? new Date(g.end.dateTime) : null;
    date = localDateTime(start);
    durationMin = end ? Math.max(0, Math.round((end - start) / 60000)) : 60;
  }

  return {
    title: g.summary || '(ohne Titel)',
    date,
    durationMin,
    category: guessCategory(g.summary, opts.category || 'Privat'),
    location: g.location || '',
    notes: (g.description || '').slice(0, 500),
    done: false,
    source: 'google',
    externalId: g.id,
    calendarId: opts.calendarId || '',
    readOnly: true,
  };
}

/** Holt und übersetzt in einem Rutsch. */
export async function fetchMapped(cfg, calendarId, from, to) {
  const raw = await listEvents(cfg, calendarId, from, to);
  return raw.map((g) => mapEvent(g, { calendarId })).filter(Boolean);
}
