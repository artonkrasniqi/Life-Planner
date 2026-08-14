/* ============================================================
   main.js — App-Schale, Router, Navigation

   Kein Framework, kein Build: die Ansichten liefern DOM-Knoten,
   der Router hängt sie ein. Läuft direkt aus Safari heraus und
   als installierte App vom Home-Bildschirm.
   ============================================================ */

import { el, clear } from './ui/kit.js';
import { renderPath, isUnlocked } from './views/path.js';
import { startLesson } from './views/lesson.js';
import { renderPractice, startBlitz, startMatch, reviewExercises, nothingToReview } from './views/practice.js';
import { renderDict } from './views/dict.js';
import { renderNotes, renderNote } from './views/notes.js';
import { renderProfile } from './views/profile.js';
import { lessonById } from './data/course.js';
import { buildLesson } from './engine/exercises.js';
import { dueItems, learnedItems } from './engine/srs.js';
import { currentStreak, hearts, getState, settings, subscribe } from './state.js';
import { unlock } from './audio.js';

const view = document.getElementById('view');
const topbar = document.getElementById('topbar');
const tabbar = document.getElementById('tabbar');
const app = document.getElementById('app');

/* Wörter, die eine Wiederholungsrunde füllen sollen (aus dem Übungsbereich). */
let pendingReview = null;

/* ---------- Kopf- und Fußleiste ---------- */

const TABS = [
  { hash: '#/', icon: '🏔️', label: 'Lernen' },
  { hash: '#/ueben', icon: '🎯', label: 'Üben' },
  { hash: '#/woerter', icon: '📖', label: 'Wörter' },
  { hash: '#/grammatik', icon: '📘', label: 'Regeln' },
  { hash: '#/profil', icon: '👤', label: 'Profil' },
];

function drawTopbar() {
  clear(topbar);
  const n = hearts();
  topbar.append(
    el('a.brand', { href: '#/' }, [
      el('span.brand__mark', { text: 'F' }),
      el('span.brand__name', { text: 'Fol Prizren' }),
    ]),
    el('div.topstats', {}, [
      el('span.pill', { title: 'Tagesserie' }, [el('span', { text: '🔥' }), el('strong', { text: currentStreak() })]),
      el('span.pill', { title: 'XP' }, [el('span', { text: '⭐' }), el('strong', { text: getState().xp })]),
      settings().hearts
        ? el('span.pill', { title: 'Herzen' }, [el('span', { text: '❤️' }), el('strong', { text: n })])
        : el('span.pill', { title: 'Ohne Herzen' }, [el('span', { text: '❤️' }), el('strong', { text: '∞' })]),
    ]),
  );
}

function drawTabbar(activeHash) {
  clear(tabbar);
  for (const tab of TABS) {
    const active = activeHash === tab.hash || (tab.hash === '#/grammatik' && activeHash.startsWith('#/grammatik'));
    tabbar.append(el('a.tab', {
      href: tab.hash, class: active ? 'is-on' : '',
      'aria-current': active ? 'page' : null,
    }, [
      el('span.tab__icon', { text: tab.icon }),
      el('span.tab__label', { text: tab.label }),
    ]));
  }
}

/* ---------- Sitzungen (Vollbild) ---------- */

function focusMode(on) {
  app.classList.toggle('is-focus', on);
}

function leaveSession() {
  const target = sessionReturn || '#/';
  if (location.hash === target) render();   // gleicher Hash: von Hand neu zeichnen
  else location.hash = target;              // sonst übernimmt der hashchange
}

let sessionReturn = '#/';

function openLesson(lesson) {
  if (!isUnlocked(lesson.id)) return;
  sessionReturn = '#/';
  location.hash = `#/lektion/${lesson.id}`;
}

/* ---------- Router ---------- */

