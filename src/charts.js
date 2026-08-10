/* ============================================================
   charts.js — Canvas-Diagramme im HUD-Stil (ohne Abhängigkeiten)
   Enthält: Linie, Balken, Donut, Sparkline, Radial-Gauge
   ============================================================ */

import { h, COLORS, num } from './util.js';

/**
 * Erstellt ein Canvas im Container, kümmert sich um DPR + Resize.
 * draw(ctx, w, h) wird bei jeder Größenänderung erneut aufgerufen.
 */
function mount(container, height, draw) {
  const canvas = h('canvas');
  container.appendChild(canvas);
  container.style.height = height + 'px';

  const render = () => {
    const w = container.clientWidth;
    const hh = height;
    // Vor dem ersten Layout (oder in ausgeblendeten Containern) ist die
    // Breite 0 — dann gibt es nichts zu zeichnen.
    if (w < 8 || hh < 8) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hh * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = hh + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    draw(ctx, w, hh);
  };

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
  } else {
    window.addEventListener('resize', render);
  }
  requestAnimationFrame(render);
  return { canvas, render };
}

function tipEl(container) {
  const t = h('div', { class: 'chart__tip' });
  container.appendChild(t);
  return t;
}

function showTip(tip, container, x, y, html) {
  tip.innerHTML = html;
  tip.classList.add('is-on');
  const w = tip.offsetWidth;
  const left = Math.max(2, Math.min(container.clientWidth - w - 2, x - w / 2));
  tip.style.left = left + 'px';
  tip.style.top = Math.max(2, y - tip.offsetHeight - 10) + 'px';
}

function gridLines(ctx, w, h, pad, steps, fmt, min, max) {
  ctx.save();
  ctx.strokeStyle = COLORS.line;
  ctx.fillStyle = COLORS.muted;
  ctx.font = '10px ui-monospace, monospace';
  ctx.lineWidth = 1;
  let prevLabel = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = Math.round(pad.t + (h - pad.t - pad.b) * t) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    // Bei grober Formatierung können benachbarte Stufen dieselbe
    // Beschriftung ergeben ("0 €", "0 €") — die zweite entfällt.
    const label = fmt(max - (max - min) * t);
    if (label !== prevLabel) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pad.l - 7, y);
      prevLabel = label;
    }
  }
  ctx.restore();
}

/** Linker Rand so breit, dass die Achsenbeschriftung vollständig passt. */
function axisPadLeft(ctx, bounds, fmt, steps = 4) {
  ctx.save();
  ctx.font = '10px ui-monospace, monospace';
  let widest = 0;
  for (let i = 0; i <= steps; i++) {
    const v = bounds.max - (bounds.max - bounds.min) * (i / steps);
    widest = Math.max(widest, ctx.measureText(fmt(v)).width);
  }
  ctx.restore();
  return Math.min(104, Math.max(38, Math.ceil(widest) + 13));
}

function niceBounds(values, opts = {}) {
  let min = opts.min !== undefined ? opts.min : Math.min(...values);
  let max = opts.max !== undefined ? opts.max : Math.max(...values);
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (min === max) { max = min + (Math.abs(min) || 1); }
  if (opts.zeroBased && min > 0) min = 0;
  if (opts.zeroBased && max < 0) max = 0;
  const span = max - min;
  const pow = Math.pow(10, Math.floor(Math.log10(span || 1)));
  const step = Math.ceil(span / 4 / pow) * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  return { min: lo, max: hi === lo ? lo + step : hi };
}

/* ============================================================
   Liniendiagramm mit Hover-Readout
   ============================================================ */
