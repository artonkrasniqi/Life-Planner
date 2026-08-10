/* ============================================================
   dashboard.js — Kommandozentrale
   ============================================================ */

import {
  h, icon, money, maskMoney, num, todayISO, fmtDate, fmtTime, hasTime,
  relativeDay, MONTHS_SHORT, colorFor, sum, COLORS,
} from '../util.js';
import { store, events, todos, finance, debts, bio, systemIntegrity, priority } from '../store.js';
import { panel, kpi, progressBar, viewHead, eyeButton, empty, pill } from '../ui/widgets.js';
import { reactorSVG } from '../ui/reactor.js';
import { barChart, gauge, hexA } from '../charts.js';
import { go } from '../nav.js';

export function render() {
  const s = store.state;
  const cur = s.profile.currency;
  const hidden = debts.hidden;
  const integrity = systemIntegrity();

  const frag = document.createDocumentFragment();

  /* ---------- Kopf ---------- */
  const today = new Date();
  frag.appendChild(viewHead(
    today.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    `Willkommen, ${s.profile.name || 'Operator'}`,
    h('button', { class: 'btn btn--ghost', onclick: () => go('calendar'), html: icon('calendar', 13) + '<span>Kalender</span>' }),
    h('button', { class: 'btn btn--primary', onclick: () => go('todos', { quickAdd: true }), html: icon('plus', 13) + '<span>Aufgabe</span>' }),
  ));

  /* ---------- Reaktor + KPIs ---------- */
  const mk = todayISO().slice(0, 7);
  const txMonth = finance.inMonth(mk);
  const income = sum(txMonth.filter((t) => t.amount > 0), (t) => t.amount);
  const expense = -sum(txMonth.filter((t) => t.amount < 0), (t) => t.amount);
  const cash = income - expense;

  const next = events.upcoming(1)[0];
  const open = todos.open().length;
  const over = todos.overdue().length;
  const last = bio.latest();

  const reactorPanel = h('section', { class: 'panel', style: { display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' } },
    h('div', { class: 'dash-reactor', style: { flex: 'none' }, html: reactorSVG(126, integrity.score / 100) }),
    h('div', { style: { flex: '1 1 200px', minWidth: '180px' } },
      h('div', { class: 'panel__sub' }, 'Systemintegrität'),
      h('div', {
        style: {
          fontFamily: 'var(--font-mono)', fontSize: '42px', fontWeight: '700',
          color: !integrity.parts.length ? 'var(--muted)'
            : integrity.score >= 70 ? 'var(--green)'
            : integrity.score >= 45 ? 'var(--gold)' : 'var(--red)',
          textShadow: '0 0 26px rgba(58,215,255,.3)', lineHeight: '1.05',
        },
      }, integrity.parts.length ? `${integrity.score}%` : '—'),
      h('div', { class: 'stack', style: { marginTop: '12px', gap: '9px' } },
        integrity.parts.length
          ? integrity.parts.map((p) => h('div', {},
              h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '4px' } },
                h('span', { class: 'panel__sub' }, p.key),
                h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text)' } }, `${p.score}%`),
              ),
              progressBar(p.score / 100, p.score >= 70 ? 'is-green' : p.score >= 45 ? 'is-gold' : 'is-red'),
            ))
          : h('div', { class: 'panel__sub' }, 'Noch keine Daten erfasst'),
      ),
    ),
  );

  const kpis = h('div', { class: 'grid grid--kpi2' },
    kpi({
      label: 'Nächster Termin', iconName: 'calendar',
      value: next ? next.title : '—',
      valueClass: 'is-cyan',
      foot: next ? `${relativeDay(next.date)} · ${hasTime(next.date) ? fmtTime(next.date) + ' Uhr' : 'ganztägig'}` : 'Nichts geplant',
      onClick: () => go('calendar'),
    }),
    kpi({
      label: 'Offene Aufgaben', iconName: 'checkSquare',
      value: String(open),
      valueClass: over > 0 ? 'is-red' : 'is-green',
      foot: over > 0 ? `<span class="down">${over} überfällig</span>` : 'alles im Zeitplan',
      onClick: () => go('todos'),
    }),
    kpi({
      label: `Cashflow ${MONTHS_SHORT[today.getMonth()]}`, iconName: 'wallet',
      value: money(cash, cur),
      valueClass: cash >= 0 ? 'is-green' : 'is-red',
      foot: `+${money(income, cur)} · −${money(expense, cur)}`,
      onClick: () => go('finance'),
    }),
    kpi({
      label: 'Schulden gesamt', iconName: 'card',
      value: maskMoney(debts.total(), hidden, cur),
      valueClass: hidden ? 'masked' : 'is-gold',
      foot: hidden ? 'verborgen' : `${s.debts.length} Posten · ${money(debts.monthlyLoad(), cur)}/Monat`,
      tools: eyeButton(hidden, () => debts.toggleHidden(), 'iconbtn--sm'),
      onClick: () => go('debts'),
    }),
  );

  frag.appendChild(h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(0, 2.2fr)', marginBottom: '14px' }, id: 'dash-top' },
    reactorPanel, kpis,
  ));

  /* ---------- Hauptbereich ---------- */
  const left = h('div', { class: 'stack' });
  const right = h('div', { class: 'stack' });

  /* Agenda */
  const upcoming = events.upcoming(6);
  left.appendChild(panel({
    title: 'Agenda',
    sub: `${events.onDay(todayISO()).length} heute`,
    pad0: true,
    tools: h('button', { class: 'btn btn--sm btn--ghost', onclick: () => go('calendar') }, 'Alle'),
  },
    upcoming.length
      ? h('div', { class: 'list' }, upcoming.map((e) => eventRow(e)))
      : empty('Keine anstehenden Termine', '◇'),
  ));

  /* Cashflow-Verlauf */
  const monthsBack = 6;
  const bars = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const tx = finance.inMonth(key);
    const inc = sum(tx.filter((t) => t.amount > 0), (t) => t.amount);
    const exp = -sum(tx.filter((t) => t.amount < 0), (t) => t.amount);
    bars.push({ label: MONTHS_SHORT[d.getMonth()], value: Math.round(inc - exp), color: inc - exp >= 0 ? COLORS.green : COLORS.red });
  }
  const cashPanel = panel({ title: 'Cashflow', sub: 'Letzte 6 Monate' });
  const cashHolder = h('div');
  cashPanel.appendChild(cashHolder);
  barChart(cashHolder, { items: bars, height: 200, fmt: (v) => money(v, cur, { decimals: 0 }), unit: '' });
  left.appendChild(cashPanel);

  /* Prioritäten */
  const topTodos = todos.sortedOpen().slice(0, 6);
  right.appendChild(panel({
    title: 'Prioritäten',
    sub: `${open} offen`,
    pad0: true,
    tools: h('button', { class: 'btn btn--sm btn--ghost', onclick: () => go('todos') }, 'Alle'),
  },
    topTodos.length
      ? h('div', { class: 'list' }, topTodos.map((t) => todoRow(t)))
      : empty('Alles erledigt', '✓'),
  ));

  /* Vitalwerte */
  const vital = panel({
    title: 'Vitalwerte',
    sub: last ? `Stand ${fmtDate(last.date, { day: '2-digit', month: '2-digit' })} · ${String(last.source || '').toUpperCase()}` : 'keine Daten',
    tools: h('button', { class: 'btn btn--sm btn--ghost', onclick: () => go('bio') }, 'Details'),
  });
  if (last) {
    const g = h('div', { class: 'gauges' });
    const g1 = h('div', { class: 'gauge' }), g2 = h('div', { class: 'gauge' }), g3 = h('div', { class: 'gauge' });
    g.append(g1, g2, g3);
    vital.appendChild(g);
    gauge(g1, { value: last.recovery ?? 0, max: 100, color: recoveryColor(last.recovery), label: 'Recovery', sub: 'prozent', height: 122 });
    gauge(g2, { value: last.strain ?? 0, max: 21, color: COLORS.gold, label: 'Strain', display: num(last.strain ?? 0, 1), sub: '/21', height: 122 });
    gauge(g3, { value: last.sleepHours ?? 0, max: 9, color: COLORS.violet, label: 'Schlaf', display: num(last.sleepHours ?? 0, 1), sub: 'std', height: 122 });
  } else {
    vital.appendChild(empty('Keine Whoop-Daten importiert', '♥'));
  }
  right.appendChild(vital);

  /* Schulden kompakt */
  const debtPanel = panel({
    title: 'Schulden',
    sub: hidden ? 'verborgen' : `${s.debts.length} Posten`,
    pad0: true,
    tools: [eyeButton(hidden, () => debts.toggleHidden(), 'iconbtn--sm'),
      h('button', { class: 'btn btn--sm btn--ghost', onclick: () => go('debts') }, 'Details')],
  });
  if (hidden) {
    debtPanel.appendChild(h('div', { style: { padding: '0 16px 16px' } },
      h('div', { class: 'lockbox' },
        h('span', { html: icon('eyeOff', 22), style: { color: 'var(--gold)' } }),
        h('div', { class: 'lockbox__t' }, 'Daten verborgen'),
        h('div', { class: 'lockbox__s' }, 'Auge antippen zum Einblenden'),
      ),
    ));
  } else if (!s.debts.length) {
    debtPanel.appendChild(empty('Schuldenfrei', '★'));
  } else {
    const list = h('div', { class: 'list' });
    for (const d of [...s.debts].sort((a, b) => b.remaining - a.remaining).slice(0, 4)) {
      const paid = Math.max(0, (d.principal || 0) - (d.remaining || 0));
      const frac = d.principal ? paid / d.principal : 0;
      list.appendChild(h('div', { class: 'item', style: { display: 'block' } },
        h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '6px' } },
          h('span', { class: 'item__title' }, d.creditor),
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--gold-2)', fontWeight: '700' } }, money(d.remaining, cur)),
        ),
        progressBar(frac, frac > 0.66 ? 'is-green' : frac > 0.33 ? 'is-gold' : 'is-red'),
      ));
    }
    debtPanel.appendChild(list);
  }
  right.appendChild(debtPanel);

  frag.appendChild(h('div', { class: 'grid grid--main' }, left, right));

  /* Responsives Umbrechen der Kopfzeile */
  const style = h('style', {}, `
    @media (max-width: 940px) { #dash-top { grid-template-columns: 1fr !important; } }
  `);
  frag.appendChild(style);

  return frag;
}

