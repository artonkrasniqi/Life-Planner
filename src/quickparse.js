/* ============================================================
   quickparse.js — Freitext-Erkennung für die Schnellnotizzeile

   Nimmt eine getippte Zeile und entscheidet, was daraus werden soll:
   Termin, Aufgabe, Buchung, Schuld oder Zahlung auf eine Schuld.
   Dabei werden Datum, Uhrzeit, Dauer, Betrag, Zinssatz, Rate,
   Priorität, Tags und Kategorie herausgelöst.

   Der Parser ist rein — er liest nur `ctx` und gibt ein Ergebnis
   zurück. Die Oberfläche zeigt das Ergebnis an, bevor etwas
   angelegt wird, und lässt den Typ überschreiben.
   ============================================================ */

import { toISODate, addDays, toNumber } from './util.js';

/* ------------------------------------------------------------
   Wortlisten
   ------------------------------------------------------------ */

const WEEKDAY_NAMES = {
  sonntag: 0, sonntags: 0,
  montag: 1, montags: 1,
  dienstag: 2, dienstags: 2,
  mittwoch: 3, mittwochs: 3,
  donnerstag: 4, donnerstags: 4,
  freitag: 5, freitags: 5,
  samstag: 6, samstags: 6, sonnabend: 6,
};

const KW = {
  debt: ['schulde', 'schulden', 'geliehen', 'leihe', 'geliehene', 'kredit', 'darlehen', 'restschuld',
    'kreditkarte', 'dispo', 'ratenkredit', 'tilgung', 'bafög', 'kfw', 'finanzierung', 'schuldner', 'gläubiger'],
  payVerb: ['bezahlt', 'gezahlt', 'überwiesen', 'ueberwiesen', 'abgebucht', 'abbezahlt', 'getilgt', 'zurückgezahlt', 'zurueckgezahlt'],
  spend: ['bezahlt', 'gezahlt', 'ausgegeben', 'gekauft', 'kostet', 'gekostet', 'überwiesen', 'abgebucht',
    'eingekauft', 'getankt', 'rechnung', 'ausgabe', 'preis', 'einkauf'],
  income: ['gehalt', 'lohn', 'einnahme', 'erhalten', 'bekommen', 'verdient', 'gutschrift', 'rückzahlung',
    'rueckzahlung', 'verkauft', 'bonus', 'honorar', 'ausgezahlt'],
  event: ['termin', 'meeting', 'besprechung', 'treffen', 'treffe', 'call', 'standup', 'review', 'arzt',
    'zahnarzt', 'friseur', 'geburtstag', 'urlaub', 'flug', 'zug', 'hotel', 'training', 'workout', 'gym',
    'kino', 'konzert', 'prüfung', 'pruefung', 'kurs', 'vorstellungsgespräch', 'beratung', 'abendessen',
    'mittagessen', 'frühstück', 'fruehstueck', 'party', 'hochzeit', 'sprechstunde', 'physio', 'massage'],
  todo: ['erledigen', 'vergessen', 'kaufen', 'anrufen', 'schreiben', 'aufräumen', 'aufraeumen', 'buchen',
    'prüfen', 'pruefen', 'checken', 'planen', 'organisieren', 'abgeben', 'kündigen', 'kuendigen',
    'vergleichen', 'sortieren', 'scannen', 'lernen', 'lesen', 'besorgen', 'holen', 'machen', 'erinnern',
    'aufgabe', 'todo', 'to-do', 'bestellen', 'reparieren', 'putzen', 'waschen', 'antworten', 'melden'],
};