export function lineChart(container, cfg) {
  const {
    values = [], labels = [], color = COLORS.cyan, height = 190,
    fmt = (v) => num(v, 0), area = true, zeroBased = false, min, max, unit = '',
  } = cfg;

  container.classList.add('chart');
  const tip = tipEl(container);
  let hover = -1;
  let geom = null;

  const { canvas, render } = mount(container, height, (ctx, w, hh) => {
    if (!values.length) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('KEINE DATEN', w / 2, hh / 2);
      return;
    }
    const b = niceBounds(values.filter((v) => v != null), { zeroBased, min, max });
    const pad = { l: axisPadLeft(ctx, b, fmt), r: 12, t: 12, b: 24 };
    gridLines(ctx, w, hh, pad, 4, fmt, b.min, b.max);

    const iw = w - pad.l - pad.r;
    const ih = hh - pad.t - pad.b;
    const stepX = values.length > 1 ? iw / (values.length - 1) : 0;
    const yOf = (v) => pad.t + ih * (1 - (v - b.min) / (b.max - b.min));
    const pts = values.map((v, i) => ({ x: pad.l + stepX * i, y: v == null ? null : yOf(v), v, label: labels[i] || '' }));
    geom = { pts, pad, stepX };

    // Fläche
    if (area) {
      const g = ctx.createLinearGradient(0, pad.t, 0, hh - pad.b);
      g.addColorStop(0, hexA(color, 0.32));
      g.addColorStop(1, hexA(color, 0));
      ctx.beginPath();
      let started = false;
      for (const p of pts) {
        if (p.y == null) continue;
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      const lastValid = [...pts].reverse().find((p) => p.y != null);
      const firstValid = pts.find((p) => p.y != null);
      if (lastValid && firstValid) {
        ctx.lineTo(lastValid.x, hh - pad.b);
        ctx.lineTo(firstValid.x, hh - pad.b);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    // Linie
    ctx.beginPath();
    let started = false;
    for (const p of pts) {
      if (p.y == null) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = hexA(color, 0.7);
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Punkte
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.y == null) continue;
      const isH = i === hover;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isH ? 4.5 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = isH ? '#fff' : color;
      ctx.fill();
      if (isH) {
        ctx.beginPath();
        ctx.moveTo(p.x, pad.t);
        ctx.lineTo(p.x, hh - pad.b);
        ctx.strokeStyle = hexA(color, 0.45);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // X-Beschriftung (ausgedünnt)
    ctx.fillStyle = COLORS.muted;
    ctx.font = '9.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const every = Math.max(1, Math.ceil(values.length / Math.max(2, Math.floor(iw / 62))));
    for (let i = 0; i < pts.length; i += every) {
      if (pts[i].label) ctx.fillText(pts[i].label, pts[i].x, hh - pad.b + 6);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!geom) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = -1, bd = Infinity;
    geom.pts.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== hover) { hover = best; render(); }
    const p = geom.pts[best];
    if (p && p.v != null) {
      showTip(tip, container, p.x, p.y, `<b style="color:${color}">${fmt(p.v)}${unit}</b><br><span style="opacity:.7">${p.label}</span>`);
    } else tip.classList.remove('is-on');
  });
  canvas.addEventListener('mouseleave', () => { hover = -1; tip.classList.remove('is-on'); render(); });

  return container;
}

/* ============================================================
   Balkendiagramm (unterstützt negative Werte + Gruppen)
   ============================================================ */
export function barChart(container, cfg) {
  const {
    items = [], height = 200, fmt = (v) => num(v, 0),
    colorFor = () => COLORS.cyan, unit = '', zeroLine = true,
  } = cfg;

  container.classList.add('chart');
  const tip = tipEl(container);
  let hover = -1;
  let geom = null;

  const { canvas, render } = mount(container, height, (ctx, w, hh) => {
    if (!items.length) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('KEINE DATEN', w / 2, hh / 2);
      return;
    }
    const vals = items.map((i) => i.value);
    const b = niceBounds(vals, { zeroBased: true });
    const pad = { l: axisPadLeft(ctx, b, fmt), r: 12, t: 12, b: 26 };
    gridLines(ctx, w, hh, pad, 4, fmt, b.min, b.max);

    const iw = w - pad.l - pad.r;
    const ih = hh - pad.t - pad.b;
    const slot = iw / items.length;
    const bw = Math.max(4, Math.min(38, slot * 0.56));
    const yOf = (v) => pad.t + ih * (1 - (v - b.min) / (b.max - b.min));
    const y0 = yOf(0);

    if (zeroLine) {
      ctx.beginPath();
      ctx.moveTo(pad.l, Math.round(y0) + 0.5);
      ctx.lineTo(w - pad.r, Math.round(y0) + 0.5);
      ctx.strokeStyle = 'rgba(72,196,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const bars = [];
    items.forEach((it, i) => {
      const cx = pad.l + slot * i + slot / 2;
      const y = yOf(it.value);
      const top = Math.min(y, y0);
      const bh = Math.max(1.5, Math.abs(y - y0));
      const col = it.color || colorFor(it, i);
      const isH = i === hover;

      const g = ctx.createLinearGradient(0, top, 0, top + bh);
      g.addColorStop(0, hexA(col, isH ? 1 : 0.9));
      g.addColorStop(1, hexA(col, 0.22));
      ctx.fillStyle = g;
      ctx.shadowColor = hexA(col, isH ? 0.8 : 0.35);
      ctx.shadowBlur = isH ? 16 : 7;
      ctx.fillRect(cx - bw / 2, top, bw, bh);
      ctx.shadowBlur = 0;

      // Kopflinie
      ctx.fillStyle = col;
      ctx.fillRect(cx - bw / 2, it.value >= 0 ? top : top + bh - 2, bw, 2);

      bars.push({ x: cx, y: top, w: bw, h: bh, it });
    });
    geom = { bars, slot, pad };

    ctx.fillStyle = COLORS.muted;
    ctx.font = '9.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const every = Math.max(1, Math.ceil(items.length / Math.max(2, Math.floor(iw / 46))));
    items.forEach((it, i) => {
      if (i % every) return;
      ctx.fillText(String(it.label ?? ''), pad.l + slot * i + slot / 2, hh - pad.b + 7);
    });
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!geom) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const idx = Math.floor((x - geom.pad.l) / geom.slot);
    const valid = idx >= 0 && idx < geom.bars.length;
    if (hover !== (valid ? idx : -1)) { hover = valid ? idx : -1; render(); }
    if (valid) {
      const bar = geom.bars[idx];
      showTip(tip, container, bar.x, bar.y, `<b style="color:${bar.it.color || COLORS.cyan}">${fmt(bar.it.value)}${unit}</b><br><span style="opacity:.7">${bar.it.label ?? ''}</span>`);
    } else tip.classList.remove('is-on');
  });
  canvas.addEventListener('mouseleave', () => { hover = -1; tip.classList.remove('is-on'); render(); });

  return container;
}

/* ============================================================
   Donut mit Zentrumsbeschriftung
   ============================================================ */
export function donutChart(container, cfg) {
  const { slices = [], height = 200, centerLabel = '', centerSub = '', fmt = (v) => num(v, 0) } = cfg;
  container.classList.add('chart');
  const tip = tipEl(container);
  let hover = -1;
  let geom = null;

  const { canvas, render } = mount(container, height, (ctx, w, hh) => {
    const cx = w / 2, cy = hh / 2;
    const R = Math.min(w, hh) / 2 - 8;
    if (R < 12) return;
    const r = R * 0.62;
    const total = slices.reduce((a, b) => a + Math.abs(b.value), 0);

    // Ring-Hintergrund
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();

    if (total > 0) {
      let a0 = -Math.PI / 2;
      const arcs = [];
      slices.forEach((s, i) => {
        const frac = Math.abs(s.value) / total;
        const a1 = a0 + frac * Math.PI * 2;
        const isH = i === hover;
        const rr = isH ? R + 3 : R;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, a0 + 0.012, a1 - 0.012);
        ctx.arc(cx, cy, r, a1 - 0.012, a0 + 0.012, true);
        ctx.closePath();
        ctx.fillStyle = isH ? s.color : hexA(s.color, 0.82);
        ctx.shadowColor = hexA(s.color, 0.65);
        ctx.shadowBlur = isH ? 20 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        arcs.push({ a0, a1, s });
        a0 = a1;
      });
      geom = { cx, cy, R, r, arcs };
    }

    // Zentrum
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eefaff';
    ctx.font = '700 17px ui-monospace, monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(centerLabel, cx, cy + 2);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '9.5px ui-monospace, monospace';
    ctx.fillText(centerSub.toUpperCase(), cx, cy + 17);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!geom) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - geom.cx;
    const y = e.clientY - rect.top - geom.cy;
    const dist = Math.hypot(x, y);
    let idx = -1;
    if (dist >= geom.r && dist <= geom.R + 4) {
      let ang = Math.atan2(y, x);
      if (ang < -Math.PI / 2) ang += Math.PI * 2;
      idx = geom.arcs.findIndex((a) => ang >= a.a0 && ang < a.a1);
    }
    if (idx !== hover) { hover = idx; render(); }
    if (idx >= 0) {
      const s = geom.arcs[idx].s;
      showTip(tip, container, geom.cx + x, geom.cy + y, `<b style="color:${s.color}">${s.label}</b><br>${fmt(s.value)}`);
    } else tip.classList.remove('is-on');
  });
  canvas.addEventListener('mouseleave', () => { hover = -1; tip.classList.remove('is-on'); render(); });

  return container;
}

