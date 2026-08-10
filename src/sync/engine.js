/* ============================================================
   engine.js — Ablauf des Abgleichs

   Ein Durchlauf ist immer dieselbe Kette:
     lesen → zusammenführen → lokal übernehmen → zurückschreiben

   Zuerst zusammenführen, dann schreiben: so kann ein Gerät den
   Stand des anderen nie überbügeln, auch wenn es lange offline war.
   ============================================================ */

import { store } from '../store.js';
import { mergeStates, syncPayload, describeMerge } from './merge.js';
import { encryptJSON, decryptJSON, isEncrypted, cryptoAvailable } from './crypto.js';
import { getProvider } from './providers.js';

const AUTO_DELAY_MS = 4000;      // Ruhezeit nach der letzten Änderung
const MIN_INTERVAL_MS = 15000;   // Mindestabstand zwischen zwei Durchläufen

const listeners = new Set();
let statusState = { status: 'off', message: '', lastSync: null, busy: false };
let timer = null;
let lastRun = 0;
let running = null;

export function onSyncStatus(fn) {
  listeners.add(fn);
  fn(statusState);
  return () => listeners.delete(fn);
}

function setStatus(patch) {
  statusState = { ...statusState, ...patch };
  for (const fn of listeners) fn(statusState);
}

export function syncStatus() { return statusState; }

export function isConfigured() {
  const cfg = store.state.sync || {};
  return cfg.provider && cfg.provider !== 'off';
}

/* ------------------------------------------------------------
   Ein Durchlauf
   ------------------------------------------------------------ */
export async function runSync(reason = 'manuell') {
  if (running) return running;                     // nie zwei parallel
  const cfg = store.state.sync || {};
  const provider = getProvider(cfg.provider);
  if (!provider) { setStatus({ status: 'off', message: '', busy: false }); return null; }

  const problem = provider.validate(cfg);
  if (problem) { setStatus({ status: 'error', message: problem, busy: false }); return null; }
  if (cfg.encrypt && !cfg.passphrase) {
    setStatus({ status: 'error', message: 'Kennwort fehlt — ohne das kann nicht verschlüsselt werden.', busy: false });
    return null;
  }
  if (cfg.encrypt && !cryptoAvailable()) {
    setStatus({ status: 'error', message: 'Verschlüsselung braucht https (oder localhost).', busy: false });
    return null;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setStatus({ status: 'offline', message: 'Kein Netz — wird nachgeholt.', busy: false });
    return null;
  }

  running = (async () => {
    setStatus({ status: 'syncing', message: `Abgleich (${reason}) …`, busy: true });
    lastRun = Date.now();
    try {
      /* 1. Gegenstelle lesen */
      const raw = await provider.read(cfg);
      let remote = null;
      if (raw) {
        if (isEncrypted(raw)) {
          if (!cfg.passphrase) throw new Error('Die Gegenstelle ist verschlüsselt — Kennwort eingeben.');
          remote = await decryptJSON(raw, cfg.passphrase);
        } else {
          remote = raw;
        }
      }

      /* 2. Zusammenführen und lokal übernehmen */
      const before = store.state;
      const merged = mergeStates(before, remote);
      const delta = describeMerge(before, merged);
      store.applyRemote(merged);

      /* 3. Zurückschreiben */
      const payload = syncPayload(store.state);
      const body = cfg.encrypt ? await encryptJSON(payload, cfg.passphrase) : payload;
      const patch = await provider.write(store.state.sync, body);

      const now = new Date().toISOString();
      store.update((s) => {
        Object.assign(s.sync, patch || {}, { lastSync: now, lastError: '' });
      });
      store.clearDirty();

      const pulled = Object.entries(delta).filter(([, n]) => n > 0);
      setStatus({
        status: 'idle',
        busy: false,
        lastSync: now,
        message: pulled.length
          ? `Übernommen: ${pulled.map(([k, n]) => `${n} ${label(k, n)}`).join(', ')}`
          : 'Alles auf demselben Stand.',
      });
      return { ok: true, delta };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      store.update((s) => { s.sync.lastError = message; });
      setStatus({ status: 'error', busy: false, message });
      return { ok: false, error: message };
    } finally {
      running = null;
    }
  })();

  return running;
}

const LABELS = {
  events: ['Termin', 'Termine'],
  todos: ['Aufgabe', 'Aufgaben'],
  accounts: ['Konto', 'Konten'],
  transactions: ['Buchung', 'Buchungen'],
  debts: ['Schuld', 'Schulden'],
  bio: ['Vitaltag', 'Vitaltage'],
};
function label(key, n) {
  const pair = LABELS[key];
  return pair ? pair[n === 1 ? 0 : 1] : key;
}

/* ------------------------------------------------------------
   Automatik
   ------------------------------------------------------------ */
function schedule(reason, delay = AUTO_DELAY_MS) {
  if (!isConfigured() || !store.state.sync.auto) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (Date.now() - lastRun < MIN_INTERVAL_MS) {
      schedule(reason, MIN_INTERVAL_MS - (Date.now() - lastRun));
      return;
    }
    runSync(reason);
  }, delay);
}

export function startSync() {
  if (!isConfigured()) { setStatus({ status: 'off', message: '', busy: false }); return; }
  setStatus({ status: 'idle', lastSync: store.state.sync.lastSync, message: '' });

  // Nach lokalen Änderungen, sobald für einen Moment Ruhe ist
  store.subscribe(() => { if (store.dirty) schedule('Änderung'); });

  // Beim Zurückkehren in den Tab und wenn das Netz wiederkommt
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule('Rückkehr', 800);
  });
  window.addEventListener('online', () => schedule('online', 500));

  // Beim Start einmal ziehen
  schedule('Start', 1200);
}

/** Verbindung einrichten und sofort abgleichen. */
export async function connectSync(cfg) {
  store.update((s) => { Object.assign(s.sync, cfg, { lastError: '' }); });
  // Beim ersten Verbinden bekommt alles einen frischen Stempel, damit der
  // lokale Bestand nicht als „uralt" gilt und von leeren Daten verdrängt wird.
  if (!store.state.sync.lastSync) store.touchAll();
  const res = await runSync('Verbinden');
  if (res && res.ok) schedule('Start', AUTO_DELAY_MS);
  return res;
}

export function disconnectSync() {
  clearTimeout(timer);
  store.update((s) => {
    s.sync.provider = 'off';
    s.sync.token = '';
    s.sync.passphrase = '';
    s.sync.lastError = '';
  });
  setStatus({ status: 'off', message: '', busy: false, lastSync: null });
}
