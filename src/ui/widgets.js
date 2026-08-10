/* ============================================================
   widgets.js — Wiederverwendbare HUD-Bausteine
   ============================================================ */

import { h, icon, clamp } from '../util.js';

export function panel(opts = {}, ...children) {
  const { title, sub, tools, class: cls = '', pad0 = false } = opts;
  const head = (title || tools || sub)
    ? h('div', { class: 'panel__head' },
        title ? h('div', { class: 'panel__title' }, title) : null,
        sub ? h('div', { class: 'panel__sub' }, sub) : null,
        tools ? h('div', { class: 'panel__tools' }, tools) : null,
      )
    : null;
  const body = pad0
    ? h('div', {}, ...children)
    : h('div', { class: 'stack' }, ...children);
  return h('section', { class: `panel ${pad0 ? 'panel--pad0' : ''} ${cls}` },
    pad0 && head ? h('div', { style: { padding: '16px 16px 0' } }, head) : head,
    body,
  );
}

export function kpi({ label, value, valueClass = '', foot, iconName, tools, onClick }) {
  return h('section', {
    class: 'panel kpi',
    style: onClick ? { cursor: 'pointer' } : null,
    onclick: onClick || null,
  },
    h('div', { class: 'kpi__label' },
      iconName ? h('span', { html: icon(iconName, 13) }) : null,
      h('span', {}, label),
      tools ? h('span', { style: { marginLeft: 'auto', display: 'flex', gap: '4px' } }, tools) : null,
    ),
    h('div', { class: `kpi__value ${valueClass}` }, value),
    foot ? h('div', { class: 'kpi__foot', html: typeof foot === 'string' ? foot : '' }, typeof foot === 'string' ? null : foot) : null,
  );
}

export function progressBar(fraction, variant = '', striped = false) {
  const f = clamp(Number(fraction) || 0, 0, 1);
  return h('div', { class: `bar ${striped ? 'bar--striped' : ''}` },
    h('div', { class: `bar__fill ${variant}`, style: { width: (striped ? 100 : f * 100) + '%' } }),
  );
}

export function iconButton(name, title, onClick, cls = '') {
  return h('button', {
    class: `iconbtn ${cls}`, title, 'aria-label': title, type: 'button',
    onclick: (e) => { e.stopPropagation(); onClick(e); },
    html: icon(name, 14),
  });
}

export function empty(text, glyph = '∅') {
  return h('div', { class: 'empty' }, text, h('span', {}, glyph));
}

export function chip(label, active, onClick) {
  return h('button', {
    class: `chip ${active ? 'is-on' : ''}`, type: 'button',
    onclick: onClick,
  }, label);
}

export function pill(label, variant = 'pill--cyan') {
  return h('span', { class: `pill ${variant}` }, label);
}

/** Trennpunkt zwischen Metadaten. */
export function dot() {
  return h('span', { style: { opacity: '.4' } }, '·');
}

export function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'field__label' }, label),
    control,
    hint ? h('span', { class: 'field__hint' }, hint) : null,
  );
}

export function viewHead(kicker, title, ...tools) {
  return h('div', { class: 'view__head' },
    h('div', {},
      h('div', { class: 'view__kicker' }, kicker),
      h('h1', { class: 'view__title' }, title),
    ),
    tools.length ? h('div', { class: 'view__tools' }, ...tools) : null,
  );
}

/** Auge-Button für den Schulden-/Privatsphäre-Modus. */
export function eyeButton(hidden, onToggle, size = '') {
  return h('button', {
    class: `iconbtn eyebtn ${hidden ? 'is-hidden' : ''} ${size}`,
    type: 'button',
    title: hidden ? 'Schulden einblenden' : 'Schulden ausblenden',
    'aria-label': hidden ? 'Schulden einblenden' : 'Schulden ausblenden',
    'aria-pressed': hidden ? 'false' : 'true',
    onclick: (e) => { e.stopPropagation(); onToggle(); },
    html: icon(hidden ? 'eyeOff' : 'eye', 14),
  });
}
