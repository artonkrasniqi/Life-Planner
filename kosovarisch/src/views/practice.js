/* ============================================================
   practice.js — Üben ohne Lernpfad

   Drei Wege, den Wortschatz wachzuhalten:
     · Wiederholen — die fälligen Wörter nach Plan
     · Blitzrunde  — 60 Sekunden, so viele wie möglich
     · Paarspiel   — sechs Paare auf Zeit
   ============================================================ */

import { el, clear, confetti, toast, sheet } from '../ui/kit.js';
import { LEXICON, entry, unitEntries } from '../data/lexicon.js';
import { dueItems, learnedItems, shakyItems, stats, review } from '../engine/srs.js';
import { buildReview, blitzExercise, matchPairs } from '../engine/exercises.js';
import { getState, addXp, touchStreak, recordGame, recordAnswer } from '../state.js';
import { check as checkBadges } from '../data/badges.js';
import { sfx } from '../audio.js';
import { shuffle } from '../util.js';

/** Vorrat fürs freie Üben: gelernte Wörter, sonst der Anfang. */
function pool() {
  const learned = learnedItems().map(entry).filter(Boolean);
  if (learned.length >= 8) return learned;
  return unitEntries(1).concat(unitEntries(2));
}

export function renderPractice({ onReview, onBlitz, onMatch }) {
  const s = getState();
  const st = stats();
  const due = dueItems();
  const shaky = shakyItems(20);
  const favs = s.fav.map(entry).filter(Boolean);

  const card = (icon, title, sub, action, opts = {}) =>
    el(`button.bigcard${opts.disabled ? '.is-off' : ''}`, {
      type: 'button', disabled: !!opts.disabled,
      style: { '--node-color': opts.color || 'var(--accent)' },
      on: { click: action },
    }, [
      el('span.bigcard__icon', { text: icon }),
      el('span.bigcard__text', {}, [el('strong', { text: title }), el('small', { text: sub })]),
      el('span.bigcard__go', { text: '▶' }),
    ]);

  return el('div.view', {}, [
    el('h1.view__title', { text: 'Üben' }),
    el('p.view__sub', { text: 'Kurze Runden, jederzeit — ganz ohne Lernpfad.' }),

    el('div.tiles3', {}, [
      el('div.tile3', {}, [el('strong', { text: st.seen }), el('small', { text: 'Wörter gesehen' })]),
      el('div.tile3', {}, [el('strong', { text: st.strong }), el('small', { text: 'sitzen fest' })]),
      el('div.tile3', {}, [el('strong', { text: st.due }), el('small', { text: 'heute fällig' })]),
    ]),

    card('🔁', 'Wiederholen',
      due.length ? `${due.length} ${due.length === 1 ? 'Wort ist' : 'Wörter sind'} dran` : 'Heute ist nichts fällig — gut gemacht!',
      () => onReview(due.length ? due : learnedItems()),
      { disabled: !due.length && learnedItems().length === 0, color: '#2fa84f' }),

    card('⚡', 'Blitzrunde', '60 Sekunden, so viele richtige wie möglich',
      onBlitz, { color: '#f0851b' }),

    card('🃏', 'Paarspiel', 'Sechs Paare finden — gegen die Uhr',
      onMatch, { color: '#3d8bfd' }),

    card('🩹', 'Wackelkandidaten',
      shaky.length ? `${shaky.length} Wörter, die dir noch schwerfallen` : 'Noch keine Problemwörter — stark!',
      () => onReview(shaky), { disabled: !shaky.length, color: '#dc2626' }),

    card('★', 'Gemerkte Wörter',
      favs.length ? `${favs.length} markiert` : 'Markiere Wörter im Wörterbuch mit ★',
      () => onReview(favs.map((e) => e.id)), { disabled: !favs.length, color: '#c9a227' }),
  ]);
}

/* ============================================================
   Blitzrunde
   ============================================================ */

