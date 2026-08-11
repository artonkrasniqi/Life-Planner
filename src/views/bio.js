/* ============================================================
   bio.js — Vitalwerte: Whoop (aktiv) + Garmin (vorbereitet)
   ============================================================ */

import {
  h, icon, num, todayISO, fmtDate, lastNDays, pickFile, toast, download, COLORS,
} from '../util.js';
import { store, bio, trash } from '../store.js';
import { panel, kpi, viewHead, empty, iconButton, chip } from '../ui/widgets.js';
import { formModal, confirmModal } from '../ui/modal.js';
import { barChart, lineChart, gauge, sparkline, legend } from '../charts.js';
import * as whoop from '../integrations/whoop.js';
import * as garmin from '../integrations/garmin.js';
import { refresh } from '../nav.js';

const local = { range: 14, metric: 'recovery' };

const RANGES = [7, 14, 30, 60, 90];

const METRICS = [
  { id: 'recovery', label: 'Recovery', unit: ' %', color: () => COLORS.green, max: 100, dec: 0 },
  { id: 'strain', label: 'Strain', unit: '', color: () => COLORS.gold, max: 21, dec: 1 },
  { id: 'hrv', label: 'HRV', unit: ' ms', color: () => COLORS.cyan, max: null, dec: 0 },
  { id: 'rhr', label: 'Ruhepuls', unit: ' bpm', color: () => COLORS.red, max: null, dec: 0 },
  { id: 'sleepHours', label: 'Schlaf', unit: ' h', color: () => COLORS.violet, max: 10, dec: 1 },
  { id: 'sleepPerf', label: 'Schlafqualität', unit: ' %', color: () => COLORS.cyan2, max: 100, dec: 0 },
  { id: 'calories', label: 'Kalorien', unit: ' kcal', color: () => COLORS.gold, max: null, dec: 0 },
  { id: 'steps', label: 'Schritte', unit: '', color: () => COLORS.green, max: null, dec: 0 },
];

export function recoveryColor(r) {
  if (r == null) return COLORS.muted;
  if (r >= 67) return COLORS.green;
  if (r >= 34) return COLORS.gold;
  return COLORS.red;
}

