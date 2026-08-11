/* ============================================================
   finance.js — Konten, Transaktionen, Budgets, Cashflow
   ============================================================ */

import {
  h, icon, money, num, todayISO, fmtDate, MONTHS, MONTHS_SHORT,
  colorFor, sum, groupBy, addMonths, COLORS, toast,
} from '../util.js';
import { store, finance, trash, CATEGORIES } from '../store.js';
import { panel, kpi, viewHead, empty, iconButton, progressBar, chip } from '../ui/widgets.js';
import { formModal, confirmModal } from '../ui/modal.js';
import { barChart, donutChart, legend, hexA } from '../charts.js';
import { refresh } from '../nav.js';
import { recurringPanel } from '../ui/recurring-panel.js';

const local = {
  y: new Date().getFullYear(),
  m: new Date().getMonth(),
  txFilter: 'alle',
};

/** Sprung aus der Suche: in den Monat der gefundenen Buchung. */
export function setParams(params = {}) {
  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    local.y = Number(params.month.slice(0, 4));
    local.m = Number(params.month.slice(5, 7)) - 1;
  }
}

export function render() {
  const s = store.state;
  const cur = s.profile.currency;
  const frag = document.createDocumentFragment();

  const mk = `${local.y}-${String(local.m + 1).padStart(2, '0')}`;
  const tx = finance.inMonth(mk).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const income = sum(tx.filter((t) => t.amount > 0), (t) => t.amount);
  const expense = -sum(tx.filter((t) => t.amount < 0), (t) => t.amount);
  const net = income - expense;
  const assets = finance.assets();
  const savingRate = income > 0 ? (net / income) * 100 : 0;

  frag.appendChild(viewHead(
    'Liquidität & Vermögen',
    'Finanzen',
    h('button', { class: 'btn btn--ghost', onclick: () => openAccountForm(), html: icon('wallet', 13) + '<span>Konto</span>' }),
    h('button', { class: 'btn btn--primary', onclick: () => openTxForm(), html: icon('plus', 13) + '<span>Buchung</span>' }),
  ));

  /* ---------- KPIs ---------- */
  frag.appendChild(h('div', { class: 'grid grid--kpi', style: { marginBottom: '14px' } },
    kpi({ label: 'Einnahmen', iconName: 'trendUp', value: money(income, cur), valueClass: 'is-green', foot: `${MONTHS[local.m]} ${local.y}` }),
    kpi({ label: 'Ausgaben', iconName: 'wallet', value: money(expense, cur), valueClass: 'is-red', foot: `${tx.length} Buchungen` }),
    kpi({
      label: 'Saldo', iconName: 'activity', value: money(net, cur),
      valueClass: net >= 0 ? 'is-cyan' : 'is-red',
      foot: `Sparquote ${num(savingRate, 0)} %`,
    }),
    kpi({
      label: 'Nettovermögen', iconName: 'target',
      value: money(finance.netWorth(), cur),
      valueClass: finance.netWorth() >= 0 ? 'is-gold' : 'is-red',
      foot: `${money(assets, cur)} Guthaben − Schulden`,
    }),
  ));

  /* ---------- Monatswahl ---------- */
  const monthNav = h('div', { class: 'row', style: { marginBottom: '10px' } },
    iconButton('chevronLeft', 'Vormonat', () => { const n = addMonths(local.y, local.m, -1); local.y = n.y; local.m = n.m; refresh(); }),
    h('div', {
      style: {
        fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: '700',
        letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--white)',
        // Wächst mit, schrumpft aber auch — eine feste Breite sprengt das Handy.
        flex: '1 1 auto', minWidth: '0', textAlign: 'center', whiteSpace: 'nowrap',
      },
    }, `${MONTHS[local.m]} ${local.y}`),
    iconButton('chevronRight', 'Folgemonat', () => { const n = addMonths(local.y, local.m, 1); local.y = n.y; local.m = n.m; refresh(); }),
    h('span', { class: 'spacer' }),
    h('button', {
      class: 'btn btn--sm btn--ghost',
      onclick: () => { local.y = new Date().getFullYear(); local.m = new Date().getMonth(); refresh(); },
    }, 'Aktueller Monat'),
  );

  /* ---------- Cashflow-Chart: 12 Monate ---------- */
  const bars = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(local.y, local.m - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const t = finance.inMonth(key);
    const inc = sum(t.filter((x) => x.amount > 0), (x) => x.amount);
    const exp = -sum(t.filter((x) => x.amount < 0), (x) => x.amount);
    bars.push({ label: MONTHS_SHORT[d.getMonth()], value: Math.round(inc - exp), color: inc - exp >= 0 ? COLORS.green : COLORS.red });
  }
  const flowPanel = panel({ title: 'Cashflow', sub: 'Saldo der letzten 12 Monate' }, monthNav);
  const flowHolder = h('div');
  flowPanel.appendChild(flowHolder);
  barChart(flowHolder, { items: bars, height: 210, fmt: (v) => money(v, cur, { decimals: 0 }) });

  /* ---------- Ausgaben nach Kategorie ---------- */
  const expByCat = [...groupBy(tx.filter((t) => t.amount < 0), (t) => t.category || 'Sonstiges')]
    .map(([k, arr]) => ({ label: k, value: -sum(arr, (t) => t.amount), color: colorFor(k) }))
    .sort((a, b) => b.value - a.value);

  const catPanel = panel({ title: 'Ausgabenstruktur', sub: `${MONTHS_SHORT[local.m]} ${local.y}` });
  const donutHolder = h('div');
  catPanel.appendChild(donutHolder);
  donutChart(donutHolder, {
    slices: expByCat,
    height: 210,
    centerLabel: money(expense, cur, { decimals: 0 }),
    centerSub: 'Ausgaben',
    fmt: (v) => money(v, cur),
  });
  catPanel.appendChild(legend(expByCat.slice(0, 8).map((c) => ({
    color: c.color, label: c.label, value: money(c.value, cur, { decimals: 0 }),
  }))));

  /* ---------- Budgets ---------- */
  const budgetEntries = Object.entries(s.budgets || {});
  const budgetPanel = panel({
    title: 'Budgets',
    sub: `${budgetEntries.length} Kategorien`,
    tools: h('button', { class: 'btn btn--sm btn--ghost', onclick: () => openBudgetForm(), html: icon('edit', 12) + '<span>Setzen</span>' }),
  },
    budgetEntries.length
      ? h('div', { class: 'stack', style: { gap: '11px' } },
          ...budgetEntries.sort((a, b) => b[1] - a[1]).map(([cat, limit]) => {
            const used = -sum(tx.filter((t) => t.amount < 0 && t.category === cat), (t) => t.amount);
            const frac = limit ? used / limit : 0;
            const variant = frac > 1 ? 'is-red' : frac > 0.8 ? 'is-gold' : 'is-green';
            return h('div', {},
              h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '4px' } },
                h('span', { style: { fontSize: '12.5px' } }, cat),
                h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: frac > 1 ? 'var(--red)' : 'var(--muted)' } },
                  `${money(used, cur, { decimals: 0 })} / ${money(limit, cur, { decimals: 0 })}`),
              ),
              progressBar(Math.min(1, frac), variant),
            );
          }),
        )
      : empty('Keine Budgets definiert', '◎'),
  );

  /* ---------- Konten ---------- */
  const accPanel = panel({ title: 'Konten', sub: money(assets, cur), pad0: true },
    s.accounts.length
      ? h('div', { class: 'list' }, s.accounts.map((a) => h('div', { class: 'item' },
          h('span', { class: 'item__accent', style: { background: colorFor(a.name) } }),
          h('div', { class: 'item__main' },
            h('div', { class: 'item__title' }, a.name),
            h('div', { class: 'item__meta' }, h('span', {}, a.type)),
          ),
          (() => {
            const bal = finance.balanceOf(a.id);
            return h('span', { style: { fontFamily: 'var(--font-mono)', fontWeight: '700', color: bal >= 0 ? 'var(--cyan-2)' : 'var(--red)' } }, money(bal, cur));
          })(),
          h('div', { class: 'item__actions' },
            iconButton('edit', 'Bearbeiten', () => openAccountForm(a), 'iconbtn--sm'),
            iconButton('trash', 'Löschen', async () => {
              if (await confirmModal({ title: 'Konto löschen', message: `„${a.name}“ löschen? Buchungen bleiben erhalten.`, confirmLabel: 'Löschen', danger: true })) {
                finance.removeAccount(a.id);
              }
            }, 'iconbtn--sm iconbtn--danger'),
          ),
        )))
      : empty('Noch kein Konto angelegt', '▤'),
  );

  /* ---------- Buchungen ---------- */
  const filters = ['alle', 'einnahmen', 'ausgaben'];
  const visible = tx.filter((t) =>
    local.txFilter === 'alle' ? true : local.txFilter === 'einnahmen' ? t.amount > 0 : t.amount < 0);

  const txPanel = panel({
    title: 'Buchungen',
    sub: `${visible.length} Einträge`,
    pad0: true,
    tools: filters.map((f) => chip(f[0].toUpperCase() + f.slice(1), local.txFilter === f, () => { local.txFilter = f; refresh(); })),
  },
    visible.length
      ? h('div', { class: 'list' }, visible.map((t) => txRow(t, cur, s)))
      : empty('Keine Buchungen in diesem Monat', '▦'),
  );

  frag.appendChild(h('div', { class: 'grid grid--main' },
    h('div', { class: 'stack' }, flowPanel, txPanel),
    h('div', { class: 'stack' }, catPanel, recurringPanel(), budgetPanel, accPanel),
  ));

  return frag;
}

