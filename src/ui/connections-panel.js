/* ============================================================
   connections-panel.js — Einrichtung von Google Kalender & Whoop
   ============================================================ */

import { h, icon, toast, fmtDate } from '../util.js';
import { store } from '../store.js';
import { panel, field } from './widgets.js';
import { confirmModal } from './modal.js';
import { googleConn, whoopConn, redirectUri } from '../integrations/connections.js';
import { refresh } from '../nav.js';

/* Entwürfe, damit halb getippte Werte nicht sofort gespeichert werden. */
let gDraft = null;
let wDraft = null;

function draftGoogle() {
  if (!gDraft) {
    const c = store.state.integrations.google;
    gDraft = { clientId: c.clientId, rangePast: c.rangePast, rangeFuture: c.rangeFuture };
  }
  return gDraft;
}
function draftWhoop() {
  if (!wDraft) {
    const c = store.state.integrations.whoop;
    wDraft = { clientId: c.clientId, workerUrl: c.workerUrl, appKey: c.appKey, autoDays: c.autoDays };
  }
  return wDraft;
}
export function resetConnectionDrafts() { gDraft = null; wDraft = null; }

function statusPill(cfg) {
  if (cfg.lastError) return h('span', { class: 'pill pill--red' }, 'Fehler');
  if (cfg.connected) return h('span', { class: 'pill pill--green' }, 'Verbunden');
  return h('span', { class: 'pill pill--muted' }, 'Nicht verbunden');
}

function copyRow(label, value) {
  return h('div', { class: 'field col-2' },
    h('span', { class: 'field__label' }, label),
    h('div', { class: 'row row--tight', style: { alignItems: 'stretch' } },
      h('code', {
        style: {
          flex: '1', minWidth: '0', padding: '9px 11px', fontSize: '11.5px',
          fontFamily: 'var(--font-mono)', color: 'var(--cyan-2)',
          background: 'rgba(4,10,18,.85)', border: '1px solid var(--line)',
          overflowX: 'auto', whiteSpace: 'nowrap',
        },
      }, value),
      h('button', {
        class: 'btn btn--sm btn--ghost',
        onclick: async () => {
          try { await navigator.clipboard.writeText(value); toast('Kopiert.', 'good'); }
          catch { toast('Kopieren nicht möglich — bitte markieren.', 'warn'); }
        },
      }, 'Kopieren'),
    ),
  );
}

/* ============================================================
   Google Kalender
   ============================================================ */
