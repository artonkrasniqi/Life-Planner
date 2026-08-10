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