export function render() {
  const s = store.state;
  const frag = document.createDocumentFragment();
  const last = bio.latest();
  const series = bio.range(local.range);

  frag.appendChild(viewHead(
    last ? `Letzter Eintrag ${fmtDate(last.date)} · Quelle ${String(last.source || 'manuell').toUpperCase()}` : 'Keine Daten',
    'Vitalwerte',
    h('button', { class: 'btn btn--ghost', onclick: () => openImport('whoop'), html: icon('upload', 13) + '<span>Whoop importieren</span>' }),
    h('button', { class: 'btn btn--ghost', onclick: () => openImport('garmin'), html: icon('upload', 13) + '<span>Garmin</span>' }),
    h('button', { class: 'btn btn--primary', onclick: () => openBioForm(), html: icon('plus', 13) + '<span>Eintrag</span>' }),
  ));

  if (!s.bio.length) {
    frag.appendChild(panel({ title: 'Keine Biometriedaten' },
      empty('Importiere deinen Whoop-Export oder trage Werte manuell ein', '♥'),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn btn--primary', onclick: () => openImport('whoop'), html: icon('upload', 13) + '<span>Whoop-Datei wählen</span>' }),
        h('button', { class: 'btn', onclick: () => openBioForm(), html: icon('plus', 13) + '<span>Manueller Eintrag</span>' }),
      ),
      integrationsPanelBody(),
    ));
    return frag;
  }

  /* ---------- Tageswerte als Gauges ---------- */
  const gaugeWrap = h('div', { class: 'gauges' });
  const gRec = h('div', { class: 'gauge' }), gStr = h('div', { class: 'gauge' }),
    gSle = h('div', { class: 'gauge' }), gPerf = h('div', { class: 'gauge' });
  gaugeWrap.append(gRec, gStr, gSle, gPerf);

  const todayPanel = panel({
    title: 'Tagesstatus',
    sub: last ? fmtDate(last.date, { weekday: 'short', day: '2-digit', month: 'short' }) : '',
    tools: last ? iconButton('edit', 'Eintrag bearbeiten', () => openBioForm(last), 'iconbtn--sm') : null,
  }, gaugeWrap);
  frag.appendChild(h('div', { style: { marginBottom: '14px' } }, todayPanel));

  gauge(gRec, { value: last.recovery ?? 0, max: 100, color: recoveryColor(last.recovery), label: 'Recovery', sub: 'prozent', height: 140 });
  gauge(gStr, { value: last.strain ?? 0, max: 21, color: COLORS.gold, label: 'Strain', display: num(last.strain ?? 0, 1), sub: 'von 21', height: 140 });
  gauge(gSle, { value: last.sleepHours ?? 0, max: 10, color: COLORS.violet, label: 'Schlaf', display: num(last.sleepHours ?? 0, 1), sub: 'stunden', height: 140 });
  gauge(gPerf, { value: last.sleepPerf ?? 0, max: 100, color: COLORS.cyan, label: 'Qualität', sub: 'prozent', height: 140 });

  /* ---------- KPI-Reihe: Durchschnitte ---------- */
  const avg = (key) => {
    const v = series.map((b) => b[key]).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const trend = (key) => {
    const v = series.map((b) => b[key]).filter((x) => x != null);
    if (v.length < 4) return 0;
    const half = Math.floor(v.length / 2);
    const a = v.slice(0, half).reduce((x, y) => x + y, 0) / half;
    const b = v.slice(half).reduce((x, y) => x + y, 0) / (v.length - half);
    return a === 0 ? 0 : ((b - a) / Math.abs(a)) * 100;
  };
  const trendFoot = (key, invert = false) => {
    const t = trend(key);
    const good = invert ? t < 0 : t > 0;
    if (Math.abs(t) < 1.5) return `stabil (${local.range} T)`;
    return `<span class="${good ? 'up' : 'down'}">${t > 0 ? '▲' : '▼'} ${num(Math.abs(t), 1)} %</span> vs. Vorperiode`;
  };

  frag.appendChild(h('div', { class: 'grid grid--kpi', style: { marginBottom: '14px' } },
    kpi({ label: `Ø Recovery ${local.range} T`, iconName: 'heart', value: avg('recovery') != null ? `${num(avg('recovery'), 0)} %` : '—', valueClass: 'is-green', foot: trendFoot('recovery') }),
    kpi({ label: `Ø Strain ${local.range} T`, iconName: 'zap', value: avg('strain') != null ? num(avg('strain'), 1) : '—', valueClass: 'is-gold', foot: trendFoot('strain') }),
    kpi({ label: `Ø Schlaf ${local.range} T`, iconName: 'moon', value: avg('sleepHours') != null ? `${num(avg('sleepHours'), 1)} h` : '—', valueClass: 'is-cyan', foot: trendFoot('sleepHours') }),
    kpi({ label: `Ø HRV ${local.range} T`, iconName: 'activity', value: avg('hrv') != null ? `${num(avg('hrv'), 0)} ms` : '—', valueClass: '', foot: trendFoot('hrv') }),
  ));

  /* ---------- Verlauf ---------- */
  const metricDef = METRICS.find((m) => m.id === local.metric) || METRICS[0];
  const dates = lastNDays(local.range);
  const byDate = new Map(s.bio.map((b) => [b.date, b]));
  const values = dates.map((d) => {
    const e = byDate.get(d);
    const v = e ? e[metricDef.id] : null;
    return v == null ? null : Number(v);
  });
  const labels = dates.map((d) => fmtDate(d, { day: '2-digit', month: '2-digit' }));

  const trendPanel = panel({
    title: 'Verlauf',
    sub: metricDef.label,
    tools: RANGES.map((r) => chip(`${r} T`, local.range === r, () => { local.range = r; refresh(); })),
  },
    h('div', { class: 'row row--tight' },
      ...METRICS.filter((m) => s.bio.some((b) => b[m.id] != null))
        .map((m) => chip(m.label, local.metric === m.id, () => { local.metric = m.id; refresh(); })),
    ),
  );
  const trendHolder = h('div');
  trendPanel.appendChild(trendHolder);
  if (metricDef.id === 'recovery') {
    barChart(trendHolder, {
      items: dates.map((d, i) => ({
        label: labels[i],
        value: values[i] ?? 0,
        color: recoveryColor(values[i]),
      })),
      height: 220,
      fmt: (v) => num(v, 0),
      unit: ' %',
    });
    trendPanel.appendChild(legend([
      { color: COLORS.green, label: 'Grün ≥ 67 — bereit' },
      { color: COLORS.gold, label: 'Gelb 34–66 — moderat' },
      { color: COLORS.red, label: 'Rot < 34 — Regeneration' },
    ]));
  } else {
    lineChart(trendHolder, {
      values, labels, color: metricDef.color(), height: 220,
      fmt: (v) => num(v, metricDef.dec), unit: metricDef.unit,
      zeroBased: ['strain', 'sleepHours', 'steps'].includes(metricDef.id),
    });
  }

  /* ---------- Schlaf-Stapel ---------- */
  const sleepPanel = panel({ title: 'Schlafdauer', sub: `${local.range} Tage · Ziel 8 h` });
  const sleepHolder = h('div');
  sleepPanel.appendChild(sleepHolder);
  barChart(sleepHolder, {
    items: dates.map((d, i) => {
      const v = byDate.get(d)?.sleepHours ?? 0;
      return { label: fmtDate(d, { day: '2-digit', month: '2-digit' }), value: Number(v) || 0, color: v >= 7.5 ? COLORS.green : v >= 6.5 ? COLORS.gold : COLORS.red };
    }),
    height: 190,
    fmt: (v) => num(v, 1),
    unit: ' h',
  });

  /* ---------- Detailwerte + Sparklines ---------- */
  const detailPanel = panel({ title: 'Kennzahlen', sub: `Trend ${local.range} Tage` });
  for (const m of METRICS) {
    const vals = dates.map((d) => byDate.get(d)?.[m.id] ?? null);
    if (!vals.some((v) => v != null)) continue;
    const cur = [...vals].reverse().find((v) => v != null);
    const row = h('div', { class: 'metric' },
      h('span', { class: 'metric__k' }, m.label),
      h('span', { class: 'metric__v' }, num(cur, m.dec)),
      h('span', { class: 'metric__u' }, m.unit.trim()),
    );
    const sp = h('div', { class: 'metric__spark' });
    row.appendChild(sp);
    detailPanel.appendChild(row);
    sparkline(sp, { values: vals, color: m.color(), height: 26 });
  }

  /* ---------- Integrationen ---------- */
  const intPanel = panel({ title: 'Datenquellen', sub: 'Whoop aktiv · Garmin vorbereitet' }, integrationsPanelBody());

  /* ---------- Rohdaten ---------- */
  const recent = bio.sorted().slice(-12).reverse();
  const rawPanel = panel({
    title: 'Einträge',
    sub: `${s.bio.length} Tage gespeichert`,
    pad0: true,
    tools: h('button', {
      class: 'btn btn--sm btn--ghost',
      onclick: () => download('bio-export.json', JSON.stringify(bio.sorted(), null, 2)),
      html: icon('download', 12) + '<span>Export</span>',
    }),
  },
    h('div', { class: 'list' }, recent.map((b) => h('div', { class: 'item' },
      h('span', { class: 'item__accent', style: { background: recoveryColor(b.recovery) } }),
      h('div', { class: 'item__main' },
        h('div', { class: 'item__title' }, fmtDate(b.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })),
        h('div', { class: 'item__meta' },
          b.recovery != null ? h('span', {}, `Rec ${num(b.recovery, 0)} %`) : null,
          b.strain != null ? h('span', {}, `Strain ${num(b.strain, 1)}`) : null,
          b.sleepHours != null ? h('span', {}, `Schlaf ${num(b.sleepHours, 1)} h`) : null,
          b.hrv != null ? h('span', {}, `HRV ${num(b.hrv, 0)}`) : null,
          b.rhr != null ? h('span', {}, `RHR ${num(b.rhr, 0)}`) : null,
          h('span', { class: 'tag' }, String(b.source || 'manuell')),
        ),
      ),
      h('div', { class: 'item__actions' },
        iconButton('edit', 'Bearbeiten', () => openBioForm(b), 'iconbtn--sm'),
        iconButton('trash', 'Löschen', () => {
          bio.remove(b.date);
          toast(`Werte vom ${fmtDate(b.date)} gelöscht`, 'warn', { label: 'Rückgängig', onClick: () => trash.restoreLast() });
        }, 'iconbtn--sm iconbtn--danger'),
      ),
    ))),
  );

  frag.appendChild(h('div', { class: 'grid grid--main' },
    h('div', { class: 'stack' }, trendPanel, sleepPanel, rawPanel),
    h('div', { class: 'stack' }, detailPanel, intPanel),
  ));

  return frag;
}

