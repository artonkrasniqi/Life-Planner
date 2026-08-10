/* ============================================================
   modal.js — generischer Formular-Dialog + Bestätigung
   ============================================================ */

import { h, icon, clear } from '../util.js';

const root = () => document.getElementById('modal-root');

function close() {
  const r = root();
  if (!r) return;
  clear(r);
  document.removeEventListener('keydown', onEsc, true);
}

function onEsc(e) {
  if (e.key === 'Escape') { e.stopPropagation(); close(); }
}

function shell({ title, body, footer, wide = false }) {
  const back = h('div', {
    class: 'modal-back',
    onmousedown: (e) => { if (e.target === back) close(); },
  },
    h('div', { class: `modal ${wide ? 'modal--wide' : ''}`, role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal__head' },
        h('span', { class: 'modal__title' }, title),
        h('span', { class: 'spacer' }),
        h('button', { class: 'iconbtn', type: 'button', title: 'Schließen', onclick: close, html: icon('x', 14) }),
      ),
      body,
      footer,
    ),
  );
  const r = root();
  clear(r);
  r.appendChild(back);
  document.addEventListener('keydown', onEsc, true);
  return back;
}

/**
 * Formular-Dialog.
 * fields: [{ name, label, type, value, options, required, step, min, max, placeholder, hint, full }]
 * types:  text | textarea | number | money | date | datetime-local | time | select | tags | checkbox
 * @returns Promise<Object|null>  Werte oder null bei Abbruch
 */
export function formModal({ title, fields, submitLabel = 'Speichern', wide = false, extraFooter = null }) {
  return new Promise((resolve) => {
    const inputs = {};

    const grid = h('div', { class: 'form-grid' });
    for (const f of fields) {
      if (!f) continue;
      let control;
      const common = {
        class: 'input',
        name: f.name,
        placeholder: f.placeholder || '',
        required: f.required || null,
      };

      switch (f.type) {
        case 'textarea':
          control = h('textarea', { class: 'textarea', name: f.name, placeholder: f.placeholder || '' }, f.value ?? '');
          break;
        case 'select':
          control = h('select', { class: 'select', name: f.name },
            (f.options || []).map((o) => {
              const val = typeof o === 'object' ? o.value : o;
              const lab = typeof o === 'object' ? o.label : o;
              return h('option', { value: val, selected: String(val) === String(f.value ?? '') ? true : null }, lab);
            }),
          );
          break;
        case 'checkbox':
          control = h('label', { class: 'switch' },
            h('input', { type: 'checkbox', name: f.name, checked: f.value ? true : null }),
            h('span', { class: 'switch__track' }),
            h('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, f.switchLabel || ''),
          );
          break;
        case 'money':
        case 'number':
          control = h('input', { ...common, type: 'number', step: f.step ?? (f.type === 'money' ? '0.01' : '1'), min: f.min ?? null, max: f.max ?? null, value: f.value ?? '' });
          break;
        case 'tags':
          control = h('input', { ...common, type: 'text', value: Array.isArray(f.value) ? f.value.join(', ') : (f.value || '') });
          break;
        default:
          control = h('input', { ...common, type: f.type || 'text', value: f.value ?? '' });
      }

      inputs[f.name] = { el: control, def: f };
      grid.appendChild(
        h('label', { class: `field ${f.full ? 'col-2' : ''}` },
          h('span', { class: 'field__label' }, f.label),
          control,
          f.hint ? h('span', { class: 'field__hint' }, f.hint) : null,
        ),
      );
    }

    const collect = () => {
      const out = {};
      for (const [name, { el, def }] of Object.entries(inputs)) {
        if (def.type === 'checkbox') {
          out[name] = el.querySelector('input').checked;
        } else if (def.type === 'number' || def.type === 'money') {
          const v = el.value.trim();
          out[name] = v === '' ? 0 : Number(v);
        } else if (def.type === 'tags') {
          out[name] = el.value.split(',').map((s) => s.trim()).filter(Boolean);
        } else {
          out[name] = el.value;
        }
      }
      return out;
    };

    const submit = () => {
      for (const [, { el, def }] of Object.entries(inputs)) {
        if (def.required && !String(el.value ?? '').trim()) {
          el.focus();
          el.style.borderColor = 'var(--red)';
          return;
        }
      }
      const values = collect();
      close();
      resolve(values);
    };

    const body = h('div', { class: 'modal__body' }, grid);
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        submit();
      }
    });

    const footer = h('div', { class: 'modal__foot' },
      extraFooter,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { close(); resolve(null); } }, 'Abbrechen'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: submit }, submitLabel),
    );

    shell({ title, body, footer, wide });
    const first = Object.values(inputs)[0];
    if (first) setTimeout(() => first.el.focus(), 40);
  });
}

/** Ja/Nein-Bestätigung. */
export function confirmModal({ title = 'Bestätigen', message, confirmLabel = 'Bestätigen', danger = false }) {
  return new Promise((resolve) => {
    const body = h('div', { class: 'modal__body' },
      h('div', { style: { fontSize: '13.5px', lineHeight: '1.6' } }, message),
    );
    const footer = h('div', { class: 'modal__foot' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { close(); resolve(false); } }, 'Abbrechen'),
      h('button', {
        class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'button',
        onclick: () => { close(); resolve(true); },
      }, confirmLabel),
    );
    shell({ title, body, footer });
  });
}

/** Freier Inhalts-Dialog. builder(closeFn) -> Node */
export function contentModal({ title, builder, wide = false }) {
  const body = h('div', { class: 'modal__body' });
  const node = builder(close);
  body.appendChild(node);
  const footer = h('div', { class: 'modal__foot' },
    h('button', { class: 'btn btn--ghost', type: 'button', onclick: close }, 'Schließen'),
  );
  shell({ title, body, footer, wide });
}

export { close as closeModal };
