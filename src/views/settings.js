/* ============================================================
   settings.js — Profil, Datensicherung, Tastenkürzel
   ============================================================ */

import { h, icon, download, pickFile, toast, fmtDate, todayISO } from '../util.js';
import { store, debts } from '../store.js';
import { panel, viewHead, field } from '../ui/widgets.js';
import { confirmModal } from '../ui/modal.js';
import { buildSeed } from '../seed.js';

const SHORTCUTS = [
  ['1 … 6', 'Ansicht wechseln'],
  ['N', 'Neuer Eintrag in der aktuellen Ansicht'],
  ['A', 'Schulden ein-/ausblenden (Auge)'],
  ['T', 'Zum heutigen Tag springen'],
  ['Esc', 'Dialog schließen'],
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

  /* ---------- Über ---------- */
  const aboutPanel = panel({ title: 'Über', sub: 'L.I.F.E. OS' },
    h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em', lineHeight: '1.7' } },
      'Life Integrated Framework / Execution — ein lokaler Life-Planner ohne Server, ohne Tracking, ohne Abhängigkeiten. ' +
      'Termine, Aufgaben, Finanzen, Schulden und Biometrie in einem HUD.'),
    h('div', { class: 'row', style: { marginTop: '6px' } },
      h('span', { class: 'pill pill--cyan' }, 'v1.0'),
      h('span', { class: 'pill pill--muted' }, 'localStorage'),
      h('span', { class: 'pill pill--gold' }, 'Whoop-Import'),
      h('span', { class: 'pill pill--violet' }, 'Garmin vorbereitet'),
    ),
  );

  frag.appendChild(h('div', { class: 'grid grid--main' },
    h('div', { class: 'stack' }, profilePanel, backupPanel, dataPanel),
    h('div', { class: 'stack' }, keysPanel, aboutPanel),
  ));

  return frag;
}
