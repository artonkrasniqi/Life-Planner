/* ============================================================
   course.js — Aufbau des Lernpfads

   Der Kurs wird aus dem Lexikon abgeleitet: jedes Wort trägt
   seine Einheit und Lektion bereits mit sich. Hier stehen nur
   noch die Namen, Farben und die Reihenfolge — und am Ende
   jeder Einheit eine Prüfung ("Provimi"), die alles mischt.
   ============================================================ */

import { lessonEntries, unitEntries, lessonCount } from './lexicon.js';

const UNITS = [
  {
    n: 1, icon: '👋', color: '#e4173b',
    title: 'Përshëndetje', de: 'Erste Worte',
    blurb: 'Hallo sagen, danke sagen, höflich sein — der Einstieg.',
    lessons: ['Hallo & Tschüss', 'Von morgens bis nachts', 'Wie geht\'s?', 'Danke & Bitte'],
  },
  {
    n: 2, icon: '🙋', color: '#f0851b',
    title: 'Un & ti', de: 'Kennenlernen',
    blurb: 'Wer bist du, woher kommst du, was heißt eigentlich "qysh"?',
    lessons: ['Ich, du, wir', 'Sein: jam, je, osht', 'Name & Herkunft', 'Sprache & Verstehen', 'Fragewörter'],
  },
  {
    n: 3, icon: '🔢', color: '#c9a227',
    title: 'Numrat', de: 'Zahlen',
    blurb: 'Zählen, Alter, Preise — alles, was man auf dem Basar braucht.',
    lessons: ['Eins bis zehn', 'Elf bis zwanzig', 'Große Zahlen', 'Alter & Preise'],
  },
  {
    n: 4, icon: '👨‍👩‍👧', color: '#2fa84f',
    title: 'Familja', de: 'Familie',
    blurb: 'Nana, babai, mixha — und warum es zwei Wörter für "Onkel" gibt.',
    lessons: ['Die engste Familie', 'Onkel, Tanten, Großeltern', 'Mann, Frau, Kinder', 'Über die Familie reden'],
  },
  {
    n: 5, icon: '☕', color: '#8a5a2b',
    title: 'Kafe & ushqim', de: 'Essen & Trinken',
    blurb: 'Bestellen, essen, loben. Mit Byrek, Fli und Baklava.',
    lessons: ['Getränke', 'Grundnahrungsmittel', 'Küche aus Prizren', 'Obst & Gemüse', 'Im Café bestellen'],
  },
  {
    n: 6, icon: '🕌', color: '#1f9bb3',
    title: 'Prizreni', de: 'In der Stadt',
    blurb: 'Çarshia, Kalaja, Ura e gurit — und nach dem Weg fragen.',
    lessons: ['Orte in Prizren', 'Alltagsorte', 'Links, rechts, geradeaus', 'Nach dem Weg fragen'],
  },
  {
    n: 7, icon: '🕰️', color: '#6a5acd',
    title: 'Koha', de: 'Zeit',
    blurb: 'Heute, morgen, "sa osht sahati" — Zeit auf Prizrener Art.',
    lessons: ['Heute, morgen, gestern', 'Tageszeiten', 'Wochentage', 'Monate & Jahreszeiten', 'Nach der Uhrzeit fragen'],
  },
  {
    n: 8, icon: '🛍️', color: '#d2691e',
    title: 'Blerje', de: 'Einkaufen',
    blurb: 'Preise, Farben, Größen — und richtig handeln.',
    lessons: ['Geld & Bezahlen', 'Farben & Größen', 'Kaufen & Wählen', 'Handeln auf dem Basar'],
  },
  {
    n: 9, icon: '🏠', color: '#b8336a',
    title: 'Në shpi', de: 'Zuhause & Gäste',
    blurb: 'Wohnen, einladen, Gast sein — das Herz der Prizrener Kultur.',
    lessons: ['Das Haus', 'Möbel & Dinge', 'Gast sein', 'Beim Besuch'],
  },
  {
    n: 10, icon: '💬', color: '#3d8bfd',
    title: 'Ndjenja', de: 'Gefühle & Small Talk',
    blurb: 'Wie fühlst du dich — und was bedeutet "vallah" wirklich?',
    lessons: ['Wie geht es dir wirklich', 'Mögen & Lieben', 'Typische Alltagswörter', 'Small Talk'],
  },
  {
    n: 11, icon: '⛰️', color: '#2e8b57',
    title: 'Moti & natyra', de: 'Wetter & Natur',
    blurb: 'Regen, Schnee, Sharr-Gebirge und die Tiere drumherum.',
    lessons: ['Das Wetter', 'Natur', 'Tiere', 'Übers Wetter reden'],
  },
  {
    n: 12, icon: '🚌', color: '#0e7490',
    title: 'Udhëtim', de: 'Unterwegs',
    blurb: 'Bus, Taxi, Ticket — von Prishtina nach Prizren und zurück.',
    lessons: ['Verkehrsmittel', 'Auf Reisen', 'Unterwegs fragen'],
  },
  {
    n: 13, icon: '💼', color: '#7c3aed',
    title: 'Punë & shkollë', de: 'Arbeit & Schule',
    blurb: 'Was arbeitest du, was lernst du — Small Talk für Erwachsene.',
    lessons: ['Arbeit', 'Berufe', 'Schule & Lernen', 'Übers Arbeiten reden'],
  },
  {
    n: 14, icon: '🩺', color: '#dc2626',
    title: 'Shëndeti', de: 'Gesundheit',
    blurb: 'Körper, Schmerzen, Apotheke — der wichtigste Notfall-Wortschatz.',
    lessons: ['Kopf & Gesicht', 'Körper', 'Beim Arzt', 'Hilfe holen'],
  },
  {
    n: 15, icon: '🎉', color: '#eab308',
    title: 'Festa', de: 'Feste & Glückwünsche',
    blurb: 'Hochzeit, Bajram, Geburtstag — und wie man richtig gratuliert.',
    lessons: ['Feste', 'Feiern', 'Gratulieren'],
  },
];

/* Prüfungen und Lektionen zu einer flachen Liste ausbauen. */
const lessons = [];
export const COURSE = UNITS.map((unit) => {
  const built = [];
  const count = Math.max(unit.lessons.length, lessonCount(unit.n));

  for (let i = 1; i <= count; i++) {
    const items = lessonEntries(unit.n, i);
    if (!items.length) continue;
    const lesson = {
      id: `u${unit.n}l${i}`,
      unit: unit.n,
      index: i,
      title: unit.lessons[i - 1] || `Lektion ${i}`,
      icon: unit.icon,
      color: unit.color,
      kind: 'lesson',
      itemIds: items.map((e) => e.id),
    };
    built.push(lesson);
    lessons.push(lesson);
  }

  const all = unitEntries(unit.n);
  const exam = {
    id: `u${unit.n}exam`,
    unit: unit.n,
    index: built.length + 1,
    title: `Prüfung: ${unit.de}`,
    icon: '🏅',
    color: unit.color,
    kind: 'exam',
    itemIds: all.map((e) => e.id),
  };
  built.push(exam);
  lessons.push(exam);

  return { ...unit, lessonList: built };
});

export const ALL_LESSONS = lessons;

export function lessonById(id) {
  return lessons.find((l) => l.id === id) || null;
}

export function unitByNumber(n) {
  return COURSE.find((u) => u.n === n) || null;
}

/** Reihenfolge: eine Lektion ist frei, wenn die davor geschafft ist. */
export function lessonIndex(id) {
  return lessons.findIndex((l) => l.id === id);
}
