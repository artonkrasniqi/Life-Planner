/* ============================================================
   speech.js — Sprachausgabe auf jedem Gerät

   Albanische Stimmen gibt es auf iPhones nicht. Statt die
   Hörknöpfe wegzulassen, nehmen wir die beste vorhandene Stimme
   und schreiben den albanischen Text vorher in ihre Rechtschreibung
   um (siehe pronounce.js).

   Reihenfolge der Vorliebe: albanisch (falls doch vorhanden),
   sonst türkisch, italienisch, deutsch, spanisch. Wer will, wählt
   die Stimme im Profil selbst aus.
   ============================================================ */

import { settings, setSetting } from './state.js';
import { respell, quality, LANGUAGE_NOTE, SUPPORTED } from './pronounce.js';

const HAS_API = typeof window !== 'undefined' && 'speechSynthesis' in window;

let allVoices = [];
let ready = false;
let primed = false;
const listeners = new Set();

function collect() {
  if (!HAS_API) return;
  const list = window.speechSynthesis.getVoices() || [];
  if (!list.length) return;
  allVoices = list;
  ready = true;
  for (const fn of listeners) fn();
}

if (HAS_API) {
  collect();
  window.speechSynthesis.addEventListener?.('voiceschanged', collect);
  // Safari meldet die Stimmen gerne verspätet — mehrfach nachfassen.
  [200, 700, 1800].forEach((ms) => setTimeout(collect, ms));
}

/** Melden, sobald die Stimmenliste da ist (Safari lädt sie asynchron). */
export function onVoicesReady(fn) {
  listeners.add(fn);
  if (ready) fn();
  return () => listeners.delete(fn);
}

/** Alle Stimmen, die wir sinnvoll verwenden können — beste zuerst. */
export function usableVoices() {
  return allVoices
    .filter((v) => SUPPORTED.includes(String(v.lang).slice(0, 2).toLowerCase()))
    .sort((a, b) => {
      const q = quality(b.lang) - quality(a.lang);
      if (q !== 0) return q;
      // Lokale Stimmen bevorzugen: klingen sofort, auch ohne Netz.
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
}

/** Die aktuell benutzte Stimme: eigene Wahl, sonst die beste. */
export function currentVoice() {
  const list = usableVoices();
  if (!list.length) return null;
  const wanted = settings().voiceURI;
  return list.find((v) => v.voiceURI === wanted) || list[0];
}

export function setVoice(voiceURI) {
  setSetting('voiceURI', voiceURI || '');
}

/** Kann dieses Gerät überhaupt vorlesen? */
export function canSpeak() {
  return !!(HAS_API && settings().speech && currentVoice());
}

/** Sprachcode der aktuellen Stimme, z. B. 'de'. */
export function voiceLang() {
  const v = currentVoice();
  return v ? String(v.lang).slice(0, 2).toLowerCase() : null;
}

/** Kurzbeschreibung für die Einstellungen. */
export function describeVoice(voice) {
  const v = voice || currentVoice();
  if (!v) return null;
  const code = String(v.lang).slice(0, 2).toLowerCase();
  const names = { sq: 'Albanisch', tr: 'Türkisch', it: 'Italienisch', de: 'Deutsch', es: 'Spanisch' };
  return {
    name: v.name,
    lang: code,
    language: names[code] || v.lang,
    note: LANGUAGE_NOTE[code] || '',
    exact: code === 'sq',
    voiceURI: v.voiceURI,
  };
}

/* iOS gibt Ton erst nach einer echten Berührung frei. Einmal
   stumm anstoßen, danach läuft alles. */
export function prime() {
  if (!HAS_API || primed) return;
  primed = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch { /* egal — dann klappt es beim ersten echten Antippen */ }
}

const RATES = { langsam: 0.7, normal: 0.85, schnell: 1 };

/**
 * Albanischen Text vorlesen.
 * @returns {boolean} false, wenn das Gerät nicht vorlesen kann
 */
export function speak(text, opts = {}) {
  if (!text || !canSpeak()) return false;
  const voice = currentVoice();
  const said = respell(text, voice.lang);
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(said);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = opts.rate || RATES[settings().rate] || RATES.normal;
    u.pitch = 1;
    if (opts.onEnd) u.onend = opts.onEnd;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Mehrere Texte nacheinander vorlesen (Hörliste). */
export function speakSeries(texts, { onStep, onDone, gap = 450 } = {}) {
  if (!canSpeak() || !texts.length) return () => {};
  let stopped = false;
  let i = 0;

  const step = () => {
    if (stopped || i >= texts.length) { if (!stopped) onDone?.(); return; }
    const index = i++;
    onStep?.(index);
    const ok = speak(texts[index], { onEnd: () => setTimeout(step, gap) });
    if (!ok) { onDone?.(); return; }
  };
  step();

  return () => { stopped = true; stop(); };
}

export function stop() {
  if (HAS_API) window.speechSynthesis.cancel();
}

/** Soll automatisch vorgelesen werden? */
export function autoplayOn() {
  return canSpeak() && settings().autoplay !== false;
}

/* Wird die Seite weggelegt, soll nichts weiterplappern. */
if (HAS_API) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.speechSynthesis.cancel();
  });
}
