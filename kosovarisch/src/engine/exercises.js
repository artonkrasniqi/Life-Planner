/* ============================================================
   exercises.js — aus Wörtern werden Aufgaben

   Die Lektionen enthalten nur Wortlisten. Welche Übungen daraus
   entstehen, entscheidet sich hier — jedes Mal neu gemischt,
   damit dieselbe Lektion beim zweiten Durchgang anders läuft.

   Aufgabentypen:
     pick-de   Wort auf Kosovarisch → deutsche Bedeutung wählen
     pick-al   Deutsch → kosovarisches Wort wählen
     sound     Lautschrift hören/lesen → Wort erkennen
     build     Satz aus Wortkacheln zusammensetzen
     type      Übersetzung eintippen
     pair      vier Paare verbinden
     grammar   Regelfrage aus den Grammatikkarten
   ============================================================ */

import { LEXICON, entry, unitEntries } from '../data/lexicon.js';
import { cardsForUnit } from '../data/grammar.js';
import { shuffle, sample, pick, randInt } from '../util.js';
import { cardOf } from './srs.js';
import { canSpeak } from '../speech.js';

/* Ablenker: bevorzugt aus derselben Einheit, sonst aus dem ganzen Lexikon. */
function distractors(item, field, count) {
  const sameUnit = unitEntries(item.u).filter(
    (e) => e.id !== item.id && e.kind === item.kind && e[field] && e[field] !== item[field]
  );
  const pool = sameUnit.length >= count
    ? sameUnit
    : LEXICON.filter((e) => e.id !== item.id && e.kind === item.kind && e[field]);
  const chosen = [];
  const used = new Set([item[field]]);
  for (const e of shuffle(pool)) {
    if (used.has(e[field])) continue;
    used.add(e[field]);
    chosen.push(e);
    if (chosen.length === count) break;
  }
  return chosen;
}

function options(correctText, others, field) {
  const list = [
    { text: correctText, correct: true },
    ...others.map((e) => ({ text: e[field], correct: false })),
  ];
  return shuffle(list);
}

/* ---------- einzelne Aufgaben ---------- */

function exPickDe(item) {
  return {
    type: 'pick-de',
    itemId: item.id,
    question: 'Was bedeutet das?',
    prompt: item.al,
    sub: item.ph,
    options: options(item.de, distractors(item, 'de', 3), 'de'),
    answer: item.de,
  };
}

function exPickAl(item) {
  return {
    type: 'pick-al',
    itemId: item.id,
    question: item.kind === 's' ? 'Wie sagt man das in Prizren?' : 'Wie heißt das auf Kosovarisch?',
    prompt: item.de,
    options: options(item.al, distractors(item, 'al', 3), 'al'),
    answer: item.al,
  };
}

function exSound(item) {
  return {
    type: 'sound',
    itemId: item.id,
    question: 'Welches Wort klingt so?',
    prompt: item.ph,
    sub: item.de,
    options: options(item.al, distractors(item, 'al', 3), 'al'),
    answer: item.al,
  };
}

/* Reines Hören: das Wort wird nur vorgelesen, nicht gezeigt. */
function exListen(item) {
  return {
    type: 'listen',
    itemId: item.id,
    question: 'Was hörst du?',
    speak: item.al,
    options: options(item.al, distractors(item, 'al', 3), 'al'),
    answer: item.al,
  };
}

function exType(item) {
  return {
    type: 'type',
    itemId: item.id,
    question: 'Schreib es auf Kosovarisch',
    prompt: item.de,
    sub: item.ph,
    answer: item.al,
    accept: [item.al, item.std].filter(Boolean),
  };
}

function exBuild(item, hard) {
  const words = item.al.split(/\s+/);
  let tiles = words.slice();
  if (hard && words.length < 7) {
    // Ein bis zwei fremde Kacheln machen es anspruchsvoller.
    const pool = LEXICON.filter((e) => e.kind === 's' && e.id !== item.id)
      .flatMap((e) => e.al.split(/\s+/))
      .filter((wrd) => !words.includes(wrd) && wrd.length > 1);
    tiles = tiles.concat(sample(pool, 1 + randInt(2)));
  }
  return {
    type: 'build',
    itemId: item.id,
    question: 'Setz den Satz zusammen',
    prompt: item.de,
    sub: item.ph,
    tiles: shuffle(tiles).map((text, i) => ({ id: `${i}-${text}`, text })),
    answer: item.al,
    words,
  };
}