function render() {
  const hash = location.hash || '#/';
  const [, route, param] = hash.split('/');
  clear(view);
  window.scrollTo(0, 0);

  if (route === 'lektion' && param) {
    const lesson = lessonById(param);
    if (!lesson) return go('#/');
    focusMode(true);
    view.append(startLesson({
      lesson,
      exercises: buildLesson(lesson),
      mode: 'lesson',
      onExit: leaveSession,
    }));
    return;
  }

  if (route === 'wiederholen') {
    const ids = pendingReview?.length ? pendingReview : (dueItems().length ? dueItems() : learnedItems());
    pendingReview = null;
    if (!ids.length) {
      focusMode(false);
      drawShell('ueben');
      view.append(renderPractice(practiceHandlers()));
      nothingToReview();
      return;
    }
    focusMode(true);
    view.append(startLesson({
      lesson: null,
      exercises: reviewExercises(ids),
      mode: 'review',
      onExit: leaveSession,
    }));
    return;
  }

  if (route === 'blitz') {
    focusMode(true);
    view.append(startBlitz({ onExit: leaveSession }));
    return;
  }

  if (route === 'paare') {
    focusMode(true);
    view.append(startMatch({ onExit: leaveSession }));
    return;
  }

  focusMode(false);
  drawShell(route);

  if (route === 'ueben') view.append(renderPractice(practiceHandlers()));
  else if (route === 'woerter') view.append(renderDict());
  else if (route === 'grammatik') view.append(param ? renderNote(param) : renderNotes());
  else if (route === 'profil') view.append(renderProfile(render));
  else view.append(renderPath(openLesson));
}

function practiceHandlers() {
  return {
    onReview: (ids) => {
      sessionReturn = '#/ueben';
      pendingReview = ids;
      location.hash = '#/wiederholen';
    },
    onBlitz: () => { sessionReturn = '#/ueben'; location.hash = '#/blitz'; },
    onMatch: () => { sessionReturn = '#/ueben'; location.hash = '#/paare'; },
  };
}

/** Kopf- und Fußleiste zeichnen; der Reiter richtet sich nach der Route. */
function drawShell(route) {
  drawTopbar();
  drawTabbar(`#/${route || ''}`);
}

function go(hash) {
  location.hash = hash;
}

/* ---------- Installationshinweis (iOS) ---------- */

const HINT_KEY = 'fol-prizren-install-hint';

function maybeInstallHint() {
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (standalone || localStorage.getItem(HINT_KEY)) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const banner = el('div.install', {}, [
    el('span.install__icon', { text: '📲' }),
    el('div.install__text', {}, [
      el('strong', { text: 'Als App aufs Handy' }),
      el('small', {
        text: isIOS
          ? 'Safari: unten auf „Teilen" tippen, dann „Zum Home-Bildschirm".'
          : 'Über das Browsermenü „Zum Startbildschirm hinzufügen" wählen.',
      }),
    ]),
    el('button.install__close', {
      type: 'button', text: '✕', 'aria-label': 'Hinweis schließen',
      on: {
        click: (e) => {
          localStorage.setItem(HINT_KEY, '1');
          e.currentTarget.closest('.install').remove();
        },
      },
    }),
  ]);
  document.getElementById('app').append(banner);
}

/* ---------- Start ---------- */

function boot() {
  // Töne brauchen auf iOS eine echte Berührung.
  const once = () => { unlock(); document.removeEventListener('pointerdown', once); };
  document.addEventListener('pointerdown', once);

  window.addEventListener('hashchange', render);
  subscribe(() => {
    if (!app.classList.contains('is-focus')) drawTopbar();
  });

  render();
  setTimeout(maybeInstallHint, 2500);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((err) => {
        console.warn('Service Worker nicht registriert:', err);
      });
    });
  }

  // Herzen füllen sich mit der Zeit — Anzeige einmal pro Minute auffrischen.
  setInterval(() => {
    if (!app.classList.contains('is-focus')) drawTopbar();
  }, 60000);
}

boot();