/* ============================================================
   Radial-Gauge (Arc-Reactor-Look)
   ============================================================ */
export function gauge(container, cfg) {
  const {
    value = 0, max = 100, color = COLORS.cyan, height = 128,
    label = '', display = null, sub = '',
  } = cfg;
  container.classList.add('chart');

  mount(container, height, (ctx, w, hh) => {
    const cx = w / 2, cy = hh / 2 + 6;
    const R = Math.min(w / 2, hh / 2) - 6;
    if (R < 24) return;
    const START = Math.PI * 0.75, SWEEP = Math.PI * 1.5;
    const frac = Math.max(0, Math.min(1, (Number(value) || 0) / (max || 1)));

    // Skalenstriche
    ctx.save();
    for (let i = 0; i <= 30; i++) {
      const a = START + (SWEEP * i) / 30;
      const on = i / 30 <= frac;
      const len = i % 5 === 0 ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R - len), cy + Math.sin(a) * (R - len));
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.strokeStyle = on ? hexA(color, 0.85) : 'rgba(120,160,190,0.16)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1.2;
      ctx.stroke();
    }
    ctx.restore();

    // Basisbogen
    ctx.beginPath();
    ctx.arc(cx, cy, R - 14, START, START + SWEEP);
    ctx.strokeStyle = 'rgba(120,160,190,0.14)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Wertbogen
    if (frac > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, R - 14, START, START + SWEEP * frac);
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.shadowColor = hexA(color, 0.85);
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Wert
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eefaff';
    ctx.font = `700 ${Math.round(R * 0.46)}px ui-monospace, monospace`;
    ctx.fillText(display !== null ? String(display) : String(Math.round(value)), cx, cy + R * 0.14);
    if (sub) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '9.5px ui-monospace, monospace';
      ctx.fillText(sub.toUpperCase(), cx, cy + R * 0.44);
    }
    if (label) {
      // Beschriftung so weit verkleinern, dass sie in den Bogen passt
      const txt = label.toUpperCase();
      let fs = 9.5;
      const maxW = R * 1.2;
      ctx.font = `700 ${fs}px ui-monospace, monospace`;
      while (ctx.measureText(txt).width > maxW && fs > 6) {
        fs -= 0.5;
        ctx.font = `700 ${fs}px ui-monospace, monospace`;
      }
      ctx.fillStyle = hexA(color, 0.9);
      ctx.fillText(txt, cx, cy - R * 0.42);
    }
  });

  return container;
}

