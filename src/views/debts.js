/* ============================================================
   debts.js — Schuldenübersicht mit Ein-Klick-Auge (Privatsphäre)

   Der Auge-Button schaltet store.state.ui.debtsHidden um. Im
   verborgenen Zustand werden alle Beträge durch Platzhalter ersetzt
   (echte Maskierung, nicht nur CSS-Weichzeichner) — auch auf dem
   Dashboard und in der Navigationsleiste.
   ============================================================ */

import {
  h, icon, money, maskMoney, num, todayISO, fmtDate, toISODate,
  colorFor, MASK, MONTHS_SHORT, COLORS, toast,
} from '../util.js';
import { store, debts, trash, payoffMonths, totalInterest, CATEGORIES } from '../store.js';
import { panel, kpi, viewHead, empty, iconButton, progressBar, eyeButton, pill, dot } from '../ui/widgets.js';
import { formModal, confirmModal } from '../ui/modal.js';
import { barChart, donutChart, legend, hexA } from '../charts.js';

export function render() {
  const s = store.state;
  const cur = s.profile.currency;
  const hidden = debts.hidden;
  const list = [...s.debts];

  const total = debts.total();
  const principal = debts.totalPrincipal();
  const paid = Math.max(0, principal - total);
  const monthly = debts.monthlyLoad();
  const progress = principal > 0 ? paid / principal : 0;

  const m = (v) => maskMoney(v, hidden, cur);
  const frag = document.createDocumentFragment();

  /* ---------- Kopf mit Auge ---------- */
  frag.appendChild(viewHead(
    hidden ? 'Daten verborgen' : `${list.length} Verbindlichkeiten`,
    'Schulden',
    h('span', {
      class: 'panel__sub',
      style: { marginRight: '2px' },
    }, hidden ? 'einblenden' : 'ausblenden'),
    eyeButton(hidden, () => debts.toggleHidden()),
    h('button', { class: 'btn btn--primary', onclick: () => openDebtForm(), html: icon('plus', 13) + '<span>Schuld erfassen</span>' }),
  ));

  /* ---------- KPIs ---------- */
  frag.appendChild(h('div', { class: 'grid grid--kpi', style: { marginBottom: '14px' } },
    kpi({
      label: 'Restschuld', iconName: 'card',
      value: m(total), valueClass: hidden ? 'masked' : 'is-red',
      foot: hidden ? 'verborgen' : `von ${money(principal, cur)} Ursprung`,
      tools: eyeButton(hidden, () => debts.toggleHidden(), 'iconbtn--sm'),
    }),
    kpi({
      label: 'Getilgt', iconName: 'check',
      value: m(paid), valueClass: hidden ? 'masked' : 'is-green',
      foot: hidden ? 'verborgen' : `${num(progress * 100, 1)} % abbezahlt`,
    }),
    kpi({
      label: 'Monatslast', iconName: 'clock',
      value: m(monthly), valueClass: hidden ? 'masked' : 'is-gold',
      foot: hidden ? 'verborgen' : `${list.length} Raten pro Monat`,
    }),
    kpi({
      label: 'Schuldenfrei in', iconName: 'target',
      value: hidden ? MASK : freedomLabel(list),
      valueClass: hidden ? 'masked' : 'is-cyan',
      foot: hidden ? 'verborgen' : freedomFoot(list),
    }),
  ));

  if (!list.length) {
    frag.appendChild(panel({ title: 'Übersicht' }, empty('Keine Schulden erfasst — sauber.', '★')));
    return frag;
  }

  /* ---------- Verborgen: Sperrbildschirm ---------- */
  if (hidden) {
    frag.appendChild(panel({
      title: 'Verbindlichkeiten',
      sub: `${list.length} Posten`,
      tools: eyeButton(hidden, () => debts.toggleHidden(), 'iconbtn--sm'),
    },
      h('div', { class: 'lockbox' },
        h('span', { html: icon('eyeOff', 30), style: { color: 'var(--gold)' } }),
        h('div', { class: 'lockbox__t' }, 'Schuldendaten verborgen'),
        h('div', { class: 'lockbox__s' }, `${list.length} Posten · Beträge maskiert`),
        h('button', {
          class: 'btn btn--gold',
          onclick: () => debts.toggleHidden(),
          html: icon('eye', 13) + '<span>Einblenden</span>',
        }),
      ),
    ));
    return frag;
  }

  /* ---------- Gesamtfortschritt ---------- */
  const overview = panel({
    title: 'Tilgungsfortschritt',
    sub: `${num(progress * 100, 1)} % erledigt`,
    tools: eyeButton(hidden, () => debts.toggleHidden(), 'iconbtn--sm'),
  },
    h('div', { class: 'row', style: { justifyContent: 'space-between' } },
      h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--green)' } }, `${money(paid, cur)} getilgt`),
      h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)' } }, `${money(total, cur)} offen`),
    ),
    h('div', { class: 'bar', style: { height: '14px' } },
      h('div', { class: 'bar__fill is-green', style: { width: `${Math.min(100, progress * 100)}%` } }),
    ),
  );

  /* ---------- Verteilung ---------- */
  const slices = list.map((d) => ({ label: d.creditor, value: d.remaining, color: colorFor(d.creditor) }));
  const distPanel = panel({ title: 'Verteilung', sub: 'Restschuld je Gläubiger' });
  const donutHolder = h('div');
  distPanel.appendChild(donutHolder);
  donutChart(donutHolder, {
    slices, height: 200,
    centerLabel: money(total, cur, { decimals: 0 }),
    centerSub: 'offen',
    fmt: (v) => money(v, cur),
  });
  distPanel.appendChild(legend(slices.map((sl) => ({ color: sl.color, label: sl.label, value: money(sl.value, cur, { decimals: 0 }) }))));

  /* ---------- Prognose: Restschuld über die Zeit ---------- */
  const projection = projectTotals(list, 36);
  const projPanel = panel({
    title: 'Prognose',
    sub: 'Restschuld bei aktuellen Raten (36 Monate)',
  });
  const projHolder = h('div');
  projPanel.appendChild(projHolder);
  barChart(projHolder, {
    items: projection.map((p) => ({ label: p.label, value: Math.round(p.value), color: p.value > 0 ? COLORS.gold : COLORS.green })),
    height: 200,
    fmt: (v) => money(v, cur, { decimals: 0 }),
  });

  /* ---------- Liste der Schulden ---------- */
  const cards = h('div', { class: 'stack' });
  for (const d of list.sort((a, b) => (b.rate || 0) - (a.rate || 0))) {
    cards.appendChild(debtCard(d, cur));
  }

  frag.appendChild(h('div', { class: 'grid grid--main' },
    h('div', { class: 'stack' }, overview, cards),
    h('div', { class: 'stack' }, distPanel, projPanel, strategyPanel(list, cur)),
  ));

  return frag;
}

