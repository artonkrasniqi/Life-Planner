/* ============================================================
   settings.js — Profil, Datensicherung, Tastenkürzel
   ============================================================ */

import { h, icon, download, pickFile, toast, fmtDate, todayISO } from '../util.js';
import { store, debts, trash } from '../store.js';
import { panel, viewHead, field } from '../ui/widgets.js';
import { confirmModal } from '../ui/modal.js';
import { buildSeed } from '../seed.js';
import { providers, makePairingCode, readPairingCode } from '../sync/providers.js';
import { runSync, connectSync, disconnectSync, syncStatus } from '../sync/engine.js';
import { cryptoAvailable } from '../sync/crypto.js';
import { connectionsPanels } from '../ui/connections-panel.js';
import { BUILD } from '../build.js';
import { refresh } from '../nav.js';

/* Entwurf der Verbindungsdaten — landet erst beim Verbinden im Zustand,
   damit ein halb getipptes Token nicht gespeichert wird. */
let draft = null;
function syncDraft() {
  if (!draft) {
    const s = store.state.sync;
    draft = { provider: s.provider, token: s.token, gistId: s.gistId, url: s.url, encrypt: s.encrypt, passphrase: s.passphrase };
  }
  return draft;
}
export function resetSyncDraft() { draft = null; }

const SHORTCUTS = [
  ['/', 'Schnellnotizzeile fokussieren'],
  ['1 … 7', 'Ansicht wechseln'],
  ['N', 'Neuer Eintrag in der aktuellen Ansicht'],
  ['A', 'Schulden ein-/ausblenden (Auge)'],
  ['T', 'Zum heutigen Tag springen'],
  ['Esc', 'Dialog schließen'],
];

const QUICK_SYNTAX = [
  ['morgen · Freitag · 15.09. · in 3 Tagen', 'Datum'],
  ['10:30 · 14 Uhr · abends · früh', 'Uhrzeit'],
  ['82,40 € · 3000 EUR', 'Betrag → Buchung'],
  ['4,9 % · Rate 90', 'Zinssatz & Rate → Schuld'],
  ['! · !! · !!!', 'Priorität'],
  ['#tag', 'Tag'],
  ['termin: · schuld: · buchung:', 'Typ erzwingen'],
];

