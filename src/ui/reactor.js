/* ============================================================
   reactor.js — animierter Arc-Reactor als SVG
   ============================================================ */

/**
 * @param {number} size  Kantenlänge in px
 * @param {number} charge 0..1 — füllt den äußeren Fortschrittsring
 */
export function reactorSVG(size = 120, charge = 1) {
  const c = Math.max(0, Math.min(1, charge));
  const R = 42;
  const circ = 2 * Math.PI * R;
  const dash = `${circ * c} ${circ}`;
  const segs = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = 50 + Math.cos(a) * 25, y1 = 50 + Math.sin(a) * 25;
    const x2 = 50 + Math.cos(a) * 33, y2 = 50 + Math.sin(a) * 33;
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#3ad7ff" stroke-width="2.4" opacity="${0.35 + 0.5 * Math.abs(Math.sin(i))}" stroke-linecap="round"/>`;
  }).join('');

  return `
<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="rcore" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#a9f2ff"/>
      <stop offset="100%" stop-color="#1d7ea3" stop-opacity="0.15"/>
    </radialGradient>
    <filter id="rglow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(72,196,255,0.18)" stroke-width="1"/>
  <circle cx="50" cy="50" r="${R}" fill="none" stroke="rgba(72,196,255,0.12)" stroke-width="4"/>
  <circle cx="50" cy="50" r="${R}" fill="none" stroke="#3ad7ff" stroke-width="4"
          stroke-dasharray="${dash}" stroke-linecap="round"
          transform="rotate(-90 50 50)" filter="url(#rglow)"/>

  <g class="reactor-spin">
    <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(141,240,255,0.35)" stroke-width="0.8" stroke-dasharray="10 6"/>
  </g>
  <g class="reactor-spin2">${segs}</g>

  <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(141,240,255,0.5)" stroke-width="1.2"/>
  <g class="reactor-core" filter="url(#rglow)">
    <circle cx="50" cy="50" r="17" fill="url(#rcore)"/>
    <circle cx="50" cy="50" r="8" fill="#eafcff"/>
  </g>
</svg>`;
}

/** Kleines Logo für die Topbar. */
export function markSVG(size = 34) {
  return `
<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(72,196,255,0.35)" stroke-width="3"/>
  <g class="reactor-spin">
    <circle cx="50" cy="50" r="34" fill="none" stroke="#3ad7ff" stroke-width="4" stroke-dasharray="34 14" stroke-linecap="round"/>
  </g>
  <circle cx="50" cy="50" r="18" fill="none" stroke="#8df0ff" stroke-width="5"/>
  <circle class="reactor-core" cx="50" cy="50" r="8" fill="#eafcff"/>
</svg>`;
}
