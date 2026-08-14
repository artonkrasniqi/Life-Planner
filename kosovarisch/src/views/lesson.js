/* ============================================================
   lesson.js — der Übungslauf

   Eine Lektion ist eine Warteschlange aus Aufgaben. Wer richtig
   antwortet, kommt weiter; wer falsch liegt, verliert ein Herz
   und bekommt dieselbe Vokabel später noch einmal.
   ============================================================ */

import { el, clear, confetti, floatText, sheet, toast } from '../ui/kit.js';
import { entry } from '../data/lexicon.js';
import { cardById } from '../data/grammar.js';
import { normalize, shuffle } from '../util.js';
import { sfx } from '../audio.js';
import { speak, hasVoice } from '../speech.js';
import { review } from '../engine/srs.js';
import {
  hearts, loseHeart, addXp, recordAnswer, completeLesson,
  touchStreak, settings, setSetting, isFav, toggleFav, HEARTS_MAX,
} from '../state.js';
import { check as checkBadges } from '../data/badges.js';

const XP_PER_ITEM = 10;

export function startLesson({ lesson, exercises, mode = 'lesson', onExit }) {
  const root = el('div.lesson');
  let queue = exercises.slice();
  const total = queue.length;
  let done = 0;
  let mistakes = 0;
  let answers = 0;
  let combo = 0;
  let bestCombo = 0;
  let xp = 0;
  let heartsOff = mode !== 'lesson' || !settings().hearts;
  let current = null;
  let answered = false;
  let selection = null;         // aktueller Antwortstand der Aufgabe

  /* ---------- Kopfzeile ---------- */

  const bar = el('span.bar__fill');
  const heartBox = el('div.hearts');

  const header = el('header.lesson__head', {}, [
    el('button.iconbtn', {
      type: 'button', 'aria-label': 'Lektion verlassen', text: '✕',
      on: { click: askExit },
    }),
    el('div.bar', {}, [bar]),
    heartBox,
  ]);

  const stage = el('div.lesson__stage');
  const footer = el('footer.lesson__foot');
  root.append(header, stage, footer);

  function drawHearts() {
    clear(heartBox);
    if (heartsOff) {
      heartBox.append(el('span.hearts__free', { text: '∞' }));
      return;
    }
    const n = hearts();
    for (let i = 0; i < HEARTS_MAX; i++) {
      heartBox.append(el('span.heart', { class: i < n ? 'is-on' : 'is-off', text: '❤' }));
    }
  }

  function drawProgress() {
    bar.style.width = `${Math.round((done / total) * 100)}%`;
  }

  /* ---------- Aufgaben zeichnen ---------- */

  function speakerButton(text) {
    if (!hasVoice()) return null;
    return el('button.speaker', {
      type: 'button', 'aria-label': 'Vorlesen', text: '🔊',
      on: { click: () => speak(text) },
    });
  }

  function optionList(ex) {
    const list = el('div.options', { class: ex.options.some((o) => o.text.length > 22) ? 'options--tall' : '' });
    ex.options.forEach((opt) => {
      const btn = el('button.option', {
        type: 'button', text: opt.text,
        on: {
          click: () => {
            if (answered) return;
            sfx.tap();
            list.querySelectorAll('.option').forEach((n) => n.classList.remove('is-picked'));
            btn.classList.add('is-picked');
            selection = opt;
            setPrimary(true);
          },
        },
      });
      list.append(btn);
    });
    return list;
  }

  function renderExercise(ex) {
    answered = false;
    selection = null;
    clear(stage);
    clear(footer);

    const head = el('p.q', { text: ex.question });
    stage.append(head);

    if (ex.type === 'pick-de' || ex.type === 'sound') {
      stage.append(el('div.prompt', {}, [
        el('div.prompt__word', {}, [
          el('span', { text: ex.prompt }),
          ex.type === 'pick-de' ? speakerButton(ex.prompt) : null,
        ]),
        ex.type === 'pick-de' && ex.sub ? el('span.prompt__ph', { text: `[${ex.sub}]` }) : null,
        ex.type === 'sound' ? el('span.prompt__hint', { text: 'So klingt es in deutscher Lautschrift' }) : null,
      ]));
      stage.append(optionList(ex));
      setPrimary(false);
    }

    if (ex.type === 'pick-al' || ex.type === 'grammar') {
      stage.append(el('div.prompt', {}, [
        el('div.prompt__word.prompt__word--de', { text: ex.prompt }),
      ]));
      stage.append(optionList(ex));
      setPrimary(false);
    }

    if (ex.type === 'type') {
      const input = el('input.input', {
        type: 'text', autocomplete: 'off', autocapitalize: 'none',
        autocorrect: 'off', spellcheck: false, placeholder: 'auf Kosovarisch tippen …',
        enterkeyhint: 'go',
        on: {
          input: () => { selection = { text: input.value }; setPrimary(input.value.trim().length > 0); },
          keydown: (e) => { if (e.key === 'Enter') primary.click(); },
        },
      });
      stage.append(
        el('div.prompt', {}, [el('div.prompt__word.prompt__word--de', { text: ex.prompt })]),
        input,
        el('button.linkbtn', {
          type: 'button', text: '💡 Tipp: Aussprache zeigen',
          on: { click: () => toast(`[${ex.sub}]`, { icon: '🗣️', ms: 3000 }) },
        }),
      );
      setPrimary(false);
      setTimeout(() => input.focus(), 60);
    }

    if (ex.type === 'build') {
      const answerRow = el('div.build__answer');
      const pool = el('div.build__pool');
      const placed = [];

      const sync = () => {
        clear(answerRow); clear(pool);
        placed.forEach((tile) => {
          answerRow.append(el('button.tile.is-placed', {
            type: 'button', text: tile.text,
            on: {
              click: () => {
                if (answered) return;
                sfx.tap();
                placed.splice(placed.indexOf(tile), 1);
                sync();
              },
            },
          }));
        });
        ex.tiles.filter((t) => !placed.includes(t)).forEach((tile) => {
          pool.append(el('button.tile', {
            type: 'button', text: tile.text,
            on: {
              click: () => {
                if (answered) return;
                sfx.tap();
                placed.push(tile);
                sync();
              },
            },
          }));
        });
        selection = { text: placed.map((t) => t.text).join(' ') };
        setPrimary(placed.length > 0);
      };

      stage.append(
        el('div.prompt', {}, [el('div.prompt__word.prompt__word--de', { text: ex.prompt })]),
        answerRow, el('div.build__line'), pool,
      );
      sync();
    }

    if (ex.type === 'pair') {
      const items = ex.itemIds.map(entry).filter(Boolean);
      const state = { left: null, right: null, solved: 0, missed: false };
      const grid = el('div.pairs');

      const tiles = shuffle([
        ...items.map((e) => ({ id: e.id, text: e.al, side: 'al' })),
        ...items.map((e) => ({ id: e.id, text: e.de, side: 'de' })),
      ]);

      tiles.forEach((tile) => {
        const btn = el('button.pair', {
          type: 'button', text: tile.text, data: { side: tile.side },
          on: {
            click: () => {
              if (answered || btn.classList.contains('is-solved')) return;
              sfx.tap();
              const key = tile.side === 'al' ? 'left' : 'right';
              const otherKey = key === 'left' ? 'right' : 'left';
              if (state[key]) state[key].node.classList.remove('is-picked');
              state[key] = { ...tile, node: btn };
              btn.classList.add('is-picked');

              if (state[otherKey]) {
                const a = state[key]; const b = state[otherKey];
                if (a.id === b.id) {
                  [a, b].forEach((t) => {
                    t.node.classList.remove('is-picked');
                    t.node.classList.add('is-solved');
                  });
                  sfx.correct();
                  state.solved += 1;
                  if (state.solved === items.length) {
                    selection = { correct: !state.missed };
                    finish(!state.missed);
                  }
                } else {
                  sfx.wrong();
                  state.missed = true;
                  [a, b].forEach((t) => {
                    t.node.classList.add('is-miss');
                    setTimeout(() => t.node.classList.remove('is-miss', 'is-picked'), 420);
                  });
                }
                state.left = null; state.right = null;
              }
            },
          },
        });
        grid.append(btn);
      });

      stage.append(el('p.prompt__hint', { text: 'Tippe ein kosovarisches Wort und dann seine Bedeutung.' }), grid);
      // Kein Prüfen-Knopf: Das Paarspiel wertet sich selbst aus.
      footer.append(el('p.hintline', { text: 'Alle Paare finden, dann geht es weiter.' }));
      return;
    }

    if (ex.type === 'grammar') {
      const card = cardById(ex.cardId);
      if (card) head.textContent = `Regelfrage · ${card.title}`;
    }
  }

  /* ---------- Prüfen ---------- */

  const primary = el('button.btn.btn--primary.btn--big', {
    type: 'button', text: 'Prüfen', disabled: true,
    on: { click: () => (answered ? next() : evaluate()) },
  });

  function setPrimary(enabled, label = 'Prüfen') {
    primary.disabled = !enabled;
    primary.textContent = label;
    if (!footer.contains(primary)) {
      clear(footer);
      footer.append(primary);
    }
  }

  function isCorrect(ex) {
    if (!selection) return false;
    if (ex.type === 'pick-de' || ex.type === 'pick-al' || ex.type === 'sound' || ex.type === 'grammar') {
      return !!selection.correct;
    }
    if (ex.type === 'type') {
      return ex.accept.some((a) => normalize(a) === normalize(selection.text));
    }
    if (ex.type === 'build') {
      return normalize(selection.text) === normalize(ex.answer);
    }
    if (ex.type === 'pair') return !!selection.correct;
    return false;
  }

  function evaluate() {
    finish(isCorrect(current));
  }

  function finish(correct) {
    if (answered) return;
    answered = true;
    answers += 1;

    const item = entry(current.itemId);
    if (item) review(current.itemId, correct);
    if (current.type === 'pair' && current.itemIds) {
      current.itemIds.forEach((id) => id !== current.itemId && review(id, correct));
    }

    if (correct) {
      combo += 1;
      bestCombo = Math.max(bestCombo, combo);
      const bonus = Math.min(10, Math.floor(combo / 2) * 2);
      const gain = XP_PER_ITEM + bonus;
      xp += gain;
      done += 1;
      sfx.correct();
      if (combo >= 3) sfx.combo(combo);
      floatText(`+${gain} XP`, primary);
    } else {
      combo = 0;
      mistakes += 1;
      if (!heartsOff) {
        loseHeart();
        drawHearts();
      }
      // Dieselbe Aufgabe kommt später noch einmal.
      queue.splice(Math.min(queue.length, 2), 0, current);
      sfx.wrong();
    }

    recordAnswer(correct, bestCombo);
    drawProgress();
    showFeedback(correct);

    if (!correct && !heartsOff && hearts() <= 0) setTimeout(outOfHearts, 500);
  }

  function showFeedback(correct) {
    // Beim Paarspiel gibt es keine einzelne Lösung zu zeigen.
    const item = current.type === 'pair' ? null : entry(current.itemId);
    const solution = current.type === 'pair' ? '' : (current.answer || item?.al || '');

    stage.querySelectorAll('.option').forEach((btn) => {
      if (btn.textContent === solution) btn.classList.add('is-right');
      else if (btn.classList.contains('is-picked')) btn.classList.add('is-wrong');
      btn.disabled = true;
    });
    stage.querySelectorAll('.tile, .input').forEach((n) => { n.disabled = true; });

    const banner = el(`div.feedback.${correct ? 'is-good' : 'is-bad'}`, {}, [
      el('div.feedback__row', {}, [
        el('span.feedback__icon', { text: correct ? '✓' : '✕' }),
        el('div', {}, [
          el('strong', { text: correct ? pickPraise() : 'Fast!' }),
          solution ? el('p.feedback__sol', { text: solution }) : null,
          item?.ph ? el('p.feedback__ph', { text: `[${item.ph}]` }) : null,
          item?.std && settings().showStd ? el('p.feedback__std', { text: `Standard: ${item.std}` }) : null,
          item?.note ? el('p.feedback__note', { text: item.note }) : null,
        ]),
      ]),
      item ? el('button.feedback__fav', {
        type: 'button', text: isFav(item.id) ? '★ gemerkt' : '☆ merken',
        on: {
          click: (e) => {
            const on = toggleFav(item.id);
            e.currentTarget.textContent = on ? '★ gemerkt' : '☆ merken';
          },
        },
      }) : null,
    ]);

    clear(footer);
    footer.append(banner, el('button.btn.btn--big', {
      type: 'button',
      class: correct ? 'btn--primary' : 'btn--danger',
      text: 'Weiter',
      on: { click: next },
    }));
  }

  const PRAISE = ['Saktë!', 'Shumë mirë!', 'Të lumtë!', 'Bravo!', 'Perfekt!', 'Mashallah!'];
  function pickPraise() {
    return PRAISE[Math.floor(Math.random() * PRAISE.length)];
  }

  /* ---------- Ablauf ---------- */

  function next() {
    if (!queue.length) return complete();
    current = queue.shift();
    renderExercise(current);
    drawProgress();
  }

  function outOfHearts() {
    sheet({
      title: 'Herzen leer 💔',
      sub: 'Du kannst warten, bis sie sich auffüllen — oder ohne Herzen weiterüben.',
      actions: [
        {
          label: 'Ohne Herzen weiter', kind: 'btn--primary',
          onClick: () => { heartsOff = true; drawHearts(); toast('Weiter geht\'s — ohne Herzen.', { icon: '∞' }); },
        },
        { label: 'Später weitermachen', onClick: () => onExit?.() },
      ],
    });
  }

  function askExit() {
    if (done === 0) return onExit?.();
    sheet({
      title: 'Wirklich aufhören?',
      sub: 'Der Fortschritt dieser Lektion geht verloren.',
      actions: [
        { label: 'Weitermachen', kind: 'btn--primary' },
        { label: 'Beenden', kind: 'btn--danger', onClick: () => onExit?.() },
      ],
    });
  }

  function complete() {
    const accuracy = answers ? (answers - mistakes) / answers : 1;
    const bonus = (lesson?.kind === 'exam' ? 40 : 20) + (mistakes === 0 ? 15 : 0);
    xp += bonus;

    const levelUp = addXp(xp);
    touchStreak();
    let result = null;
    if (mode === 'lesson' && lesson) result = completeLesson(lesson.id, { accuracy, mistakes });

    const fresh = checkBadges({ mistakes, combo: bestCombo });

    sfx.complete();
    confetti(mistakes === 0 ? 90 : 55);
    if (levelUp) setTimeout(() => sfx.levelUp(), 500);

    clear(root);
    root.append(summary({
      title: mistakes === 0 ? 'Fehlerfrei! 🏆' : 'Geschafft! 🎉',
      xp, accuracy, mistakes, bestCombo,
      stars: result?.stars || 0,
      levelUp, badges: fresh,
      onExit,
    }));
  }

  /* ---------- Start ---------- */

  drawHearts();
  if (!heartsOff && hearts() <= 0) {
    heartsOff = true;
    drawHearts();
  }
  next();
  return root;
}

