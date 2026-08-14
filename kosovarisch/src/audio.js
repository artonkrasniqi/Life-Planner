/* ============================================================
   audio.js — Töne und kleines Rütteln

   Keine Sounddateien: alles wird per Web Audio erzeugt. Das
   spart Ladezeit und funktioniert offline sofort. iOS lässt
   Töne erst nach der ersten Berührung zu — deshalb wird der
   Audiokontext beim ersten Tippen entsperrt.
   ============================================================ */

import { settings } from './state.js';

let ctx = null;

function ensure() {
  if (!settings().sound) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Einmalig an eine Nutzergeste hängen (iOS-Freischaltung). */
export function unlock() {
  const c = ensure();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.01);
}

function tone(freq, start, dur, type = 'sine', vol = 0.16) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function buzz(pattern) {
  if (!settings().haptics) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export const sfx = {
  tap() { tone(420, 0, 0.05, 'triangle', 0.06); },
  correct() {
    tone(660, 0, 0.12, 'sine', 0.14);
    tone(880, 0.08, 0.16, 'sine', 0.12);
    buzz(18);
  },
  wrong() {
    tone(190, 0, 0.2, 'sawtooth', 0.1);
    tone(140, 0.1, 0.24, 'sawtooth', 0.09);
    buzz([28, 40, 28]);
  },
  combo(n) {
    const base = 620 + Math.min(n, 12) * 45;
    tone(base, 0, 0.09, 'square', 0.07);
  },
  complete() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'sine', 0.14));
    buzz([20, 60, 20]);
  },
  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.15));
    buzz([30, 50, 30, 50, 60]);
  },
  badge() {
    [784, 988, 1319].forEach((f, i) => tone(f, i * 0.12, 0.35, 'sine', 0.13));
    buzz([25, 40, 60]);
  },
  tick() { tone(1200, 0, 0.03, 'square', 0.05); },
};
