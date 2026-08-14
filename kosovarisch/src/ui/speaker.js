/* ============================================================
   speaker.js — der Hörknopf

   Ein Knopf, überall gleich: Wort antippen, Wort hören. Gibt es
   auf dem Gerät keine brauchbare Stimme, entsteht gar kein Knopf
   — dann bleibt die Lautschrift der Weg.
   ============================================================ */

import { el } from './kit.js';
import { canSpeak, speak } from '../speech.js';

export function speaker(text, { size = '', slow = false, label } = {}) {
  if (!text || !canSpeak()) return null;
  return el(`button.speaker${size ? `.speaker--${size}` : ''}`, {
    type: 'button',
    'aria-label': label || (slow ? 'Langsam vorlesen' : 'Vorlesen'),
    text: slow ? '🐢' : '🔊',
    on: {
      click: (event) => {
        event.stopPropagation();      // in Listen nicht die Zeile mit aufklappen
        event.preventDefault();
        speak(text, slow ? { rate: 0.55 } : {});
      },
    },
  });
}

/** Zwei Knöpfe: normal und langsam. */
export function speakerPair(text) {
  if (!text || !canSpeak()) return null;
  return el('div.speakers', {}, [speaker(text), speaker(text, { slow: true })]);
}
