/* ============================================================
   whoop.js — Whoop-Datenimport

   Drei Wege, Daten hereinzubekommen:
   1) CSV aus dem offiziellen Whoop-Datenexport
      (App → Einstellungen → Datenexport → physiological_cycles.csv)
   2) JSON aus der Whoop-API v2 (/v2/recovery, /v2/cycle, /v2/activity/sleep)
   3) Eigener Proxy/Backend, das ein Bearer-Token hält (fetchFromProxy)

   Hinweis: Die Whoop-API nutzt OAuth2 mit Client-Secret. Ein reiner
   Browser-Client darf das Secret nicht halten — deshalb der Proxy-Weg.
   ============================================================ */

import { parseCSV, pickCol, toNumber } from '../util.js';

const round = (v, d = 0) => (v == null ? null : Number(Number(v).toFixed(d)));

/** Extrahiert 'YYYY-MM-DD' aus verschiedenen Whoop-Zeitformaten. */
function isoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/(\d{2})[./](\d{2})[./](\d{4})/); // 01.05.2024
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------
   CSV: physiological_cycles.csv
   ------------------------------------------------------------ */
export function parseWhoopCSV(text) {
  const { rows } = parseCSV(text);
  const out = [];
  for (const r of rows) {
    const date = isoDate(pickCol(r, 'cycle start', 'start time', 'date', 'datum'));
    if (!date) continue;
    const asleepMin = toNumber(pickCol(r, 'asleep duration (min)', 'asleep duration', 'sleep duration'));
    const entry = {
      date,
      source: 'whoop',
      recovery: round(toNumber(pickCol(r, 'recovery score'))),
      strain: round(toNumber(pickCol(r, 'day strain', 'strain')), 1),
      hrv: round(toNumber(pickCol(r, 'heart rate variability'))),
      rhr: round(toNumber(pickCol(r, 'resting heart rate'))),
      sleepHours: asleepMin != null ? round(asleepMin / 60, 2) : null,
      sleepPerf: round(toNumber(pickCol(r, 'sleep performance'))),
      calories: round(toNumber(pickCol(r, 'energy burned'))),
      spo2: round(toNumber(pickCol(r, 'blood oxygen')), 1),
      respRate: round(toNumber(pickCol(r, 'respiratory rate')), 1),
      skinTemp: round(toNumber(pickCol(r, 'skin temp')), 1),
    };
    if (Object.entries(entry).some(([k, v]) => !['date', 'source'].includes(k) && v != null)) out.push(entry);
  }
  return dedupe(out);
}

/* ------------------------------------------------------------
   JSON: Whoop API v2 (recovery / cycle / sleep) oder eigenes Format
   ------------------------------------------------------------ */
export function parseWhoopJSON(text) {
  let data;
  try { data = typeof text === 'string' ? JSON.parse(text) : text; }
  catch { throw new Error('Ungültiges JSON.'); }

  const buckets = [];
  const collect = (v) => {
    if (Array.isArray(v)) buckets.push(...v);
    else if (v && typeof v === 'object') {
      if (Array.isArray(v.records)) buckets.push(...v.records);
      else if (Array.isArray(v.data)) buckets.push(...v.data);
      else buckets.push(v);
    }
  };
  if (Array.isArray(data)) data.forEach(collect);
  else {
    collect(data);
    for (const key of ['recovery', 'recoveries', 'cycles', 'cycle', 'sleep', 'sleeps', 'workouts']) {
      if (data[key]) collect(data[key]);
    }
  }

  const byDate = new Map();
  const merge = (date, patch) => {
    if (!date) return;
    const cur = byDate.get(date) || { date, source: 'whoop' };
    for (const [k, v] of Object.entries(patch)) if (v != null) cur[k] = v;
    byDate.set(date, cur);
  };

  for (const rec of buckets) {
    if (!rec || typeof rec !== 'object') continue;
    const score = rec.score && typeof rec.score === 'object' ? rec.score : {};
    const date = isoDate(rec.start || rec.created_at || rec.date || rec.updated_at || rec.cycle_start);
    if (!date) continue;

    // Recovery-Datensatz
    if (score.recovery_score != null || score.hrv_rmssd_milli != null || score.resting_heart_rate != null) {
      merge(date, {
        recovery: round(score.recovery_score),
        hrv: round(score.hrv_rmssd_milli != null ? score.hrv_rmssd_milli : null),
        rhr: round(score.resting_heart_rate),
        spo2: round(score.spo2_percentage, 1),
        skinTemp: round(score.skin_temp_celsius, 1),
      });
    }
    // Cycle-Datensatz (Strain)
    if (score.strain != null || score.kilojoule != null) {
      merge(date, {
        strain: round(score.strain, 1),
        calories: score.kilojoule != null ? round(score.kilojoule / 4.184) : null,
        avgHr: round(score.average_heart_rate),
        maxHr: round(score.max_heart_rate),
      });
    }
    // Sleep-Datensatz
    const stages = score.stage_summary;
    if (stages || score.sleep_performance_percentage != null) {
      const asleepMilli = stages
        ? (stages.total_in_bed_time_milli || 0) - (stages.total_awake_time_milli || 0)
        : null;
      merge(date, {
        sleepHours: asleepMilli != null ? round(asleepMilli / 3600000, 2) : null,
        sleepPerf: round(score.sleep_performance_percentage),
        respRate: round(score.respiratory_rate, 1),
      });
    }
    // Bereits normalisiertes Format
    if (rec.recovery != null || rec.strain != null || rec.sleepHours != null) {
      merge(date, {
        recovery: round(rec.recovery),
        strain: round(rec.strain, 1),
        hrv: round(rec.hrv),
        rhr: round(rec.rhr),
        sleepHours: round(rec.sleepHours, 2),
        sleepPerf: round(rec.sleepPerf),
        calories: round(rec.calories),
      });
    }
  }

  return dedupe([...byDate.values()]);
}