export function render() {
  const s = store.state;
  const frag = document.createDocumentFragment();

  frag.appendChild(viewHead('Konfiguration', 'Einstellungen'));

  /* ---------- Profil ---------- */
  const nameInput = h('input', {
    class: 'input', type: 'text', value: s.profile.name || '',
    dataset: { focusKey: 'set-name' },
    onchange: (e) => store.update((st) => { st.profile.name = e.target.value.trim() || 'Operator'; }),
  });
  const currencySel = h('select', { class: 'select', onchange: (e) => store.update((st) => { st.profile.currency = e.target.value; }) },
    ['EUR', 'CHF', 'USD', 'GBP'].map((c) => h('option', { value: c, selected: s.profile.currency === c ? true : null }, c)),
  );
  const privacyToggle = h('label', { class: 'switch' },
    h('input', { type: 'checkbox', checked: s.ui.debtsHidden ? true : null, onchange: () => debts.toggleHidden() }),
    h('span', { class: 'switch__track' }),
    h('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, s.ui.debtsHidden ? 'Schulden verborgen' : 'Schulden sichtbar'),
  );

  const profilePanel = panel({ title: 'Profil', sub: 'Anzeige & Währung' },
    h('div', { class: 'form-grid' },
      field('Name', nameInput),
      field('Währung', currencySel),
      h('div', { class: 'field col-2' },
        h('span', { class: 'field__label' }, 'Privatsphäre'),
        privacyToggle,
        h('span', { class: 'field__hint' }, 'Gleiche Einstellung wie das Auge-Symbol in der Kopfzeile.'),
      ),
    ),
  );

  /* ---------- Datenbestand ---------- */
  const counts = [
    ['Termine', s.events.length],
    ['Aufgaben', s.todos.length],
    ['Konten', s.accounts.length],
    ['Buchungen', s.transactions.length],
    ['Schulden', s.debts.length],
    ['Biometrie-Tage', s.bio.length],
  ];

  const dataPanel = panel({ title: 'Datenbestand', sub: `angelegt am ${fmtDate(s.meta?.created || todayISO())}` },
    h('div', { class: 'grid grid--3', style: { gap: '10px' } },
      ...counts.map(([k, v]) => h('div', { style: { border: '1px solid var(--line)', padding: '10px 12px' } },
        h('div', { class: 'panel__sub' }, k),
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: '700', color: 'var(--cyan-2)' } }, String(v)),
      )),
    ),
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
      'Alle Daten liegen ausschließlich lokal im Browser (localStorage). Nichts wird hochgeladen. Sichere sie regelmäßig als JSON.'),
  );

  /* ---------- Sicherung ---------- */
  const backupPanel = panel({ title: 'Sicherung', sub: 'Export / Import / Zurücksetzen' },
    h('div', { class: 'row' },
      h('button', {
        class: 'btn btn--primary',
        onclick: () => {
          download(`life-os-backup-${todayISO()}.json`, store.export());
          toast('Sicherung heruntergeladen.', 'good');
        },
        html: icon('download', 13) + '<span>Backup exportieren</span>',
      }),
      h('button', {
        class: 'btn',
        onclick: async () => {
          const res = await pickFile('.json,application/json');
          if (!res) return;
          try {
            const data = JSON.parse(res.text);
            if (!data || typeof data !== 'object') throw new Error('Unerwartetes Format');
            const ok = await confirmModal({
              title: 'Backup einspielen',
              message: 'Der aktuelle Datenbestand wird vollständig ersetzt. Fortfahren?',
              confirmLabel: 'Ersetzen', danger: true,
            });
            if (!ok) return;
            store.replace(data);
            toast('Backup eingespielt.', 'good');
          } catch (e) {
            toast(`Import fehlgeschlagen: ${e.message}`, 'bad');
          }
        },
        html: icon('upload', 13) + '<span>Backup einspielen</span>',
      }),
      h('button', {
        class: 'btn btn--gold',
        onclick: async () => {
          const ok = await confirmModal({
            title: 'Demo-Daten laden',
            message: 'Ersetzt den aktuellen Bestand durch einen kompletten Beispieldatensatz (Termine, Buchungen, Schulden, 60 Tage Whoop-Werte).',
            confirmLabel: 'Demo laden',
          });
          if (!ok) return;
          store.replace(buildSeed());
          toast('Demo-Daten geladen.', 'good');
        },
        html: icon('zap', 13) + '<span>Demo-Daten</span>',
      }),
      h('button', {
        class: 'btn btn--danger',
        onclick: async () => {
          const ok = await confirmModal({
            title: 'Alles löschen',
            message: 'Sämtliche Termine, Aufgaben, Finanzen, Schulden und Vitalwerte werden unwiderruflich entfernt. Vorher ein Backup exportieren?',
            confirmLabel: 'Endgültig löschen', danger: true,
          });
          if (!ok) return;
          store.reset();
          toast('Alle Daten gelöscht.', 'warn');
        },
        html: icon('trash', 13) + '<span>Alles löschen</span>',
      }),
    ),
  );

  /* ---------- Tastenkürzel ---------- */
  const keysPanel = panel({ title: 'Tastenkürzel', sub: 'Schneller navigieren' },
    ...SHORTCUTS.map(([k, v]) => h('div', { class: 'row', style: { justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '7px' } },
      h('kbd', {
        style: {
          fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '2px 8px',
          border: '1px solid var(--line-strong)', color: 'var(--cyan-2)', background: 'rgba(58,215,255,.08)',
        },
      }, k),
      h('span', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, v),
    )),
  );

  /* ---------- Papierkorb ---------- */
  const trashItems = trash.list();
  const trashPanel = panel({
    title: 'Papierkorb',
    sub: trashItems.length ? `${trashItems.length} Einträge · 30 Tage` : 'leer',
    pad0: true,
    tools: trashItems.length
      ? h('button', {
          class: 'btn btn--sm btn--danger',
          onclick: async () => {
            const ok = await confirmModal({
              title: 'Papierkorb leeren',
              message: `${trashItems.length} Einträge endgültig entfernen?`,
              confirmLabel: 'Endgültig löschen', danger: true,
            });
            if (ok) { trash.empty(); toast('Papierkorb geleert.', 'warn'); }
          },
        }, 'Leeren')
      : null,
  },
    trashItems.length
      ? h('div', { class: 'list' }, trashItems.slice(0, 40).map((t) => h('div', { class: 'item' },
          h('div', { class: 'item__main' },
            h('div', { class: 'item__title' }, t.title),
            h('div', { class: 'item__meta' },
              h('span', { class: 'tag' }, t.label),
              h('span', {}, new Date(t.deletedAt).toLocaleString('de-DE')),
            ),
          ),
          h('div', { class: 'item__actions' },
            h('button', {
              class: 'btn btn--sm',
              onclick: () => { trash.restore(t.key); toast('Wiederhergestellt.', 'good'); },
            }, 'Zurückholen'),
          ),
        )))
      : h('div', { style: { padding: '0 16px 16px' } },
          h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
            'Gelöschtes landet hier und bleibt 30 Tage lang wiederherstellbar. Direkt nach dem Löschen geht es auch über „Rückgängig“ in der Einblendung unten rechts.')),
  );

  /* ---------- Synchronisierung ---------- */
  const syncPanel = buildSyncPanel();

  /* ---------- Externe Verbindungen ---------- */
  const [googlePanel, whoopPanel] = connectionsPanels();

  /* ---------- Schnellnotiz ---------- */
  const syntaxPanel = panel({ title: 'Schnellnotiz', sub: 'Was die Zeile oben erkennt' },
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
      'Einfach lostippen — der Typ ergibt sich aus dem Text und lässt sich in der Vorschau mit einem Klick korrigieren.'),
    ...QUICK_SYNTAX.map(([k, v]) => h('div', { class: 'row', style: { justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '7px', gap: '14px' } },
      h('code', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--cyan-2)' } }, k),
      h('span', { style: { fontSize: '12px', color: 'var(--muted)', textAlign: 'right', flex: 'none' } }, v),
    )),
  );

  /* ---------- Über ---------- */
  const aboutPanel = panel({ title: 'Über', sub: 'L.I.F.E. OS' },
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.7' } },
      'Life Integrated Framework / Execution — ein lokaler Life-Planner ohne Server, ohne Tracking, ohne Abhängigkeiten. ' +
      'Termine, Aufgaben, Finanzen, Schulden und Biometrie in einem HUD.'),
    h('div', { class: 'row', style: { marginTop: '6px' } },
      h('span', { class: 'pill pill--cyan' }, 'v1.0'),
      h('span', { class: 'pill pill--gold' }, BUILD),
      h('span', { class: 'pill pill--muted' }, 'localStorage'),
      h('span', { class: 'pill pill--muted' }, 'Whoop · Google'),
    ),
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6', borderTop: '1px solid var(--line)', paddingTop: '10px' } },
      'Zeigt die App eine alte Fassung, leert dieser Knopf den Zwischenspeicher und lädt sie frisch. Deine Daten bleiben dabei unberührt.'),
    h('button', {
      class: 'btn btn--gold',
      onclick: async () => {
        toast('Lade neu \u2026');
        try {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          }
          if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch (e) {
          console.warn('[L.I.F.E. OS] Cache-Reinigung:', e);
        }
        location.reload(true);
      },
      html: icon('refresh', 13) + '<span>Neu laden erzwingen</span>',
    }),
  );

  frag.appendChild(h('div', { class: 'grid grid--main' },
    h('div', { class: 'stack' }, syncPanel, googlePanel, whoopPanel, profilePanel, backupPanel, trashPanel, dataPanel),
    h('div', { class: 'stack' }, syntaxPanel, keysPanel, aboutPanel),
  ));

  return frag;
}