export function startBlitz({ onExit }) {
  const items = pool();
  const DURATION = 60;
  let left = DURATION;
  let score = 0;
  let combo = 0;
  let best = 0;
  let locked = false;

  const root = el('div.lesson.lesson--game');
  const timeBar = el('span.bar__fill.bar__fill--time');
  const scoreOut = el('div.gamescore', { text: '0' });
  const stage = el('div.lesson__stage');

  root.append(
    el('header.lesson__head', {}, [
      el('button.iconbtn', { type: 'button', text: '✕', 'aria-label': 'Beenden', on: { click: stop } }),
      el('div.bar', {}, [timeBar]),
      scoreOut,
    ]),
    stage,
  );

  const timer = setInterval(() => {
    left -= 1;
    timeBar.style.width = `${(left / DURATION) * 100}%`;
    if (left <= 5 && left > 0) sfx.tick();
    if (left <= 0) finish();
  }, 1000);

  function nextQuestion() {
    locked = false;
    const ex = blitzExercise(items);
    clear(stage);
    stage.append(
      el('p.q', { text: ex.question }),
      el('div.prompt', {}, [el('div.prompt__word', { text: ex.prompt })]),
      el('div.options', {}, ex.options.map((opt) => el('button.option', {
        type: 'button', text: opt.text,
        on: {
          click: (e) => {
            if (locked) return;
            locked = true;
            const btn = e.currentTarget;
            if (opt.correct) {
              score += 1;
              combo += 1;
              best = Math.max(best, combo);
              btn.classList.add('is-right');
              scoreOut.textContent = String(score);
              sfx.correct();
              if (ex.itemId && entry(ex.itemId)) review(ex.itemId, true);
            } else {
              combo = 0;
              btn.classList.add('is-wrong');
              stage.querySelectorAll('.option').forEach((n) => {
                if (n.textContent === ex.answer) n.classList.add('is-right');
              });
              sfx.wrong();
              if (ex.itemId && entry(ex.itemId)) review(ex.itemId, false);
            }
            recordAnswer(opt.correct, best);
            setTimeout(() => { if (left > 0) nextQuestion(); }, opt.correct ? 220 : 750);
          },
        },
      }))),
    );
  }

  function stop() {
    clearInterval(timer);
    onExit?.();
  }

  function finish() {
    clearInterval(timer);
    const xp = score * 5;   // eine Blitzrunde soll sich neben einer Lektion lohnen
    addXp(xp);
    touchStreak();
    const isBest = recordGame('blitz', score);
    const badges = checkBadges({ combo: best });
    sfx.complete();
    if (score >= 20) confetti(60);

    clear(root);
    root.append(el('div.summary', {}, [
      el('div.summary__hero', {}, [
        el('span.summary__emoji', { text: '⚡' }),
        el('h2', { text: 'Zeit um!' }),
        isBest ? el('p.summary__best', { text: 'Neuer Bestwert!' }) : null,
      ]),
      el('div.summary__grid', {}, [
        el('div.summary__cell', {}, [el('strong', { text: score }), el('small', { text: 'richtig' })]),
        el('div.summary__cell', {}, [el('strong', { text: `+${xp}` }), el('small', { text: 'XP' })]),
        el('div.summary__cell', {}, [el('strong', { text: best }), el('small', { text: 'in Folge' })]),
      ]),
      ...badges.map((b) => el('div.summary__badge', {}, [
        el('span.summary__badgeicon', { text: b.icon }),
        el('div', {}, [el('strong', { text: `Abzeichen: ${b.title}` }), el('small', { text: b.de })]),
      ])),
      el('button.btn.btn--primary.btn--big', { type: 'button', text: 'Fertig', on: { click: () => onExit?.() } }),
    ]));
  }

  nextQuestion();
  return root;
}

/* ============================================================
   Paarspiel
   ============================================================ */

