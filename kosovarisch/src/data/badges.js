/* ============================================================
   badges.js — Abzeichen

   Jedes Abzeichen prüft sich selbst. `check()` wird nach jeder
   Lektion, jedem Spiel und jeder Antwort aufgerufen und gibt
   zurück, was frisch verdient wurde.
   ============================================================ */

import { getState, hasBadge, grantBadge, currentStreak } from '../state.js';
import { learnedItems } from '../engine/srs.js';
import { ALL_LESSONS } from './course.js';

export const BADGES = [
  { id: 'hapi', icon: '👣', title: 'Hapi i parë', de: 'Erster Schritt', hint: 'Schließe deine erste Lektion ab.',
    test: (s) => s.stats.lessons >= 1 },
  { id: 'pese', icon: '📚', title: 'Pesë', de: 'Fünf geschafft', hint: 'Schließe 5 Lektionen ab.',
    test: (s) => s.stats.lessons >= 5 },
  { id: 'njezet', icon: '🎓', title: 'Njëzet', de: 'Zwanzig geschafft', hint: 'Schließe 20 Lektionen ab.',
    test: (s) => s.stats.lessons >= 20 },
  { id: 'gjysma', icon: '🧗', title: 'Gjysma e rrugës', de: 'Halbe Strecke', hint: 'Schließe die Hälfte aller Lektionen ab.',
    test: (s) => s.stats.lessons >= Math.floor(ALL_LESSONS.length / 2) },

  { id: 'perfekt', icon: '✨', title: 'Pa gabime', de: 'Ohne Fehler', hint: 'Beende eine Lektion fehlerfrei.',
    test: (s) => s.stats.perfect >= 1 },
  { id: 'perfekt10', icon: '💎', title: 'Dhjetë të përsosura', de: 'Zehnmal fehlerfrei', hint: 'Beende 10 Lektionen fehlerfrei.',
    test: (s) => s.stats.perfect >= 10 },

  { id: 'zjarr3', icon: '🔥', title: 'Zjarr', de: 'Drei Tage am Stück', hint: 'Lerne an 3 Tagen hintereinander.',
    test: () => currentStreak() >= 3 },
  { id: 'zjarr7', icon: '🔥', title: 'Një javë', de: 'Eine ganze Woche', hint: 'Lerne an 7 Tagen hintereinander.',
    test: () => currentStreak() >= 7 },
  { id: 'zjarr30', icon: '🏆', title: 'Një muaj', de: 'Ein ganzer Monat', hint: 'Lerne an 30 Tagen hintereinander.',
    test: () => currentStreak() >= 30 },

  { id: 'fjale50', icon: '🗣️', title: '50 fjalë', de: '50 Wörter', hint: 'Beherrsche 50 Wörter.',
    test: () => learnedItems().length >= 50 },
  { id: 'fjale150', icon: '📖', title: '150 fjalë', de: '150 Wörter', hint: 'Beherrsche 150 Wörter.',
    test: () => learnedItems().length >= 150 },
  { id: 'fjale300', icon: '🧠', title: '300 fjalë', de: '300 Wörter', hint: 'Beherrsche 300 Wörter.',
    test: () => learnedItems().length >= 300 },

  { id: 'combo10', icon: '⚡', title: 'Dhjetë me radhë', de: '10 in Folge', hint: '10 richtige Antworten hintereinander.',
    test: (s) => s.stats.bestCombo >= 10 },
  { id: 'combo25', icon: '🌟', title: 'Njëzet e pesë', de: '25 in Folge', hint: '25 richtige Antworten hintereinander.',
    test: (s) => s.stats.bestCombo >= 25 },

  { id: 'xp2000', icon: '🎖️', title: '2000 XP', de: '2000 Punkte', hint: 'Sammle 2000 XP.',
    test: (s) => s.xp >= 2000 },
  { id: 'xp8000', icon: '👑', title: '8000 XP', de: '8000 Punkte', hint: 'Sammle 8000 XP.',
    test: (s) => s.xp >= 8000 },

  { id: 'nate', icon: '🌙', title: 'Buf nate', de: 'Nachteule', hint: 'Lerne nach 23 Uhr.',
    test: (s, ctx) => ctx.hour >= 23 },
  { id: 'mengjes', icon: '🌅', title: 'Zogu i hershëm', de: 'Frühaufsteher', hint: 'Lerne vor 7 Uhr morgens.',
    test: (s, ctx) => ctx.hour < 7 },

  { id: 'blitz', icon: '⏱️', title: 'Blic', de: 'Blitzschnell', hint: 'Hole 30 Punkte in der Blitzrunde.',
    test: (s) => s.stats.blitzBest >= 30 },
  { id: 'cifte', icon: '🃏', title: 'Çiftet', de: 'Paarfinder', hint: 'Schaffe das Paarspiel unter 45 Sekunden.',
    test: (s) => s.stats.matchBest > 0 && s.stats.matchBest <= 45 },

  { id: 'provimi', icon: '🏅', title: 'Provimi i parë', de: 'Erste Prüfung', hint: 'Bestehe die erste Prüfung einer Einheit.',
    test: (s) => Object.keys(s.lessons).some((id) => id.endsWith('exam') && s.lessons[id].done) },
  { id: 'synimi7', icon: '🎯', title: 'Shtatë ditë', de: 'Sieben Ziele', hint: 'Erreiche an 7 Tagen dein Tagesziel.',
    test: (s) => Object.values(s.log).filter((xp) => xp >= (s.settings.goal || 150)).length >= 7 },

  { id: 'prizrenas', icon: '🕌', title: 'Prizrenas', de: 'Prizrener', hint: 'Schließe alle Lektionen ab.',
    test: (s) => ALL_LESSONS.every((l) => s.lessons[l.id]?.done) },
];

export function badgeById(id) {
  return BADGES.find((b) => b.id === id) || null;
}

/**
 * Prüft alle Abzeichen und vergibt neue.
 * @returns {Array} frisch verdiente Abzeichen
 */
export function check(ctx = {}) {
  const s = getState();
  const context = { hour: new Date().getHours(), ...ctx };
  const fresh = [];
  for (const b of BADGES) {
    if (hasBadge(b.id)) continue;
    let ok = false;
    try { ok = !!b.test(s, context); } catch { ok = false; }
    if (ok && grantBadge(b.id)) fresh.push(b);
  }
  return fresh;
}
