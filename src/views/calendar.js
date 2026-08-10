/* ============================================================
   calendar.js — Termine: Monatsraster + Tagesagenda
   ============================================================ */

import {
  h, icon, todayISO, toISODate, monthMatrix, MONTHS, WEEKDAYS,
  fmtDate, fmtTime, hasTime, relativeDay, colorFor, toISODateTime, parseLocal, addMonths,
} from '../util.js';
import { store, events, CATEGORIES } from '../store.js';
import { panel, viewHead, empty, iconButton, dot } from '../ui/widgets.js';
import { formModal, confirmModal } from '../ui/modal.js';
import { hexA } from '../charts.js';
import { refresh as rerender } from '../nav.js';

const local = {
  y: new Date().getFullYear(),
  m: new Date().getMonth(),
  selected: todayISO(),
  filter: 'alle',
};

export function setParams(params = {}) {
  if (params.date) {
    local.selected = params.date;
    const d = parseLocal(params.date);
    if (d) { local.y = d.getFullYear(); local.m = d.getMonth(); }
  }
  if (params.newEvent) openEventForm();
}

export function render() {
  const s = store.state;
  const frag = document.createDocumentFragment();

  frag.appendChild(viewHead(
    'Zeitachse',
    'Termine',
    h('button', {
      class: 'btn btn--ghost', onclick: () => { local.y = new Date().getFullYear(); local.m = new Date().getMonth(); local.selected = todayISO(); rerender(); },
    }, 'Heute'),
    h('button', { class: 'btn btn--primary', onclick: () => openEventForm(), html: icon('plus', 13) + '<span>Neuer Termin</span>' }),
  ));

  /* ---------- Monatsnavigation ---------- */
  const nav = h('div', { class: 'row', style: { marginBottom: '4px' } },
    iconButton('chevronLeft', 'Vorheriger Monat', () => { const n = addMonths(local.y, local.m, -1); local.y = n.y; local.m = n.m; rerender(); }),
    h('div', {
      style: {
        fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: '700',
        letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--white)', minWidth: '176px', textAlign: 'center',
      },
    }, `${MONTHS[local.m]} ${local.y}`),
    iconButton('chevronRight', 'Nächster Monat', () => { const n = addMonths(local.y, local.m, 1); local.y = n.y; local.m = n.m; rerender(); }),
    h('span', { class: 'spacer' }),
    h('span', { class: 'panel__sub' }, `${monthEvents().length} Termine im Monat`),
  );

  /* ---------- Monatsraster ---------- */
  const cal = h('div', { class: 'cal' });
  cal.appendChild(h('div', { class: 'cal__weekdays' }, WEEKDAYS.map((w) => h('div', { class: 'cal__wd' }, w))));
  const grid = h('div', { class: 'cal__grid' });
  const weeks = monthMatrix(local.y, local.m);
  const today = todayISO();

  for (const week of weeks) {
    for (const day of week) {
      const iso = toISODate(day);
      const outside = day.getMonth() !== local.m;
      const evs = events.onDay(iso);
      const cell = h('button', {
        class: `cal__day ${outside ? 'is-out' : ''} ${iso === today ? 'is-today' : ''} ${iso === local.selected ? 'is-sel' : ''}`,
        type: 'button',
        onclick: () => { local.selected = iso; if (outside) { local.y = day.getFullYear(); local.m = day.getMonth(); } rerender(); },
        ondblclick: () => openEventForm({ date: `${iso}T09:00` }),
      },
        h('div', { class: 'cal__num' },
          String(day.getDate()).padStart(2, '0'),
          evs.length > 2 ? h('span', { class: 'cal__more' }, `${evs.length}`) : null,
        ),
        ...evs.slice(0, 2).map((e) => h('div', {
          class: 'cal__ev',
          style: { borderLeftColor: colorFor(e.category), background: hexA(colorFor(e.category), 0.14), opacity: e.done ? 0.5 : 1 },
        }, `${hasTime(e.date) ? fmtTime(e.date) + ' ' : ''}${e.title}`)),
        evs.length > 2 ? h('div', { class: 'cal__more' }, `+${evs.length - 2} weitere`) : null,
        evs.length ? h('div', { class: 'cal__dots' }, evs.slice(0, 6).map((e) => h('span', { class: 'cal__dot', style: { background: colorFor(e.category) } }))) : null,
      );
      grid.appendChild(cell);
    }
  }
  cal.appendChild(grid);

  const calPanel = panel({ title: 'Monatsübersicht', sub: 'Doppelklick auf einen Tag legt einen Termin an' }, nav, cal);

  /* ---------- Tagesagenda ---------- */
  const dayEvents = events.onDay(local.selected);
  const agenda = panel({
    title: fmtDate(local.selected, { weekday: 'long', day: '2-digit', month: 'long' }),
    sub: relativeDay(local.selected),
    pad0: true,
    tools: h('button', {
      class: 'btn btn--sm', onclick: () => openEventForm({ date: `${local.selected}T09:00` }), html: icon('plus', 12) + '<span>Termin</span>',
    }),
  },
    dayEvents.length
      ? h('div', { class: 'list' }, dayEvents.map(eventRow))
      : empty('Keine Termine an diesem Tag', '◇'),
  );

  /* ---------- Kommende Termine ---------- */
  const upcoming = events.upcoming(12);
  const upcomingPanel = panel({ title: 'Anstehend', sub: 'Nächste Termine', pad0: true },
    upcoming.length
      ? h('div', { class: 'list' }, upcoming.map(eventRow))
      : empty('Nichts geplant', '◇'),
  );

  frag.appendChild(h('div', { class: 'grid grid--main' },
    calPanel,
    h('div', { class: 'stack' }, agenda, upcomingPanel),
  ));

  return frag;
}

