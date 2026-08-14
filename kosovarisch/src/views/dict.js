/* ============================================================
   dict.js — Wörterbuch

   Alle Wörter und Wendungen der App, durchsuchbar auf Deutsch
   und auf Kosovarisch. Ein Tipp auf einen Eintrag öffnet die
   Details samt Lautschrift, Standardform und Lernstand.
   ============================================================ */

import { el, clear, sheet, toast } from '../ui/kit.js';
import { LEXICON, entry } from '../data/lexicon.js';
import { COURSE } from '../data/course.js';
import { normalize } from '../util.js';
import { strength, cardOf } from '../engine/srs.js';
import { isFav, toggleFav, settings } from '../state.js';
import { speak, canSpeak, describeVoice } from '../speech.js';
import { speaker } from '../ui/speaker.js';
import { preview } from '../pronounce.js';

let filter = { text: '', unit: 0, only: 'alle' };

export function openEntry(id) {
  const e = entry(id);
  if (!e) return;
  const card = cardOf(id);
  const pct = Math.round(strength(id) * 100);

  const body = [
    el('div.entry__head', {}, [
      el('div', {}, [
        el('h3.entry__al', { text: e.al }),
        el('p.entry__ph', { text: `[${e.ph}]` }),
      ]),
      canSpeak()
        ? el('div.speakers', {}, [
          el('button.speaker.speaker--big', {
            type: 'button', text: '🔊', 'aria-label': 'Vorlesen',
            on: { click: () => speak(e.al) },
          }),
          el('button.speaker', {
            type: 'button', text: '🐢', 'aria-label': 'Langsam vorlesen',
            on: { click: () => speak(e.al, { rate: 0.55 }) },
          }),
        ])
        : null,
    ]),
    el('p.entry__de', { text: e.de }),
    e.std ? el('p.entry__std', {}, [el('span.tag', { text: 'Standard' }), ` ${e.std}`]) : null,
    e.note ? el('p.entry__note', { text: e.note }) : null,
    voiceHint(e.al),
    el('div.entry__meter', {}, [
      el('div.meter', {}, [el('span', { style: { width: `${pct}%` } })]),
      el('small', {
        text: card
          ? `Lernstand ${pct}% · ${card.ok} richtig, ${card.bad} daneben · wieder am ${card.due}`
          : 'Noch nicht geübt',
      }),
    ]),
  ];

  sheet({
    sub: `Einheit ${e.u} · ${COURSE.find((u) => u.n === e.u)?.de || ''}`,
    content: body,
    actions: [
      {
        label: isFav(id) ? '★ Nicht mehr merken' : '☆ Merken',
        onClick: () => {
          const on = toggleFav(id);
          toast(on ? 'Zu den gemerkten Wörtern' : 'Aus den gemerkten Wörtern entfernt', { icon: on ? '★' : '☆' });
        },
      },
      { label: 'Schließen', kind: 'btn--primary' },
    ],
  });
}

/* Bei einer Ersatzstimme zeigen, was ihr tatsächlich vorgelegt wird —
   sonst wirkt die Aussprache wie ein Zufallsprodukt. */
function voiceHint(al) {
  const v = describeVoice();
  if (!v || v.exact) return null;
  const said = preview(al, v.lang);
  if (!said) return null;
  return el('p.entry__voice', {}, [
    el('span.tag', { text: v.language }),
    ` liest: ${said}`,
  ]);
}

function row(e) {
  const pct = Math.round(strength(e.id) * 100);
  return el('button.wordrow', {
    type: 'button',
    on: { click: () => openEntry(e.id) },
  }, [
    el('span.wordrow__main', {}, [
      el('strong', { text: e.al }),
      el('small', { text: e.de }),
    ]),
    el('span.wordrow__side', {}, [
      isFav(e.id) ? el('span.wordrow__fav', { text: '★' }) : null,
      el('span.dot', { style: { '--pct': `${pct}%` }, title: `Lernstand ${pct}%` }),
      speaker(e.al),
    ]),
  ]);
}

export function renderDict() {
  const listBox = el('div.wordlist');

  const search = el('input.input.input--search', {
    type: 'search', placeholder: 'Suchen …',
    value: filter.text, autocapitalize: 'none', autocorrect: 'off',
    on: { input: (e) => { filter.text = e.target.value; draw(); } },
  });

  const chips = el('div.chips');
  const unitChips = el('div.chips.chips--scroll');
  const chip = (label, active, onClick) => el('button.chip', {
    type: 'button', text: label, class: active ? 'is-on' : '',
    on: { click: () => { onClick(); draw(); } },
  });

  function drawChips() {
    clear(chips);
    clear(unitChips);
    chips.append(
      chip('Alle', filter.only === 'alle' && !filter.unit, () => { filter.only = 'alle'; filter.unit = 0; }),
      chip('★ Gemerkt', filter.only === 'fav', () => { filter.only = filter.only === 'fav' ? 'alle' : 'fav'; }),
      chip('Gelernt', filter.only === 'gelernt', () => { filter.only = filter.only === 'gelernt' ? 'alle' : 'gelernt'; }),
    );
    // Die Einheiten in einer Zeile zum Wischen — sonst füllen 15 Chips den Bildschirm.
    unitChips.append(...COURSE.map((u) => chip(`${u.icon} ${u.title}`, filter.unit === u.n, () => {
      filter.unit = filter.unit === u.n ? 0 : u.n;
    })));
  }

  function matches(e) {
    if (filter.unit && e.u !== filter.unit) return false;
    if (filter.only === 'fav' && !isFav(e.id)) return false;
    if (filter.only === 'gelernt' && !(cardOf(e.id)?.ok > 0)) return false;
    if (!filter.text.trim()) return true;
    const q = normalize(filter.text);
    return [e.al, e.de, e.std, e.ph].filter(Boolean).some((t) => normalize(t).includes(q));
  }

  function draw() {
    drawChips();
    clear(listBox);
    const found = LEXICON.filter(matches);

    if (!found.length) {
      listBox.append(el('p.empty', { text: 'Nichts gefunden. Anderes Wort probieren?' }));
      return;
    }

    const byUnit = new Map();
    for (const e of found) {
      if (!byUnit.has(e.u)) byUnit.set(e.u, []);
      byUnit.get(e.u).push(e);
    }

    for (const [u, items] of [...byUnit.entries()].sort((a, b) => a[0] - b[0])) {
      const unit = COURSE.find((c) => c.n === u);
      listBox.append(
        el('h3.wordgroup', { text: `${unit?.icon || ''} ${unit?.title || 'Einheit ' + u} · ${unit?.de || ''}` }),
        ...items.map(row),
      );
    }
    listBox.append(el('p.pathfoot', { text: `${found.length} von ${LEXICON.length} Einträgen` }));
  }

  draw();

  return el('div.view', {}, [
    el('h1.view__title', { text: 'Wörterbuch' }),
    el('p.view__sub', {
      text: settings().showStd
        ? 'Prizrener Form zuerst, Standardalbanisch in den Details.'
        : 'Alle Wörter und Wendungen dieser App.',
    }),
    search, chips, unitChips, listBox,
  ]);
}