function googlePanel() {
  const cfg = store.state.integrations.google;
  const d = draftGoogle();

  const clientInput = h('input', {
    class: 'input', type: 'text', value: d.clientId,
    placeholder: '1234567890-abc….apps.googleusercontent.com',
    dataset: { focusKey: 'g-client' }, autocomplete: 'off',
    oninput: (e) => { d.clientId = e.target.value.trim(); },
  });

  const calendarList = cfg.calendars?.length
    ? h('div', { class: 'field col-2' },
        h('span', { class: 'field__label' }, 'Kalender'),
        h('div', { class: 'stack', style: { gap: '6px' } },
          ...cfg.calendars.map((c) => h('label', { class: 'switch', style: { justifyContent: 'flex-start' } },
            h('input', {
              type: 'checkbox',
              checked: (cfg.calendarIds || []).includes(c.id) ? true : null,
              onchange: (e) => store.update((s) => {
                const ids = new Set(s.integrations.google.calendarIds || []);
                if (e.target.checked) ids.add(c.id); else ids.delete(c.id);
                s.integrations.google.calendarIds = [...ids];
              }),
            }),
            h('span', { class: 'switch__track' }),
            h('span', { style: { fontSize: '12.5px' } }, c.name + (c.primary ? ' · Haupt' : '')),
          )),
        ),
      )
    : null;

  const rangeRow = cfg.connected
    ? [
        field('Vergangenheit (Tage)', h('input', {
          class: 'input', type: 'number', min: 0, max: 365, value: cfg.rangePast,
          onchange: (e) => store.update((s) => { s.integrations.google.rangePast = Number(e.target.value) || 0; }),
        })),
        field('Zukunft (Tage)', h('input', {
          class: 'input', type: 'number', min: 1, max: 730, value: cfg.rangeFuture,
          onchange: (e) => store.update((s) => { s.integrations.google.rangeFuture = Number(e.target.value) || 30; }),
        })),
      ]
    : [];

  const actions = [
    h('button', {
      class: 'btn btn--primary',
      onclick: async () => {
        if (!d.clientId) { toast('Bitte zuerst die Client-ID eintragen.', 'warn'); return; }
        try {
          toast('Google-Fenster wird geöffnet …');
          await googleConn.connect(d.clientId);
          const n = await googleConn.sync();
          toast(`Verbunden — ${n} Termine übernommen.`, 'good');
        } catch (e) {
          store.update((s) => { s.integrations.google.lastError = e.message; });
          toast(e.message, 'bad');
        }
      },
      html: icon('link', 13) + `<span>${cfg.connected ? 'Neu anmelden' : 'Verbinden'}</span>`,
    }),
  ];

  if (cfg.connected) {
    actions.push(h('button', {
      class: 'btn',
      onclick: async () => {
        try {
          const n = await googleConn.sync();
          toast(`${n} Termine aktualisiert.`, 'good');
        } catch (e) {
          store.update((s) => { s.integrations.google.lastError = e.message; });
          toast(e.message, 'bad');
        }
      },
      html: icon('refresh', 13) + '<span>Termine holen</span>',
    }));
    actions.push(h('button', {
      class: 'btn btn--danger',
      onclick: async () => {
        const ok = await confirmModal({
          title: 'Google trennen',
          message: 'Die gespiegelten Google-Termine werden aus der App entfernt. In Google bleibt alles unverändert.',
          confirmLabel: 'Trennen', danger: true,
        });
        if (!ok) return;
        googleConn.disconnect();
        resetConnectionDrafts();
        toast('Google getrennt.', 'warn');
      },
      html: icon('x', 13) + '<span>Trennen</span>',
    }));
  }

  return panel({
    title: 'Google Kalender',
    sub: cfg.lastSync ? `Stand ${new Date(cfg.lastSync).toLocaleString('de-DE')}` : 'nicht eingerichtet',
    tools: statusPill(cfg),
  },
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
      'Deine Google-Termine werden in die Zeitachse gespiegelt — gelesen, nicht verändert. Einmalig brauchst du eine OAuth-Client-ID aus der Google Cloud Console.'),

    h('details', { style: { fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.7' } },
      h('summary', { style: { cursor: 'pointer', color: 'var(--cyan-2)' } }, 'Anleitung: Client-ID besorgen'),
      h('ol', { style: { paddingLeft: '18px', marginTop: '8px' } },
        h('li', {}, 'console.cloud.google.com öffnen, Projekt anlegen'),
        h('li', {}, '„APIs & Dienste“ → Bibliothek → Google Calendar API aktivieren'),
        h('li', {}, '„OAuth-Zustimmungsbildschirm“ → Extern → dich selbst als Testnutzer eintragen'),
        h('li', {}, '„Anmeldedaten“ → OAuth-Client-ID erstellen → Webanwendung'),
        h('li', {}, 'Bei „Autorisierte JavaScript-Quellen“ die Adresse unten eintragen'),
        h('li', {}, 'Client-ID kopieren und hier einsetzen'),
      ),
    ),
    copyRow('Autorisierte JavaScript-Quelle', location.origin),

    h('div', { class: 'form-grid' },
      h('div', { class: 'field col-2' },
        h('span', { class: 'field__label' }, 'Client-ID'),
        clientInput,
      ),
      ...rangeRow,
      calendarList,
    ),
    h('div', { class: 'row' }, ...actions),
    cfg.lastError
      ? h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', borderLeft: '2px solid var(--red)', paddingLeft: '10px', lineHeight: '1.6' } }, cfg.lastError)
      : null,
  );
}

/* ============================================================
   Whoop
   ============================================================ */
function whoopPanel() {
  const cfg = store.state.integrations.whoop;
  const d = draftWhoop();

  const inp = (key, placeholder, type = 'text') => h('input', {
    class: 'input', type, value: d[key] ?? '', placeholder,
    dataset: { focusKey: 'w-' + key }, autocomplete: 'off',
    oninput: (e) => { d[key] = e.target.value.trim(); },
  });

  const save = () => store.update((s) => {
    Object.assign(s.integrations.whoop, {
      clientId: d.clientId, workerUrl: d.workerUrl, appKey: d.appKey,
      autoDays: Number(d.autoDays) || 30,
    });
  });

  const actions = [
    h('button', {
      class: 'btn btn--primary',
      onclick: () => {
        if (!d.clientId || !d.workerUrl) { toast('Client-ID und Worker-Adresse werden gebraucht.', 'warn'); return; }
        save();
        try { whoopConn.beginAuth(); }
        catch (e) { toast(e.message, 'bad'); }
      },
      html: icon('link', 13) + `<span>${cfg.connected ? 'Neu anmelden' : 'Mit Whoop verbinden'}</span>`,
    }),
    h('button', {
      class: 'btn btn--ghost',
      onclick: () => { save(); toast('Gespeichert.', 'good'); refresh(); },
      html: icon('save', 13) + '<span>Nur speichern</span>',
    }),
  ];

  if (cfg.connected) {
    actions.push(h('button', {
      class: 'btn',
      onclick: async () => {
        try {
          toast('Hole Whoop-Daten …');
          const n = await whoopConn.sync();
          toast(`${n} Tage aktualisiert.`, 'good');
        } catch (e) {
          store.update((s) => { s.integrations.whoop.lastError = e.message; });
          toast(e.message, 'bad');
        }
      },
      html: icon('refresh', 13) + '<span>Jetzt abrufen</span>',
    }));
    actions.push(h('button', {
      class: 'btn btn--danger',
      onclick: async () => {
        const ok = await confirmModal({
          title: 'Whoop trennen',
          message: 'Die Anmeldung wird entfernt. Bereits geholte Vitalwerte bleiben erhalten.',
          confirmLabel: 'Trennen', danger: true,
        });
        if (!ok) return;
        whoopConn.disconnect();
        resetConnectionDrafts();
        toast('Whoop getrennt.', 'warn');
      },
      html: icon('x', 13) + '<span>Trennen</span>',
    }));
  }

  return panel({
    title: 'Whoop — automatisch',
    sub: cfg.lastSync ? `Stand ${new Date(cfg.lastSync).toLocaleString('de-DE')}` : 'nicht eingerichtet',
    tools: statusPill(cfg),
  },
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
      'Whoop verlangt beim Anmelden ein geheimes Kennzeichen, das nicht in eine öffentliche Web-App gehört. Deshalb läuft der Abruf über einen winzigen eigenen Vermittler — der Code dafür liegt im Projekt unter worker/whoop-proxy.js und ist bei Cloudflare kostenlos.'),

    h('details', { style: { fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.7' } },
      h('summary', { style: { cursor: 'pointer', color: 'var(--cyan-2)' } }, 'Anleitung: Whoop-App und Vermittler'),
      h('ol', { style: { paddingLeft: '18px', marginTop: '8px' } },
        h('li', {}, 'developer.whoop.com → App anlegen, unten stehende Adresse als Redirect-URI eintragen'),
        h('li', {}, 'Scopes: read:recovery, read:cycles, read:sleep, read:profile, offline'),
        h('li', {}, 'dash.cloudflare.com → Workers → neuen Worker mit dem Inhalt von worker/whoop-proxy.js'),
        h('li', {}, 'Dort WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET und ALLOWED_ORIGIN setzen'),
        h('li', {}, 'Worker-Adresse und Client-ID hier eintragen, dann verbinden'),
      ),
    ),
    copyRow('Redirect-URI für die Whoop-App', redirectUri()),

    h('div', { class: 'form-grid' },
      h('div', { class: 'field col-2' }, h('span', { class: 'field__label' }, 'Whoop Client-ID'), inp('clientId', 'aus deiner Whoop-App')),
      h('div', { class: 'field col-2' }, h('span', { class: 'field__label' }, 'Adresse des Vermittlers'), inp('workerUrl', 'https://whoop-proxy.dein-name.workers.dev')),
      field('Zugangskennwort (optional)', inp('appKey', 'nur wenn im Worker gesetzt', 'password')),
      field('Zeitraum (Tage)', h('input', {
        class: 'input', type: 'number', min: 1, max: 365, value: d.autoDays ?? 30,
        oninput: (e) => { d.autoDays = e.target.value; },
      })),
    ),
    h('div', { class: 'row' }, ...actions),
    cfg.lastError
      ? h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', borderLeft: '2px solid var(--red)', paddingLeft: '10px', lineHeight: '1.6' } }, cfg.lastError)
      : null,
  );
}

export function connectionsPanels() {
  return [googlePanel(), whoopPanel()];
}
