/* ============================================================
   notes.js — Grammatik & Kultur

   Kurze Karten statt Kapitel: jede erklärt genau eine Sache,
   auf Deutsch, mit Beispielen aus dem Prizrener Alltag.
   ============================================================ */

import { el } from '../ui/kit.js';
import { CARDS, cardById } from '../data/grammar.js';
import { COURSE } from '../data/course.js';

function section(part) {
  if (part.p) return el('p.note__p', { text: part.p });
  if (part.tip) return el('div.note__tip', {}, [el('span', { text: '💡' }), el('p', { text: part.tip })]);
  if (part.list) return el('ul.note__list', {}, part.list.map((t) => el('li', { text: t })));
  if (part.table) {
    return el('div.note__table', {}, part.table.map((row, i) => el('div.note__tr', { class: i === 0 && row[0].length < 22 && /Prizren|Standard/.test(row[0]) ? 'is-head' : '' }, [
      el('span.note__td', { text: row[0] }),
      el('span.note__td.note__td--de', { text: row[1] }),
    ])));
  }
  return null;
}

export function renderNote(id) {
  const card = cardById(id);
  if (!card) return el('div.view', {}, [el('p.empty', { text: 'Diese Karte gibt es nicht.' })]);

  const unit = COURSE.find((u) => u.n === card.unit);

  return el('div.view.view--note', {}, [
    el('a.backlink', { href: '#/grammatik', text: '‹ Grammatik & Kultur' }),
    el('div.note__head', {}, [
      el('span.note__icon', { text: card.icon }),
      el('div', {}, [
        el('span.note__kicker', { text: `${card.kind === 'kultur' ? 'Kultur' : 'Grammatik'} · Einheit ${card.unit} ${unit ? '· ' + unit.de : ''}` }),
        el('h1.note__title', { text: card.title }),
      ]),
    ]),
    el('p.note__teaser', { text: card.teaser }),
    el('div.note__body', {}, card.body.map(section).filter(Boolean)),
    card.quiz?.length
      ? el('p.note__hint', { text: `In der Prüfung dieser Einheit wird daraus eine Frage — es lohnt sich also.` })
      : null,
  ]);
}

export function renderNotes() {
  const groups = [
    { key: 'grammatik', title: 'Grammatik', sub: 'Die Regeln dahinter — kurz und ohne Fachchinesisch.' },
    { key: 'kultur', title: 'Kultur & Prizren', sub: 'Was man wissen sollte, bevor man den Mund aufmacht.' },
  ];

  return el('div.view', {}, [
    el('h1.view__title', { text: 'Grammatik & Kultur' }),
    el('p.view__sub', { text: `${CARDS.length} Karten, jede in zwei Minuten gelesen.` }),
    ...groups.map((g) => el('section', {}, [
      el('h2.section__title', { text: g.title }),
      el('p.section__sub', { text: g.sub }),
      el('div.notecards', {}, CARDS.filter((c) => c.kind === g.key).map((c) => el('a.notecard', { href: `#/grammatik/${c.id}` }, [
        el('span.notecard__icon', { text: c.icon }),
        el('span.notecard__text', {}, [
          el('strong', { text: c.title }),
          el('small', { text: c.teaser }),
        ]),
        el('span.notecard__go', { text: '›' }),
      ]))),
    ])),
  ]);
}