function txRow(t, cur, s) {
  const acc = s.accounts.find((a) => a.id === t.accountId);
  return h('div', { class: 'tx' },
    h('span', { class: 'tx__date' }, fmtDate(t.date, { day: '2-digit', month: '2-digit' })),
    h('span', { class: 'tx__name' },
      t.note || t.category,
      acc ? h('span', { style: { color: 'var(--muted)', fontSize: '11px', marginLeft: '8px', fontFamily: 'var(--font-mono)' } }, acc.name) : null,
    ),
    h('span', { class: 'tx__cat tag', style: { borderColor: hexA(colorFor(t.category), 0.4), color: colorFor(t.category), background: hexA(colorFor(t.category), 0.1) } }, t.category),
    h('span', { class: `tx__amt ${t.amount >= 0 ? 'pos' : 'neg'}` }, (t.amount >= 0 ? '+' : '') + money(t.amount, cur)),
    iconButton('trash', 'Buchung löschen', () => {
      finance.removeTx(t.id);
      toast(`Buchung gelöscht: ${t.note || t.category}`, 'warn', { label: 'Rückgängig', onClick: () => trash.restoreLast() });
    }, 'iconbtn--sm iconbtn--danger'),
  );
}

/* ---------- Dialoge ---------- */

/** @param {object|null} prefill  Werte aus der Schnellnotizzeile */
export async function openTxForm(prefill = null) {
  const s = store.state;
  const values = await formModal({
    title: 'Neue Buchung',
    submitLabel: 'Buchen',
    fields: [
      { name: 'kind', label: 'Art', type: 'select', options: [{ value: 'expense', label: 'Ausgabe' }, { value: 'income', label: 'Einnahme' }], value: prefill?.kind || 'expense' },
      { name: 'amount', label: 'Betrag', type: 'money', value: prefill?.amount || '', required: true, min: 0, hint: 'immer positiv eingeben' },
      { name: 'date', label: 'Datum', type: 'date', value: prefill?.date || todayISO() },
      {
        name: 'accountId', label: 'Konto', type: 'select',
        options: s.accounts.length ? s.accounts.map((a) => ({ value: a.id, label: a.name })) : [{ value: '', label: '— kein Konto —' }],
        value: s.accounts[0]?.id || '',
      },
      { name: 'category', label: 'Kategorie', type: 'select', options: [...new Set([...CATEGORIES.expense, ...CATEGORIES.income])], value: prefill?.category || 'Lebensmittel' },
      { name: 'note', label: 'Notiz', type: 'text', value: prefill?.note || '', placeholder: 'optional' },
    ],
  });
  if (!values) return;
  const amt = Math.abs(Number(values.amount) || 0);
  finance.addTx({
    date: values.date,
    amount: values.kind === 'income' ? amt : -amt,
    category: values.category,
    note: values.note,
    accountId: values.accountId || null,
  });
}

