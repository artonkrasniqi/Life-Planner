/* ============================================================
   connections.js — Steuerung der Live-Verbindungen

   Bündelt Google Kalender und Whoop: Anmelden, Token auffrischen,
   Daten holen, Verbindung trennen. Die Views rufen nur diese
   Funktionen auf und kennen die Feinheiten der Anbieter nicht.
   ============================================================ */

import { store, events as eventsApi, bio } from '../store.js';
import { toISODate, addDays, toast, uid } from '../util.js';
import * as google from './google.js';
import * as whoop from './whoop.js';

/** Adresse, die bei Whoop als Redirect-URI hinterlegt sein muss. */
export function redirectUri() {
  return location.origin + location.pathname;
}

/* ============================================================
   Google Kalender
   ============================================================ */

export const googleConn = {
  cfg() { return store.state.integrations.google || {}; },

  async connect(clientId) {
    const token = await google.requestToken(clientId, 'consent');
    store.update((s) => {
      Object.assign(s.integrations.google, {
        clientId, connected: true, lastError: '',
        accessToken: token.accessToken, expiresAt: token.expiresAt,
      });
    });
    const cals = await google.listCalendars({ ...googleConn.cfg() });
    store.update((s) => {
      s.integrations.google.calendars = cals;
      if (!s.integrations.google.calendarIds?.length) {
        const primary = cals.find((c) => c.primary) || cals[0];
        s.integrations.google.calendarIds = primary ? [primary.id] : [];
      }
    });
    return cals;
  },

  /** Sorgt für ein gültiges Token — ohne Rückfrage, wenn möglich. */
  async ensureToken() {
    const cfg = googleConn.cfg();
    if (google.tokenValid(cfg)) return cfg;
    const token = await google.requestToken(cfg.clientId, '');
    store.update((s) => {
      s.integrations.google.accessToken = token.accessToken;
      s.integrations.google.expiresAt = token.expiresAt;
    });
    return googleConn.cfg();
  },

  /** Holt die Termine aller gewählten Kalender ins Zeitfenster. */
  async sync() {
    const cfg = await googleConn.ensureToken();
    const ids = cfg.calendarIds || [];
    if (!ids.length) throw new Error('Kein Kalender ausgewählt.');

    const past = Number(cfg.rangePast ?? 30);
    const future = Number(cfg.rangeFuture ?? 120);
    const from = addDays(new Date(), -past);
    const to = addDays(new Date(), future);

    let total = 0;
    for (const calId of ids) {
      const items = await google.fetchMapped(cfg, calId, from, to);
      eventsApi.syncExternal({
        source: 'google',
        calendarId: calId,
        items,
        from: toISODate(from),
        to: toISODate(to),
      });
      total += items.length;
    }
    store.update((s) => {
      s.integrations.google.lastSync = new Date().toISOString();
      s.integrations.google.lastError = '';
    });
    return total;
  },

  disconnect() {
    eventsApi.dropExternal('google');
    store.update((s) => {
      Object.assign(s.integrations.google, {
        connected: false, accessToken: '', expiresAt: 0, lastSync: null, calendars: [], calendarIds: [],
      });
    });
  },
};

/* ============================================================
   Whoop
   ============================================================ */

const STATE_KEY = 'life-os:whoop-state';

export const whoopConn = {
  cfg() { return store.state.integrations.whoop || {}; },

  /** Schickt den Browser zur Anmeldung bei Whoop. */
  beginAuth() {
    const cfg = whoopConn.cfg();
    const state = uid() + uid();
    sessionStorage.setItem(STATE_KEY, state);
    localStorage.setItem(STATE_KEY, state);       // überlebt auch einen Neustart der App
    location.assign(whoop.buildAuthUrl(cfg, redirectUri(), state));
  },

  /**
   * Wird beim Start aufgerufen: kommt der Browser gerade von Whoop
   * zurück, steht der Anmeldecode in der Adresse.
   * @returns {Promise<boolean>} ob eine Rückkehr verarbeitet wurde
   */
  async handleRedirect() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    if (!code && !error) return false;

    const expected = sessionStorage.getItem(STATE_KEY) || localStorage.getItem(STATE_KEY);
    // Adresse säubern, damit ein Neuladen den Code nicht erneut einlöst.
    history.replaceState({}, '', redirectUri());
    sessionStorage.removeItem(STATE_KEY);
    localStorage.removeItem(STATE_KEY);

    if (error) { toast(`Whoop-Anmeldung abgebrochen: ${error}`, 'bad'); return true; }
    if (!expected || state !== expected) {
      toast('Whoop-Anmeldung verworfen — der Sicherheitswert stimmte nicht.', 'bad');
      return true;
    }

    try {
      const tokens = await whoop.exchangeCode(whoopConn.cfg(), code, redirectUri());
      store.update((s) => {
        Object.assign(s.integrations.whoop, tokens, { connected: true, lastError: '' });
      });
      toast('Mit Whoop verbunden — hole Daten …', 'good');
      const n = await whoopConn.sync();
      toast(`${n} Tage von Whoop übernommen.`, 'good');
    } catch (e) {
      store.update((s) => { s.integrations.whoop.lastError = e.message; });
      toast(`Whoop-Anmeldung fehlgeschlagen: ${e.message}`, 'bad');
    }
    return true;
  },

  async sync(days) {
    let cfg = whoopConn.cfg();
    const fresh = await whoop.ensureToken(cfg);
    if (fresh) {
      store.update((s) => { Object.assign(s.integrations.whoop, fresh); });
      cfg = whoopConn.cfg();
    }
    const entries = await whoop.fetchRange(cfg, Number(days ?? cfg.autoDays ?? 30));
    bio.upsertMany(entries, 'whoop');
    store.update((s) => {
      s.integrations.whoop.lastSync = new Date().toISOString();
      s.integrations.whoop.lastError = '';
    });
    return entries.length;
  },

  disconnect() {
    store.update((s) => {
      Object.assign(s.integrations.whoop, {
        connected: false, accessToken: '', refreshToken: '', expiresAt: 0,
      });
    });
  },
};
