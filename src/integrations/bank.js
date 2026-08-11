/* ============================================================
   bank.js — Umsätze aus Bank-CSV einlesen

   Es gibt kein einheitliches Format: Sparkasse, DKB, comdirect, C24
   und Consorsbank benennen ihre Spalten unterschiedlich, setzen
   Vorspann-Zeilen über die Kopfzeile und trennen mal mit Semikolon,
   mal mit Komma. Statt für jede Bank eine eigene Vorlage zu pflegen,
   sucht dieser Import die Kopfzeile und ordnet die Spalten über
   Stichwörter zu — das deckt alle gängigen deutschen Exporte ab.
   ============================================================ */

import { parseCSV, toNumber } from '../util.js';

/* Stichwörter je Feld, in der Reihenfolge der Verlässlichkeit. */
const COLS = {
  date: ['buchungstag', 'buchungsdatum', 'valutadatum', 'wertstellung', 'valuta', 'datum', 'date'],
  amount: ['betrag', 'umsatz', 'amount', 'wert'],
  currency: ['währung', 'waehrung', 'currency'],
  purpose: ['verwendungszweck', 'buchungstext', 'beschreibung', 'verwendung', 'text', 'referenz', 'description'],
  counterparty: ['empfänger', 'empfaenger', 'auftraggeber', 'beteiligter', 'begünstigter', 'beguenstigter',
    'zahlungsempfänger', 'zahlungspflichtiger', 'name', 'gegenkonto', 'payee'],
  debitCredit: ['soll/haben', 'soll-haben', 's/h', 'haben/soll'],
};

/** Findet die Kopfzeile — viele Exporte haben Vorspann-Zeilen. */
function findHeader(lines) {
  const wanted = [...COLS.date, ...COLS.amount];
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const low = lines[i].toLowerCase();
    const hitsDate = COLS.date.some((k) => low.includes(k));
    const hitsAmount = COLS.amount.some((k) => low.includes(k));
    if (hitsDate && hitsAmount) return i;
    void wanted;
  }
  return 0;
}

function pickColumn(headers, keys) {
  const low = headers.map((hh) => hh.toLowerCase().trim());
  for (const key of keys) {
    const exact = low.findIndex((hh) => hh === key);
    if (exact >= 0) return headers[exact];
  }
  for (const key of keys) {
    const partial = low.findIndex((hh) => hh.includes(key));
    if (partial >= 0) return headers[partial];
  }
  return null;
}

function isoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/* ------------------------------------------------------------
   Kategorie raten
   ------------------------------------------------------------ */
const CATEGORY_RULES = [
  [['miete', 'nebenkosten', 'hausverwaltung', 'wohnung'], 'Miete'],
  [['rewe', 'aldi', 'lidl', 'edeka', 'penny', 'kaufland', 'netto', 'norma', 'supermarkt', 'denns', 'bio company', 'dm-drogerie', 'rossmann', 'lebensmittel'], 'Lebensmittel'],
  [['tankstelle', 'aral', 'shell', 'esso', 'jet', 'total', 'db vertrieb', 'deutsche bahn', 'bvg', 'mvg', 'hvv', 'rmv', 'uber', 'freenow', 'flixbus', 'parkhaus', 'sprit'], 'Transport'],
  [['netflix', 'spotify', 'amazon prime', 'disney', 'telekom', 'vodafone', 'o2', '1und1', '1&1', 'fitness', 'mcfit', 'gym', 'abo', 'youtube', 'apple.com/bill', 'icloud', 'adobe'], 'Abos'],
  [['restaurant', 'gastst', 'kino', 'cinemaxx', 'bar ', 'cafe', 'café', 'lieferando', 'wolt', 'uber eats', 'bäckerei', 'baeckerei', 'mcdonald', 'burger'], 'Freizeit'],
  [['apotheke', 'arzt', 'praxis', 'zahnarzt', 'klinik', 'physio', 'krankenkasse', 'aok', 'tk ', 'barmer'], 'Gesundheit'],
  [['versicherung', 'allianz', 'huk', 'ergo', 'axa', 'debeka', 'haftpflicht'], 'Versicherung'],
  [['amazon', 'zalando', 'otto', 'mediamarkt', 'saturn', 'ikea', 'h&m', 'zara', 'decathlon', 'shop'], 'Shopping'],
  [['kredit', 'darlehen', 'rate', 'tilgung', 'finanzierung', 'leasing'], 'Schuldenrate'],
  [['strom', 'gas', 'stadtwerke', 'vattenfall', 'eon', 'e.on', 'rundfunk', 'gez'], 'Sonstiges'],
];