function exPair(items) {
  const four = items.slice(0, 4);
  return {
    type: 'pair',
    itemId: four[0].id,
    itemIds: four.map((e) => e.id),
    question: 'Finde die Paare',
    left: shuffle(four.map((e) => ({ id: e.id, text: e.al, side: 'al' }))),
    right: shuffle(four.map((e) => ({ id: e.id, text: e.de, side: 'de' }))),
  };
}

function exGrammar(card) {
  const q = pick(card.quiz);
  return {
    type: 'grammar',
    itemId: `g:${card.id}`,
    question: 'Regelfrage',
    prompt: q.q,
    cardId: card.id,
    options: shuffle([
      { text: q.a, correct: true },
      ...q.wrong.map((t) => ({ text: t, correct: false })),
    ]),
    answer: q.a,
  };
}

/* ---------- Sitzungen ---------- */

/** Ist das Wort schon einmal drangekommen? */
function known(id) {
  const c = cardOf(id);
  return !!c && c.ok > 0;
}

function variantsFor(item, { hard }) {
  const list = [];
  if (item.kind === 's') {
    list.push(exBuild(item, hard));
    list.push(exPickDe(item));
    if (hard) list.push(exPickAl(item));
  } else {
    list.push(exPickDe(item));
    list.push(exPickAl(item));
    list.push(exSound(item));
    if (hard || known(item.id)) list.push(exType(item));
  }
  // Hörverstehen nur, wenn das Gerät auch wirklich vorlesen kann.
  if (canSpeak()) list.push(exListen(item));
  return list;
}

/** Zwei gleiche Wörter nie direkt hintereinander. */
function spread(list) {
  const out = [];
  const rest = shuffle(list);
  while (rest.length) {
    let idx = rest.findIndex((ex) => !out.length || ex.itemId !== out[out.length - 1].itemId);
    if (idx < 0) idx = 0;
    out.push(rest.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Aufgaben für eine Lektion des Lernpfads.
 * @param {object} lesson  Lektion aus course.js
 * @param {number} max     Höchstzahl an Aufgaben
 */
export function buildLesson(lesson, max = 14) {
  const items = lesson.itemIds.map(entry).filter(Boolean);
  const hard = lesson.kind === 'exam';
  const chosen = [];

  const pool = hard ? shuffle(items).slice(0, 10) : items;
  for (const item of pool) {
    const variants = shuffle(variantsFor(item, { hard }));
    const n = known(item.id) || hard ? 1 : 2;
    chosen.push(...variants.slice(0, n));
  }

  // Ein Paarspiel als Auflockerung, sobald genug Wörter da sind.
  const words = items.filter((e) => e.kind === 'w');
  if (words.length >= 4) chosen.push(exPair(shuffle(words)));

  // In der Prüfung kommt eine Regelfrage der Einheit dazu.
  if (hard) {
    const cards = cardsForUnit(lesson.unit).filter((c) => c.quiz?.length);
    if (cards.length) chosen.push(exGrammar(pick(cards)));
  }

  return spread(chosen).slice(0, max);
}

/** Wiederholung: gezielt die fälligen Wörter. */
export function buildReview(ids, max = 16) {
  const items = ids.map(entry).filter(Boolean);
  const list = [];
  for (const item of shuffle(items).slice(0, max)) {
    list.push(pick(variantsFor(item, { hard: false })));
  }
  return spread(list).slice(0, max);
}

/** Blitzrunde: endloser Nachschub kurzer Auswahlaufgaben. */
export function blitzExercise(pool) {
  const item = pick(pool);
  // Sätze eignen sich nicht für die Lautschrift-Aufgabe.
  const makers = item.kind === 's' ? [exPickDe, exPickAl] : [exPickDe, exPickAl, exSound];
  return pick(makers)(item);
}

/** Paarspiel: n Paare aus dem übergebenen Vorrat. */
export function matchPairs(pool, n = 6) {
  const items = sample(pool.filter((e) => e.kind === 'w'), n);
  return {
    items,
    tiles: shuffle([
      ...items.map((e) => ({ key: `al:${e.id}`, id: e.id, text: e.al, side: 'al' })),
      ...items.map((e) => ({ key: `de:${e.id}`, id: e.id, text: e.de, side: 'de' })),
    ]),
  };
}