/** Wörter, die reine Signalgeber sind und nicht in den Titel gehören. */
const STRIP_WORDS = {
  transaction: ['bezahlt', 'gezahlt', 'ausgegeben', 'gekauft', 'gekostet', 'kostet', 'überwiesen', 'ueberwiesen',
    'abgebucht', 'eingekauft', 'erhalten', 'bekommen', 'ausgabe', 'einnahme', 'für', 'fuer', 'ich', 'habe'],
  debt: ['ich', 'schulde', 'schulden', 'habe', 'mir', 'geliehen', 'leihe', 'noch', 'offen',
    'zins', 'zinsen', 'zinssatz', 'rate', 'p.a.', 'monatlich'],
  payment: ['bezahlt', 'gezahlt', 'überwiesen', 'ueberwiesen', 'abgebucht', 'abbezahlt', 'getilgt', 'rate', 'ich', 'habe', 'auf'],
  // "Termin", "Aufgabe" & Co. werden hier bewusst NICHT entfernt: als
  // Präfix ("termin: …") fängt sie PREFIXES ab, mitten im Satz sind sie
  // Teil des Titels — "Aufgabe von Gerät A" soll nicht zu "Gerät A" werden.
  event: [],
  todo: ['ich', 'muss', 'noch', 'sollte'],
};

/** Typ-Präfixe für die manuelle Ansage: "termin: …" */
const PREFIXES = [
  [/^\s*(?:termin|kalender|event|t)\s*[:>]\s*/i, 'event'],
  [/^\s*(?:aufgabe|todo|to-do|a)\s*[:>]\s*/i, 'todo'],
  [/^\s*(?:buchung|ausgabe|finanz|geld|f)\s*[:>]\s*/i, 'transaction'],
  [/^\s*(?:einnahme|gutschrift)\s*[:>]\s*/i, 'income'],
  [/^\s*(?:schuld|schulden|kredit|s)\s*[:>]\s*/i, 'debt'],
  [/^\s*(?:zahlung|rate)\s*[:>]\s*/i, 'payment'],
];

const CATEGORY_HINTS = {
  transaction: [
    [['miete', 'nebenkosten', 'kaltmiete', 'warmmiete'], 'Miete'],
    [['einkauf', 'lebensmittel', 'supermarkt', 'rewe', 'aldi', 'lidl', 'edeka', 'penny', 'kaufland', 'netto', 'wocheneinkauf'], 'Lebensmittel'],
    [['tanken', 'getankt', 'benzin', 'diesel', 'bahn', 'ticket', 'öpnv', 'oepnv', 'uber', 'taxi', 'sprit', 'parken'], 'Transport'],
    [['abo', 'netflix', 'spotify', 'handy', 'internet', 'fitnessstudio', 'mitgliedschaft', 'streaming', 'mobilfunk'], 'Abos'],
    [['kino', 'bar', 'restaurant', 'essen', 'freizeit', 'konzert', 'urlaub', 'ausgehen', 'café', 'cafe'], 'Freizeit'],
    [['apotheke', 'arzt', 'medikament', 'zahnarzt', 'brille', 'therapie'], 'Gesundheit'],
    [['versicherung', 'haftpflicht', 'hausrat', 'kfz-versicherung'], 'Versicherung'],
    [['shopping', 'kleidung', 'schuhe', 'amazon', 'klamotten', 'elektronik'], 'Shopping'],
    [['rate', 'kredit', 'tilgung', 'darlehen'], 'Schuldenrate'],
  ],
  income: [
    [['gehalt', 'lohn', 'ausgezahlt'], 'Gehalt'],
    [['freelance', 'nebenjob', 'honorar', 'auftrag'], 'Nebenjob'],
    [['verkauft', 'verkauf'], 'Verkauf'],
    [['rückzahlung', 'rueckzahlung', 'erstattung'], 'Rückzahlung'],
    [['zinsen', 'dividende'], 'Zinsen'],
  ],
  event: [
    [['arzt', 'zahnarzt', 'apotheke', 'therapie', 'physio', 'impfung', 'vorsorge', 'sprechstunde'], 'Gesundheit'],
    [['training', 'gym', 'lauf', 'sport', 'fitness', 'workout', 'schwimmen', 'radfahren'], 'Sport'],
    [['meeting', 'standup', 'review', 'call', 'büro', 'buero', 'arbeit', 'projekt', 'kunde', 'besprechung', 'kickoff'], 'Arbeit'],
    [['familie', 'mama', 'papa', 'oma', 'opa', 'geburtstag', 'hochzeit', 'eltern', 'schwester', 'bruder'], 'Familie'],
    [['flug', 'zug', 'urlaub', 'reise', 'hotel', 'trip', 'ausflug'], 'Reise'],
    [['bank', 'steuer', 'finanz', 'berater', 'versicherung'], 'Finanzen'],
  ],
  debt: [
    [['kreditkarte', 'visa', 'mastercard'], 'Kreditkarte'],
    [['auto', 'fahrzeug', 'wagen'], 'Auto'],
    [['studium', 'bafög', 'bafoeg', 'kfw', 'studien'], 'Studium'],
    [['dispo', 'überziehung', 'ueberziehung'], 'Dispo'],
    [['freund', 'privat', 'bruder', 'schwester', 'kumpel', 'papa', 'mama'], 'Privat'],
  ],
};

