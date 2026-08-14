/* ============================================================
   kit.js — Bausteine für die Oberfläche

   Kein Framework: ein kleiner Helfer für Elemente, dazu Toast,
   Bottom-Sheet, Fortschrittsring und Konfetti.
   ============================================================ */

/**
 * Element bauen.
 *   el('div.card', { text: 'Hallo' })
 *   el('button.btn', { on: { click: fn } }, [kind1, kind2])
 */
export function el(spec, attrs = {}, children = []) {
  const [tagPart, ...classes] = String(spec).split('.');
  const node = document.createElement(tagPart || 'div');
  if (classes.length) node.className = classes.join(' ');

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = [node.className, value].filter(Boolean).join(' ');
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key === 'on') for (const [ev, fn] of Object.entries(value)) node.addEventListener(ev, fn);
    else if (key === 'data') for (const [k, v] of Object.entries(value)) node.dataset[k] = v;
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ---------- Toast ---------- */

export function toast(message, { icon = '', ms = 2200 } = {}) {
  const root = document.getElementById('toasts');
  const node = el('div.toast', {}, [icon ? el('span.toast__icon', { text: icon }) : null, el('span', { text: message })]);
  root.append(node);
  requestAnimationFrame(() => node.classList.add('is-in'));
  setTimeout(() => {
    node.classList.remove('is-in');
    setTimeout(() => node.remove(), 320);
  }, ms);
  return node;
}

/* ---------- Bottom-Sheet ---------- */

export function sheet({ title, sub, content, actions = [] }) {
  const root = document.getElementById('sheet-root');
  clear(root);

  const close = () => {
    panel.classList.remove('is-in');
    backdrop.classList.remove('is-in');
    setTimeout(() => clear(root), 260);
    document.body.classList.remove('is-locked');
  };

  const backdrop = el('div.sheet__backdrop', { on: { click: close } });
  const panel = el('div.sheet', {}, [
    el('div.sheet__grip'),
    title ? el('h3.sheet__title', { text: title }) : null,
    sub ? el('p.sheet__sub', { text: sub }) : null,
    el('div.sheet__body', {}, [].concat(content || [])),
    actions.length
      ? el('div.sheet__actions', {}, actions.map((a) => el(`button.btn.${a.kind || 'btn--ghost'}`, {
        type: 'button', text: a.label,
        on: { click: () => { if (a.onClick) a.onClick(); if (a.keepOpen !== true) close(); } },
      })))
      : null,
  ]);

  root.append(backdrop, panel);
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => {
    backdrop.classList.add('is-in');
    panel.classList.add('is-in');
  });
  return { close, panel };
}

/* ---------- Fortschrittsring ---------- */

export function ring(percent, { size = 96, width = 9, color = 'var(--accent)', label = '', sub = '' } = {}) {
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  const wrap = el('div.ring', { style: { width: `${size}px`, height: `${size}px` } });
  wrap.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
              stroke="var(--line)" stroke-width="${width}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
              stroke="${color}" stroke-width="${width}" stroke-linecap="round"
              stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, percent)))}"
              transform="rotate(-90 ${size / 2} ${size / 2})" />
    </svg>`;
  if (label) wrap.append(el('div.ring__label', {}, [el('strong', { text: label }), sub ? el('small', { text: sub }) : null]));
  return wrap;
}

/* ---------- Konfetti ---------- */

const COLORS = ['#e4173b', '#f0b323', '#2fa84f', '#3d8bfd', '#b8336a', '#ffffff'];

export function confetti(count = 60) {
  const root = document.getElementById('fx');
  for (let i = 0; i < count; i++) {
    const piece = el('i.confetti');
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.animationDuration = `${1.5 + Math.random() * 1.2}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.width = `${6 + Math.random() * 6}px`;
    piece.style.height = `${9 + Math.random() * 8}px`;
    root.append(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

/** Kurzer Punktezuwachs, der nach oben wegfliegt. */
export function floatText(text, target) {
  const root = document.getElementById('fx');
  const rect = target?.getBoundingClientRect?.();
  const node = el('div.floaty', { text });
  node.style.left = `${rect ? rect.left + rect.width / 2 : window.innerWidth / 2}px`;
  node.style.top = `${rect ? rect.top : window.innerHeight / 2}px`;
  root.append(node);
  setTimeout(() => node.remove(), 1200);
}
