/* ============================================================
   recurring-panel.js — Verwaltung wiederkehrender Einträge
   ============================================================ */

import { h, icon, money, fmtDate, relativeDay, toast } from '../util.js';
import { store, recurring, trash, CATEGORIES, PRIORITIES } from '../store.js';
import { panel, empty, iconButton } from './widgets.js';
import { formModal } from './modal.js';
import {
  FREQUENCIES, KINDS, WEEKDAY_LABELS, describe, nextDue, occurrences,
} from '../recurring.js';
import { todayISO, toISODate, addDays, parseLocal } from '../util.js';

const KIND_LOOK = {
  transaction: { icon: 'wallet', color: 'var(--gold)', label: 'Buchung' },
  event: { icon: 'calendar', color: 'var(--cyan)', label: 'Termin' },
  todo: { icon: 'checkSquare', color: 'var(--green)', label: 'Aufgabe' },
};

export function recurringPanel() {
  const s = store.state;
  const rules = recurring.list();
  const cur = s.profile.currency;

  const monthlyLoad = rules
    .filter((r) => r.active && r.kind === 'transaction' && r.freq === 'monthly')
    .reduce((a, r) => a + (Number(r.template?.amount) || 0), 0);

  return panel({
    title: 'Wiederkehrend',
    sub: rules.length
      ? `${rules.filter((r) => r.active).length} aktiv${monthlyLoad ? ` · ${money(monthlyLoad, cur, { decimals: 0 })} pro Monat` : ''}`
      : 'nichts eingerichtet',
    pad0: true,
    tools: h('button', {
      class: 'btn btn--sm', onclick: () => openRuleForm(),
      html: icon('plus', 12) + '<span>Regel</span>',
    }),
  },
    rules.length
      ? h('div', { class: 'list' }, rules.map((r) => ruleRow(r, cur)))
      : h('div', { style: { padding: '0 16px 16px' } },
          h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
            'Miete, Abos, Gehalt, Kreditraten oder der wöchentliche Müll — einmal anlegen statt jeden Monat neu eintippen. Fälliges wird beim Öffnen der App nachgetragen.'),
          h('div', { class: 'row', style: { marginTop: '10px' } },
            h('button', { class: 'btn btn--primary btn--sm', onclick: () => openRuleForm(), html: icon('plus', 12) + '<span>Erste Regel anlegen</span>' }),
          )),
  );
}

function ruleRow(r, cur) {
  const look = KIND_LOOK[r.kind] || KIND_LOOK.transaction;
  const due = r.active ? nextDue(r) : null;
  const amount = Number(r.template?.amount) || 0;

  return h('div', { class: `item ${r.active ? '' : 'is-done'}` },
    h('span', { class: 'item__accent', style: { background: r.active ? look.color : 'var(--muted)' } }),
    h('span', { style: { color: r.active ? look.color : 'var(--muted)', display: 'inline-flex', flex: 'none' }, html: icon(look.icon, 15) }),
    h('div', { class: 'item__main' },
      h('div', { class: 'item__title' }, r.name || '(ohne Namen)'),
      h('div', { class: 'item__meta' },
        h('span', { class: 'tag' }, look.label),
        h('span', {}, describe(r)),
        r.kind === 'transaction' && amount
          ? h('span', { style: { color: amount >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: '700' } }, money(amount, cur))
          : null,
        due
          ? h('span', {}, `nächste: ${fmtDate(due, { day: '2-digit', month: 'short' })} (${relativeDay(due)})`)
          : h('span', { style: { color: 'var(--muted)' } }, r.active ? 'keine weitere' : 'pausiert'),
      ),
    ),
    h('div', { class: 'item__actions' },
      iconButton(r.active ? 'clock' : 'refresh', r.active ? 'Pausieren' : 'Fortsetzen', () => {
        recurring.toggle(r.id);
      }, 'iconbtn--sm'),
      iconButton('edit', 'Bearbeiten', () => openRuleForm(r), 'iconbtn--sm'),
      iconButton('trash', 'Löschen', () => {
        recurring.remove(r.id);
        toast(`Regel gelöscht: ${r.name}`, 'warn', { label: 'Rückgängig', onClick: () => trash.restoreLast() });
      }, 'iconbtn--sm iconbtn--danger'),
    ),
  );
}

/* ------------------------------------------------------------
   Dialog
   ------------------------------------------------------------ */