/* ------------------------------------------------------------
   Kleine Helfer
   ------------------------------------------------------------ */

/** Ersetzt einen Bereich durch Leerzeichen, damit Positionen stabil bleiben. */
function blank(chars, start, length) {
  for (let i = start; i < start + length && i < chars.length; i++) chars[i] = ' ';
}

function hasWord(text, words) {
  return words.some((w) => new RegExp(`(^|[^\\wäöüß])${escapeRe(w)}([^\\wäöüß]|$)`, 'i').test(text));
}

function countWords(text, words) {
  return words.reduce((n, w) => n + (new RegExp(`(^|[^\\wäöüß])${escapeRe(w)}([^\\wäöüß]|$)`, 'i').test(text) ? 1 : 0), 0);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * Wortgrenze mit Umlauten. `\b` arbeitet in JavaScript nur auf ASCII —
 * `/\bübermorgen\b/` findet nichts, weil "ü" für `\b` kein Wortzeichen ist.
 * Lookbehind wird bewusst vermieden (ältere iOS-Safari-Versionen).
 */
const WCH = '0-9A-Za-z_ÄÖÜäöüß';
function wordRe(body, flags = 'i') {
  return new RegExp(`(^|[^${WCH}])(?:${body})(?![${WCH}])`, flags);
}

/** Führt wordRe aus und rechnet den Index um das führende Zeichen zurück. */
function matchWord(text, body) {
  const m = text.match(wordRe(body));
  if (!m) return null;
  const lead = m[1].length;
  return { m, index: m.index + lead, length: m[0].length - lead };
}

function guessCategory(kind, text, fallback) {
  for (const [words, cat] of CATEGORY_HINTS[kind] || []) {
    if (words.some((w) => text.includes(w))) return cat;
  }
  return fallback;
}

/* ------------------------------------------------------------
   Hauptfunktion
   ------------------------------------------------------------ */

/**
 * @param {string} input
 * @param {{debts?: Array, now?: Date, forceType?: string}} ctx
 */
export function parseQuick(input, ctx = {}) {
  const now = ctx.now || new Date();
  const debtList = ctx.debts || [];
  const raw = String(input || '');

  const result = {
    raw,
    type: 'todo',
    explicitType: false,
    title: '',
    date: '',
    time: '',
    durationMin: 0,
    amount: null,
    direction: 'out',
    category: '',
    priority: 'normal',
    tags: [],
    rate: null,
    minPayment: null,
    creditor: '',
    debtId: null,
    debtName: '',
    scores: {},
  };

  if (!raw.trim()) return result;

  /* --- 0. Typ-Präfix --------------------------------------- */
  let work = raw;
  for (const [re, type] of PREFIXES) {
    const m = work.match(re);
    if (!m) continue;
    work = work.slice(m[0].length);
    result.explicitType = true;
    if (type === 'income') { result.type = 'transaction'; result.direction = 'in'; }
    else result.type = type;
    break;
  }

  // Manuelle Auswahl in der Oberfläche schlägt jedes Präfix.
  if (ctx.forceType) {
    result.type = ctx.forceType === 'income' ? 'transaction' : ctx.forceType;
    if (ctx.forceType === 'income') result.direction = 'in';
    result.explicitType = true;
  }

  const chars = work.split('');
  const lowerFull = work.toLowerCase();

  /* --- 1. Tags und Priorität -------------------------------- */
  for (const m of work.matchAll(/#([\wäöüßÄÖÜ-]+)/g)) {
    result.tags.push(m[1].toLowerCase());
    blank(chars, m.index, m[0].length);
  }
  const bang = work.match(/!{1,3}/);
  if (bang) {
    result.priority = bang[0].length >= 3 ? 'critical' : bang[0].length === 2 ? 'high' : 'low';
    for (const m of work.matchAll(/!+/g)) blank(chars, m.index, m[0].length);
  }

  /* --- 2. Zinssatz und Rate (vor der Betragserkennung) ------ */
  const pct = work.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) {
    result.rate = toNumber(pct[1]);
    blank(chars, pct.index, pct[0].length);
  }
  const zins = chars.join('').match(/\bzins(?:en|satz)?\s*(?:von\s*)?(\d+(?:[.,]\d+)?)/i);
  if (zins && result.rate == null) {
    result.rate = toNumber(zins[1]);
    blank(chars, zins.index, zins[0].length);
  }
  const rateM = chars.join('').match(/\brate\s*(?:von\s*)?(\d+(?:[.,]\d+)?)\s*(?:€|eur|euro)?/i);
  if (rateM) {
    // Weder das Wort "Rate" noch die Zahl werden entfernt: das Wort ist ein
    // Klassifizierungssignal, und die Zahl muss die Betragserkennung noch
    // sehen — sonst hat "Rate 420 € bezahlt" gar keinen Betrag mehr.
    result.minPayment = toNumber(rateM[1]);
  }

  /* --- 3. Datum (vor der Uhrzeit, sonst frisst "15.09." die Zeit) --- */
  const dateHit = extractDate(chars.join(''), now);
  if (dateHit) {
    result.date = dateHit.date;
    blank(chars, dateHit.index, dateHit.length);
  }

  /* --- 4. Uhrzeit ------------------------------------------- */
  const timeSources = [
    /\b(?:um\s+)?([01]?\d|2[0-3]):([0-5]\d)\s*(?:uhr)?\b/i,
    /\b(?:um\s+)?([01]?\d|2[0-3])\.([0-5]\d)\s*uhr\b/i,   // Punkt nur zusammen mit "Uhr"
    /\b(?:um\s+)?([01]?\d|2[0-3])\s*uhr\b/i,
  ];
  for (const re of timeSources) {
    const m = chars.join('').match(re);
    if (!m) continue;
    let hh = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (/abend|nachmittag/.test(lowerFull) && hh < 12) hh += 12;
    result.time = `${pad2(hh)}:${pad2(mm)}`;
    blank(chars, m.index, m[0].length);
    break;
  }

  /* --- 4b. Tageszeiten: "morgen früh", "abends" ------------- */
  const DAYTIME = [
    [/\b(?:morgens|früh|frueh|vormittags?)\b/i, '08:00'],
    [/\bmittags?\b/i, '12:00'],
    [/\bnachmittags?\b/i, '15:00'],
    [/\babends?\b/i, '19:00'],
    [/\bnachts?\b/i, '21:00'],
  ];
  for (const [re, defTime] of DAYTIME) {
    const m = chars.join('').match(re);
    if (!m) continue;
    if (!result.time) result.time = defTime;
    blank(chars, m.index, m[0].length);
    break;
  }

  /* --- 5. Dauer --------------------------------------------- */
  const durM = chars.join('').match(/\b(?:für\s+|fuer\s+)?(\d+(?:[.,]\d+)?)\s*(min|minuten|h|std|stunde|stunden)\b/i);
  if (durM) {
    const n = toNumber(durM[1]) || 0;
    result.durationMin = /^(h|std|stunde|stunden)$/i.test(durM[2]) ? Math.round(n * 60) : Math.round(n);
    blank(chars, durM.index, durM[0].length);
  }

  /* --- 6. Beträge ------------------------------------------- */
  const moneyContext = hasWord(lowerFull, [...KW.spend, ...KW.income, ...KW.debt, 'rate', 'betrag', 'summe']);
  const amounts = [];
  const scan = chars.join('');
  const amountRe = /(?:(€|eur|euro)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(€|eur\b|euro\b)?/gi;
  for (const m of scan.matchAll(amountRe)) {
    const hasCurrency = Boolean(m[1] || m[3]);
    // Zahlen mit Maßeinheit sind kein Geld ("10 km", "3 Stück") und
    // bleiben unangetastet, damit sie im Titel erhalten bleiben.
    if (/^\s*(?:km|kg|mg|ml|stück|stk|liter|x|%)\b/i.test(scan.slice(m.index + m[0].length))) continue;
    if (!hasCurrency && !moneyContext) continue;
    const value = toNumber(m[2]);
    if (value == null) continue;
    amounts.push({ value, index: m.index, length: m[0].length, hasCurrency });
  }
  // Bei mehreren Beträgen zählt der größte als Hauptbetrag.
  if (amounts.length) {
    const primary = amounts.reduce((a, b) => (b.value > a.value ? b : a));
    result.amount = primary.value;
    for (const a of amounts) blank(chars, a.index, a.length);
    if (amounts.length > 1 && result.minPayment == null) {
      const rest = amounts.filter((a) => a !== primary).map((a) => a.value);
      result.minPayment = Math.min(...rest);
    }
  }

  /* --- 7. Klassifizierung ----------------------------------- */
  const rest = chars.join('').toLowerCase();
  const hasAmount = result.amount != null;
  const debtHits = countWords(lowerFull, KW.debt);
  const payVerb = hasWord(lowerFull, KW.payVerb);
  const spendHits = countWords(lowerFull, KW.spend);
  const incomeHits = countWords(lowerFull, KW.income);
  const eventHits = countWords(lowerFull, KW.event);
  const todoHits = countWords(lowerFull, KW.todo);

  // Bezieht sich der Text auf eine bereits erfasste Schuld?
  const matchedDebt = findDebt(lowerFull, debtList);
  if (matchedDebt) { result.debtId = matchedDebt.id; result.debtName = matchedDebt.creditor; }

  const s = { event: 0, todo: 0, transaction: 0, debt: 0, payment: 0 };
  if (hasAmount) s.transaction += 3;
  else s.transaction -= 4;
  if (result.time) s.event += 4;
  if (result.date && !hasAmount) { s.event += 1; s.todo += 1; }
  if (result.durationMin) s.event += 2;

  s.debt += debtHits * 4;
  s.transaction += spendHits * 3 + incomeHits * 3;
  s.event += eventHits * 3;
  s.todo += todoHits * 3;
  if (bang) s.todo += 2;
  if (hasAmount && !debtHits && !spendHits && !incomeHits && !eventHits) s.transaction += 1;
  if (hasAmount && debtHits) s.debt += 3;
  // Eine Rate auf eine bestehende Schuld ist keine neue Schuld.
  if (matchedDebt && hasAmount && (payVerb || /\brate\b/i.test(lowerFull))) {
    s.payment = Math.max(s.debt, s.transaction) + 6;
    s.debt -= 4;
  } else if (payVerb && debtHits) {
    s.debt -= 4;
    s.transaction += 3;
  }
  // Zinssatz und Monatsrate beschreiben eine Verbindlichkeit, keine Buchung
  // und keine Zahlung — auch ohne ein Wort wie "Kredit" im Text.
  if (result.rate != null) { s.debt += 6; s.payment -= 8; }
  if (result.minPayment != null && hasAmount) s.debt += 3;
  result.scores = s;

  if (!result.explicitType) {
    // Bei Gleichstand gewinnt der harmlosere Typ (Aufgabe vor Termin …).
    const ORDER = ['todo', 'event', 'transaction', 'debt', 'payment'];
    const best = Object.entries(s)
      .sort((a, b) => (b[1] - a[1]) || (ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])))[0];
    result.type = best && best[1] > 0 ? best[0] : 'todo';
  }
  if (result.type === 'payment' && !result.debtId) result.type = 'debt';

  /* --- 9. Richtung der Buchung ------------------------------ */
  if (result.type === 'transaction' && !result.explicitType) {
    result.direction = incomeHits > spendHits ? 'in' : 'out';
  }

  /* --- 10. Gläubiger ---------------------------------------- */
  if (result.type === 'debt') {
    const nameM = work.match(/\b(?:an|bei|von|gegenüber)\s+((?:der|die|das|den)\s+)?([A-ZÄÖÜ][\wäöüß.-]*(?:\s+[A-ZÄÖÜ][\wäöüß.-]*)?)/);
    if (nameM) result.creditor = nameM[2].trim();
  }

  /* --- 11. Titel säubern ------------------------------------ */
  result.title = cleanTitle(chars.join(''), result.type);

  /* --- 12. Kategorie ---------------------------------------- */
  if (result.type === 'transaction') {
    result.category = guessCategory(result.direction === 'in' ? 'income' : 'transaction', lowerFull,
      result.direction === 'in' ? 'Sonstiges' : 'Sonstiges');
  } else if (result.type === 'event') {
    result.category = guessCategory('event', lowerFull, 'Privat');
  } else if (result.type === 'debt') {
    result.category = guessCategory('debt', lowerFull, 'Kredit');
  }

  /* --- 13. Standardwerte ------------------------------------ */
  if (result.type === 'event') {
    if (!result.date) result.date = toISODate(now);
    if (!result.durationMin) result.durationMin = 60;
  }
  if (!result.title) {
    result.title = { event: 'Termin', todo: 'Notiz', transaction: 'Buchung', debt: result.creditor || 'Schuld', payment: `Rate ${result.debtName}` }[result.type];
  }
  if (result.type === 'debt' && !result.creditor) result.creditor = result.title;

  return result;
}

