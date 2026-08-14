/* ============================================================
   pronounce.js — Albanisch für fremde Stimmen umschreiben

   Das Problem: iPhones und Android-Geräte bringen KEINE
   albanische Stimme mit. Apple bietet für Albanisch gar keine an.
   Eine deutsche Stimme, der man "qysh je" hinwirft, sagt
   "kwüsch jeh" — also Unsinn.

   Die Lösung: Wir zerlegen das Wort in Laute und schreiben es in
   der Rechtschreibung der Stimme neu, die gerade vorhanden ist.
   Aus "qysh je" wird für eine deutsche Stimme "kjüsch je", für
   eine türkische "kyüş ye", für eine italienische "chiusc ie".
   Vorgelesen klingt das jeweils nahe am echten Albanischen.

   Das ist eine Annäherung, keine perfekte Aussprache — aber es
   funktioniert offline, auf jedem Gerät, ohne Konto und ohne
   heruntergeladene Tondateien.
   ============================================================ */

/* Die Doppelbuchstaben müssen vor den Einzelbuchstaben geprüft
   werden, sonst wird aus "sh" ein s und ein h. */
const DIGRAPHS = {
  dh: 'DH', gj: 'GJ', ll: 'LL', nj: 'NJ', rr: 'RR',
  sh: 'SH', th: 'TH', xh: 'XH', zh: 'ZH',
};

const SINGLES = {
  a: 'A', b: 'B', c: 'C', 'ç': 'CH', d: 'D', e: 'E', 'ë': 'EH', f: 'F',
  g: 'G', h: 'H', i: 'I', j: 'J', k: 'K', l: 'L', m: 'M', n: 'N',
  o: 'O', p: 'P', q: 'Q', r: 'R', s: 'S', t: 'T', u: 'U', v: 'V',
  x: 'X', y: 'Y', z: 'Z',
};

const FRONT = new Set(['E', 'EH', 'I']);          // für c/g-Regeln im Italienischen
const VOWELS = new Set(['A', 'E', 'EH', 'I', 'O', 'U', 'Y']);

/** Text in Lautbausteine zerlegen. Unbekanntes bleibt stehen. */
export function toPhonemes(text) {
  const src = String(text || '').toLowerCase();
  const out = [];
  for (let i = 0; i < src.length;) {
    const two = src.slice(i, i + 2);
    if (DIGRAPHS[two]) { out.push(DIGRAPHS[two]); i += 2; continue; }
    const one = src[i];
    if (SINGLES[one]) { out.push(SINGLES[one]); i += 1; continue; }
    out.push({ raw: one });                        // Leerzeichen, Satzzeichen …
    i += 1;
  }
  return out;
}

/* ---------- Zielschreibweisen ---------- */

/* Deutsch: sch/tsch/dsch decken die Zischlaute ab, ü das y,
   das unbetonte e das ë. Kein th/dh — die gibt es nicht. */
const DE = {
  A: 'a', B: 'b', C: 'z', CH: 'tsch', D: 'd', DH: 'd', E: 'e', EH: 'e',
  F: 'f', G: 'g', GJ: 'dj', H: 'h', I: 'i', J: 'j', K: 'k', L: 'l',
  LL: 'l', M: 'm', N: 'n', NJ: 'nj', O: 'o', P: 'p', Q: 'kj', R: 'r',
  RR: 'r', S: 'ss', SH: 'sch', T: 't', TH: 't', U: 'u', V: 'w',
  X: 'ds', XH: 'dsch', Y: 'ü', Z: 's', ZH: 'sch',
};

/* Türkisch passt am besten: ş, ç, c, j, ü und das ı treffen die
   albanischen Laute fast eins zu eins. */
const TR = {
  A: 'a', B: 'b', C: 'ts', CH: 'ç', D: 'd', DH: 'd', E: 'e', EH: 'ı',
  F: 'f', G: 'g', GJ: 'gy', H: 'h', I: 'i', J: 'y', K: 'k', L: 'l',
  LL: 'l', M: 'm', N: 'n', NJ: 'ny', O: 'o', P: 'p', Q: 'ky', R: 'r',
  RR: 'rr', S: 's', SH: 'ş', T: 't', TH: 't', U: 'u', V: 'v',
  X: 'dz', XH: 'c', Y: 'ü', Z: 'z', ZH: 'j',
};

/* Spanisch: kein sch und kein ü, dafür sitzen th (z) und dh (d)
   richtig gut. Notlösung, wenn nichts Besseres da ist. */
