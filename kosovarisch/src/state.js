/* ============================================================
   state.js — Fortschritt, XP, Serie, Herzen

   Alles liegt lokal im Gerät (localStorage). Kein Konto, kein
   Server, keine Datenübertragung. Wer wechselt, nimmt seinen
   Fortschritt über "Sichern" als Datei mit.
   ============================================================ */

import { today, dayDiff, clamp } from './util.js';

const KEY = 'fol-prizren-v1';
const listeners = new Set();

/* ---------- Ränge ---------- */

/* Grob gerechnet bringt eine saubere Lektion 200-260 XP; der ganze
   Kurs liegt damit bei rund 18 000 XP. Danach sind die Ränge gestaffelt. */
export const RANKS = [
  { xp: 0, name: 'Mysafir', de: 'Gast' },
  { xp: 250, name: 'Fillestar', de: 'Anfänger' },
  { xp: 700, name: 'Komshi', de: 'Nachbar' },
  { xp: 1400, name: 'Shok', de: 'Kumpel' },
  { xp: 2400, name: 'Prizrenas', de: 'Prizrener' },
  { xp: 3800, name: 'Bilbil', de: 'Nachtigall' },
  { xp: 5600, name: 'Mjeshtër', de: 'Meister' },
  { xp: 8000, name: 'Profesor', de: 'Professor' },
  { xp: 11500, name: 'Gjuhëtar', de: 'Sprachkundiger' },
  { xp: 16000, name: 'Legjendë', de: 'Legende' },
];

export const HEARTS_MAX = 5;
export const HEART_REFILL_MS = 15 * 60 * 1000;

function emptyState() {
  return {
    v: 1,
    xp: 0,
    hearts: { n: HEARTS_MAX, ts: Date.now() },
    streak: { count: 0, best: 0, last: null },
    log: {},              // Tagesstempel -> XP an diesem Tag
    lessons: {},          // Lektions-ID -> { stars, acc, done, runs }
    srs: {},              // Wort-ID -> Wiederholungsdaten
    badges: {},           // Abzeichen-ID -> Zeitstempel
    fav: [],              // markierte Wörter
    stats: {
      answers: 0, correct: 0, lessons: 0, perfect: 0,
      bestCombo: 0, blitzBest: 0, matchBest: 0, minutes: 0,
    },
    settings: {
      sound: true, haptics: true, showStd: true,
      hearts: true, goal: 150, speech: true,
    },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    // Fehlende Felder ergänzen, damit ältere Stände weiterlaufen.
    const base = emptyState();
    return {
      ...base, ...parsed,
      hearts: { ...base.hearts, ...(parsed.hearts || {}) },
      streak: { ...base.streak, ...(parsed.streak || {}) },
      stats: { ...base.stats, ...(parsed.stats || {}) },
      settings: { ...base.settings, ...(parsed.settings || {}) },
      log: parsed.log || {}, lessons: parsed.lessons || {},
      srs: parsed.srs || {}, badges: parsed.badges || {}, fav: parsed.fav || [],
    };
  } catch (err) {
    console.warn('Fortschritt konnte nicht gelesen werden:', err);
    return emptyState();
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Fortschritt konnte nicht gespeichert werden:', err);
    }
  }, 120);
}

/** Änderungen melden — die Oberfläche zeichnet sich dann neu. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  save();
  for (const fn of listeners) fn(state);
}

export function getState() {
  return state;
}

/** Von außen geänderte Teile (z. B. die Wiederholungsdaten) sichern. */
export function persist() {
  emit();
}

export function settings() {
  return state.settings;
}

export function setSetting(key, value) {
  state.settings[key] = value;
  emit();
}

/* ---------- Rang & XP ---------- */

export function rankFor(xp) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) idx = i;
  const current = RANKS[idx];
  const next = RANKS[idx + 1] || null;
  const span = next ? next.xp - current.xp : 1;
  const done = next ? xp - current.xp : 1;
  return {
    level: idx + 1, ...current, next,
    progress: next ? clamp(done / span, 0, 1) : 1,
    toNext: next ? next.xp - xp : 0,
  };
}

export function addXp(amount) {
  const before = rankFor(state.xp).level;
  state.xp += amount;
  const day = today();
  state.log[day] = (state.log[day] || 0) + amount;
  emit();
  const after = rankFor(state.xp).level;
  return after > before ? rankFor(state.xp) : null;   // Aufstieg?
}

export function xpToday() {
  return state.log[today()] || 0;
}

export function goalProgress() {
  return clamp(xpToday() / (state.settings.goal || 150), 0, 1);
}

/** XP der letzten 7 Tage, ältester zuerst — für das Balkendiagramm. */
export function weekLog() {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const stamp = today(d);
    out.push({
      stamp,
      xp: state.log[stamp] || 0,
      label: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()],
    });
  }
  return out;
}

