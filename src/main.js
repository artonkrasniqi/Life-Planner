/* ============================================================
   main.js — Boot, Router, Topbar, Navigation, Tastenkürzel
   ============================================================ */

import { h, $, clear, icon, todayISO, toast } from './util.js';
import { store, todos, debts, events } from './store.js';
import { setNavigator, setRefresher } from './nav.js';
import { markSVG, reactorSVG } from './ui/reactor.js';
import { eyeButton } from './ui/widgets.js';
import { confirmModal } from './ui/modal.js';
import { buildSeed } from './seed.js';
import { mountQuickbar, focusQuickbar } from './ui/quickbar.js';

import * as dashboard from './views/dashboard.js';
import * as calendar from './views/calendar.js';
import * as todosView from './views/todos.js';
import * as financeView from './views/finance.js';
import * as debtsView from './views/debts.js';
import * as bioView from './views/bio.js';
import * as settingsView from './views/settings.js';

/* ------------------------------------------------------------
   Ansichten
   ------------------------------------------------------------ */
const VIEWS = [
  { id: 'dashboard', label: 'Zentrale', icon: 'home', mod: dashboard },
  { id: 'calendar', label: 'Termine', icon: 'calendar', mod: calendar, onNew: () => calendar.openEventForm() },
  { id: 'todos', label: 'Aufgaben', icon: 'checkSquare', mod: todosView, onNew: () => todosView.openTodoForm() },
  { id: 'finance', label: 'Finanzen', icon: 'wallet', mod: financeView, onNew: () => financeView.openTxForm() },
  { id: 'debts', label: 'Schulden', icon: 'card', mod: debtsView, onNew: () => debtsView.openDebtForm() },
  { id: 'bio', label: 'Vitalwerte', icon: 'heart', mod: bioView, onNew: () => bioView.openBioForm() },
  { id: 'settings', label: 'System', icon: 'settings', mod: settingsView },
];

let current = store.state.ui.view && VIEWS.some((v) => v.id === store.state.ui.view)
  ? store.state.ui.view
  : 'dashboard';

/* ------------------------------------------------------------
   Rendering
   ------------------------------------------------------------ */
function renderView() {
  const host = $('#view');
  if (!host) return;

  // Fokus + Scrollposition über das Neurendern retten
  const active = document.activeElement;
  const focusKey = active && active.dataset ? active.dataset.focusKey : null;
  const selStart = focusKey ? active.selectionStart : null;
  const selEnd = focusKey ? active.selectionEnd : null;
  const scrollTop = host.scrollTop;

  const view = VIEWS.find((v) => v.id === current) || VIEWS[0];
  clear(host);
  try {
    host.appendChild(view.mod.render());
  } catch (err) {
    console.error('[L.I.F.E. OS] Render-Fehler:', err);
    host.appendChild(h('section', { class: 'panel' },
      h('div', { class: 'panel__title' }, 'Fehler beim Rendern'),
      h('pre', { style: { color: 'var(--red)', fontSize: '11px', whiteSpace: 'pre-wrap' } }, String(err && err.stack || err)),
    ));
  }

  host.scrollTop = scrollTop;
  if (focusKey) {
    const el = host.querySelector(`[data-focus-key="${focusKey}"]`);
    if (el) {
      el.focus();
      try { el.setSelectionRange(selStart, selEnd); } catch { /* nicht alle Feldtypen unterstützen das */ }
    }
  }

  renderRail();
  renderTopbar();
}

function navigate(id, params) {
  const view = VIEWS.find((v) => v.id === id);
  if (!view) return;
  current = id;
  if (params && typeof view.mod.setParams === 'function') view.mod.setParams(params);
  store.update((s) => { s.ui.view = id; });   // löst renderView über das Abo aus
}

setNavigator(navigate);
setRefresher(renderView);

/* ------------------------------------------------------------
   Navigationsleiste
   ------------------------------------------------------------ */
function renderRail() {
  const rail = $('#rail');
  if (!rail) return;
  clear(rail);

  const over = todos.overdue().length;
  const open = todos.open().length;
  const todayEvents = events.onDay(todayISO()).filter((e) => !e.done).length;

  rail.appendChild(h('div', { class: 'rail__label' }, 'Module'));

  for (const v of VIEWS) {
    let badge = null;
    if (v.id === 'todos' && open) badge = h('span', { class: `navbtn__badge ${over ? 'bad' : ''}` }, String(open));
    if (v.id === 'calendar' && todayEvents) badge = h('span', { class: 'navbtn__badge warn' }, String(todayEvents));
    if (v.id === 'debts' && store.state.debts.length && !debts.hidden) {
      badge = h('span', { class: 'navbtn__badge warn' }, String(store.state.debts.length));
    }

    rail.appendChild(h('button', {
      class: `navbtn ${current === v.id ? 'is-active' : ''}`,
      type: 'button',
      onclick: () => navigate(v.id),
      title: v.label,
    },
      h('span', { html: icon(v.icon, 16), style: { display: 'inline-flex' } }),
      h('span', { class: 'navbtn__txt' }, v.label),
      badge,
    ));
  }

  rail.appendChild(h('div', { class: 'rail__foot' },
    h('div', {}, 'L.I.F.E. OS v1.0'),
    h('div', { style: { marginTop: '3px', opacity: '.7' } }, 'lokal · offline · privat'),
  ));
}

/* ------------------------------------------------------------
   Topbar
   ------------------------------------------------------------ */
