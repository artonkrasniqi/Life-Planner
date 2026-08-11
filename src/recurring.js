/* ============================================================
   recurring.js — Wiederkehrende Einträge

   Eine Regel beschreibt, was in welchem Takt entstehen soll: Miete
   am 1., Gehalt am 28., Müll rausbringen jeden Dienstag, Autorate
   monatlich. Beim Start der App wird nachgeholt, was seit dem letzten
   Mal fällig war.

   Erzeugte Einträge tragen eine berechenbare Kennung
   (`rec:<regel>:<datum>`). Dadurch kann dieselbe Ausführung nie zweimal
   entstehen — auch nicht, wenn zwei Geräte am selben Tag nachholen:
   der Abgleich erkennt beide als denselben Eintrag.
   ============================================================ */

import { uid, toISODate, parseLocal, todayISO, addDays } from './util.js';

export const FREQUENCIES = [
  { id: 'weekly', label: 'Wöchentlich' },
  { id: 'monthly', label: 'Monatlich' },
  { id: 'quarterly', label: 'Vierteljährlich' },
  { id: 'yearly', label: 'Jährlich' },
];

export const KINDS = [
  { id: 'transaction', label: 'Buchung' },
  { id: 'event', label: 'Termin' },
  { id: 'todo', label: 'Aufgabe' },
];

export const WEEKDAY_LABELS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/** Wie weit Termine im Voraus angelegt werden. */
const LOOKAHEAD_DAYS = 60;

const pad = (n) => String(n).padStart(2, '0');

/** Klemmt den Monatstag auf den letzten Tag des Monats (31. Februar gibt es nicht). */
function dayInMonth(year, month, day) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

/**
 * Alle Fälligkeiten einer Regel zwischen zwei Daten (einschließlich).
 * @returns {string[]} ISO-Daten
 */
export function occurrences(rule, fromISO, toISO) {
  const out = [];
  const from = parseLocal(fromISO);
  const to = parseLocal(toISO);
  if (!from || !to || to < from) return out;

  const start = rule.startDate ? parseLocal(rule.startDate) : from;
  const end = rule.endDate ? parseLocal(rule.endDate) : null;
  const begin = start > from ? start : from;

  if (rule.freq === 'weekly') {
    const target = Number(rule.weekday ?? 1);
    const cursor = new Date(begin);
    // auf den nächsten passenden Wochentag vorrücken
    cursor.setDate(cursor.getDate() + ((target - cursor.getDay() + 7) % 7));
    while (cursor <= to) {
      if (cursor >= start && (!end || cursor <= end)) out.push(toISODate(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return out;
  }

  const step = rule.freq === 'quarterly' ? 3 : rule.freq === 'yearly' ? 12 : 1;
  const day = Number(rule.day ?? 1);
  const anchorMonth = rule.freq === 'yearly' ? (Number(rule.month ?? start.getMonth() + 1) - 1) : null;

  // beim Startmonat beginnen und in Schritten weitergehen
  let y = start.getFullYear();
  let m = anchorMonth != null ? anchorMonth : start.getMonth();
  let guard = 0;
  while (guard++ < 600) {
    const d = dayInMonth(y, m, day);
    if (d > to) break;
    if (d >= begin && d >= start && (!end || d <= end)) out.push(toISODate(d));
    m += step;
    while (m > 11) { m -= 12; y += 1; }
  }
  return out;
}

/** Nächste Fälligkeit ab heute — für die Anzeige. */
export function nextDue(rule, fromISO = todayISO()) {
  const horizon = toISODate(addDays(parseLocal(fromISO), 420));
  return occurrences(rule, fromISO, horizon)[0] || null;
}

/** Berechenbare Kennung: dieselbe Ausführung ergibt immer denselben Wert. */
export function occurrenceId(ruleId, dateISO) {
  return `rec:${ruleId}:${dateISO}`;
}

export function describe(rule) {
  const day = Number(rule.day ?? 1);
  switch (rule.freq) {
    case 'weekly': return `jeden ${WEEKDAY_LABELS[Number(rule.weekday ?? 1)]}`;
    case 'quarterly': return `alle 3 Monate am ${day}.`;
    case 'yearly': return `jährlich am ${day}.${pad(Number(rule.month ?? 1))}.`;
    default: return `monatlich am ${day}.`;
  }
}

/* ------------------------------------------------------------
   Nachholen
   ------------------------------------------------------------ */

/**
 * Erzeugt alles, was seit dem letzten Lauf fällig war.
 *
 * Buchungen und Aufgaben werden nur bis heute erzeugt — eine Miete für
 * nächsten Monat abzubuchen wäre falsch. Termine dürfen vorausgreifen,
 * damit der Kalender nach vorn gefüllt ist.
 *
 * @returns {{created:number, byKind:object}}
 */
export function materialize(state, now = new Date()) {
  const today = toISODate(now);
  const ahead = toISODate(addDays(now, LOOKAHEAD_DAYS));
  const created = { transaction: 0, event: 0, todo: 0 };

  for (const rule of state.recurring || []) {
    if (!rule.active) continue;

    // Erstes Nachholen erst ab der Anlage der Regel — sonst entstünden
    // rückwirkend Jahre an Buchungen.
    const from = rule.lastRun
      ? toISODate(addDays(parseLocal(rule.lastRun), 1))
      : (rule.startDate || today);
    const to = rule.kind === 'event' ? ahead : today;

    for (const date of occurrences(rule, from, to)) {
      const id = occurrenceId(rule.id, date);
      const t = rule.template || {};

      if (rule.kind === 'transaction') {
        if (state.transactions.some((x) => x.id === id)) continue;
        state.transactions.push({
          id, date,
          amount: Number(t.amount) || 0,
          category: t.category || 'Sonstiges',
          note: t.note || rule.name,
          accountId: t.accountId || state.accounts[0]?.id || null,
          recurringId: rule.id,
        });
        created.transaction++;
      } else if (rule.kind === 'event') {
        if (state.events.some((x) => x.id === id)) continue;
        state.events.push({
          id,
          title: t.title || rule.name,
          date: t.time ? `${date}T${t.time}` : date,
          durationMin: Number(t.durationMin) || 60,
          category: t.category || 'Privat',
          location: t.location || '',
          notes: t.notes || '',
          done: false,
          recurringId: rule.id,
        });
        created.event++;
      } else {
        if (state.todos.some((x) => x.id === id)) continue;
        state.todos.push({
          id,
          title: t.title || rule.name,
          notes: t.notes || '',
          priority: t.priority || 'normal',
          due: date,
          tags: t.tags || [],
          done: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          recurringId: rule.id,
        });
        created.todo++;
      }
    }

    rule.lastRun = to;
  }

  const total = created.transaction + created.event + created.todo;
  return { created: total, byKind: created };
}

export function newRule(patch = {}) {
  return {
    id: uid(),
    name: '',
    kind: 'transaction',
    freq: 'monthly',
    day: 1,
    weekday: 1,
    month: 1,
    startDate: todayISO(),
    endDate: '',
    active: true,
    lastRun: '',
    template: {},
    ...patch,
  };
}