export async function openRuleForm(existing = null) {
  const s = store.state;
  const isEdit = existing && existing.id;
  const t = existing?.template || {};
  const isKind = (k) => (v) => v.kind === k;

  const values = await formModal({
    title: isEdit ? 'Regel bearbeiten' : 'Wiederkehrender Eintrag',
    submitLabel: isEdit ? 'Aktualisieren' : 'Anlegen',
    wide: true,
    fields: [
      { name: 'name', label: 'Bezeichnung', type: 'text', value: existing?.name || '', required: true, full: true, placeholder: 'z. B. Miete, Netflix, Gehalt' },
      { name: 'kind', label: 'Art', type: 'select', options: KINDS.map((k) => ({ value: k.id, label: k.label })), value: existing?.kind || 'transaction' },
      { name: 'freq', label: 'Takt', type: 'select', options: FREQUENCIES.map((f) => ({ value: f.id, label: f.label })), value: existing?.freq || 'monthly' },

      { name: 'day', label: 'Tag im Monat', type: 'number', min: 1, max: 31, value: existing?.day ?? 1,
        hint: 'Der 31. rutscht in kürzeren Monaten auf den letzten Tag.',
        showIf: (v) => v.freq !== 'weekly' },
      { name: 'weekday', label: 'Wochentag', type: 'select',
        options: WEEKDAY_LABELS.map((l, i) => ({ value: i, label: l })), value: existing?.weekday ?? 1,
        showIf: (v) => v.freq === 'weekly' },
      { name: 'month', label: 'Monat', type: 'select',
        options: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
          .map((l, i) => ({ value: i + 1, label: l })),
        value: existing?.month ?? 1, showIf: (v) => v.freq === 'yearly' },

      { name: 'startDate', label: 'Ab wann', type: 'date', value: existing?.startDate || todayISO() },
      { name: 'endDate', label: 'Bis (optional)', type: 'date', value: existing?.endDate || '' },

      /* Buchung */
      { name: 'amount', label: 'Betrag', type: 'money', value: t.amount ?? '',
        hint: 'Ausgaben mit Minus, Einnahmen positiv.', showIf: isKind('transaction') },
      { name: 'category', label: 'Kategorie', type: 'select',
        options: [...new Set([...CATEGORIES.expense, ...CATEGORIES.income])], value: t.category || 'Miete',
        showIf: isKind('transaction') },
      { name: 'accountId', label: 'Konto', type: 'select',
        options: s.accounts.length ? s.accounts.map((a) => ({ value: a.id, label: a.name })) : [{ value: '', label: '— kein Konto —' }],
        value: t.accountId || s.accounts[0]?.id || '', showIf: isKind('transaction') },

      /* Termin */
      { name: 'time', label: 'Uhrzeit', type: 'time', value: t.time || '', showIf: isKind('event') },
      { name: 'durationMin', label: 'Dauer (Minuten)', type: 'number', min: 0, step: 5, value: t.durationMin ?? 60, showIf: isKind('event') },
      { name: 'eventCategory', label: 'Kategorie', type: 'select', options: CATEGORIES.event, value: t.category || 'Privat', showIf: isKind('event') },
      { name: 'location', label: 'Ort', type: 'text', value: t.location || '', showIf: isKind('event') },

      /* Aufgabe */
      { name: 'priority', label: 'Priorität', type: 'select',
        options: PRIORITIES.map((p) => ({ value: p.id, label: p.label })), value: t.priority || 'normal',
        showIf: isKind('todo') },
      { name: 'tags', label: 'Tags', type: 'tags', value: t.tags || [], showIf: isKind('todo') },

      { name: 'notes', label: 'Notiz', type: 'text', value: t.notes || t.note || '', full: true },
    ],
  });
  if (!values) return;

  const template = {};
  if (values.kind === 'transaction') {
    template.amount = Number(values.amount) || 0;
    template.category = values.category;
    template.accountId = values.accountId || null;
    template.note = values.notes || values.name;
  } else if (values.kind === 'event') {
    template.title = values.name;
    template.time = values.time;
    template.durationMin = Number(values.durationMin) || 60;
    template.category = values.eventCategory;
    template.location = values.location;
    template.notes = values.notes;
  } else {
    template.title = values.name;
    template.priority = values.priority;
    template.tags = values.tags;
    template.notes = values.notes;
  }

  const patch = {
    name: values.name,
    kind: values.kind,
    freq: values.freq,
    day: Number(values.day) || 1,
    weekday: Number(values.weekday) || 0,
    month: Number(values.month) || 1,
    startDate: values.startDate,
    endDate: values.endDate,
    template,
  };

  if (isEdit) {
    recurring.patch(existing.id, patch);
    toast('Regel aktualisiert.', 'good');
  } else {
    const rule = recurring.add({ ...patch, active: true });
    const preview = occurrences(rule, values.startDate, toISODate(addDays(parseLocal(values.startDate), 370))).length;
    toast(`Regel angelegt — ${describe(rule)}${preview ? `, ${preview}× im ersten Jahr` : ''}.`, 'good');
  }
}
