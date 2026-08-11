/* ============================================================
   todos.js — Aufgaben mit Prioritäten, Fälligkeiten, Tags
   ============================================================ */

import { h, icon, todayISO, relativeDay, fmtDate, toast } from '../util.js';
import { store, todos, trash, PRIORITIES, priority } from '../store.js';
import { panel, viewHead, empty, iconButton, chip, pill, progressBar } from '../ui/widgets.js';
import { formModal, confirmModal } from '../ui/modal.js';
import { refresh } from '../nav.js';

const local = { filter: 'offen', tag: null, quickAdd: '' };

export function setParams(params = {}) {
  if (params.quickAdd) setTimeout(() => document.querySelector('[data-focus-key="todo-quick"]')?.focus(), 60);
  if (params.filter) { local.filter = params.filter; local.tag = null; }
}

const FILTERS = [
  { id: 'offen', label: 'Offen' },
  { id: 'heute', label: 'Heute' },
  { id: 'ueberfaellig', label: 'Überfällig' },
  { id: 'woche', label: 'Diese Woche' },
  { id: 'erledigt', label: 'Erledigt' },
  { id: 'alle', label: 'Alle' },
];

export function render() {
  const s = store.state;
  const frag = document.createDocumentFragment();

  const open = todos.open();
  const over = todos.overdue();
  const doneCount = s.todos.filter((t) => t.done).length;
  const total = s.todos.length;

  frag.appendChild(viewHead(
    `${open.length} offen · ${over.length} überfällig`,
    'Aufgaben',
    h('button', { class: 'btn btn--primary', onclick: () => openTodoForm(), html: icon('plus', 13) + '<span>Neue Aufgabe</span>' }),
  ));

  /* ---------- Schnellerfassung ---------- */
  const quick = h('input', {
    class: 'input',
    type: 'text',
    placeholder: 'Aufgabe eintippen und Enter drücken …  (Tipp: "!!" = hoch, "!!!" = kritisch, "@heute" / "@morgen")',
    value: local.quickAdd,
    dataset: { focusKey: 'todo-quick' },
    oninput: (e) => { local.quickAdd = e.target.value; },
    onkeydown: (e) => {
      if (e.key !== 'Enter') return;
      const parsed = parseQuick(e.target.value);
      if (!parsed.title) return;
      todos.add(parsed);
      local.quickAdd = '';
      e.target.value = '';
    },
  });

  /* ---------- Filterleiste ---------- */
  const tags = [...new Set(s.todos.flatMap((t) => t.tags || []))].sort();
  const filterRow = h('div', { class: 'row row--tight', style: { marginTop: '12px' } },
    ...FILTERS.map((f) => chip(f.label, local.filter === f.id, () => { local.filter = f.id; refresh(); })),
    tags.length ? h('span', { style: { width: '1px', height: '20px', background: 'var(--line)', margin: '0 4px' } }) : null,
    ...tags.map((t) => chip('#' + t, local.tag === t, () => { local.tag = local.tag === t ? null : t; refresh(); })),
  );

  const controlPanel = panel({ title: 'Erfassung', sub: `${total} Aufgaben gesamt` }, quick, filterRow);

  /* ---------- Liste ---------- */
  const list = filtered();
  const listPanel = panel({
    title: currentFilterLabel(),
    sub: `${list.length} Einträge`,
    pad0: true,
  },
    list.length ? h('div', { class: 'list' }, list.map(todoRow)) : empty('Keine Aufgaben in dieser Ansicht', '✓'),
  );

  /* ---------- Seitenpanel: Statistik ---------- */
  const byPrio = PRIORITIES.map((p) => ({ p, n: open.filter((t) => t.priority === p.id).length }));
  const doneFrac = total ? doneCount / total : 0;

  const stats = panel({ title: 'Auslastung', sub: 'Offene Aufgaben nach Priorität' },
    h('div', { class: 'stack', style: { gap: '10px' } },
      ...byPrio.map(({ p, n }) => h('div', {},
        h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '4px' } },
          h('span', {}, pill(p.label, p.pill)),
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '12px' } }, String(n)),
        ),
        progressBar(open.length ? n / open.length : 0, p.id === 'critical' ? 'is-red' : p.id === 'high' ? 'is-gold' : ''),
      )),
    ),
    h('div', { style: { borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '4px' } },
      h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '6px' } },
        h('span', { class: 'panel__sub' }, 'Erledigungsquote'),
        h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--green)', fontWeight: '700' } }, `${Math.round(doneFrac * 100)} %`),
      ),
      progressBar(doneFrac, 'is-green'),
      h('div', { class: 'kpi__foot' }, `${doneCount} von ${total} erledigt`),
    ),
    doneCount > 0
      ? h('button', {
          class: 'btn btn--ghost btn--sm',
          onclick: async () => {
            if (await confirmModal({ title: 'Erledigte löschen', message: `${doneCount} erledigte Aufgaben endgültig entfernen?`, confirmLabel: 'Entfernen', danger: true })) {
              store.update((st) => { st.todos = st.todos.filter((t) => !t.done); });
            }
          },
          html: icon('trash', 12) + '<span>Erledigte aufräumen</span>',
        })
      : null,
  );

  frag.appendChild(h('div', { class: 'stack' },
    controlPanel,
    h('div', { class: 'grid grid--main' }, listPanel, stats),
  ));

  return frag;
}