/* ------------------------------------------------------------
   Datumserkennung
   ------------------------------------------------------------ */
function extractDate(text, now) {
  const lower = text.toLowerCase();
  const iso = (d) => toISODate(d);

  const simple = [
    ['übermorgen|uebermorgen', 2],
    ['morgen', 1],
    ['heute', 0],
    ['gestern', -1],
    ['vorgestern', -2],
  ];
  for (const [body, off] of simple) {
    const hit = matchWord(lower, body);
    if (hit) return { date: iso(addDays(now, off)), index: hit.index, length: hit.length };
  }

  // "nächste Woche", "nächsten Monat"
  let hit = matchWord(lower, '(?:n(?:ä|ae)chste[nrs]?|kommende[nrs]?)\\s+(?:woche|monat)');
  if (hit) {
    const d = new Date(now);
    if (/woche/.test(hit.m[0])) d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    return { date: iso(d), index: hit.index, length: hit.length };
  }

  // "am Wochenende" -> nächster Samstag
  hit = matchWord(lower, '(?:am\\s+)?wochenende');
  if (hit) {
    const delta = (6 - now.getDay() + 7) % 7 || 7;
    return { date: iso(addDays(now, delta)), index: hit.index, length: hit.length };
  }

  // Wochentage: "am Montag", "nächsten Freitag"
  hit = matchWord(lower, '(?:am\\s+|n(?:ä|ae)chste[nr]?\\s+|kommende[nr]?\\s+|diesen\\s+)?(?:sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend)s?');
  if (hit) {
    const name = hit.m[0].match(/(sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend)/)[1];
    let delta = (WEEKDAY_NAMES[name] - now.getDay() + 7) % 7;
    if (delta === 0) delta = 7;             // "Montag" an einem Montag meint nächste Woche
    if (/n(ä|ae)chste|kommende/.test(hit.m[0]) && delta < 7) delta += 7;
    return { date: iso(addDays(now, delta)), index: hit.index, length: hit.length };
  }

  // "in 3 Tagen", "in 2 Wochen"
  hit = matchWord(lower, 'in\\s+\\d{1,3}\\s+(?:tag|tagen|woche|wochen|monat|monaten)');
  if (hit) {
    const n = parseInt(hit.m[0].match(/\d+/)[0], 10);
    const d = new Date(now);
    if (/tag/.test(hit.m[0])) d.setDate(d.getDate() + n);
    else if (/woche/.test(hit.m[0])) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return { date: iso(d), index: hit.index, length: hit.length };
  }

  let m;

  // ISO: 2026-09-01
  m = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, index: m.index, length: m[0].length };

  // 01.09.2026 / 1.9.26 / 1.9.
  m = lower.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, mon, day);
    if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(year + 1);
    if (!isNaN(d)) return { date: iso(d), index: m.index, length: m[0].length };
  }

  // "am 15." -> Tag im laufenden oder nächsten Monat
  m = lower.match(/\bam\s+(\d{1,2})\.(?!\d)/);
  if (m) {
    const day = parseInt(m[1], 10);
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setMonth(d.getMonth() + 1);
    return { date: iso(d), index: m.index, length: m[0].length };
  }

  return null;
}

