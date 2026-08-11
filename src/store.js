/* ============================================================
   store.js — Zustand, Persistenz (localStorage), Pub/Sub
   ============================================================ */

import { uid, todayISO } from './util.js';
import { buildBaseline, stampChanges, touchAll, pruneTombstones } from './sync/merge.js';
import { materialize, newRule } from './recurring.js';

const KEY = 'life-os:state:v1';
const TRASH_TTL_MS = 30 * 24 * 3600 * 1000;   // Papierkorb hält 30 Tage
const SCHEMA = 1;

export const CATEGORIES = {
  event: ['Arbeit', 'Privat', 'Sport', 'Gesundheit', 'Familie', 'Finanzen', 'Reise', 'Sonstiges'],
  income: ['Gehalt', 'Nebenjob', 'Rückzahlung', 'Verkauf', 'Zinsen', 'Sonstiges'],
  expense: ['Miete', 'Lebensmittel', 'Transport', 'Abos', 'Freizeit', 'Gesundheit', 'Shopping', 'Versicherung', 'Schuldenrate', 'Sonstiges'],
  debt: ['Kredit', 'Kreditkarte', 'Privat', 'Studium', 'Auto', 'Dispo', 'Sonstiges'],
};

export const PRIORITIES = [
  { id: 'critical', label: 'Kritisch', pill: 'pill--red', rank: 0 },
  { id: 'high', label: 'Hoch', pill: 'pill--gold', rank: 1 },
  { id: 'normal', label: 'Normal', pill: 'pill--cyan', rank: 2 },
  { id: 'low', label: 'Niedrig', pill: 'pill--muted', rank: 3 },
];

export function priority(id) {
  return PRIORITIES.find((p) => p.id === id) || PRIORITIES[2];
}

function emptyState() {
  return {
    schema: SCHEMA,
    profile: { name: 'Operator', currency: 'EUR', monthlyIncomeTarget: 0 },
    ui: { debtsHidden: true, view: 'dashboard' },
    events: [],
    todos: [],
    accounts: [],
    transactions: [],
    budgets: {},
    debts: [],
    bio: [],
    recurring: [],
    // Gelöschtes wandert hierher statt sofort zu verschwinden.
    // Gerätelokal: was du hier löschst, ist auf dem anderen Gerät weg —
    // der Papierkorb ist die Sicherung dieses Geräts, keine geteilte Liste.
    trash: [],
    integrations: {
      whoop: {
        connected: false, lastSync: null, lastError: '', note: '',
        clientId: '', workerUrl: '', appKey: '',
        accessToken: '', refreshToken: '', expiresAt: 0, autoDays: 30,
      },
      garmin: { connected: false, lastSync: null, lastError: '', note: '' },
      google: {
        connected: false, lastSync: null, lastError: '',
        clientId: '', accessToken: '', expiresAt: 0,
        calendars: [], calendarIds: [], rangePast: 30, rangeFuture: 120,
      },
    },
    // Verbindungsdaten für den Abgleich — bleiben gerätelokal und
    // werden weder synchronisiert noch in Backups geschrieben.
    sync: {
      provider: 'off',
      token: '',
      gistId: '',
      url: '',
      encrypt: true,
      passphrase: '',
      auto: true,
      lastSync: null,
      lastError: '',
    },
    meta: {
      created: todayISO(),
      seeded: false,
      deviceId: uid(),
      tombstones: {},
      fieldUpdated: {},
    },
  };
}