function currentFilterLabel() {
  const f = FILTERS.find((x) => x.id === local.filter);
  return (f ? f.label : 'Alle') + (local.tag ? ` · #${local.tag}` : '');
}

function filtered() {
  const s = store.state;
  const now = todayISO();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  let list = [...s.todos];
  switch (local.filter) {
    case 'offen': list = list.filter((t) => !t.done); break;
    case 'heute': list = list.filter((t) => !t.done && t.due === now); break;
    case 'ueberfaellig': list = list.filter((t) => !t.done && t.due && t.due < now); break;
    case 'woche': list = list.filter((t) => !t.done && t.due && t.due >= now && t.due <= weekEndISO); break;
    case 'erledigt': list = list.filter((t) => t.done); break;
    default: break;
  }
  if (local.tag) list = list.filter((t) => (t.tags || []).includes(local.tag));

  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pr = priority(a.priority).rank - priority(b.priority).rank;
    if (pr !== 0) return pr;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

function todoRow(t) {
  const p = priority(t.priority);
  const overdue = !t.done && t.due && t.due < todayISO();
  const accent = t.priority === 'critical' ? 'var(--red)' : t.priority === 'high' ? 'var(--gold)' : t.priority === 'low' ? 'var(--muted)' : 'var(--cyan)';

  return h('div', { class: `item ${t.done ? 'is-done' : ''}` },
    h('span', { class: 'item__accent', style: { background: t.done ? 'var(--muted)' : accent } }),
    h('button', {
      class: `checkbox ${t.done ? 'is-on' : ''}`, type: 'button',
      title: t.done ? 'Wieder öffnen' : 'Erledigt',
      onclick: () => todos.toggle(t.id),
      html: icon('check', 12),
    }),
    h('div', { class: 'item__main' },
      h('div', { class: 'item__title' }, t.title),
      h('div', { class: 'item__meta' },
        pill(p.label, p.pill),
        t.due
          ? h('span', { style: overdue ? { color: 'var(--red)', fontWeight: '700' } : null },
              `${overdue ? '⚠ ' : ''}${relativeDay(t.due)} (${fmtDate(t.due, { day: '2-digit', month: '2-digit' })})`)
          : h('span', {}, 'kein Datum'),
        ...(t.tags || []).map((tag) => h('span', { class: 'tag' }, '#' + tag)),
      ),
      t.notes ? h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' } }, t.notes) : null,
    ),
    h('div', { class: 'item__actions' },
      iconButton('edit', 'Bearbeiten', () => openTodoForm(t), 'iconbtn--sm'),
      iconButton('trash', 'Löschen', () => {
        todos.remove(t.id);
        toast(`Aufgabe gelöscht: ${t.title}`, 'warn', { label: 'Rückgängig', onClick: () => trash.restoreLast() });
      }, 'iconbtn--sm iconbtn--danger'),
    ),
  );
}

export async function openTodoForm(existing = null) {
  const isEdit = existing && existing.id;
  const values = await formModal({
    title: isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe',
    submitLabel: isEdit ? 'Aktualisieren' : 'Anlegen',
    fields: [
      { name: 'title', label: 'Titel', type: 'text', value: existing?.title || '', required: true, full: true },
      { name: 'priority', label: 'Priorität', type: 'select', options: PRIORITIES.map((p) => ({ value: p.id, label: p.label })), value: existing?.priority || 'normal' },
      { name: 'due', label: 'Fällig am', type: 'date', value: existing?.due || '' },
      { name: 'tags', label: 'Tags', type: 'tags', value: existing?.tags || [], hint: 'kommagetrennt', full: true },
      { name: 'notes', label: 'Notizen', type: 'textarea', value: existing?.notes || '', full: true },
    ],
  });
  if (!values) return;
  if (isEdit) todos.patch(existing.id, values);
  else todos.add(values);
}

/** Kurzsyntax: "Text !!! @morgen #tag" */
function parseQuick(raw) {
  let text = String(raw).trim();
  let prio = 'normal';
  if (/!!!/.test(text)) prio = 'critical';
  else if (/!!/.test(text)) prio = 'high';
  else if (/(^|\s)!(\s|$)/.test(text)) prio = 'low';
  text = text.replace(/!+/g, ' ');

  let due = '';
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const map = {
    '@heute': 0, '@today': 0, '@morgen': 1, '@tomorrow': 1, '@übermorgen': 2, '@uebermorgen': 2, '@woche': 7,
  };
  for (const [k, off] of Object.entries(map)) {
    if (text.toLowerCase().includes(k)) {
      const d = new Date(today);
      d.setDate(d.getDate() + off);
      due = iso(d);
      text = text.replace(new RegExp(k, 'ig'), ' ');
      break;
    }
  }
  const dateMatch = text.match(/@(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) { due = dateMatch[1]; text = text.replace(dateMatch[0], ' '); }

  const tags = [];
  text = text.replace(/#([\wÄÖÜäöüß-]+)/g, (_, t) => { tags.push(t.toLowerCase()); return ' '; });

  return { title: text.replace(/\s+/g, ' ').trim(), priority: prio, due, tags };
}