function monthEvents() {
  const prefix = `${local.y}-${String(local.m + 1).padStart(2, '0')}`;
  return store.state.events.filter((e) => String(e.date).startsWith(prefix));
}

function eventRow(e) {
  const col = colorFor(e.category);
  return h('div', { class: `item ${e.done ? 'is-done' : ''}` },
    h('span', { class: 'item__accent', style: { background: col, boxShadow: `0 0 10px ${hexA(col, 0.7)}` } }),
    h('div', { class: 'item__main' },
      h('div', { class: 'item__title' }, e.title),
      h('div', { class: 'item__meta' },
        h('span', { html: icon('clock', 11) + ' ' + (hasTime(e.date) ? `${fmtTime(e.date)} Uhr` : 'ganztägig') }),
        e.durationMin ? dot() : null,
        e.durationMin ? h('span', {}, `${e.durationMin} min`) : null,
        dot(),
        h('span', {}, fmtDate(e.date, { day: '2-digit', month: '2-digit', year: '2-digit' })),
        e.location ? dot() : null,
        e.location ? h('span', { html: icon('pin', 11) + ' ' + e.location }) : null,
        h('span', { class: 'tag' }, e.category),
      ),
      e.notes ? h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' } }, e.notes) : null,
    ),
    h('div', { class: 'item__actions' },
      iconButton(e.done ? 'refresh' : 'check', e.done ? 'Als offen markieren' : 'Als erledigt markieren', () => events.patch(e.id, { done: !e.done }), 'iconbtn--sm'),
      iconButton('edit', 'Bearbeiten', () => openEventForm(e), 'iconbtn--sm'),
      iconButton('trash', 'Löschen', async () => {
        if (await confirmModal({ title: 'Termin löschen', message: `„${e.title}“ wirklich löschen?`, confirmLabel: 'Löschen', danger: true })) {
          events.remove(e.id);
        }
      }, 'iconbtn--sm iconbtn--danger'),
    ),
  );
}

export async function openEventForm(existing = null) {
  const isEdit = existing && existing.id;
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);

  const values = await formModal({
    title: isEdit ? 'Termin bearbeiten' : 'Neuer Termin',
    submitLabel: isEdit ? 'Aktualisieren' : 'Anlegen',
    fields: [
      { name: 'title', label: 'Titel', type: 'text', value: existing?.title || '', required: true, full: true, placeholder: 'z. B. Zahnarzt' },
      { name: 'date', label: 'Datum & Uhrzeit', type: 'datetime-local', value: normalizeDT(existing?.date) || toISODateTime(now) },
      { name: 'durationMin', label: 'Dauer (Minuten)', type: 'number', value: existing?.durationMin ?? 60, min: 0, step: 5 },
      { name: 'category', label: 'Kategorie', type: 'select', options: CATEGORIES.event, value: existing?.category || 'Privat' },
      { name: 'location', label: 'Ort', type: 'text', value: existing?.location || '', placeholder: 'optional' },
      { name: 'notes', label: 'Notizen', type: 'textarea', value: existing?.notes || '', full: true },
    ],
  });
  if (!values) return;
  if (isEdit) events.patch(existing.id, values);
  else events.add(values);
}

function normalizeDT(s) {
  if (!s) return '';
  return hasTime(s) ? String(s).slice(0, 16) : `${String(s).slice(0, 10)}T09:00`;
}
