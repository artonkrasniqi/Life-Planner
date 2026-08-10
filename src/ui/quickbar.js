/* ============================================================
   quickbar.js — Schnellnotizzeile mit automatischer Zuordnung

   Eine Zeile für alles: Termin, Aufgabe, Buchung, Schuld oder
   Zahlung. Was daraus wird, erkennt `quickparse` aus dem Text —
   die Vorschau zeigt das Ergebnis, bevor Enter etwas anlegt, und
   jeder Typ lässt sich mit einem Klick überschreiben.
   ============================================================ */

import { h, icon, clear, money, fmtDate, relativeDay, toast, num } from '../util.js';
import { store, events, todos, finance, debts, priority } from '../store.js';
import { parseQuick, TYPE_LABELS, TYPE_ICONS } from '../quickparse.js';
import { openEventForm } from '../views/calendar.js';
import { openTodoForm } from '../views/todos.js';
import { openTxForm } from '../views/finance.js';
import { openDebtForm } from '../views/debts.js';
import { go } from '../nav.js';

const PLACEHOLDERS = [
  'Zahnarzt morgen 10:30',
  'Wocheneinkauf 82,40 €',
  'Steuerunterlagen sortieren !!',
  'Meeting mit Team am Freitag um 14 Uhr',
  '2000 € bei der Sparkasse 4,9 % Rate 80',
  'Rate Autokredit 420 € bezahlt',
  'Mama anrufen #privat',
];

let override = null;
let input, pop, iconSlot;

export function mountQuickbar(host) {
  clear(host);

  iconSlot = h('span', { class: 'qb__icon', html: icon('zap', 16) });

  input = h('input', {
    class: 'qb__input',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'sentences',
    spellcheck: 'false',
    'aria-label': 'Schnellnotiz — wird automatisch zugeordnet',
    placeholder: 'Schnellnotiz … ' + PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    dataset: { focusKey: 'quickbar' },
    oninput: () => { override = null; update(); },
    onfocus: () => update(),
    onblur: () => setTimeout(() => { if (!pop.contains(document.activeElement)) hide(); }, 120),
    onkeydown: onKey,
  });

  pop = h('div', { class: 'qb__pop', hidden: true });

  // Die Vorschau liegt bewusst neben .qb__form, nicht darin: das
  // clip-path der Eingabezeile würde sie sonst wegschneiden.
  host.appendChild(h('div', { class: 'qb' },
    h('div', { class: 'qb__form' },
      iconSlot,
      input,
      h('kbd', { class: 'qb__kbd' }, '/'),
    ),
    pop,
  ));
}

/** Fokussiert die Zeile (Tastenkürzel „/“). */
export function focusQuickbar() {
  if (!input) return;
  input.focus();
  input.select();
}

/* ------------------------------------------------------------
   Auswertung
   ------------------------------------------------------------ */
function current() {
  return parseQuick(input.value, {
    debts: store.state.debts,
    forceType: override,
  });
}

function hide() {
  pop.hidden = true;
  iconSlot.innerHTML = icon('zap', 16);
  iconSlot.className = 'qb__icon';
}