/* ------------------------------------------------------------
   Optionaler Live-Abruf über einen eigenen Proxy
   ------------------------------------------------------------ */
/**
 * Erwartet einen Endpunkt, der Whoop-API-Antworten weiterreicht, z. B.
 *   GET {baseUrl}/recovery?limit=25   ->  { records: [...] }
 * Das Bearer-Token wird optional mitgeschickt (nur wenn der Proxy es verlangt).
 */
export async function fetchFromProxy(baseUrl, token, path = 'recovery', params = { limit: 25 }) {
  if (!baseUrl) throw new Error('Kein Proxy-Endpunkt hinterlegt.');
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Proxy antwortete mit ${res.status}`);
  return parseWhoopJSON(await res.text());
}

/* ============================================================
   Live-Anbindung über den eigenen Worker (worker/whoop-proxy.js)

   Ablauf: Die App schickt dich zu Whoop, Whoop schickt dich mit einem
   Code zurück, der Worker tauscht den Code gegen Token (dafür braucht
   es das Secret) und leitet danach die API-Aufrufe weiter.
   ============================================================ */

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_SCOPES = 'read:recovery read:cycles read:sleep read:profile offline';

function base(cfg) {
  const b = String(cfg.workerUrl || '').replace(/\/+$/, '');
  if (!b) throw new Error('Keine Worker-Adresse hinterlegt.');
  return b;
}

function headers(cfg, extra = {}) {
  return { ...(cfg.appKey ? { 'X-App-Key': cfg.appKey } : {}), ...extra };
}

/** Adresse, zu der die Anmeldung führt. `state` schützt vor Unterschieben. */
export function buildAuthUrl(cfg, redirectUri, state) {
  if (!cfg.clientId) throw new Error('Keine Whoop-Client-ID hinterlegt.');
  const u = new URL(WHOOP_AUTH_URL);
  u.searchParams.set('client_id', cfg.clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', WHOOP_SCOPES);
  u.searchParams.set('state', state);
  return u.toString();
}

async function postToken(cfg, body) {
  const res = await fetch(`${base(cfg)}/token`, {
    method: 'POST',
    headers: headers(cfg, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Der Worker antwortete mit ${res.status}`);
  if (!data.access_token) throw new Error('Der Worker lieferte kein Zugriffstoken zurück.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || body.refresh_token || '',
    expiresAt: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000,
  };
}

export function exchangeCode(cfg, code, redirectUri) {
  return postToken(cfg, { code, redirect_uri: redirectUri });
}

export function refreshTokens(cfg) {
  if (!cfg.refreshToken) throw new Error('Kein Refresh-Token — bitte neu verbinden.');
  return postToken(cfg, { refresh_token: cfg.refreshToken });
}

/** Sorgt dafür, dass ein gültiges Token vorliegt. */
export async function ensureToken(cfg) {
  if (cfg.accessToken && cfg.expiresAt && cfg.expiresAt > Date.now()) return null;
  return refreshTokens(cfg);
}

async function apiGet(cfg, path, params = {}) {
  const u = new URL(`${base(cfg)}/api${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  }
  const res = await fetch(u, { headers: headers(cfg, { Authorization: `Bearer ${cfg.accessToken}` }), cache: 'no-store' });
  if (res.status === 401) throw new Error('Whoop-Token abgelehnt — bitte neu verbinden.');
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Whoop antwortete mit ${res.status}`);
  return data || {};
}

async function collect(cfg, path, start, end) {
  const out = [];
  let nextToken;
  do {
    const data = await apiGet(cfg, path, {
      start: start.toISOString(),
      end: end.toISOString(),
      limit: 25,
      nextToken,
    });
    out.push(...(data.records || []));
    nextToken = data.next_token;
  } while (nextToken && out.length < 400);
  return out;
}

/**
 * Holt Recovery, Zyklen und Schlaf und führt sie pro Tag zusammen.
 * @returns {Promise<Array>} Einträge im Bio-Format
 */
export async function fetchRange(cfg, days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const [recovery, cycles, sleep] = await Promise.all([
    collect(cfg, '/v2/recovery', start, end),
    collect(cfg, '/v2/cycle', start, end),
    collect(cfg, '/v2/activity/sleep', start, end),
  ]);
  return parseWhoopJSON({ records: [...recovery, ...cycles, ...sleep] });
}

/** Erkennt anhand des Dateiinhalts, welcher Parser passt. */
export function parseAny(name, text) {
  const isJson = /\.json$/i.test(name || '') || String(text).trim().startsWith('{') || String(text).trim().startsWith('[');
  return isJson ? parseWhoopJSON(text) : parseWhoopCSV(text);
}

function dedupe(entries) {
  const m = new Map();
  for (const e of entries) {
    const prev = m.get(e.date);
    m.set(e.date, prev ? { ...prev, ...Object.fromEntries(Object.entries(e).filter(([, v]) => v != null)) } : e);
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}
