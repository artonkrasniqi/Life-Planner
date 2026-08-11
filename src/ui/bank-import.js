/* ============================================================
   bank-import.js — Umsätze einlesen, mit Vorschau vor dem Übernehmen
   ============================================================ */

import { h, icon, money, fmtDate, pickFile, toast, clear, colorFor } from '../util.js';
import { store, finance } from '../store.js';
import { parseBankCSV, splitNew, summarize } from '../integrations/bank.js';
import { hexA } from '../charts.js';

let overlay = null;

function close() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  document.removeEventListener('keydown', onKey, true);
}

function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); close(); }
}

/** Datei wählen, einlesen und die Vorschau zeigen. */
export async function startBankImport() {
  const file = await pickFile('.csv,.txt,text/csv');
  if (!file) return;

  let parsed;
  try {
    parsed = parseBankCSV(file.text);
  } catch (e) {
    toast(e.message, 'bad');
    return;
  }

  const { fresh, duplicates } = splitNew(parsed.rows, store.state.transactions);
  showPreview({ file, parsed, fresh, duplicates });
}

function showPreview({ file, parsed, fresh, duplicates }) {
  const cur = store.state.profile.currency;
  const accounts = store.state.accounts;
  const sum = summarize(fresh.length ? fresh : parsed.rows);

  // Zeilen sind hier noch veränderbar: abwählen und Kategorie ändern.
  const picked = new Set(fresh.map((_, i) => i));

  const accSelect = h('select', { class: 'select' },
    accounts.length
      ? accounts.map((a) => h('option', { value: a.id }, a.name))
      : h('option', { value: '' }, '— kein Konto angelegt —'),
  );

  const rowsBox = h('div', { class: 'bimp__rows' });
  const countLabel = h('span');

  const renderRows = () => {
    clear(rowsBox);
    if (!fresh.length) {
      rowsBox.appendChild(h('div', { class: 'search__hint' },
        'Alle Zeilen dieser Datei sind bereits gebucht — es gibt nichts zu übernehmen.'));
      return;
    }
    fresh.forEach((r, i) => {
      const on = picked.has(i);
      rowsBox.appendChild(h('label', { class: `bimp__row ${on ? '' : 'is-off'}` },
        h('input', {
          type: 'checkbox', checked: on ? true : null,
          onchange: (e) => {
            if (e.target.checked) picked.add(i); else picked.delete(i);
            e.target.closest('.bimp__row').classList.toggle('is-off', !e.target.checked);
            updateCount();
          },
        }),
        h('span', { class: 'bimp__date' }, fmtDate(r.date, { day: '2-digit', month: '2-digit', year: '2-digit' })),
        h('span', { class: 'bimp__note', title: r.note }, r.note),
        h('span', {
          class: 'tag bimp__cat',
          style: { borderColor: hexA(colorFor(r.category), 0.45), color: colorFor(r.category), background: hexA(colorFor(r.category), 0.1) },
        }, r.category),
        h('span', { class: `bimp__amt ${r.amount >= 0 ? 'pos' : 'neg'}` }, money(r.amount, cur)),
      ));
    });
  };

  const updateCount = () => {
    const chosen = fresh.filter((_, i) => picked.has(i));
    const s = summarize(chosen);
    countLabel.textContent = chosen.length
      ? `${chosen.length} Buchungen · +${money(s.income, cur, { decimals: 0 })} / −${money(s.expense, cur, { decimals: 0 })}`
      : 'nichts ausgewählt';
  };

  const stat = (label, value, cls = '') => h('div', { class: 'bimp__stat' },
    h('span', { class: 'bimp__k' }, label),
    h('span', { class: `bimp__v ${cls}` }, value),
  );

  overlay = h('div', {
    class: 'search__back',
    onmousedown: (e) => { if (e.target === overlay) close(); },
  },
    h('div', { class: 'search__panel bimp', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal__head' },
        h('span', { class: 'modal__title' }, 'Umsätze übernehmen'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'iconbtn', type: 'button', title: 'Schließen', onclick: close, html: icon('x', 14) }),
      ),

      h('div', { class: 'bimp__head' },
        h('div', { class: 'panel__sub', style: { textTransform: 'none', letterSpacing: '.02em' } }, file.name),
        h('div', { class: 'bimp__stats' },
          stat('Gefunden', String(parsed.rows.length)),
          stat('Neu', String(fresh.length), 'is-green'),
          stat('Schon gebucht', String(duplicates.length), duplicates.length ? 'is-gold' : ''),
          parsed.skipped ? stat('Übersprungen', String(parsed.skipped), 'is-gold') : null,
          sum.from ? stat('Zeitraum', `${fmtDate(sum.from, { day: '2-digit', month: '2-digit' })} – ${fmtDate(sum.to, { day: '2-digit', month: '2-digit', year: '2-digit' })}`) : null,
        ),
        h('div', { class: 'form-grid', style: { marginTop: '4px' } },
          h('label', { class: 'field' },
            h('span', { class: 'field__label' }, 'Auf welches Konto'),
            accSelect,
          ),
          h('div', { class: 'field' },
            h('span', { class: 'field__label' }, 'Auswahl'),
            h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--cyan-2)', paddingTop: '9px' } }, countLabel),
          ),
        ),
      ),

      rowsBox,

      h('div', { class: 'modal__foot' },
        duplicates.length
          ? h('span', { class: 'panel__sub', style: { marginRight: 'auto', textTransform: 'none', letterSpacing: '.02em' } },
              `${duplicates.length} bereits vorhandene Zeilen werden übersprungen.`)
          : h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: close }, 'Abbrechen'),
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: () => {
            const chosen = fresh.filter((_, i) => picked.has(i));
            if (!chosen.length) { toast('Nichts ausgewählt.', 'warn'); return; }
            const accountId = accSelect.value || null;
            for (const r of chosen) {
              finance.addTx({ date: r.date, amount: r.amount, category: r.category, note: r.note, accountId });
            }
            close();
            toast(`${chosen.length} Buchungen übernommen.`, 'good');
          },
        }, 'Übernehmen'),
      ),
    ),
  );

  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey, true);
  renderRows();
  updateCount();
}