function update() {
  const text = input.value.trim();
  if (!text) { hide(); return; }

  const r = current();
  pop.hidden = false;
  iconSlot.innerHTML = icon(TYPE_ICONS[r.type], 16);
  iconSlot.className = `qb__icon is-${r.type}`;

  clear(pop);

  /* --- Typwahl ---------------------------------------------- */
  const available = ['todo', 'event', 'transaction', 'debt'];
  if (r.debtId) available.push('payment');

  pop.appendChild(h('div', { class: 'qb__types' },
    h('span', { class: 'qb__lead' }, r.explicitType ? 'Typ gewählt' : 'Erkannt als'),
    ...available.map((t) => h('button', {
      class: `chip ${r.type === t ? 'is-on' : ''}`,
      type: 'button',
      tabindex: '-1',
      onmousedown: (e) => e.preventDefault(),
      onclick: () => { override = t; update(); input.focus(); },
    }, TYPE_LABELS[t])),
    r.type === 'transaction'
      ? h('span', { class: 'qb__sep' })
      : null,
    r.type === 'transaction'
      ? h('button', {
          class: `chip ${r.direction === 'out' ? 'is-on' : ''}`, type: 'button', tabindex: '-1',
          onmousedown: (e) => e.preventDefault(),
          onclick: () => { override = 'transaction'; update(); input.focus(); },
        }, 'Ausgabe')
      : null,
    r.type === 'transaction'
      ? h('button', {
          class: `chip ${r.direction === 'in' ? 'is-on' : ''}`, type: 'button', tabindex: '-1',
          onmousedown: (e) => e.preventDefault(),
          onclick: () => { override = 'income'; update(); input.focus(); },
        }, 'Einnahme')
      : null,
  ));

  /* --- Felder ------------------------------------------------ */
  pop.appendChild(h('div', { class: 'qb__grid' }, ...fieldsFor(r)));

  /* --- Aktionen ---------------------------------------------- */
  pop.appendChild(h('div', { class: 'qb__actions' },
    h('span', { class: 'qb__hint' },
      h('kbd', {}, 'Enter'), ' anlegen · ',
      h('kbd', {}, 'Tab'), ' Typ · ',
      h('kbd', {}, '⇧Enter'), ' Details · ',
      h('kbd', {}, 'Esc'), ' abbrechen',
    ),
    h('button', {
      class: 'btn btn--ghost btn--sm', type: 'button', tabindex: '-1',
      onmousedown: (e) => e.preventDefault(),
      onclick: () => openDetails(r),
    }, 'Details …'),
    h('button', {
      class: 'btn btn--primary btn--sm', type: 'button', tabindex: '-1',
      onmousedown: (e) => e.preventDefault(),
      onclick: () => apply(r),
    }, 'Anlegen'),
  ));
}

function cell(label, value, cls = '') {
  return h('div', { class: 'qb__cell' },
    h('span', { class: 'qb__k' }, label),
    h('span', { class: `qb__v ${cls}` }, value),
  );
}

function whenText(r) {
  if (!r.date) return 'ohne Datum';
  const day = `${fmtDate(r.date, { weekday: 'short', day: '2-digit', month: 'short' })} (${relativeDay(r.date)})`;
  return r.time ? `${day} · ${r.time} Uhr` : `${day} · ganztägig`;
}

function fieldsFor(r) {
  const cur = store.state.profile.currency;
  const acc = store.state.accounts[0];

  switch (r.type) {
    case 'event':
      return [
        cell('Titel', r.title, 'is-strong'),
        cell('Wann', whenText(r)),
        cell('Dauer', `${r.durationMin} min`),
        cell('Kategorie', r.category || 'Privat'),
      ];

    case 'todo':
      return [
        cell('Titel', r.title, 'is-strong'),
        cell('Fällig', r.date ? `${fmtDate(r.date, { weekday: 'short', day: '2-digit', month: 'short' })} (${relativeDay(r.date)})` : 'kein Datum'),
        cell('Priorität', priority(r.priority).label),
        cell('Tags', r.tags.length ? r.tags.map((t) => '#' + t).join(' ') : '—'),
      ];

    case 'transaction': {
      const amt = r.amount || 0;
      return [
        cell('Notiz', r.title, 'is-strong'),
        cell('Betrag', `${r.direction === 'in' ? '+' : '−'} ${money(amt, cur)}`, r.direction === 'in' ? 'is-green' : 'is-red'),
        cell('Kategorie', r.category || 'Sonstiges'),
        cell('Datum', r.date ? fmtDate(r.date, { day: '2-digit', month: 'short' }) : 'heute'),
        cell('Konto', acc ? acc.name : '⚠ kein Konto angelegt', acc ? '' : 'is-warn'),
      ];
    }

    case 'debt':
      return [
        cell('Gläubiger', r.creditor || r.title, 'is-strong'),
        cell('Betrag', money(r.amount || 0, cur), 'is-gold'),
        cell('Zinssatz', r.rate != null ? `${num(r.rate, 2)} % p. a.` : '0,00 % p. a.'),
        cell('Monatsrate', r.minPayment != null ? money(r.minPayment, cur) : '—'),
        cell('Art', r.category || 'Kredit'),
      ];

    case 'payment':
      return [
        cell('Schuld', r.debtName, 'is-strong'),
        cell('Zahlung', money(r.amount || 0, cur), 'is-green'),
        cell('Datum', r.date ? fmtDate(r.date, { day: '2-digit', month: 'short' }) : 'heute'),
        cell('Buchung', acc ? `wird auf ${acc.name} als Ausgabe gebucht` : 'kein Konto — nur Schuld wird reduziert'),
      ];

    default:
      return [];
  }
}

