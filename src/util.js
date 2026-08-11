/* ============================================================
   util.js — DOM-Helfer, Datum, Formatierung, Icons
   ============================================================ */

/* ---------- DOM ---------- */

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false || c === true) continue;
    parent.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Icons (feather-artige Pfade) ---------- */

const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  checkSquare: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  flame: '<path d="M12 2s4 4.5 4 8a4 4 0 0 1-8 0c0-1 .4-2 .9-2.8C8.3 9 7 11 7 13.5a5 5 0 0 0 10 0C17 9 12 2 12 2z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  trendUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
};

export function icon(name, size = 16, cls = '') {
  const p = ICONS[name] || ICONS.target;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

export function iconEl(name, size = 16, cls = '') {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.innerHTML = icon(name, size, cls);
  return span.firstChild;
}

/* ---------- Datum ---------- */

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toISODateTime(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${toISODate(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parst 'YYYY-MM-DD' oder 'YYYY-MM-DDTHH:mm' als lokale Zeit. */
export function parseLocal(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) { const d = new Date(s); return isNaN(d) ? null : d; }
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}

export function dateOnly(s) {
  return String(s || '').slice(0, 10);
}

export function fmtDate(s, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = parseLocal(s);
  if (!d) return '—';
  return d.toLocaleDateString('de-DE', opts);
}

export function fmtTime(s) {
  const d = parseLocal(s);
  if (!d) return '';
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function hasTime(s) {
  return /T\d{2}:\d{2}/.test(String(s || ''));
}

export function daysBetween(a, b) {
  const A = parseLocal(dateOnly(a)), B = parseLocal(dateOnly(b));
  if (!A || !B) return 0;
  return Math.round((B - A) / 86400000);
}

export function relativeDay(s) {
  const d = daysBetween(todayISO(), s);
  if (d === 0) return 'Heute';
  if (d === 1) return 'Morgen';
  if (d === 2) return 'Übermorgen';
  if (d === -1) return 'Gestern';
  if (d < 0) return `vor ${Math.abs(d)} Tagen`;
  if (d < 7) return `in ${d} Tagen`;
  if (d < 14) return 'nächste Woche';
  return `in ${Math.round(d / 7)} Wochen`;
}

export function startOfMonth(y, m) { return new Date(y, m, 1); }
export function endOfMonth(y, m) { return new Date(y, m + 1, 0); }

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(y, m, n) {
  const d = new Date(y, m + n, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

export function monthKey(s) { return String(s || '').slice(0, 7); }

/** 6x7 Matrix, Montag als Wochenstart. */
export function monthMatrix(y, m) {
  const first = startOfMonth(y, m);
  const shift = (first.getDay() + 6) % 7;
  const start = addDays(first, -shift);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) row.push(addDays(start, w * 7 + d));
    weeks.push(row);
  }
  return weeks;
}

export function lastNDays(n, from = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(toISODate(addDays(from, -i)));
  return out;
}

/* ---------- Formatierung ---------- */

export function money(n, currency = 'EUR', opts = {}) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency,
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  }).format(v);
}

export function moneyShort(n, currency = 'EUR') {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1000000) return money(v / 1000000, currency, { decimals: 1 }).replace(/(\d)(?=\s?\D*$)/, '$1 Mio');
  if (a >= 10000) return money(v, currency, { decimals: 0 });
  return money(v, currency);
}

export function num(n, d = 1) {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0);
}

export function pct(n, d = 0) {
  return `${num(n, d)} %`;
}

export const MASK = '••••••';

/** Maskiert einen Geldbetrag, wenn der Privatsphäre-Modus aktiv ist. */
export function maskMoney(n, hidden, currency = 'EUR') {
  return hidden ? MASK : money(n, currency);
}

export function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

export function sum(arr, f = (x) => x) {
  return arr.reduce((a, b) => a + (Number(f(b)) || 0), 0);
}

export function groupBy(arr, f) {
  const m = new Map();
  for (const x of arr) {
    const k = f(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- CSS-Variablen lesen ---------- */

let cssCache = null;
export function css(name) {
  if (!cssCache) cssCache = {};
  if (!(name in cssCache)) {
    cssCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#3ad7ff';
  }
  return cssCache[name];
}

export const COLORS = {
  get cyan() { return css('--cyan'); },
  get cyan2() { return css('--cyan-2'); },
  get gold() { return css('--gold'); },
  get red() { return css('--red'); },
  get green() { return css('--green'); },
  get violet() { return css('--violet'); },
  get muted() { return css('--muted'); },
  get text() { return css('--text'); },
  get line() { return 'rgba(72,196,255,0.16)'; },
};

/** Farbpalette für Kategorien (deterministisch). */
const PALETTE = ['#3ad7ff', '#ffb03a', '#2fe0a4', '#a77bff', '#ff4d5f', '#8df0ff', '#ffd489', '#5b8cff', '#ff8ab5', '#7bffb0'];
export function colorFor(key) {
  let hash = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/* ---------- Toast ---------- */

/**
 * @param {string} msg
 * @param {string} kind  good | warn | bad
 * @param {{label:string, onClick:Function}} [action]  z. B. Rückgängig
 */
export function toast(msg, kind = '', action = null) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = h('div', { class: `toast ${kind ? 'is-' + kind : ''}` }, msg);
  if (action) {
    el.appendChild(h('button', {
      class: 'toast__action',
      type: 'button',
      onclick: () => { el.remove(); action.onClick(); },
    }, action.label));
  }
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

/* ---------- Datei-Helfer ---------- */

export function download(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept = '.json') {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, style: { display: 'none' } });
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, text: String(r.result) });
      r.onerror = () => resolve(null);
      r.readAsText(f);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

/* ---------- CSV ---------- */

/** Robuster CSV-Parser (Komma oder Semikolon, Quotes, eingebettete Zeilenumbrüche). */
export function parseCSV(text) {
  const src = String(text).replace(/^﻿/, '');
  const head = src.slice(0, src.indexOf('\n') >= 0 ? src.indexOf('\n') : src.length);
  const delim = (head.match(/;/g) || []).length > (head.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((s) => s.trim());
  const out = rows.slice(1)
    .filter((r) => r.some((v) => String(v).trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((hh, i) => [hh, (r[i] ?? '').trim()])));
  return { headers, rows: out };
}

/** Findet einen Spaltenwert anhand von Teilstrings (case-insensitive). */
export function pickCol(rowObj, ...needles) {
  const keys = Object.keys(rowObj);
  for (const n of needles) {
    const nn = n.toLowerCase();
    const k = keys.find((key) => key.toLowerCase().includes(nn));
    if (k !== undefined && rowObj[k] !== '') return rowObj[k];
  }
  return undefined;
}

/**
 * Zahl aus Text — beherrscht deutsche und englische Notation:
 *   "1.234,56" -> 1234.56 | "1,234.56" -> 1234.56
 *   "12.480"   -> 12480   | "48,2"     -> 48.2
 * Bei nur einem Trennzeichen entscheidet die Dreiergruppierung,
 * ob es Tausender- oder Dezimaltrennzeichen ist.
 */
export function toNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  let s = String(v).trim().replace(/[\s%€$£]/g, '');
  if (!s) return null;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // Das zuletzt auftretende Zeichen ist das Dezimaltrennzeichen.
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (hasComma) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
