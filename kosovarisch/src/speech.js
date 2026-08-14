/* ============================================================
   speech.js — Sprachausgabe, wenn das Gerät sie kann

   Ehrliche Vorwarnung: iOS bringt von Haus aus KEINE albanische
   Stimme mit. Ist keine vorhanden, blenden wir die Hörknöpfe
   aus und verlassen uns auf die Lautschrift — lieber gar keine
   Aussprache als eine falsche mit deutscher oder englischer
   Stimme.

   Wer eine albanische Stimme installiert (Einstellungen →
   Bedienungshilfen → Gesprochene Inhalte → Stimmen → Albanisch),
   bekommt die Knöpfe automatisch angezeigt.
   ============================================================ */

import { settings } from './state.js';

let cached = null;
let ready = false;

function findVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.find((v) => /^sq/i.test(v.lang)) || null;
}

function refresh() {
  cached = findVoice();
  ready = true;
}

if ('speechSynthesis' in window) {
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
  // Safari meldet die Stimmen manchmal verspätet.
  setTimeout(refresh, 600);
}

/** Gibt es eine albanische Stimme auf diesem Gerät? */
export function hasVoice() {
  if (!ready) refresh();
  return !!cached;
}

/** Text vorlesen. Gibt false zurück, wenn es nicht geht. */
export function speak(text) {
  if (!settings().speech || !hasVoice()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = cached;
    u.lang = cached.lang;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}