/* ------------------------------------------------------------
   Anlegen
   ------------------------------------------------------------ */
function apply(r) {
  if (!r || !input.value.trim()) return;
  const cur = store.state.profile.currency;
  const today = new Date().toISOString().slice(0, 10);
  let msg = '';

  switch (r.type) {
    case 'event': {
      const date = r.time ? `${r.date}T${r.time}` : r.date;
      events.add({ title: r.title, date, durationMin: r.durationMin, category: r.category || 'Privat' });
      msg = `Termin angelegt: ${r.title} — ${whenText(r)}`;
      break;
    }
    case 'todo':
      todos.add({ title: r.title, priority: r.priority, due: r.date || '', tags: r.tags });
      msg = `Aufgabe angelegt: ${r.title}`;
      break;

    case 'transaction': {
      const amt = Math.abs(r.amount || 0);
      if (!amt) { toast('Kein Betrag erkannt.', 'warn'); return; }
      finance.addTx({
        date: r.date || today,
        amount: r.direction === 'in' ? amt : -amt,
        category: r.category || 'Sonstiges',
        note: r.title,
      });
      msg = `Buchung erfasst: ${r.direction === 'in' ? '+' : '−'}${money(amt, cur)} · ${r.title}`;
      break;
    }

    case 'debt': {
      const amt = Math.abs(r.amount || 0);
      debts.add({
        creditor: r.creditor || r.title,
        type: r.category || 'Kredit',
        principal: amt,
        remaining: amt,
        rate: r.rate ?? 0,
        minPayment: r.minPayment ?? 0,
      });
      msg = `Schuld erfasst: ${r.creditor || r.title} · ${money(amt, cur)}`;
      break;
    }

    case 'payment': {
      const amt = Math.abs(r.amount || 0);
      if (!amt) { toast('Kein Betrag erkannt.', 'warn'); return; }
      debts.pay(r.debtId, amt, r.date || today, true);
      msg = `Zahlung gebucht: ${money(amt, cur)} auf ${r.debtName}`;
      break;
    }

    default:
      return;
  }

  input.value = '';
  override = null;
  hide();
  toast(msg, 'good');
}

/** Öffnet den vollen Dialog mit den erkannten Werten vorbelegt. */
function openDetails(r) {
  const today = new Date().toISOString().slice(0, 10);
  switch (r.type) {
    case 'event':
      openEventForm({ title: r.title, date: r.time ? `${r.date}T${r.time}` : r.date, durationMin: r.durationMin, category: r.category });
      break;
    case 'todo':
      openTodoForm({ title: r.title, priority: r.priority, due: r.date, tags: r.tags });
      break;
    case 'transaction':
      openTxForm({
        kind: r.direction === 'in' ? 'income' : 'expense',
        amount: Math.abs(r.amount || 0),
        date: r.date || today,
        category: r.category,
        note: r.title,
      });
      break;
    case 'debt':
      openDebtForm({
        creditor: r.creditor || r.title, type: r.category,
        principal: Math.abs(r.amount || 0), remaining: Math.abs(r.amount || 0),
        rate: r.rate ?? 0, minPayment: r.minPayment ?? 0,
      });
      break;
    case 'payment':
      go('debts');
      break;
    default:
      break;
  }
  input.value = '';
  override = null;
  hide();
}

/* ------------------------------------------------------------
   Tastatur
   ------------------------------------------------------------ */
function onKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (input.value) { input.value = ''; override = null; hide(); }
    else input.blur();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const r = current();
    if (!input.value.trim()) return;
    if (e.shiftKey) openDetails(r);
    else apply(r);
    return;
  }
  if (e.key === 'Tab' && input.value.trim()) {
    e.preventDefault();
    const r = current();
    const cycle = ['todo', 'event', 'transaction', 'debt'];
    if (r.debtId) cycle.push('payment');
    const idx = cycle.indexOf(r.type);
    override = cycle[(idx + 1) % cycle.length];
    update();
  }
}