export function startMatch({ onExit }) {
  const { items, tiles } = matchPairs(pool(), 6);
  let solved = 0;
  let misses = 0;
  let picked = null;
  let seconds = 0;

  const clock = el('div.gamescore', { text: '0s' });
  const grid = el('div.pairs.pairs--game');
  const root = el('div.lesson.lesson--game');

  const timer = setInterval(() => {
    seconds += 1;
    clock.textContent = `${seconds}s`;
  }, 1000);

  root.append(
    el('header.lesson__head', {}, [
      el('button.iconbtn', { type: 'button', text: '✕', 'aria-label': 'Beenden', on: { click: () => { clearInterval(timer); onExit?.(); } } }),
      el('div.gametitle', { text: 'Finde die Paare' }),
      clock,
    ]),
    el('div.lesson__stage', {}, [grid]),
  );

  shuffle(tiles).forEach((tile) => {
    const btn = el('button.pair', {
      type: 'button', text: tile.text, data: { side: tile.side },
      on: {
        click: () => {
          if (btn.classList.contains('is-solved') || btn === picked?.node) return;
          sfx.tap();
          if (!picked) {
            picked = { ...tile, node: btn };
            btn.classList.add('is-picked');
            return;
          }
          const a = picked; const b = { ...tile, node: btn };
          picked = null;
          if (a.id === b.id && a.side !== b.side) {
            [a, b].forEach((t) => {
              t.node.classList.remove('is-picked');
              t.node.classList.add('is-solved');
            });
            sfx.correct();
            review(a.id, true);
            solved += 1;
            if (solved === items.length) finish();
          } else {
            misses += 1;
            sfx.wrong();
            b.node.classList.add('is-miss');
            a.node.classList.add('is-miss');
            setTimeout(() => {
              [a, b].forEach((t) => t.node.classList.remove('is-miss', 'is-picked'));
            }, 420);
          }
        },
      },
    });
    grid.append(btn);
  });

  function finish() {
    clearInterval(timer);
    const xp = Math.max(25, 90 - misses * 6);
    addXp(xp);
    touchStreak();
    const isBest = recordGame('match', seconds);
    const badges = checkBadges({});
    sfx.complete();
    confetti(50);

    clear(root);
    root.append(el('div.summary', {}, [
      el('div.summary__hero', {}, [
        el('span.summary__emoji', { text: '🃏' }),
        el('h2', { text: 'Alle Paare gefunden!' }),
        isBest ? el('p.summary__best', { text: 'Neue Bestzeit!' }) : null,
      ]),
      el('div.summary__grid', {}, [
        el('div.summary__cell', {}, [el('strong', { text: `${seconds}s` }), el('small', { text: 'Zeit' })]),
        el('div.summary__cell', {}, [el('strong', { text: misses }), el('small', { text: 'Fehlgriffe' })]),
        el('div.summary__cell', {}, [el('strong', { text: `+${xp}` }), el('small', { text: 'XP' })]),
      ]),
      ...badges.map((b) => el('div.summary__badge', {}, [
        el('span.summary__badgeicon', { text: b.icon }),
        el('div', {}, [el('strong', { text: `Abzeichen: ${b.title}` }), el('small', { text: b.de })]),
      ])),
      el('button.btn.btn--primary.btn--big', { type: 'button', text: 'Fertig', on: { click: () => onExit?.() } }),
    ]));
  }

  return root;
}

/* Startet eine Wiederholungsrunde und liefert die Aufgaben. */
export function reviewExercises(ids) {
  const list = (ids && ids.length ? ids : LEXICON.slice(0, 20).map((e) => e.id));
  return buildReview(list, 16);
}

/* Hinweis, wenn gar nichts zu wiederholen ist. */
export function nothingToReview() {
  sheet({
    title: 'Noch nichts zu wiederholen',
    sub: 'Lerne zuerst ein paar Lektionen im Lernpfad — danach taucht der Wortschatz hier automatisch auf.',
    actions: [{ label: 'Zum Lernpfad', kind: 'btn--primary', onClick: () => { location.hash = '#/'; } }],
  });
  toast('Erst lernen, dann wiederholen 🙂', { icon: '💡' });
}