/* ============================================================
   Synchronisierung
   ============================================================ */
function buildSyncPanel() {
  const s = store.state;
  const d = syncDraft();
  const st = syncStatus();
  const connected = s.sync.provider !== 'off';

  const STATUS_LOOK = {
    off: ['pill--muted', 'Aus'],
    idle: ['pill--green', 'Verbunden'],
    syncing: ['pill--cyan', 'Abgleich läuft'],
    error: ['pill--red', 'Fehler'],
    offline: ['pill--gold', 'Offline'],
  };
  const [pillCls, pillTxt] = STATUS_LOOK[st.status] || STATUS_LOOK.off;

  const providerSel = h('select', {
    class: 'select',
    onchange: (e) => { d.provider = e.target.value; refresh(); },
  },
    h('option', { value: 'off', selected: d.provider === 'off' ? true : null }, 'Aus — nur dieses Gerät'),
    ...Object.values(providers).map((p) =>
      h('option', { value: p.id, selected: d.provider === p.id ? true : null }, p.label)),
  );

  const tokenInput = h('input', {
    class: 'input', type: 'password', value: d.token, placeholder: 'github_pat_…',
    dataset: { focusKey: 'sync-token' },
    autocomplete: 'off',
    oninput: (e) => { d.token = e.target.value.trim(); },
  });

  const gistInput = h('input', {
    class: 'input', type: 'text', value: d.gistId, placeholder: 'wird beim ersten Abgleich angelegt',
    dataset: { focusKey: 'sync-gist' },
    oninput: (e) => { d.gistId = e.target.value.trim(); },
  });

  const urlInput = h('input', {
    class: 'input', type: 'text', value: d.url, placeholder: 'https://mein-server.example/life-os',
    dataset: { focusKey: 'sync-url' },
    oninput: (e) => { d.url = e.target.value.trim(); },
  });

  const passInput = h('input', {
    class: 'input', type: 'password', value: d.passphrase, placeholder: 'auf allen Geräten identisch',
    dataset: { focusKey: 'sync-pass' },
    autocomplete: 'new-password',
    oninput: (e) => { d.passphrase = e.target.value; },
  });

  const encryptToggle = h('label', { class: 'switch' },
    h('input', {
      type: 'checkbox', checked: d.encrypt ? true : null,
      onchange: (e) => { d.encrypt = e.target.checked; refresh(); },
    }),
    h('span', { class: 'switch__track' }),
    h('span', { style: { fontSize: '12px', color: 'var(--muted)' } },
      d.encrypt ? 'Daten werden verschlüsselt abgelegt' : '⚠ unverschlüsselt'),
  );

  const autoToggle = h('label', { class: 'switch' },
    h('input', {
      type: 'checkbox', checked: s.sync.auto ? true : null,
      onchange: (e) => store.update((st2) => { st2.sync.auto = e.target.checked; }),
    }),
    h('span', { class: 'switch__track' }),
    h('span', { style: { fontSize: '12px', color: 'var(--muted)' } },
      s.sync.auto ? 'gleicht selbstständig ab' : 'nur auf Knopfdruck'),
  );

  const fields = [];
  if (d.provider === 'gist') {
    fields.push(
      field('GitHub-Token', tokenInput, 'Fein abgestuftes Token mit der Berechtigung „Gists: read and write“'),
      field('Gist-ID', gistInput, 'Auf dem zweiten Gerät dieselbe ID eintragen'),
    );
  } else if (d.provider === 'rest') {
    fields.push(
      field('Adresse', urlInput, 'GET liefert den Stand, PUT nimmt ihn entgegen'),
      field('Token (optional)', tokenInput, 'wird als Bearer-Token gesendet'),
    );
  }
  if (d.provider !== 'off') {
    fields.push(
      h('div', { class: 'field col-2' },
        h('span', { class: 'field__label' }, 'Verschlüsselung'),
        encryptToggle,
      ),
      d.encrypt ? field('Kennwort', passInput, 'Ohne dieses Kennwort sind die Daten nicht lesbar — auch nicht für dich') : null,
    );
  }

  const actions = [];
  if (d.provider !== 'off') {
    actions.push(h('button', {
      class: 'btn btn--primary',
      onclick: async () => {
        const provider = providers[d.provider];
        const problem = provider.validate(d);
        if (problem) { toast(problem, 'warn'); return; }
        if (d.encrypt && !d.passphrase) { toast('Bitte ein Kennwort setzen.', 'warn'); return; }
        if (d.encrypt && !cryptoAvailable()) { toast('Verschlüsselung braucht https oder localhost.', 'bad'); return; }
        toast('Verbinde …');
        const res = await connectSync({ ...d });
        if (res && res.ok) toast('Verbunden und abgeglichen.', 'good');
        else if (res) toast(res.error, 'bad');
      },
      html: icon('link', 13) + `<span>${connected ? 'Aktualisieren' : 'Verbinden'}</span>`,
    }));
  }
  if (connected) {
    actions.push(h('button', {
      class: 'btn', disabled: st.busy ? true : null,
      onclick: async () => { const r = await runSync('Knopfdruck'); if (r && !r.ok) toast(r.error, 'bad'); },
      html: icon('refresh', 13) + '<span>Jetzt abgleichen</span>',
    }));
    actions.push(h('button', {
      class: 'btn btn--gold',
      onclick: async () => {
        const code = makePairingCode(store.state.sync);
        try {
          await navigator.clipboard.writeText(code);
          toast('Kopplungscode kopiert — enthält das Token, also vorsichtig damit.', 'warn');
        } catch {
          await confirmModal({ title: 'Kopplungscode', message: h('code', { style: { wordBreak: 'break-all', fontSize: '11px' } }, code), confirmLabel: 'OK' });
        }
      },
      html: icon('save', 13) + '<span>Kopplungscode</span>',
    }));
    actions.push(h('button', {
      class: 'btn btn--danger',
      onclick: async () => {
        const ok = await confirmModal({
          title: 'Verbindung trennen',
          message: 'Token und Kennwort werden von diesem Gerät entfernt. Die Daten bleiben lokal und auf der Gegenstelle erhalten.',
          confirmLabel: 'Trennen', danger: true,
        });
        if (!ok) return;
        disconnectSync();
        resetSyncDraft();
        toast('Verbindung getrennt.', 'warn');
      },
      html: icon('x', 13) + '<span>Trennen</span>',
    }));
  } else {
    actions.push(h('button', {
      class: 'btn btn--ghost',
      onclick: async () => {
        const code = prompt('Kopplungscode vom ersten Gerät einfügen:');
        if (!code) return;
        try {
          const cfg = readPairingCode(code);
          draft = { ...syncDraft(), ...cfg };
          refresh();
          toast('Code übernommen — jetzt nur noch das Kennwort setzen und verbinden.', 'good');
        } catch (e) {
          toast(e.message, 'bad');
        }
      },
      html: icon('upload', 13) + '<span>Kopplungscode einfügen</span>',
    }));
  }

  return panel({
    title: 'Synchronisierung',
    sub: connected ? providers[s.sync.provider]?.label : 'nicht eingerichtet',
    tools: h('span', { class: `pill ${pillCls}` }, pillTxt),
  },
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.6' } },
      d.provider !== 'off' && providers[d.provider]
        ? providers[d.provider].hint
        : 'Ohne Abgleich bleibt jeder Browser für sich. Mit Abgleich teilen sich alle Geräte denselben Stand — verschlüsselt, sodass am Ablageort nur unlesbare Zeichen liegen.'),

    field('Ablageort', providerSel),
    h('div', { class: 'form-grid' }, ...fields.filter(Boolean)),
    connected
      ? h('div', { class: 'field' },
          h('span', { class: 'field__label' }, 'Automatik'),
          autoToggle,
        )
      : null,
    h('div', { class: 'row' }, ...actions),

    st.message
      ? h('div', {
          style: {
            fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6',
            color: st.status === 'error' ? 'var(--red)' : 'var(--muted)',
            borderLeft: `2px solid ${st.status === 'error' ? 'var(--red)' : 'var(--line-strong)'}`,
            paddingLeft: '10px',
          },
        }, st.message)
      : null,
    s.sync.lastSync
      ? h('div', { class: 'kpi__foot' }, `Letzter Abgleich: ${new Date(s.sync.lastSync).toLocaleString('de-DE')}`)
      : null,
  );
}