const INCOME_RULES = [
  [['gehalt', 'lohn', 'bezüge', 'bezuege', 'salär', 'entgelt'], 'Gehalt'],
  [['honorar', 'rechnung', 'freelance', 'auftrag'], 'Nebenjob'],
  [['erstattung', 'rückzahlung', 'rueckzahlung', 'gutschrift', 'retoure'], 'Rückzahlung'],
  [['zinsen', 'dividende', 'ausschüttung'], 'Zinsen'],
  [['verkauf', 'ebay', 'kleinanzeigen'], 'Verkauf'],
];

export function guessCategory(text, amount) {
  const t = String(text || '').toLowerCase();
  const rules = amount >= 0 ? INCOME_RULES : CATEGORY_RULES;
  for (const [words, cat] of rules) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return 'Sonstiges';
}

/* ------------------------------------------------------------
   Fingerabdruck gegen Doppel-Import
   ------------------------------------------------------------ */
export function fingerprint(tx) {
  const note = String(tx.note || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${String(tx.date).slice(0, 10)}|${(Number(tx.amount) || 0).toFixed(2)}|${note}`;
}

/* ------------------------------------------------------------
   Hauptfunktion
   ------------------------------------------------------------ */
/**
 * @param {string} text  Inhalt der CSV-Datei
 * @returns {{rows:Array, columns:object, skipped:number, headerLine:number}}
 */
export function parseBankCSV(text) {
  const clean = String(text).replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/);
  const headerLine = findHeader(lines);
  const body = lines.slice(headerLine).join('\n');

  const { headers, rows } = parseCSV(body);
  if (!headers.length) throw new Error('Die Datei enthält keine erkennbare Tabelle.');

  const columns = {
    date: pickColumn(headers, COLS.date),
    amount: pickColumn(headers, COLS.amount),
    purpose: pickColumn(headers, COLS.purpose),
    counterparty: pickColumn(headers, COLS.counterparty),
    debitCredit: pickColumn(headers, COLS.debitCredit),
  };

  if (!columns.date) throw new Error('Keine Datumsspalte gefunden. Ist das ein Umsatz-Export?');
  if (!columns.amount) throw new Error('Keine Betragsspalte gefunden. Ist das ein Umsatz-Export?');

  const out = [];
  let skipped = 0;

  for (const r of rows) {
    const date = isoDate(r[columns.date]);
    let amount = toNumber(r[columns.amount]);
    if (!date || amount == null) { skipped++; continue; }

    // Manche Exporte führen das Vorzeichen in einer eigenen Spalte.
    if (columns.debitCredit) {
      const sh = String(r[columns.debitCredit] || '').trim().toUpperCase();
      if (sh.startsWith('S')) amount = -Math.abs(amount);
      else if (sh.startsWith('H')) amount = Math.abs(amount);
    }

    const party = columns.counterparty ? String(r[columns.counterparty] || '').trim() : '';
    const purpose = columns.purpose ? String(r[columns.purpose] || '').trim() : '';
    const note = [party, purpose].filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 140) || 'Umsatz';

    out.push({
      date,
      amount,
      note,
      category: guessCategory(`${party} ${purpose}`, amount),
    });
  }

  if (!out.length) throw new Error('Keine verwertbaren Zeilen gefunden.');
  out.sort((a, b) => a.date.localeCompare(b.date));
  return { rows: out, columns, skipped, headerLine };
}

/**
 * Teilt die eingelesenen Zeilen in neu und bereits vorhanden.
 * @param {Array} rows        aus parseBankCSV
 * @param {Array} existing    bestehende Buchungen
 */
export function splitNew(rows, existing) {
  const seen = new Set(existing.map(fingerprint));
  const fresh = [];
  const duplicates = [];
  for (const r of rows) {
    const fp = fingerprint(r);
    if (seen.has(fp)) { duplicates.push(r); continue; }
    seen.add(fp);           // auch Doppel innerhalb derselben Datei abfangen
    fresh.push(r);
  }
  return { fresh, duplicates };
}

/** Kurzstatistik für die Vorschau. */
export function summarize(rows) {
  const income = rows.filter((r) => r.amount > 0).reduce((a, b) => a + b.amount, 0);
  const expense = -rows.filter((r) => r.amount < 0).reduce((a, b) => a + b.amount, 0);
  const byCat = new Map();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) || 0) + 1);
  return {
    count: rows.length,
    from: rows[0]?.date || null,
    to: rows[rows.length - 1]?.date || null,
    income,
    expense,
    categories: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
  };
}