export async function openAccountForm(existing = null) {
  const isEdit = existing && existing.id;
  const values = await formModal({
    title: isEdit ? 'Konto bearbeiten' : 'Neues Konto',
    submitLabel: isEdit ? 'Aktualisieren' : 'Anlegen',
    fields: [
      { name: 'name', label: 'Bezeichnung', type: 'text', value: existing?.name || '', required: true },
      { name: 'type', label: 'Typ', type: 'select', options: ['Giro', 'Sparen', 'Bar', 'Depot', 'Sonstiges'], value: existing?.type || 'Giro' },
      {
        name: 'startBalance', label: 'Anfangsbestand', type: 'money',
        value: existing?.startBalance ?? 0, full: true,
        hint: 'Der angezeigte Kontostand ergibt sich daraus plus allen Buchungen.',
      },
    ],
  });
  if (!values) return;
  if (isEdit) finance.patchAccount(existing.id, values);
  else finance.addAccount(values);
}

export async function openBudgetForm() {
  const s = store.state;
  const values = await formModal({
    title: 'Budget setzen',
    submitLabel: 'Speichern',
    fields: [
      { name: 'category', label: 'Kategorie', type: 'select', options: CATEGORIES.expense, value: CATEGORIES.expense[0] },
      { name: 'limit', label: 'Monatslimit', type: 'money', value: '', hint: '0 entfernt das Budget' },
    ],
  });
  if (!values) return;
  finance.setBudget(values.category, Number(values.limit) || 0);
}
