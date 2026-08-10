/* ============================================================
   garmin.js — Garmin-Connect-Import (Vorbereitung)

   Garmin bietet keinen offenen Endpunkt für Privatnutzer ohne
   Developer-Programm. Praktikabel sind heute:
   1) CSV-Export aus Garmin Connect (Berichte → Exportieren)
   2) Ein eigener Proxy (z. B. python-garminconnect als kleiner Service)

   Der Parser mappt die üblichen Spaltennamen (DE + EN) auf dasselbe
   Bio-Schema, das auch Whoop benutzt — beide Quellen landen also in
   derselben Zeitreihe und lassen sich vergleichen.
   ============================================================ */

import { parseCSV, pickCol, toNumber } from '../util.js';

const round = (v, d = 0) => (v == null ? null : Number(Number(v).toFixed(d)));

function isoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/** '7:32' oder '7h 32m' oder '452' (Minuten) -> Stunden */
function toHours(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return round(+m[1] + +m[2] / 60, 2);
  m = s.match(/(\d+)\s*h\D*(\d+)?/i);
  if (m) return round(+m[1] + (+(m[2] || 0)) / 60, 2);
  const n = toNumber(s);
  if (n == null) return null;
  return n > 24 ? round(n / 60, 2) : round(n, 2);
}

export function parseGarminCSV(text) {
  const { rows } = parseCSV(text);
  const out = [];
  for (const r of rows) {
    const date = isoDate(pickCol(r, 'datum', 'date', 'tag', 'day'));
    if (!date) continue;
    const entry = {
      date,
      source: 'garmin',
      steps: round(toNumber(pickCol(r, 'schritte', 'steps'))),
      rhr: round(toNumber(pickCol(r, 'ruhepuls', 'resting heart rate', 'resting hr'))),
      hrv: round(toNumber(pickCol(r, 'hrv', 'herzfrequenzvariabilität'))),
      calories: round(toNumber(pickCol(r, 'kalorien', 'calories'))),
      sleepHours: toHours(pickCol(r, 'schlafdauer', 'sleep duration', 'schlaf', 'sleep time')),
      bodyBattery: round(toNumber(pickCol(r, 'body battery', 'körperbatterie'))),
      stress: round(toNumber(pickCol(r, 'stress'))),
      vo2max: round(toNumber(pickCol(r, 'vo2', 'vo2max')), 1),
      distanceKm: round(toNumber(pickCol(r, 'distanz', 'distance')), 2),
    };
    if (Object.entries(entry).some(([k, v]) => !['date', 'source'].includes(k) && v != null)) out.push(entry);
  }
  return dedupe(out);
}

export function parseGarminJSON(text) {
  let data;
  try { data = typeof text === 'string' ? JSON.parse(text) : text; }
  catch { throw new Error('Ungültiges JSON.'); }
  const arr = Array.isArray(data) ? data : (data.records || data.data || [data]);
  const out = [];
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue;
    const date = isoDate(r.calendarDate || r.date || r.startTimeLocal || r.start);
    if (!date) continue;
    out.push({
      date,
      source: 'garmin',
      steps: round(r.totalSteps ?? r.steps),
      rhr: round(r.restingHeartRate ?? r.rhr),
      hrv: round(r.hrvWeeklyAverage ?? r.hrv),
      calories: round(r.totalKilocalories ?? r.calories),
      sleepHours: r.sleepTimeSeconds != null ? round(r.sleepTimeSeconds / 3600, 2) : toHours(r.sleepHours),
      bodyBattery: round(r.bodyBatteryMostRecentValue ?? r.bodyBattery),
      stress: round(r.averageStressLevel ?? r.stress),
      vo2max: round(r.vo2MaxValue ?? r.vo2max, 1),
    });
  }
  return dedupe(out);
}

export function parseAny(name, text) {
  const isJson = /\.json$/i.test(name || '') || String(text).trim().startsWith('{') || String(text).trim().startsWith('[');
  return isJson ? parseGarminJSON(text) : parseGarminCSV(text);
}

export async function fetchFromProxy(baseUrl, token, path = 'daily', params = { days: 30 }) {
  if (!baseUrl) throw new Error('Kein Proxy-Endpunkt hinterlegt.');
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`Proxy antwortete mit ${res.status}`);
  return parseGarminJSON(await res.text());
}

function dedupe(entries) {
  const m = new Map();
  for (const e of entries) {
    const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v != null));
    m.set(e.date, { ...(m.get(e.date) || {}), ...clean });
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}