/* ---------- Abschlussbild ---------- */

function summary({ title, xp, accuracy, mistakes, bestCombo, stars, levelUp, badges, onExit }) {
  const pct = Math.round(accuracy * 100);

  const wrap = el('div.summary', {}, [
    el('div.summary__hero', {}, [
      el('span.summary__emoji', { text: mistakes === 0 ? '🏆' : '🎉' }),
      el('h2', { text: title }),
      stars ? el('div.stars.stars--big', {}, [1, 2, 3].map((i) => el('i', { class: i <= stars ? 'is-on' : '', text: '★' }))) : null,
    ]),
    el('div.summary__grid', {}, [
      el('div.summary__cell', {}, [el('strong', { text: `+${xp}` }), el('small', { text: 'XP' })]),
      el('div.summary__cell', {}, [el('strong', { text: `${pct}%` }), el('small', { text: 'richtig' })]),
      el('div.summary__cell', {}, [el('strong', { text: `${bestCombo}` }), el('small', { text: 'in Folge' })]),
    ]),
    levelUp
      ? el('div.summary__level', {}, [
        el('span', { text: '⬆️' }),
        el('div', {}, [
          el('strong', { text: `Neuer Rang: ${levelUp.name}` }),
          el('small', { text: levelUp.de }),
        ]),
      ])
      : null,
    ...(badges || []).map((b) => el('div.summary__badge', {}, [
      el('span.summary__badgeicon', { text: b.icon }),
      el('div', {}, [
        el('strong', { text: `Abzeichen: ${b.title}` }),
        el('small', { text: b.de }),
      ]),
    ])),
    el('button.btn.btn--primary.btn--big', {
      type: 'button', text: 'Weiter', on: { click: () => onExit?.() },
    }),
  ]);

  if (badges?.length) setTimeout(() => sfx.badge(), 900);
  return wrap;
}