/* ------------------------------------------------------------
   Integrationen
   ------------------------------------------------------------ */
function integrationsPanelBody() {
  const s = store.state;
  const box = (id, name, desc, active) => {
    const cfg = s.integrations[id] || {};
    return h('div', { style: { borderTop: '1px solid var(--line)', paddingTop: '12px' } },
      h('div', { class: 'row' },
        h('span', { html: icon(id === 'whoop' ? 'heart' : 'activity', 15), style: { color: active ? 'var(--cyan)' : 'var(--muted)' } }),
        h('span', { style: { fontWeight: '700', letterSpacing: '.1em', textTransform: 'uppercase', fontSize: '12px' } }, name),
        h('span', { class: 'spacer' }),
        h('span', { class: `pill ${cfg.lastSync ? 'pill--green' : 'pill--muted'}` }, cfg.lastSync ? 'Daten vorhanden' : 'keine Daten'),
      ),
      h('div', { class: 'panel__sub', style: { marginTop: '6px', textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } }, desc),
      cfg.lastSync ? h('div', { class: 'kpi__foot' }, `Letzter Import: ${new Date(cfg.lastSync).toLocaleString('de-DE')}`) : null,
      h('div', { class: 'row row--tight', style: { marginTop: '8px' } },
        h('button', { class: 'btn btn--sm', onclick: () => openImport(id), html: icon('upload', 12) + '<span>Datei importieren</span>' }),
        h('button', { class: 'btn btn--sm btn--ghost', onclick: () => openProxyForm(id), html: icon('link', 12) + '<span>API-Proxy</span>' }),
      ),
    );
  };

  return h('div', { class: 'stack' },
    box('whoop', 'Whoop', 'CSV aus dem Whoop-Datenexport (physiological_cycles.csv) oder JSON der API v2. Recovery, Strain, HRV, Ruhepuls, Schlaf und Kalorien werden automatisch zugeordnet.', true),
    box('garmin', 'Garmin Connect', 'CSV-Export aus Garmin Connect oder JSON eines eigenen Proxys. Schritte, Ruhepuls, Schlaf, Body Battery, Stress und VO₂max landen in derselben Zeitreihe.', false),
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6', borderTop: '1px solid var(--line)', paddingTop: '10px' } },
      'Direkter Live-Abruf braucht ein Backend: beide Anbieter nutzen OAuth2 mit Client-Secret, das im Browser nicht sicher liegen kann. Hinterlege dafür die URL deines Proxys.'),
  );
}

