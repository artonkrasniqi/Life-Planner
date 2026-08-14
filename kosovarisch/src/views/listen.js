/* ============================================================
   listen.js — Hörliste

   Der Sprachführer zum Anhören: eine Einheit auswählen, auf Play
   tippen und alles der Reihe nach hören — Wort für Wort, mit
   deutscher Bedeutung daneben. Gut für unterwegs, im Bus oder
   zum Nebenherhören.
   ============================================================ */

import { el, clear } from '../ui/kit.js';
import { COURSE } from '../data/course.js';
import { unitEntries, LEXICON } from '../data/lexicon.js';
import { canSpeak, speak, speakSeries, stop, describeVoice } from '../speech.js';
import { isFav } from '../state.js';

let chosen = { unit: 1, only: 'alle' };
let cancelSeries = null;

function entriesFor() {
  if (chosen.only === 'fav') return LEXICON.filter((e) => isFav(e.id));
  if (chosen.only === 'saetze') return unitEntries(chosen.unit).filter((e) => e.kind === 's');
  return unitEntries(chosen.unit);
}

export function renderListen() {
  const view = el('div.view');
  const list = el('div.hearlist');
  const unitChips = el('div.chips.chips--scroll');
  const kindChips = el('div.chips');

  const voice = describeVoice();

  const playAll = el('button.bigcard', {
    type: 'button', style: { '--node-color': '#2fa84f' },
    on: { click: () => togglePlayAll() },
  }, [
    el('span.bigcard__icon', { text: '▶️' }),
    el('span.bigcard__text', {}, [
      el('strong', { text: 'Alles nacheinander abspielen' }),
      el('small', { text: 'Läuft von oben nach unten durch — antippen zum Stoppen.' }),
    ]),
    el('span.bigcard__go', { text: '▶' }),
  ]);

  let playing = false;

  function togglePlayAll() {
    if (playing) {
      cancelSeries?.();
      cancelSeries = null;
      playing = false;
      list.querySelectorAll('.hearrow').forEach((r) => r.classList.remove('is-playing'));
      playAll.querySelector('.bigcard__icon').textContent = '▶️';
      playAll.querySelector('strong').textContent = 'Alles nacheinander abspielen';
      return;
    }
    const items = entriesFor();
    if (!items.length) return;
    playing = true;
    playAll.querySelector('.bigcard__icon').textContent = '⏹';
    playAll.querySelector('strong').textContent = 'Läuft … zum Stoppen antippen';

    cancelSeries = speakSeries(items.map((e) => e.al), {
      onStep: (i) => {
        const rows = list.querySelectorAll('.hearrow');
        rows.forEach((r) => r.classList.remove('is-playing'));
        const row = rows[i];
        if (row) {
          row.classList.add('is-playing');
          row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      },
      onDone: () => { playing = false; togglePlayAll(); },
    });
  }

  function chip(label, active, onClick) {
    return el('button.chip', {
      type: 'button', text: label, class: active ? 'is-on' : '',
      on: { click: () => { cancelSeries?.(); playing = false; onClick(); draw(); } },
    });
  }

  function row(e) {
    return el('div.hearrow', {}, [
      el('button.hearrow__play', {
        type: 'button', 'aria-label': `${e.al} vorlesen`, text: '🔊',
        on: { click: () => speak(e.al) },
      }),
      el('div.hearrow__text', {}, [
        el('strong', { text: e.al }),
        el('small', { text: e.de }),
        el('span.hearrow__ph', { text: `[${e.ph}]` }),
      ]),
      el('button.hearrow__slow', {
        type: 'button', 'aria-label': 'Langsam vorlesen', text: '🐢',
        on: { click: () => speak(e.al, { rate: 0.55 }) },
      }),
    ]);
  }

  function draw() {
    clear(unitChips);
    clear(kindChips);
    clear(list);

    kindChips.append(
      chip('Alles', chosen.only === 'alle', () => { chosen.only = 'alle'; }),
      chip('Nur Sätze', chosen.only === 'saetze', () => { chosen.only = 'saetze'; }),
      chip('★ Gemerkt', chosen.only === 'fav', () => { chosen.only = 'fav'; }),
    );
    unitChips.append(...COURSE.map((u) => chip(`${u.icon} ${u.title}`, chosen.unit === u.n && chosen.only !== 'fav',
      () => { chosen.unit = u.n; if (chosen.only === 'fav') chosen.only = 'alle'; })));

    const items = entriesFor();
    if (!items.length) {
      list.append(el('p.empty', { text: chosen.only === 'fav' ? 'Noch nichts gemerkt — markiere Wörter im Wörterbuch mit ★.' : 'Hier ist nichts.' }));
      return;
    }
    items.forEach((e) => list.append(row(e)));
  }

  draw();

  view.append(
    el('h1.view__title', { text: 'Hören' }),
    el('p.view__sub', {
      text: voice
        ? 'Alles zum Anhören — einzeln oder am Stück.'
        : 'Dieses Gerät kann gerade nicht vorlesen. Die Lautschrift steht trotzdem bei jedem Wort.',
    }),
    voice
      ? el('div.voicebar', {}, [
        el('span.voicebar__icon', { text: voice.exact ? '🎙️' : '🗣️' }),
        el('div', {}, [
          el('strong', { text: `Stimme: ${voice.name} (${voice.language})` }),
          el('small', { text: voice.note }),
        ]),
        el('a.voicebar__link', { href: '#/profil', text: 'ändern' }),
      ])
      : el('div.voicebar.voicebar--off', {}, [
        el('span.voicebar__icon', { text: '🔇' }),
        el('div', {}, [
          el('strong', { text: 'Keine Stimme gefunden' }),
          el('small', { text: 'In Safari erlaubt iOS die Sprachausgabe erst nach der ersten Berührung — tippe kurz irgendwohin und lade die Seite neu.' }),
        ]),
      ]),
    canSpeak() ? playAll : null,
    kindChips, unitChips, list,
  );

  return view;
}

/** Beim Verlassen der Ansicht nicht weiterreden. */
export function stopListening() {
  cancelSeries?.();
  cancelSeries = null;
  stop();
}