/* ---------- Persistenz ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return migrate(data);
  } catch (e) {
    console.warn('[L.I.F.E. OS] Konnte Zustand nicht laden:', e);
    return null;
  }
}

function migrate(data) {
  const base = emptyState();
  const merged = { ...base, ...data };
  // Verschachtelte Defaults sicherstellen
  merged.profile = { ...base.profile, ...(data.profile || {}) };
  merged.ui = { ...base.ui, ...(data.ui || {}) };
  merged.integrations = {
    whoop: { ...base.integrations.whoop, ...(data.integrations?.whoop || {}) },
    garmin: { ...base.integrations.garmin, ...(data.integrations?.garmin || {}) },
    google: { ...base.integrations.google, ...(data.integrations?.google || {}) },
  };
  merged.sync = { ...base.sync, ...(data.sync || {}) };
  merged.meta = { ...base.meta, ...(data.meta || {}) };
  merged.meta.tombstones = pruneTombstones(merged.meta.tombstones || {});
  merged.meta.fieldUpdated = merged.meta.fieldUpdated || {};
  if (!merged.meta.deviceId) merged.meta.deviceId = uid();
  for (const k of ['events', 'todos', 'accounts', 'transactions', 'debts', 'bio', 'recurring', 'trash']) {
    if (!Array.isArray(merged[k])) merged[k] = [];
  }
  merged.trash = merged.trash.filter((t) => Date.now() - (t.deletedAt || 0) < TRASH_TTL_MS);

  // Kontostände werden gerechnet statt gespeichert. Alte Daten einmalig
  // umrechnen, damit der angezeigte Stand exakt gleich bleibt.
  for (const acc of merged.accounts) {
    if (acc.startBalance === undefined) {
      const moves = merged.transactions.reduce(
        (sum, t) => (t.accountId === acc.id ? sum + (Number(t.amount) || 0) : sum), 0,
      );
      acc.startBalance = (Number(acc.balance) || 0) - moves;
    }
    delete acc.balance;
  }
  if (typeof merged.budgets !== 'object' || !merged.budgets) merged.budgets = {};
  merged.schema = SCHEMA;
  return merged;
}

let state = load() || emptyState();
const listeners = new Set();
let saveTimer = null;

/* Momentaufnahme, gegen die geänderte Einträge erkannt werden. */
let baseline = buildBaseline(state);
/* Liegen lokale Änderungen vor, die noch nicht hochgeladen wurden? */
let dirty = false;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[L.I.F.E. OS] Speichern fehlgeschlagen:', e);
    }
  }, 120);
}

function emit() {
  for (const fn of listeners) fn(state);
}

/* ---------- Öffentliche API ---------- */