/* ---------- Zeilen ---------- */

function eventRow(e) {
  const col = colorFor(e.category);
  return h('div', { class: 'item', onclick: () => go('calendar', { date: String(e.date).slice(0, 10) }), style: { cursor: 'pointer' } },
    h('span', { class: 'item__accent', style: { background: col, boxShadow: `0 0 10px ${hexA(col, 0.7)}` } }),
    h('div', { class: 'item__main' },
      h('div', { class: 'item__title' }, e.title),
      h('div', { class: 'item__meta' },
        h('span', {}, relativeDay(e.date)),
        h('span', {}, '·'),
        h('span', {}, hasTime(e.date) ? `${fmtTime(e.date)} Uhr` : 'ganztägig'),
        e.location ? h('span', {}, '·') : null,
        e.location ? h('span', {}, e.location) : null,
      ),
    ),
    h('span', { class: 'tag' }, e.category),
  );
}

function todoRow(t) {
  const p = priority(t.priority);
  const overdue = t.due && t.due < todayISO();
  return h('div', { class: 'item' },
    h('button', {
      class: 'checkbox', type: 'button', title: 'Erledigt',
      onclick: () => todos.toggle(t.id),
      html: icon('check', 12),
    }),
    h('div', { class: 'item__main' },
      h('div', { class: 'item__title' }, t.title),
      h('div', { class: 'item__meta' },
        pill(p.label, p.pill),
        t.due ? h('span', { style: overdue ? { color: 'var(--red)' } : null }, relativeDay(t.due)) : null,
      ),
    ),
  );
}

export function recoveryColor(r) {
  if (r == null) return COLORS.muted;
  if (r >= 67) return COLORS.green;
  if (r >= 34) return COLORS.gold;
  return COLORS.red;
}