/* ------------------------------------------------------------
   Einzelne Schuld
   ------------------------------------------------------------ */
function debtCard(d, cur) {
  const paid = Math.max(0, (d.principal || 0) - (d.remaining || 0));
  const frac = d.principal ? paid / d.principal : 0;
  const months = payoffMonths(d.remaining, d.rate, d.minPayment);
  const interest = totalInterest(d.remaining, d.rate, d.minPayment);
  const col = colorFor(d.creditor);
  const payments = (d.payments || []).slice(-3).reverse();

  return h('section', { class: 'panel' },
    h('div', { class: 'row', style: { alignItems: 'flex-start' } },
      h('span', { style: { width: '4px', alignSelf: 'stretch', minHeight: '38px', background: col, boxShadow: `0 0 12px ${hexA(col, 0.8)}` } }),
      h('div', { style: { flex: '1 1 200px', minWidth: 0 } },
        h('div', { style: { fontSize: '15px', fontWeight: '700', color: 'var(--white)' } }, d.creditor),
        h('div', { class: 'item__meta' },
          h('span', { class: 'tag' }, d.type),
          h('span', {}, `${num(d.rate || 0, 2)} % Zins`),
          dot(),
          h('span', {}, `Rate ${money(d.minPayment, cur, { decimals: 0 })}`),
          d.note ? dot() : null,
          d.note ? h('span', {}, d.note) : null,
        ),
      ),
      h('div', { style: { textAlign: 'right' } },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: '700', color: 'var(--gold-2)' } }, money(d.remaining, cur)),
        h('div', { class: 'panel__sub' }, `von ${money(d.principal, cur, { decimals: 0 })}`),
      ),
      h('div', { class: 'row row--tight' },
        iconButton('plus', 'Zahlung erfassen', () => openPaymentForm(d), 'iconbtn--sm'),
        iconButton('edit', 'Bearbeiten', () => openDebtForm(d), 'iconbtn--sm'),
        iconButton('trash', 'Löschen', () => {
          debts.remove(d.id);
          toast(`Schuld entfernt: ${d.creditor}`, 'warn', { label: 'Rückgängig', onClick: () => trash.restoreLast() });
        }, 'iconbtn--sm iconbtn--danger'),
      ),
    ),
    h('div', { style: { marginTop: '12px' } },
      h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '5px' } },
        h('span', { class: 'panel__sub' }, `${num(frac * 100, 1)} % getilgt`),
        h('span', { class: 'panel__sub' }, `${money(paid, cur, { decimals: 0 })} / ${money(d.principal, cur, { decimals: 0 })}`),
      ),
      progressBar(frac, frac > 0.66 ? 'is-green' : frac > 0.33 ? 'is-gold' : 'is-red'),
    ),
    h('div', { class: 'row', style: { marginTop: '12px', gap: '18px' } },
      metric('Restlaufzeit', isFinite(months) ? `${months} Mon.` : '∞', isFinite(months) ? null : 'var(--red)'),
      metric('Schuldenfrei', isFinite(months) ? fmtDate(toISODate(addMonthsDate(new Date(), months)), { month: 'short', year: 'numeric' }) : 'nie', isFinite(months) ? null : 'var(--red)'),
      metric('Zinskosten', isFinite(interest) ? money(interest, cur, { decimals: 0 }) : '∞', 'var(--gold-2)'),
      payments.length ? metric('Letzte Zahlung', `${money(payments[0].amount, cur, { decimals: 0 })} · ${fmtDate(payments[0].date, { day: '2-digit', month: '2-digit' })}`) : null,
    ),
    !isFinite(months)
      ? h('div', { class: 'row', style: { marginTop: '10px', color: 'var(--red)', fontSize: '12px' } },
          h('span', { html: icon('alert', 14) }),
          h('span', {}, 'Die Rate deckt die Zinsen nicht — Restschuld wächst.'),
        )
      : null,
  );
}