async function openImport(source) {
  const res = await pickFile('.csv,.json,text/csv,application/json');
  if (!res) return;
  try {
    const mod = source === 'garmin' ? garmin : whoop;
    const entries = mod.parseAny(res.name, res.text);
    if (!entries.length) {
      toast('Keine verwertbaren Zeilen gefunden.', 'warn');
      return;
    }
    bio.upsertMany(entries, source);
    store.update((s) => { s.integrations[source].connected = true; });
    toast(`${entries.length} Tage aus ${res.name} importiert.`, 'good');
  } catch (e) {
    console.error(e);
    toast(`Import fehlgeschlagen: ${e.message}`, 'bad');
  }
}

async function openProxyForm(source) {
  const cfg = store.state.integrations[source] || {};
  const values = await formModal({
    title: `${source === 'whoop' ? 'Whoop' : 'Garmin'} — API-Proxy`,
    submitLabel: 'Abrufen',
    fields: [
      { name: 'baseUrl', label: 'Proxy-Basis-URL', type: 'text', value: cfg.baseUrl || '', full: true, placeholder: 'https://mein-proxy.example.com/api/', hint: 'Endpunkt, der die Anbieter-API weiterreicht' },
      { name: 'token', label: 'Bearer-Token (optional)', type: 'text', value: cfg.token || '', full: true },
      { name: 'path', label: 'Pfad', type: 'text', value: source === 'whoop' ? 'recovery' : 'daily' },
      { name: 'limit', label: 'Anzahl', type: 'number', value: 30, min: 1, max: 365 },
    ],
  });
  if (!values) return;

  store.update((s) => {
    s.integrations[source].baseUrl = values.baseUrl;
    s.integrations[source].token = values.token;
  });

  if (!values.baseUrl) { toast('Endpunkt gespeichert (kein Abruf).', 'warn'); return; }
  toast('Rufe Daten ab …');
  try {
    const mod = source === 'garmin' ? garmin : whoop;
    const params = source === 'whoop' ? { limit: values.limit } : { days: values.limit };
    const entries = await mod.fetchFromProxy(values.baseUrl, values.token, values.path, params);
    if (!entries.length) { toast('Proxy lieferte keine Datensätze.', 'warn'); return; }
    bio.upsertMany(entries, source);
    store.update((s) => { s.integrations[source].connected = true; });
    toast(`${entries.length} Tage synchronisiert.`, 'good');
  } catch (e) {
    console.error(e);
    toast(`Abruf fehlgeschlagen: ${e.message}`, 'bad');
  }
}