function renderTopbar() {
  const bar = $('#topbar');
  if (!bar) return;
  clear(bar);

  const hidden = debts.hidden;

  bar.appendChild(h('div', { class: 'brand' },
    h('div', { class: 'brand__mark', html: markSVG(34) }),
    h('div', { class: 'brand__txt' },
      h('div', { class: 'brand__name' }, 'L.I.F.E. OS'),
      h('div', { class: 'brand__sub' }, 'Life Integrated Framework / Execution'),
    ),
  ));

  bar.appendChild(h('div', { class: 'topbar__spacer' }));

  bar.appendChild(h('div', { class: 'status-strip' },
    h('span', {}, h('span', { class: 'status-dot' }), ' Systeme ', h('b', {}, 'online')),
    h('span', {}, 'Datenschutz ', h('b', {}, hidden ? 'aktiv' : 'offen')),
  ));

  bar.appendChild(eyeButton(hidden, () => debts.toggleHidden()));

  const clock = h('div', { class: 'clock' });
  bar.appendChild(clock);
  tickClock(clock);
}

let clockTimer = null;
function tickClock(el) {
  const paint = () => {
    if (!el.isConnected) { clearInterval(clockTimer); return; }
    const now = new Date();
    clear(el);
    el.appendChild(document.createTextNode(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })));
    el.appendChild(h('small', {}, now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })));
  };
  paint();
  clearInterval(clockTimer);
  clockTimer = setInterval(paint, 1000);
}

/* ------------------------------------------------------------
   Tastenkürzel
   ------------------------------------------------------------ */
function onKey(e) {
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.getElementById('modal-root')?.firstChild) return;

  if (e.key === '/') { e.preventDefault(); focusQuickbar(); return; }

  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= VIEWS.length) { navigate(VIEWS[n - 1].id); return; }

  const k = e.key.toLowerCase();
  if (k === 'n') {
    const v = VIEWS.find((x) => x.id === current);
    if (v && v.onNew) { e.preventDefault(); v.onNew(); }
  } else if (k === 'a') {
    debts.toggleHidden();
    toast(debts.hidden ? 'Schulden verborgen' : 'Schulden sichtbar', debts.hidden ? 'warn' : 'good');
  } else if (k === 't') {
    navigate('calendar', { date: todayISO() });
  }
}

/* ------------------------------------------------------------
   Boot-Sequenz
   ------------------------------------------------------------ */
const BOOT_LINES = [
  'ARC-KERN ONLINE ........... <b>OK</b>',
  'ZEITACHSE GELADEN ......... <b>OK</b>',
  'AUFGABENMATRIX ............ <b>OK</b>',
  'FINANZMODUL .............. <b>OK</b>',
  'BIOMETRIE-LINK ........... <b>OK</b>',
  'ALLE SYSTEME BEREIT',
];

function boot() {
  const el = $('#boot');
  const log = $('#boot-log');
  const fill = $('#boot-bar-fill');
  const reactor = $('#boot-reactor');
  if (reactor) reactor.innerHTML = reactorSVG(120, 0.86);

  const skipped = sessionStorage.getItem('life-os:booted') === '1';
  if (skipped || !el) {
    el?.classList.add('is-done');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let i = 0;
    const finish = () => {
      clearInterval(timer);
      sessionStorage.setItem('life-os:booted', '1');
      el.classList.add('is-done');
      resolve();
    };
    el.addEventListener('click', finish, { once: true });

    const timer = setInterval(() => {
      if (i < BOOT_LINES.length) {
        log.innerHTML += (i ? '\n' : '') + BOOT_LINES[i];
        log.scrollTop = log.scrollHeight;
        fill.style.width = `${((i + 1) / BOOT_LINES.length) * 100}%`;
        i++;
      } else {
        setTimeout(finish, 320);
        clearInterval(timer);
      }
    }, 220);
  });
}

/* ------------------------------------------------------------
   Erstkontakt: Demo oder leer
   ------------------------------------------------------------ */
async function firstRun() {
  const s = store.state;
  const isEmpty = !s.events.length && !s.todos.length && !s.transactions.length && !s.debts.length && !s.bio.length;
  if (!isEmpty || s.meta?.seedAsked) return;

  store.update((st) => { st.meta.seedAsked = true; });
  const ok = await confirmModal({
    title: 'Willkommen bei L.I.F.E. OS',
    message: h('div', {},
      h('p', { style: { marginTop: 0 } }, 'Dein Planer ist noch leer. Soll ich einen Beispieldatensatz laden, damit du alles direkt in Aktion siehst?'),
      h('p', { style: { color: 'var(--muted)', fontSize: '12.5px' } },
        'Enthält Termine, Aufgaben, 5 Monate Buchungen, 4 Schuldenposten und 60 Tage Whoop-Werte. Lässt sich in den Einstellungen jederzeit löschen.'),
    ),
    confirmLabel: 'Demo laden',
  });
  if (ok) {
    store.replace(buildSeed());
    toast('Demo-Daten geladen — viel Spaß beim Erkunden.', 'good');
  }
}

/* ------------------------------------------------------------
   Start
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   Service Worker — macht die App auf dem Handy offlinefähig
   ------------------------------------------------------------ */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url))
      .catch((err) => console.warn('[L.I.F.E. OS] Service Worker nicht registriert:', err));
  });
}

/* ------------------------------------------------------------
   Start
   ------------------------------------------------------------ */
async function start() {
  store.subscribe(() => renderView());
  mountQuickbar($('#quickbar'));
  renderView();
  document.addEventListener('keydown', onKey);
  registerSW();
  await boot();
  await firstRun();
}

start();