/* ------------------------------------------------------------
   Bestehende Schuld im Text finden
   ------------------------------------------------------------ */
function findDebt(lowerText, debtList) {
  let best = null;
  for (const d of debtList) {
    const words = String(d.creditor || '').toLowerCase().split(/[^\wäöüß]+/).filter((w) => w.length >= 4);
    for (const w of words) {
      if (lowerText.includes(w) && (!best || w.length > best.len)) best = { debt: d, len: w.length };
    }
  }
  return best ? best.debt : null;
}

/* ------------------------------------------------------------
   Titel aufräumen
   ------------------------------------------------------------ */
function cleanTitle(text, type) {
  let t = text;
  for (const w of STRIP_WORDS[type] || []) {
    t = t.replace(new RegExp(`(^|[^\\wäöüß])${escapeRe(w)}([^\\wäöüß]|$)`, 'gi'), '$1$2');
  }
  t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  // Führende Füllwörter können sich stapeln ("bei der Sparkasse").
  let prev;
  do {
    prev = t;
    t = t.replace(/^(?:am|um|für|fuer|an|bei|von|mit|in|auf|der|die|das|den|dem)\b\s*/i, '').trim();
  } while (t !== prev);
  t = t
    .replace(/\s*\b(?:am|um|für|fuer|an|bei|von|mit|in|auf|und)\b\s*$/i, '')
    .replace(/^[-–—,.:;]+\s*/, '')
    .replace(/\s*[-–—,.:;]+$/, '')
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/* ------------------------------------------------------------
   Menschenlesbare Beschreibung für die Vorschau
   ------------------------------------------------------------ */
export const TYPE_LABELS = {
  event: 'Termin',
  todo: 'Aufgabe',
  transaction: 'Buchung',
  debt: 'Schuld',
  payment: 'Zahlung',
};

export const TYPE_ICONS = {
  event: 'calendar',
  todo: 'checkSquare',
  transaction: 'wallet',
  debt: 'card',
  payment: 'check',
};
