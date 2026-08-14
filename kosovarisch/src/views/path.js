/* ============================================================
   path.js — der Lernpfad

   Die Startseite: Tagesziel, Serie und darunter der Weg durch
   alle Einheiten. Eine Lektion öffnet sich, sobald die davor
   geschafft ist — mit Sternen für saubere Durchgänge.
   ============================================================ */

import { el, sheet, ring } from '../ui/kit.js';
import { COURSE, ALL_LESSONS, lessonIndex } from '../data/course.js';
import { cardsForUnit } from '../data/grammar.js';
import {
  getState, lessonState, isLessonDone, currentStreak,
  xpToday, settings, rankFor,
} from '../state.js';
import { dueItems } from '../engine/srs.js';
import { entry } from '../data/lexicon.js';

/** Offen ist eine Lektion, wenn die vorherige geschafft ist. */
export function isUnlocked(id) {
  const i = lessonIndex(id);
  if (i <= 0) return true;
  return isLessonDone(ALL_LESSONS[i - 1].id);
}

/** Die erste noch nicht geschaffte Lektion. */
export function nextLesson() {
  return ALL_LESSONS.find((l) => !isLessonDone(l.id)) || null;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Natën e mirë';
  if (h < 11) return 'Mirmëngjes';
  if (h < 18) return 'Mirdita';
  return 'Mirmbrëma';
}

function unitProgress(unit) {
  const done = unit.lessonList.filter((l) => isLessonDone(l.id)).length;
  return { done, total: unit.lessonList.length, pct: done / unit.lessonList.length };
}

function stars(n) {
  return el('span.stars', {}, [1, 2, 3].map((i) => el('i', { class: i <= n ? 'is-on' : '', text: '★' })));
}

function lessonNode(lesson, onStart) {
  const st = lessonState(lesson.id);
  const open = isUnlocked(lesson.id);
  const done = st.done;
  const state = done ? 'is-done' : open ? 'is-open' : 'is-locked';

  const node = el(`button.node.${state}`, {
    type: 'button',
    'aria-label': `${lesson.title}${done ? ', geschafft' : open ? '' : ', noch gesperrt'}`,
    style: { '--node-color': lesson.color },
    on: {
      click: () => {
        if (!open) {
          sheet({
            title: 'Noch gesperrt 🔒',
            sub: 'Schließe erst die Lektion davor ab — dann geht es hier weiter.',
            actions: [{ label: 'Alles klar', kind: 'btn--primary' }],
          });
          return;
        }
        onStart(lesson);
      },
    },
  }, [
    el('span.node__badge', { text: done ? '✓' : lesson.kind === 'exam' ? '🏅' : lesson.icon }),
    done ? stars(st.stars) : null,
  ]);

  return el('div.node-wrap', {}, [node, el('span.node__title', { text: lesson.title })]);
}

function unitBlock(unit, onStart) {
  const p = unitProgress(unit);
  const cards = cardsForUnit(unit.n);

  const header = el('section.unit', { style: { '--unit-color': unit.color } }, [
    el('div.unit__top', {}, [
      el('span.unit__icon', { text: unit.icon }),
      el('div.unit__meta', {}, [
        el('span.unit__kicker', { text: `Einheit ${unit.n} · ${unit.de}` }),
        el('h2.unit__title', { text: unit.title }),
        el('p.unit__blurb', { text: unit.blurb }),
      ]),
    ]),
    el('div.unit__bar', {}, [el('span', { style: { width: `${Math.round(p.pct * 100)}%` } })]),
    el('div.unit__foot', {}, [
      el('span', { text: `${p.done}/${p.total} Lektionen` }),
      cards.length
        ? el('a.unit__link', { href: `#/grammatik/${cards[0].id}`, text: `📘 ${cards[0].title}` })
        : null,
    ]),
  ]);

  const nodes = el('div.nodes', {}, unit.lessonList.map((l, i) => {
    const wrap = lessonNode(l, onStart);
    wrap.style.setProperty('--shift', `${Math.sin(i * 1.1) * 34}px`);
    return wrap;
  }));

  return el('div.unit-block', {}, [header, nodes]);
}

export function renderPath(onStart) {
  const s = getState();
  const rank = rankFor(s.xp);
  const goal = settings().goal || 150;
  const doneToday = xpToday();
  const due = dueItems().length;
  const next = nextLesson();

  const head = el('header.hero', {}, [
    el('div.hero__row', {}, [
      el('div', {}, [
        el('p.hero__hi', { text: `${greeting()}!` }),
        el('h1.hero__title', { text: 'Fol Prizren' }),
        el('p.hero__sub', { text: `Rang: ${rank.name} · ${rank.de}` }),
      ]),
      ring(Math.min(1, doneToday / goal), {
        size: 84, width: 8, color: 'var(--accent)',
        label: `${doneToday}`, sub: `von ${goal} XP`,
      }),
    ]),
    el('div.hero__stats', {}, [
      el('div.stat', {}, [el('span.stat__num', { text: `🔥 ${currentStreak()}` }), el('span.stat__lbl', { text: 'Tage Serie' })]),
      el('div.stat', {}, [el('span.stat__num', { text: `⭐ ${s.xp}` }), el('span.stat__lbl', { text: 'XP gesamt' })]),
      el('div.stat', {}, [el('span.stat__num', { text: `🔁 ${due}` }), el('span.stat__lbl', { text: 'zu wiederholen' })]),
    ]),
  ]);

  const cta = next
    ? el('button.cta', {
      type: 'button',
      style: { '--node-color': next.color },
      on: { click: () => onStart(next) },
    }, [
      el('span.cta__icon', { text: next.icon }),
      el('span.cta__text', {}, [
        el('strong', { text: isLessonDone(next.id) ? 'Weiter üben' : 'Weiterlernen' }),
        el('small', { text: `${next.title} · Einheit ${next.unit}` }),
      ]),
      el('span.cta__go', { text: '▶' }),
    ])
    : el('div.cta.cta--done', {}, [
      el('span.cta__icon', { text: '🎉' }),
      el('span.cta__text', {}, [
        el('strong', { text: 'Alles geschafft!' }),
        el('small', { text: 'Halte den Wortschatz mit der Wiederholung frisch.' }),
      ]),
    ]);

  const dueCard = due > 0
    ? el('a.duecard', { href: '#/ueben' }, [
      el('span', { text: '🔁' }),
      el('div', {}, [
        el('strong', { text: `${due} ${due === 1 ? 'Wort' : 'Wörter'} warten` }),
        el('small', { text: 'Wiederholen hält sie im Kopf.' }),
      ]),
      el('span.duecard__go', { text: '›' }),
    ])
    : null;

  return el('div.view.view--path', {}, [
    head, cta, dueCard,
    ...COURSE.map((u) => unitBlock(u, onStart)),
    el('p.pathfoot', { text: `${ALL_LESSONS.length} Lektionen · ${wordCount()} Wörter & Wendungen` }),
  ]);
}

function wordCount() {
  return ALL_LESSONS
    .filter((l) => l.kind === 'lesson')
    .reduce((n, l) => n + l.itemIds.filter((id) => entry(id)).length, 0);
}