function metric(k, v, color) {
  return h('div', {},
    h('div', { class: 'panel__sub' }, k),
    h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '13.5px', fontWeight: '700', color: color || 'var(--text)' } }, v),
  );
}

/* ------------------------------------------------------------
   Strategie: Avalanche vs. Snowball
   ------------------------------------------------------------ */
function strategyPanel(list, cur) {
  const avalanche = [...list].filter((d) => d.remaining > 0).sort((a, b) => (b.rate || 0) - (a.rate || 0));
  const snowball = [...list].filter((d) => d.remaining > 0).sort((a, b) => a.remaining - b.remaining);

  const col = (title, sub, items, badge) => h('div', {},
    h('div', { class: 'row', style: { marginBottom: '8px' } },
      h('span', { class: 'panel__title', style: { fontSize: '10.5px' } }, title),
      pill(badge, badge === 'Zins' ? 'pill--red' : 'pill--cyan'),
    ),
    h('div', { class: 'panel__sub', style: { marginBottom: '8px' } }, sub),
    h('div', { class: 'stack', style: { gap: '5px' } },
      ...items.slice(0, 4).map((d, i) => h('div', { class: 'row', style: { justifyContent: 'space-between', fontSize: '12px' } },
        h('span', {}, `${i + 1}. ${d.creditor}`),
        h('span', { style: { fontFamily: 'var(--font-mono)', color: 'var(--muted)' } },
          badge === 'Zins' ? `${num(d.rate || 0, 1)} %` : money(d.remaining, cur, { decimals: 0 })),
      )),
    ),
  );

  return panel({ title: 'Tilgungsstrategie', sub: 'In welcher Reihenfolge tilgen?' },
    col('Avalanche', 'Höchster Zins zuerst — spart am meisten Geld.', avalanche, 'Zins'),
    h('div', { style: { height: '1px', background: 'var(--line)' } }),
    col('Snowball', 'Kleinste Schuld zuerst — schnellste Erfolgserlebnisse.', snowball, 'Betrag'),
  );
}