const ES = {
  A: 'a', B: 'b', C: 'ts', CH: 'ch', D: 'd', DH: 'd', E: 'e', EH: 'e',
  F: 'f', GJ: 'gui', H: 'j', I: 'i', J: 'y', K: 'k', L: 'l',
  LL: 'l', M: 'm', N: 'n', NJ: 'ñ', O: 'o', P: 'p', Q: 'qui', R: 'r',
  RR: 'rr', S: 's', SH: 'sh', T: 't', TH: 'z', U: 'u', V: 'v',
  X: 'ds', XH: 'y', Y: 'u', Z: 's', ZH: 'y',
  // "gu" braucht es nur vor e/i — sonst würde aus "gurit" ein "guurit".
  G: (front) => (front ? 'gu' : 'g'),
};

/**
 * Tabelle anwenden. Ein Eintrag darf auch eine Funktion sein — die
 * bekommt mitgeteilt, ob ein heller Vokal (e/i) folgt. Das brauchen
 * Italienisch und Spanisch: "c" vor e/i ist tsch, sonst k.
 *
 * Der Blick nach vorn endet am Wortende: über ein Leerzeichen hinweg
 * gilt kein Folgevokal mehr.
 */
function render(tokens, table) {
  const nextInWord = (i) => {
    for (let k = i + 1; k < tokens.length; k++) {
      if (typeof tokens[k] !== 'string') return null;   // Wortgrenze
      return tokens[k];
    }
    return null;
  };

  return tokens.map((t, i) => {
    if (typeof t !== 'string') return t.raw;
    const rule = table[t];
    if (typeof rule === 'function') return rule(FRONT.has(nextInWord(i) || ''));
    return rule ?? '';
  }).join('');
}

/* Italienisch: die Zischlaute sitzen gut, nur die c/g-Regeln muss man
   mitdenken. */
const IT = {
  A: 'a', B: 'b', C: 'z', D: 'd', DH: 'd', E: 'e', EH: 'e', F: 'f',
  H: '', I: 'i', J: 'i', L: 'l', LL: 'l', M: 'm', N: 'n', NJ: 'gn',
  O: 'o', P: 'p', R: 'r', RR: 'rr', S: 'ss', T: 't', TH: 't', U: 'u',
  V: 'v', X: 'z', Y: 'u', Z: 's',
  K: (front) => (front ? 'ch' : 'c'),
  G: (front) => (front ? 'gh' : 'g'),
  CH: (front) => (front ? 'c' : 'ci'),        // tsch
  Q: (front) => (front ? 'c' : 'ci'),         // fällt in Prizren mit ç zusammen
  XH: (front) => (front ? 'g' : 'gi'),        // dsch
  GJ: (front) => (front ? 'g' : 'gi'),
  ZH: (front) => (front ? 'g' : 'gi'),
  SH: (front) => (front ? 'sc' : 'sci'),
};

/* Welche Sprachen können wir bedienen — beste zuerst. */
export const SUPPORTED = ['sq', 'tr', 'it', 'de', 'es'];

export const LANGUAGE_NOTE = {
  sq: 'Albanische Stimme — echte Aussprache.',
  tr: 'Türkische Stimme, albanisch umgeschrieben. Klingt sehr nah am Original.',
  it: 'Italienische Stimme, albanisch umgeschrieben. Gute Annäherung.',
  de: 'Deutsche Stimme, albanisch umgeschrieben. Verständlich, mit deutschem Einschlag.',
  es: 'Spanische Stimme, albanisch umgeschrieben. Notlösung — ohne "sch" und "ü".',
};

/**
 * Albanischen Text so umschreiben, dass ihn eine Stimme der
 * angegebenen Sprache halbwegs albanisch ausspricht.
 */
export function respell(text, lang) {
  const code = String(lang || '').slice(0, 2).toLowerCase();
  if (code === 'sq') return String(text);              // echte Stimme: nichts anfassen
  const tokens = toPhonemes(text);
  if (code === 'tr') return render(tokens, TR);
  if (code === 'it') return render(tokens, IT);
  if (code === 'es') return render(tokens, ES);
  return render(tokens, DE);                            // Deutsch als Rückfall
}

/** Nur zum Anzeigen: „So würde die Stimme es lesen." */
export function preview(text, lang) {
  const said = respell(text, lang);
  return said === String(text) ? null : said;
}

/* Wie gut passt eine Sprache? Größer ist besser — steuert die Auswahl. */
export function quality(lang) {
  const code = String(lang || '').slice(0, 2).toLowerCase();
  const idx = SUPPORTED.indexOf(code);
  return idx < 0 ? 0 : SUPPORTED.length - idx;
}

/** Grobe Silbentrennung fürs Vorlesen — hilft manchen Stimmen. */
export function isVowel(token) {
  return VOWELS.has(token);
}
