/* ============================================================
   search.js — Suche über alles

   Eine Zeile, die Termine, Aufgaben, Buchungen und Schulden
   gleichzeitig durchsucht. Ein Treffer führt direkt dorthin, wo
   der Eintrag steht — bei einer Buchung auch in den richtigen Monat.
   ============================================================ */

import { h, icon, clear, money, fmtDate, relativeDay, escapeHtml } from '../util.js';
import { store, priority } from '../store.js';
import { go } from '../nav.js';

const MAX_PER_GROUP = 6;

let overlay = null;
let input = null;
let resultBox = null;
let hits = [];

/* ------------------------------------------------------------
   Treffer sammeln
   ------------------------------------------------------------ */
function norm(v) {
  return String(v ?? '').toLowerCase();
}

/** Alle Wörter müssen vorkommen — Reihenfolge egal. */
function matches(haystack, words) {
  const hay = norm(haystack);
  return words.every((w) => hay.includes(w));
}

function search(query) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const s = store.state;
  const cur = s.profile.currency;
  const out = [];

  for (const e of s.events) {
    if (!matches([e.title, e.location, e.notes, e.category].join(' '), words)) continue;
    out.push({
      group: 'Termine', icon: 'calendar', color: 'var(--cyan)',
      title: e.title,
      meta: `${fmtDate(e.date, { day: '2-digit', month: 'short', year: 'numeric' })} · ${relativeDay(e.date)}${e.location ? ' · ' + e.location : ''}`,
      sort: String(e.date),
      open: () => go('calendar', { date: String(e.date).slice(0, 10) }),
    });
  }

  for (const t of s.todos) {
    if (!matches([t.title, t.notes, (t.tags || []).join(' ')].join(' '), words)) continue;
    out.push({
      group: 'Aufgaben', icon: 'checkSquare', color: t.done ? 'var(--muted)' : 'var(--green)',
      title: t.title,
      meta: `${t.done ? 'erledigt' : priority(t.priority).label}${t.due ? ' · ' + relativeDay(t.due) : ''}`,
      sort: t.due || '9999',
      open: () => go('todos', { filter: 'alle' }),
    });
  }

  for (const t of s.transactions) {
    if (!matches([t.note, t.category].join(' '), words)) continue;
    out.push({
      group: 'Buchungen', icon: 'wallet', color: t.amount >= 0 ? 'var(--green)' : 'var(--red)',
      title: t.note || t.category,
      meta: `${money(t.amount, cur)} · ${t.category} · ${fmtDate(t.date, { day: '2-digit', month: 'short', year: 'numeric' })}`,
      sort: String(t.date),
      reverse: true,
      open: () => go('finance', { month: String(t.date).slice(0, 7) }),
    });
  }

  for (const d of s.debts) {
    if (!matches([d.creditor, d.note, d.type].join(' '), words)) continue;
    out.push({
      group: 'Schulden', icon: 'card', color: 'var(--gold)',
      title: d.creditor,
      meta: store.state.ui.debtsHidden ? 'Beträge verborgen' : `${money(d.remaining, cur)} offen · ${d.type}`,
      sort: d.creditor,
      open: () => go('debts'),
    });
  }

  return out;
}

/* ------------------------------------------------------------
   Darstellung
   ------------------------------------------------------------ */
function highlight(text, query) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  let out = escapeHtml(text);
  for (const w of words) {
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    out = out.replace(re, '<mark class="search__mark">$1</mark>');
  }
  return out;
}

function renderResults() {
  const q = input.value.trim();
  clear(resultBox);
  hits = [];

  if (q.length < 2) {
    resultBox.appendChild(h('div', { class: 'search__hint' },
      'Mindestens zwei Zeichen. Gesucht wird in Terminen, Aufgaben, Buchungen und Schulden.'));
    return;
  }

  const all = search(q);
  if (!all.length) {
    resultBox.appendChild(h('div', { class: 'search__hint' }, `Nichts gefunden zu „${q}“.`));
    return;
  }

  const groups = new Map();
  for (const r of all) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group).push(r);
  }

  for (const [name, list] of groups) {
    list.sort((a, b) => (a.reverse ? String(b.sort).localeCompare(String(a.sort)) : String(a.sort).localeCompare(String(b.sort))));
    resultBox.appendChild(h('div', { class: 'search__group' },
      name,
      h('span', { class: 'search__count' }, String(list.length)),
    ));
    for (const r of list.slice(0, MAX_PER_GROUP)) {
      hits.push(r);
      resultBox.appendChild(h('button', {
        class: 'search__hit', type: 'button',
        onclick: () => { close(); r.open(); },
      },
        h('span', { class: 'search__ico', style: { color: r.color }, html: icon(r.icon, 15) }),
        h('span', { class: 'search__body' },
          h('span', { class: 'search__title', html: highlight(r.title, q) }),
          h('span', { class: 'search__meta' }, r.meta),
        ),
      ));
    }
    if (list.length > MAX_PER_GROUP) {
      resultBox.appendChild(h('div', { class: 'search__more' }, `… und ${list.length - MAX_PER_GROUP} weitere`));
    }
  }
}

/* ------------------------------------------------------------
   Öffnen / Schließen
   ------------------------------------------------------------ */
export function closeSearch() { close(); }

function close() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  input = null;
  resultBox = null;
  hits = [];
  document.removeEventListener('keydown', onKey, true);
}

function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); close(); }
}

export function openSearch(initial = '') {
  if (overlay) { input.focus(); input.select(); return; }

  input = h('input', {
    class: 'search__input', type: 'search', value: initial,
    placeholder: 'Suchen …', autocomplete: 'off', spellcheck: 'false',
    'aria-label': 'Alles durchsuchen',
    oninput: renderResults,
    onkeydown: (e) => {
      if (e.key === 'Enter' && hits.length) {
        e.preventDefault();
        const first = hits[0];
        close();
        first.open();
      }
    },
  });
  resultBox = h('div', { class: 'search__results' });

  overlay = h('div', {
    class: 'search__back',
    onmousedown: (e) => { if (e.target === overlay) close(); },
  },
    h('div', { class: 'search__panel', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'search__bar' },
        h('span', { class: 'search__ico', style: { color: 'var(--cyan)' }, html: icon('target', 16) }),
        input,
        h('button', { class: 'iconbtn', type: 'button', title: 'Schließen', onclick: close, html: icon('x', 14) }),
      ),
      resultBox,
    ),
  );

  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey, true);
  renderResults();
  setTimeout(() => input.focus(), 30);
}