export async function openBioForm(existing = null) {
  const values = await formModal({
    title: existing ? `Werte — ${fmtDate(existing.date)}` : 'Vitalwerte erfassen',
    submitLabel: 'Speichern',
    fields: [
      { name: 'date', label: 'Datum', type: 'date', value: existing?.date || todayISO(), required: true },
      { name: 'source', label: 'Quelle', type: 'select', options: [{ value: 'manual', label: 'Manuell' }, { value: 'whoop', label: 'Whoop' }, { value: 'garmin', label: 'Garmin' }], value: existing?.source || 'manual' },
      { name: 'recovery', label: 'Recovery (%)', type: 'number', value: existing?.recovery ?? '', min: 0, max: 100 },
      { name: 'strain', label: 'Strain (0–21)', type: 'number', step: '0.1', value: existing?.strain ?? '', min: 0, max: 21 },
      { name: 'hrv', label: 'HRV (ms)', type: 'number', value: existing?.hrv ?? '' },
      { name: 'rhr', label: 'Ruhepuls (bpm)', type: 'number', value: existing?.rhr ?? '' },
      { name: 'sleepHours', label: 'Schlaf (Stunden)', type: 'number', step: '0.1', value: existing?.sleepHours ?? '' },
      { name: 'sleepPerf', label: 'Schlafqualität (%)', type: 'number', value: existing?.sleepPerf ?? '', min: 0, max: 100 },
      { name: 'calories', label: 'Kalorien', type: 'number', value: existing?.calories ?? '' },
      { name: 'steps', label: 'Schritte', type: 'number', value: existing?.steps ?? '' },
    ],
  });
  if (!values) return;
  const clean = { date: values.date, source: values.source };
  for (const k of ['recovery', 'strain', 'hrv', 'rhr', 'sleepHours', 'sleepPerf', 'calories', 'steps']) {
    if (values[k] !== '' && values[k] !== 0) clean[k] = Number(values[k]);
    else if (values[k] === 0 && existing && existing[k] != null) clean[k] = 0;
  }
  bio.upsert(clean);
  toast('Werte gespeichert.', 'good');
}