/* ---------- Serie ---------- */

/** Beim Lernen aufrufen: verlängert oder startet die Tagesserie. */
export function touchStreak() {
  const day = today();
  const last = state.streak.last;
  if (last === day) return state.streak;
  if (last && dayDiff(last, day) === 1) state.streak.count += 1;
  else state.streak.count = 1;
  state.streak.last = day;
  state.streak.best = Math.max(state.streak.best, state.streak.count);
  emit();
  return state.streak;
}

/** Serie fürs Anzeigen: gestern zählt noch, älter nicht mehr. */
export function currentStreak() {
  const { last, count } = state.streak;
  if (!last) return 0;
  const diff = dayDiff(last, today());
  return diff <= 1 ? count : 0;
}

/* ---------- Herzen ---------- */

/** Herzen füllen sich mit der Zeit von selbst wieder auf. */
export function hearts() {
  if (!state.settings.hearts) return HEARTS_MAX;
  const h = state.hearts;
  if (h.n >= HEARTS_MAX) {
    h.ts = Date.now();
    return HEARTS_MAX;
  }
  const gained = Math.floor((Date.now() - h.ts) / HEART_REFILL_MS);
  if (gained > 0) {
    h.n = Math.min(HEARTS_MAX, h.n + gained);
    h.ts = h.n >= HEARTS_MAX ? Date.now() : h.ts + gained * HEART_REFILL_MS;
    save();
  }
  return h.n;
}

/** Millisekunden bis zum nächsten Herz (0 = alle voll). */
export function heartTimer() {
  if (hearts() >= HEARTS_MAX) return 0;
  return Math.max(0, state.hearts.ts + HEART_REFILL_MS - Date.now());
}

export function loseHeart() {
  if (!state.settings.hearts) return HEARTS_MAX;
  const n = hearts();
  if (n <= 0) return 0;
  if (n === HEARTS_MAX) state.hearts.ts = Date.now();
  state.hearts.n = n - 1;
  emit();
  return state.hearts.n;
}

export function refillHearts() {
  state.hearts = { n: HEARTS_MAX, ts: Date.now() };
  emit();
}

/* ---------- Lektionen ---------- */

export function lessonState(id) {
  return state.lessons[id] || { stars: 0, acc: 0, done: false, runs: 0 };
}

export function isLessonDone(id) {
  return !!state.lessons[id]?.done;
}

/** Ergebnis einer Lektion verbuchen. Gibt die neuen Sterne zurück. */
export function completeLesson(id, { accuracy, mistakes }) {
  const prev = lessonState(id);
  const stars = mistakes === 0 ? 3 : accuracy >= 0.85 ? 2 : 1;
  state.lessons[id] = {
    done: true,
    stars: Math.max(prev.stars, stars),
    acc: Math.max(prev.acc, accuracy),
    runs: prev.runs + 1,
  };
  state.stats.lessons += 1;
  if (mistakes === 0) state.stats.perfect += 1;
  emit();
  return state.lessons[id];
}

export function lessonsToday() {
  // Wird nur grob gebraucht (Abzeichen "5 Lektionen an einem Tag"):
  // wir zählen über die XP-Kurve des Tages.
  return Math.floor((state.log[today()] || 0) / 40);
}

/* ---------- Antworten & Statistik ---------- */

export function recordAnswer(correct, combo) {
  state.stats.answers += 1;
  if (correct) state.stats.correct += 1;
  state.stats.bestCombo = Math.max(state.stats.bestCombo, combo || 0);
  save();
}

export function recordGame(kind, score) {
  const key = kind === 'blitz' ? 'blitzBest' : 'matchBest';
  const better = kind === 'match'
    ? (state.stats[key] === 0 || score < state.stats[key])   // Zeit: kleiner ist besser
    : score > state.stats[key];
  if (better) state.stats[key] = score;
  emit();
  return better;
}

/* ---------- Favoriten ---------- */

export function isFav(id) {
  return state.fav.includes(id);
}

export function toggleFav(id) {
  const i = state.fav.indexOf(id);
  if (i >= 0) state.fav.splice(i, 1);
  else state.fav.push(id);
  emit();
  return isFav(id);
}

/* ---------- Abzeichen ---------- */

export function hasBadge(id) {
  return !!state.badges[id];
}

export function grantBadge(id) {
  if (state.badges[id]) return false;
  state.badges[id] = new Date().toISOString();
  emit();
  return true;
}

/* ---------- Sichern & Zurücksetzen ---------- */

export function exportState() {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('Datei passt nicht.');
  state = { ...emptyState(), ...parsed };
  emit();
}

export function resetAll() {
  state = emptyState();
  emit();
}