/* ------------------------------------------------------------
   Prognose der Gesamtrestschuld
   ------------------------------------------------------------ */
function projectTotals(list, months) {
  const state = list.map((d) => ({ rem: Number(d.remaining) || 0, i: (Number(d.rate) || 0) / 100 / 12, pay: Number(d.minPayment) || 0 }));
  const out = [];
  const now = new Date();
  for (let mth = 0; mth <= months; mth += 3) {
    const idx = now.getMonth() + mth;
    const label = `${MONTHS_SHORT[idx % 12]} ${String((now.getFullYear() + Math.floor(idx / 12)) % 100).padStart(2, '0')}`;
    out.push({ label, value: state.reduce((a, b) => a + b.rem, 0) });
    for (let k = 0; k < 3; k++) {
      for (const d of state) {
        if (d.rem <= 0) continue;
        d.rem = Math.max(0, d.rem * (1 + d.i) - d.pay);
      }
    }
  }
  return out;
}

function addMonthsDate(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + (isFinite(n) ? n : 0));
  return d;
}

function freedomLabel(list) {
  const maxMonths = list.reduce((acc, d) => {
    const m = payoffMonths(d.remaining, d.rate, d.minPayment);
    return Math.max(acc, isFinite(m) ? m : Infinity);
  }, 0);
  if (!isFinite(maxMonths)) return 'nie';
  if (maxMonths === 0) return 'jetzt';
  const y = Math.floor(maxMonths / 12), mm = maxMonths % 12;
  return y ? `${y} J ${mm} M` : `${mm} Monate`;
}

function freedomFoot(list) {
  const maxMonths = list.reduce((acc, d) => {
    const m = payoffMonths(d.remaining, d.rate, d.minPayment);
    return Math.max(acc, isFinite(m) ? m : Infinity);
  }, 0);
  if (!isFinite(maxMonths)) return 'Rate deckt Zinsen nicht';
  const d = addMonthsDate(new Date(), maxMonths);
  return `voraussichtlich ${d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
}

/* ------------------------------------------------------------
   Dialoge
   ------------------------------------------------------------ */
export async function openDebtForm(existing = null) {
  const isEdit = existing && existing.id;
  const values = await formModal({
    title: isEdit ? 'Schuld bearbeiten' : 'Neue Schuld',
    submitLabel: isEdit ? 'Aktualisieren' : 'Erfassen',
    fields: [
      { name: 'creditor', label: 'Gläubiger', type: 'text', value: existing?.creditor || '', required: true, full: true },
      { name: 'type', label: 'Art', type: 'select', options: CATEGORIES.debt, value: existing?.type || 'Kredit' },
      { name: 'rate', label: 'Zinssatz (% p. a.)', type: 'number', step: '0.01', value: existing?.rate ?? 0 },
      { name: 'principal', label: 'Ursprungsbetrag', type: 'money', value: existing?.principal ?? 0 },
      { name: 'remaining', label: 'Restschuld', type: 'money', value: existing?.remaining ?? 0 },
      { name: 'minPayment', label: 'Monatsrate', type: 'money', value: existing?.minPayment ?? 0 },
      { name: 'startDate', label: 'Beginn', type: 'date', value: existing?.startDate || todayISO() },
      { name: 'note', label: 'Notiz', type: 'text', value: existing?.note || '', full: true },
    ],
  });
  if (!values) return;
  if (isEdit) debts.patch(existing.id, values);
  else debts.add(values);
}

export async function openPaymentForm(d) {
  const cur = store.state.profile.currency;
  const values = await formModal({
    title: `Zahlung — ${d.creditor}`,
    submitLabel: 'Buchen',
    fields: [
      { name: 'amount', label: 'Betrag', type: 'money', value: d.minPayment || 0, required: true, min: 0 },
      { name: 'date', label: 'Datum', type: 'date', value: todayISO() },
      { name: 'book', label: 'In Finanzen buchen', type: 'checkbox', value: true, switchLabel: 'als Ausgabe erfassen', full: true },
    ],
  });
  if (!values) return;
  debts.pay(d.id, values.amount, values.date, values.book);
}
