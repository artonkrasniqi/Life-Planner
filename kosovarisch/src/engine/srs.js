/* ============================================================
   srs.js — verteilte Wiederholung (Spaced Repetition)

   Vereinfachtes SM-2: Wer ein Wort kann, sieht es immer
   seltener; wer es vergisst, bekommt es morgen wieder. Damit
   bleibt der Wortschatz hängen, ohne dass man ständig alles
   durchgehen muss.
   ============================================================ */

import { getState, persist } from '../state.js';
import { today, shiftDay, dayDiff } from '../util.js';
import { entry } from '../data/lexicon.js';

const START_EASE = 2.4;

function card(id) {
  const srs = getState().srs;
  if (!srs[id]) {
    srs[id] = { due: today(), ivl: 0, ease: START_EASE, reps: 0, lapses: 0, ok: 0, bad: 0 };
  }
  return srs[id];
}

export function cardOf(id) {
  return getState().srs[id] || null;
}

/** Antwort verbuchen und den nächsten Termin berechnen. */
export function review(id, correct) {
  const c = card(id);
  if (correct) {
    c.ok += 1;
    c.reps += 1;
    if (c.reps === 1) c.ivl = 1;
    else if (c.reps === 2) c.ivl = 3;
    else c.ivl = Math.round(c.ivl * c.ease);
    c.ease = Math.min(2.8, c.ease + 0.05);
  } else {
    c.bad += 1;
    c.lapses += 1;
    c.reps = 0;
    c.ivl = 1;
    c.ease = Math.max(1.6, c.ease - 0.2);
  }
  c.ivl = Math.min(c.ivl, 180);
  c.due = shiftDay(today(), c.ivl);
  persist();
  return c;
}

/** Wie sicher sitzt ein Wort? 0 = neu, 1 = fest verankert. */
export function strength(id) {
  const c = cardOf(id);
  if (!c) return 0;
  return Math.min(1, c.ivl / 30);
}

/** Alle Wörter, die heute (oder überfällig) dran sind. */
export function dueItems() {
  const srs = getState().srs;
  const now = today();
  return Object.keys(srs)
    .filter((id) => entry(id) && dayDiff(srs[id].due, now) >= 0)
    .sort((a, b) => dayDiff(srs[b].due, now) - dayDiff(srs[a].due, now));
}

/** Wörter, die schon einmal richtig beantwortet wurden. */
export function learnedItems() {
  const srs = getState().srs;
  return Object.keys(srs).filter((id) => entry(id) && srs[id].ok > 0);
}

/** Die wackligsten Wörter — Grundlage für "Schwache Wörter üben". */
export function shakyItems(limit = 20) {
  const srs = getState().srs;
  return Object.keys(srs)
    .filter((id) => entry(id) && srs[id].bad > 0)
    .sort((a, b) => (srs[b].bad - srs[b].ok) - (srs[a].bad - srs[a].ok))
    .slice(0, limit);
}

export function stats() {
  const srs = getState().srs;
  const ids = Object.keys(srs).filter((id) => entry(id));
  let strong = 0;
  for (const id of ids) if (srs[id].ivl >= 21) strong += 1;
  return { seen: ids.length, strong, due: dueItems().length };
}
