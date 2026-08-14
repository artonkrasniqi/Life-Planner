/* ============================================================
   util.js — kleine Helfer, die überall gebraucht werden
   ============================================================ */

/** Zufällige Ganzzahl 0 .. n-1 */
export function randInt(n) {
  return Math.floor(Math.random() * n);
}

/** Neue, gemischte Kopie eines Arrays (Fisher-Yates). */
export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Zufälliges Element. */
export function pick(list) {
  return list[randInt(list.length)];
}

/** Bis zu n zufällige, verschiedene Elemente. */
export function sample(list, n) {
  return shuffle(list).slice(0, n);
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Vergleichsform für Tipp-Antworten: Kleinschreibung, ohne
 * Sonderzeichen, ohne Satzzeichen. So gilt "faleminderit"
 * auch dann, wenn jemand "Faleminderit!" tippt.
 */
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .replace(/[’'`´]/g, '')
    .replace(/[^a-z0-9äöüß ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tagesstempel im lokalen Format 2026-08-14. */
export function today(date) {
  const d = date ? new Date(date) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Differenz in ganzen Tagen zwischen zwei Tagesstempeln. */
export function dayDiff(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86400000);
}

/** Tagesstempel um n Tage verschoben. */
export function shiftDay(stamp, n) {
  const [y, m, d] = stamp.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const p = (v) => String(v).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/** "vor 3 Tagen", "heute" … für die Wiederholungsanzeige. */
export function relativeDay(stamp) {
  const diff = dayDiff(today(), stamp);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff === -1) return 'gestern';
  if (diff > 1) return `in ${diff} Tagen`;
  return `vor ${-diff} Tagen`;
}

export function formatNumber(n) {
  return new Intl.NumberFormat('de-DE').format(n);
}