export const store = {
  get state() { return state; },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Mutiert den Zustand, speichert und benachrichtigt alle Views. */
  update(mutator) {
    mutator(state);
    if (stampChanges(state, baseline)) dirty = true;
    baseline = buildBaseline(state);
    persist();
    emit();
  },

  /** Ersetzt den kompletten Zustand (Import / Reset). */
  replace(next) {
    const keepSync = state.sync;
    state = migrate(next);
    state.sync = keepSync;               // Verbindung überlebt einen Import
    touchAll(state);                     // Importiertes gewinnt beim nächsten Abgleich
    baseline = buildBaseline(state);
    dirty = true;
    persist();
    emit();
  },

  reset() {
    const keepSync = state.sync;
    state = emptyState();
    state.sync = keepSync;
    baseline = buildBaseline(state);
    dirty = true;
    persist();
    emit();
  },

  /**
   * Übernimmt einen zusammengeführten Stand von der Gegenstelle.
   * Stempelt bewusst NICHT — sonst gingen die Zeitstempel der
   * Gegenseite verloren und jeder Abgleich würde alles neu schreiben.
   */
  applyRemote(next) {
    state = next;
    baseline = buildBaseline(state);
    persist();
    emit();
  },

  /** Stempelt alle Einträge — beim erstmaligen Verbinden. */
  touchAll() {
    touchAll(state);
    baseline = buildBaseline(state);
    dirty = true;
    persist();
    emit();
  },

  get dirty() { return dirty; },
  clearDirty() { dirty = false; },

  /** Backup ohne Geheimnisse: Token und Kennwort bleiben auf dem Gerät. */
  export() {
    const { sync, ...rest } = state;
    return JSON.stringify({
      ...rest,
      integrations: stripSecrets(rest.integrations),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },
};

function stripSecrets(integrations) {
  const out = {};
  for (const [k, v] of Object.entries(integrations || {})) {
    const { token, ...safe } = v || {};
    out[k] = safe;
  }
  return out;
}

/* ---------- Papierkorb ---------- */

const TRASH_LABELS = {
  events: 'Termin', todos: 'Aufgabe', accounts: 'Konto',
  transactions: 'Buchung', debts: 'Schuld', bio: 'Vitalwerte', recurring: 'Wiederholung',
};

/** Verschiebt einen Eintrag in den Papierkorb, statt ihn wegzuwerfen. */
function softDelete(coll, id) {
  let removed = null;
  store.update((s) => {
    const idx = s[coll].findIndex((v) => (coll === 'bio' ? v.date : v.id) === id);
    if (idx < 0) return;
    removed = s[coll][idx];
    s[coll].splice(idx, 1);
    s.trash.unshift({
      key: `${coll}:${id}:${Date.now()}`,
      coll,
      label: TRASH_LABELS[coll] || coll,
      title: removed.title || removed.creditor || removed.name || removed.note || removed.date || '—',
      item: removed,
      deletedAt: Date.now(),
    });
    if (s.trash.length > 200) s.trash.length = 200;
  });
  return removed;
}

export const trash = {
  list() {
    return [...state.trash].sort((a, b) => b.deletedAt - a.deletedAt);
  },
  /** Holt einen Eintrag zurück; der Abgleich verteilt ihn wieder mit. */
  restore(key) {
    store.update((s) => {
      const idx = s.trash.findIndex((t) => t.key === key);
      if (idx < 0) return;
      const entry = s.trash[idx];
      s.trash.splice(idx, 1);
      const list = s[entry.coll];
      const idOf = (v) => (entry.coll === 'bio' ? v.date : v.id);
      if (!list.some((v) => idOf(v) === idOf(entry.item))) list.push(entry.item);
    });
  },
  /** Nimmt den zuletzt gelöschten Eintrag zurück. */
  restoreLast() {
    const first = trash.list()[0];
    if (first) trash.restore(first.key);
    return first;
  },
  purge(key) {
    store.update((s) => { s.trash = s.trash.filter((t) => t.key !== key); });
  },
  empty() {
    store.update((s) => { s.trash = []; });
  },
  get count() { return state.trash.length; },
};

/* ---------- Aktionen: Termine ---------- */

export const events = {
  add(e) {
    store.update((s) => s.events.push({ id: uid(), title: '', date: todayISO(), durationMin: 60, category: 'Privat', location: '', notes: '', done: false, ...e }));
  },
  patch(id, changes) {
    store.update((s) => {
      const x = s.events.find((v) => v.id === id);
      if (x) Object.assign(x, changes);
    });
  },
  remove(id) { return softDelete('events', id); },
  sorted() {
    return [...state.events].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  },
  onDay(iso) {
    return events.sorted().filter((e) => String(e.date).slice(0, 10) === iso);
  },
  upcoming(limit = 5) {
    const now = todayISO();
    return events.sorted().filter((e) => String(e.date).slice(0, 10) >= now && !e.done).slice(0, limit);
  },

  /**
   * Spiegelt Termine einer externen Quelle in einem Zeitfenster.
   * Was in dem Fenster von dieser Quelle stammt und nicht mehr geliefert
   * wird, verschwindet — so wirkt ein Löschen in Google auch hier.
   *
   * Die lokale id wird aus der Fremd-id abgeleitet, damit zwei Geräte
   * denselben Google-Termin nicht zweimal anlegen und der Abgleich sie
   * als einen Eintrag erkennt.
   */
  syncExternal({ source, calendarId = '', items = [], from, to }) {
    const key = (extId) => `${source}:${extId}`;
    const inWindow = (iso) => {
      const d = String(iso).slice(0, 10);
      return d >= from && d <= to;
    };
    store.update((s) => {
      const incoming = new Map(items.filter((i) => i.externalId).map((i) => [i.externalId, i]));

      s.events = s.events.filter((e) => {
        if (e.source !== source) return true;
        if (calendarId && e.calendarId && e.calendarId !== calendarId) return true;
        if (!inWindow(e.date)) return true;
        return incoming.has(e.externalId);
      });

      for (const e of s.events) {
        if (e.source !== source) continue;
        const inc = incoming.get(e.externalId);
        if (!inc) continue;
        Object.assign(e, inc, { id: key(inc.externalId) });
        incoming.delete(inc.externalId);
      }

      for (const inc of incoming.values()) {
        s.events.push({ id: key(inc.externalId), notes: '', location: '', done: false, ...inc });
      }
    });
    return items.length;
  },

  /** Entfernt alle Termine einer Quelle (beim Trennen der Verbindung). */
  dropExternal(source) {
    store.update((s) => { s.events = s.events.filter((e) => e.source !== source); });
  },
};

/* ---------- Aktionen: To-dos ---------- */

export const todos = {
  add(t) {
    store.update((s) => s.todos.unshift({
      id: uid(), title: '', notes: '', priority: 'normal', due: '', tags: [],
      done: false, createdAt: new Date().toISOString(), completedAt: null, ...t,
    }));
  },
  patch(id, changes) {
    store.update((s) => {
      const x = s.todos.find((v) => v.id === id);
      if (x) Object.assign(x, changes);
    });
  },
  toggle(id) {
    store.update((s) => {
      const x = s.todos.find((v) => v.id === id);
      if (!x) return;
      x.done = !x.done;
      x.completedAt = x.done ? new Date().toISOString() : null;
    });
  },
  remove(id) { return softDelete('todos', id); },
  open() { return state.todos.filter((t) => !t.done); },
  overdue() {
    const now = todayISO();
    return todos.open().filter((t) => t.due && t.due < now);
  },
  dueToday() {
    const now = todayISO();
    return todos.open().filter((t) => t.due === now);
  },
  sortedOpen() {
    return [...todos.open()].sort((a, b) => {
      const pr = priority(a.priority).rank - priority(b.priority).rank;
      if (pr !== 0) return pr;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });
  },
};

/* ---------- Aktionen: Finanzen ---------- */

export const finance = {
  /**
   * Kontostand = Anfangsbestand + alle Buchungen.
   *
   * Früher wurde der Stand gespeichert und bei jeder Buchung angepasst.
   * Das driftet, sobald zwei Geräte abgleichen: beide Buchungen kommen an,
   * aber vom Konto überlebt nur eine Fassung — der Stand passt dann zu
   * genau einer der beiden. Gerechnet stimmt er immer.
   */
  balanceOf(accountId) {
    const acc = state.accounts.find((a) => a.id === accountId);
    if (!acc) return 0;
    const moves = state.transactions.reduce(
      (sum, t) => (t.accountId === accountId ? sum + (Number(t.amount) || 0) : sum), 0,
    );
    return (Number(acc.startBalance) || 0) + moves;
  },

  assets() {
    return state.accounts.reduce((a, acc) => a + finance.balanceOf(acc.id), 0);
  },

  addAccount(a) {
    const { balance, ...rest } = a || {};
    store.update((s) => s.accounts.push({
      id: uid(), name: 'Konto', type: 'Giro',
      startBalance: Number(balance ?? rest.startBalance ?? 0),
      ...rest,
    }));
  },
  patchAccount(id, changes) {
    store.update((s) => {
      const x = s.accounts.find((v) => v.id === id);
      if (x) Object.assign(x, changes);
    });
  },
  removeAccount(id) {
    store.update((s) => {
      s.transactions = s.transactions.map((t) => (t.accountId === id ? { ...t, accountId: null } : t));
    });
    softDelete('accounts', id);
  },
  addTx(t) {
    store.update((s) => {
      const tx = { id: uid(), date: todayISO(), amount: 0, category: 'Sonstiges', note: '', accountId: s.accounts[0]?.id || null, ...t };
      s.transactions.push(tx);
    });
  },
  removeTx(id) { softDelete('transactions', id); },
  setBudget(cat, limit) {
    store.update((s) => {
      if (!limit) delete s.budgets[cat];
      else s.budgets[cat] = Number(limit);
    });
  },
  inMonth(mk) {
    return state.transactions.filter((t) => String(t.date).slice(0, 7) === mk);
  },
  netWorth() {
    const debt = state.debts.reduce((a, b) => a + Number(b.remaining || 0), 0);
    return finance.assets() - debt;
  },
};

/* ---------- Aktionen: Schulden ---------- */

export const debts = {
  add(d) {
    store.update((s) => s.debts.push({
      id: uid(), creditor: 'Gläubiger', type: 'Kredit', principal: 0, remaining: 0,
      rate: 0, minPayment: 0, startDate: todayISO(), payments: [], note: '', ...d,
    }));
  },
  patch(id, changes) {
    store.update((s) => {
      const x = s.debts.find((v) => v.id === id);
      if (x) Object.assign(x, changes);
    });
  },
  remove(id) { return softDelete('debts', id); },
  /** Zahlung erfassen; optional als Transaktion in den Finanzen buchen. */
  pay(id, amount, date, alsoBook = true) {
    store.update((s) => {
      const d = s.debts.find((v) => v.id === id);
      if (!d) return;
      const amt = Math.max(0, Number(amount) || 0);
      d.payments = d.payments || [];
      d.payments.push({ date: date || todayISO(), amount: amt });
      d.remaining = Math.max(0, Number(d.remaining || 0) - amt);
      if (alsoBook) {
        s.transactions.push({
          id: uid(), date: date || todayISO(), amount: -amt, category: 'Schuldenrate',
          note: `Rate: ${d.creditor}`, accountId: s.accounts[0]?.id || null, debtId: d.id,
        });
      }
    });
  },
  total() { return state.debts.reduce((a, b) => a + Number(b.remaining || 0), 0); },
  totalPrincipal() { return state.debts.reduce((a, b) => a + Number(b.principal || 0), 0); },
  monthlyLoad() { return state.debts.reduce((a, b) => a + Number(b.minPayment || 0), 0); },
  toggleHidden() {
    store.update((s) => { s.ui.debtsHidden = !s.ui.debtsHidden; });
  },
  get hidden() { return !!state.ui.debtsHidden; },
};

/** Restlaufzeit in Monaten (Annuität). Infinity = Rate deckt Zinsen nicht. */
export function payoffMonths(remaining, annualRatePct, monthlyPayment) {
  const P = Number(remaining) || 0;
  const M = Number(monthlyPayment) || 0;
  const i = (Number(annualRatePct) || 0) / 100 / 12;
  if (P <= 0) return 0;
  if (M <= 0) return Infinity;
  if (i === 0) return Math.ceil(P / M);
  if (M <= P * i) return Infinity;
  return Math.ceil(-Math.log(1 - (P * i) / M) / Math.log(1 + i));
}

/** Gesamte verbleibende Zinskosten bei aktueller Rate. */
export function totalInterest(remaining, annualRatePct, monthlyPayment) {
  const n = payoffMonths(remaining, annualRatePct, monthlyPayment);
  if (!isFinite(n)) return Infinity;
  return Math.max(0, n * (Number(monthlyPayment) || 0) - (Number(remaining) || 0));
}

/* ---------- Aktionen: Biometrie (Whoop / Garmin) ---------- */

export const bio = {
  /** Fügt einen Tageseintrag hinzu oder aktualisiert ihn (Schlüssel = Datum). */
  upsert(entry) {
    store.update((s) => {
      const date = String(entry.date).slice(0, 10);
      const existing = s.bio.find((b) => b.date === date);
      if (existing) Object.assign(existing, { ...entry, date });
      else s.bio.push({ id: uid(), source: 'manual', ...entry, date });
      s.bio.sort((a, b) => a.date.localeCompare(b.date));
    });
  },
  upsertMany(entries, source) {
    store.update((s) => {
      for (const e of entries) {
        const date = String(e.date).slice(0, 10);
        if (!date) continue;
        const existing = s.bio.find((b) => b.date === date);
        const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v !== null && v !== undefined && v !== ''));
        const incoming = source || e.source || 'manual';
        if (existing) {
          // Stammen die Werte eines Tages aus mehreren Geräten, bleibt das
          // sichtbar: "whoop+garmin".
          const known = String(existing.source || '').split('+').filter(Boolean);
          const mergedSource = known.includes(incoming) ? existing.source : [...known, incoming].join('+');
          Object.assign(existing, clean, { date, source: mergedSource || incoming });
        } else {
          s.bio.push({ id: uid(), source: incoming, ...clean, date });
        }
      }
      s.bio.sort((a, b) => a.date.localeCompare(b.date));
      if (source && s.integrations[source]) {
        s.integrations[source].lastSync = new Date().toISOString();
      }
    });
  },
  remove(date) { return softDelete('bio', date); },
  sorted() { return [...state.bio].sort((a, b) => a.date.localeCompare(b.date)); },
  latest() { return bio.sorted().slice(-1)[0] || null; },
  range(days) {
    const all = bio.sorted();
    return all.slice(-days);
  },
  byDate(iso) { return state.bio.find((b) => b.date === iso) || null; },
};