/* ============================================================
   Sparkline
   ============================================================ */
export function sparkline(container, cfg) {
  const { values = [], color = COLORS.cyan, height = 26 } = cfg;
  container.classList.add('chart');
  mount(container, height, (ctx, w, hh) => {
    const vals = values.filter((v) => v != null);
    if (vals.length < 2) return;
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const stepX = w / (values.length - 1);
    ctx.beginPath();
    let started = false;
    values.forEach((v, i) => {
      if (v == null) { started = false; return; }
      const x = stepX * i;
      const y = 3 + (hh - 6) * (1 - (v - min) / span);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = hexA(color, 0.6);
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const lastIdx = values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
    if (lastIdx != null) {
      const x = stepX * lastIdx;
      const y = 3 + (hh - 6) * (1 - (values[lastIdx] - min) / span);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  });
  return container;
}

/* ============================================================
   Hilfsfunktion: Farbe + Alpha
   ============================================================ */
export function hexA(color, a) {
  const c = String(color).trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4
      ? c.slice(1).split('').map((x) => x + x).join('')
      : c.slice(1);
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  if (c.startsWith('rgb')) {
    const parts = c.replace(/rgba?\(|\)/g, '').split(',').map((s) => parseFloat(s));
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return c;
}

/** Legende als DOM-Element. */
export function legend(items) {
  return h('div', { class: 'legend' },
    items.map((i) => h('div', { class: 'legend__i' },
      h('span', { class: 'legend__sw', style: { background: i.color } }),
      i.label,
      i.value ? h('span', { class: 'legend__v' }, i.value) : null,
    )),
  );
}