/* ---------- Aktionen: Wiederkehrende Einträge ---------- */

export const recurring = {
  list() { return [...state.recurring]; },
  add(patch) {
    const rule = newRule(patch);
    store.update((s) => s.recurring.push(rule));
    recurring.run();
    return rule;
  },
  patch(id, changes) {
    store.update((s) => {
      const r = s.recurring.find((x) => x.id === id);
      if (r) Object.assign(r, changes);
    });
    recurring.run();
  },
  toggle(id) {
    store.update((s) => {
      const r = s.recurring.find((x) => x.id === id);
      if (r) r.active = !r.active;
    });
    recurring.run();
  },
  remove(id) { return softDelete('recurring', id); },

  /** Holt nach, was seit dem letzten Lauf fällig war. */
  run() {
    let result = { created: 0, byKind: {} };
    store.update((s) => { result = materialize(s); });
    return result;
  },
};

/* ---------- Abgeleitete Kennzahl: Systemintegrität ---------- */

/**
 * "Systemintegrität" — gewichteter Score aus vier Domänen.
 * Nur Domänen mit Daten fließen ein.
 */
export function systemIntegrity() {
  const parts = [];

  // 1. Aufgaben: Anteil nicht überfälliger offener Aufgaben
  const open = todos.open().length;
  const over = todos.overdue().length;
  if (state.todos.length > 0) {
    const score = open === 0 ? 100 : Math.max(0, 100 - (over / Math.max(1, open)) * 100 - Math.min(20, open * 1.2));
    parts.push({ key: 'Aufgaben', score });
  }

  // 2. Finanzen: Cashflow des laufenden Monats
  const mk = todayISO().slice(0, 7);
  const tx = finance.inMonth(mk);
  if (tx.length > 0) {
    const inc = tx.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const exp = -tx.filter((t) => t.amount < 0).reduce((a, b) => a + b.amount, 0);
    const ratio = inc > 0 ? (inc - exp) / inc : (exp > 0 ? -1 : 0);
    parts.push({ key: 'Finanzen', score: Math.max(0, Math.min(100, 50 + ratio * 125)) });
  }

  // 3. Schulden: Tilgungsfortschritt
  const P = debts.totalPrincipal();
  if (P > 0) {
    parts.push({ key: 'Schulden', score: Math.max(0, Math.min(100, (1 - debts.total() / P) * 100)) });
  }

  // 4. Körper: Recovery des letzten Eintrags
  const last = bio.latest();
  if (last && last.recovery != null) {
    parts.push({ key: 'Körper', score: Math.max(0, Math.min(100, Number(last.recovery))) });
  }

  if (!parts.length) return { score: 0, parts: [] };
  const score = Math.round(parts.reduce((a, b) => a + b.score, 0) / parts.length);
  return { score, parts: parts.map((p) => ({ ...p, score: Math.round(p.score) })) };
}
