/* ============================================================
   profile.js — Profil, Abzeichen, Einstellungen

   Auch der Ort, an dem der Fortschritt gesichert oder auf ein
   anderes Gerät übertragen wird — als Datei, ohne Konto.
   ============================================================ */

import { el, ring, sheet, toast } from '../ui/kit.js';
import {
  getState, rankFor, currentStreak, weekLog, settings, setSetting,
  hearts, heartTimer, refillHearts, exportState, importState, resetAll,
  xpToday, HEARTS_MAX,
} from '../state.js';
import { BADGES } from '../data/badges.js';
import { ALL_LESSONS } from '../data/course.js';
import { stats as srsStats } from '../engine/srs.js';
import { usableVoices, currentVoice, setVoice, describeVoice, canSpeak, speak } from '../speech.js';
import { preview } from '../pronounce.js';
import { LEXICON } from '../data/lexicon.js';

function weekChart() {
  const log = weekLog();
  const max = Math.max(settings().goal || 150, ...log.map((d) => d.xp));
  return el('div.week', {}, log.map((d) => el('div.week__col', {}, [
    el('div.week__bar', {}, [
      el('span', {
        style: { height: `${d.xp ? Math.max(6, Math.round((d.xp / max) * 100)) : 4}%` },
        class: d.xp >= (settings().goal || 150) ? 'is-goal' : (d.xp ? '' : 'is-empty'),
      }),
    ]),
    el('small.week__lbl', { text: d.label }),
    el('small.week__xp', { text: d.xp || '' }),
  ])));
}

function toggleRow(key, label, hint) {
  const on = !!settings()[key];
  const knob = el('span.switch__knob');
  const sw = el('button.switch', {
    type: 'button', role: 'switch', 'aria-checked': String(on), class: on ? 'is-on' : '',
    on: {
      click: (e) => {
        const next = !settings()[key];
        setSetting(key, next);
        e.currentTarget.classList.toggle('is-on', next);
        e.currentTarget.setAttribute('aria-checked', String(next));
      },
    },
  }, [knob]);

  return el('div.setting', {}, [
    el('div.setting__text', {}, [el('strong', { text: label }), hint ? el('small', { text: hint }) : null]),
    sw,
  ]);
}

function goalRow(rerender) {
  const options = [60, 150, 300, 600];
  return el('div.setting.setting--col', {}, [
    el('div.setting__text', {}, [
      el('strong', { text: 'Tagesziel' }),
      el('small', { text: 'Wie viele XP willst du pro Tag schaffen?' }),
    ]),
    el('div.chips', {}, options.map((v) => el('button.chip', {
      type: 'button', text: `${v} XP`, class: settings().goal === v ? 'is-on' : '',
      on: { click: () => { setSetting('goal', v); rerender(); } },
    }))),
  ]);
}

/* ---------- Sprachausgabe ---------- */

const PROBE = 'Qysh je? Faleminderit shumë!';

function voiceSection(rerender) {
  const voices = usableVoices();
  const active = currentVoice();
  const info = describeVoice();

  if (!voices.length) {
    return el('section.card', {}, [
      el('h2.section__title', { text: 'Sprachausgabe' }),
      el('p.note__p', { text: 'Dieses Gerät meldet gerade keine Stimme, mit der sich Albanisch nachbilden lässt.' }),
      el('p.note__p', { text: 'In Safari kommt die Stimmenliste manchmal erst nach der ersten Berührung. Tippe kurz irgendwohin und lade die Seite neu — dann sollten die Hörknöpfe erscheinen.' }),
      el('p.note__p', { text: 'Die Lautschrift in eckigen Klammern steht bei jedem Wort und funktioniert auch ohne Ton.' }),
    ]);
  }

  const list = el('div.voicelist', {}, voices.slice(0, 12).map((v) => {
    const on = active && v.voiceURI === active.voiceURI;
    const code = String(v.lang).slice(0, 2).toLowerCase();
    return el('button.voiceopt', {
      type: 'button', class: on ? 'is-on' : '',
      on: {
        click: () => {
          setVoice(v.voiceURI);
          speak(PROBE);
          rerender();
        },
      },
    }, [
      el('span.voiceopt__lang', { text: code.toUpperCase() }),
      el('span.voiceopt__text', {}, [
        el('strong', { text: v.name }),
        el('small', { text: v.lang + (v.localService ? ' · auf dem Gerät' : ' · online') }),
      ]),
      on ? el('span.voiceopt__check', { text: '✓' }) : null,
    ]);
  }));

  return el('section.card', {}, [
    el('h2.section__title', { text: 'Sprachausgabe' }),
    info
      ? el('div.voicebar', {}, [
        el('span.voicebar__icon', { text: info.exact ? '🎙️' : '🗣️' }),
        el('div', {}, [
          el('strong', { text: `${info.name} · ${info.language}` }),
          el('small', { text: info.note }),
        ]),
      ])
      : null,
    !info?.exact
      ? el('p.section__sub', {
        text: `Albanische Stimmen gibt es auf iPhones nicht. Deshalb wird jedes Wort in die Schreibweise der gewählten Stimme übersetzt: „Qysh je" → „${preview('Qysh je', info?.lang) || 'qysh je'}".`,
      })
      : null,
    el('div.btnrow', {}, [
      el('button.btn.btn--primary', {
        type: 'button', text: '🔊 Aussprache testen',
        on: { click: () => speak(PROBE) },
      }),
    ]),
    el('h3.section__title.section__title--sm', { text: 'Stimme wählen' }),
    el('p.section__sub', { text: 'Türkisch und Italienisch treffen die albanischen Laute am besten, Deutsch ist am vertrautesten. Antippen spielt eine Probe ab.' }),
    list,
    el('h3.section__title.section__title--sm', { text: 'Tempo' }),
    el('div.chips', {}, ['langsam', 'normal', 'schnell'].map((r) => el('button.chip', {
      type: 'button', text: r, class: settings().rate === r ? 'is-on' : '',
      on: { click: () => { setSetting('rate', r); speak(PROBE); rerender(); } },
    }))),
  ]);
}

function dataRow(rerender) {
  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `kosovarisch-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Fortschritt gesichert', { icon: '💾' });
  };

  const upload = () => {
    const input = el('input', { type: 'file', accept: 'application/json' });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importState(String(reader.result));
          toast('Fortschritt geladen', { icon: '✅' });
          rerender();
        } catch {
          toast('Diese Datei passt nicht.', { icon: '⚠️' });
        }
      };
      reader.readAsText(file);
    });
    input.click();
  };

  const wipe = () => sheet({
    title: 'Alles zurücksetzen?',
    sub: 'XP, Serie, Abzeichen und der gesamte Lernstand werden gelöscht. Das lässt sich nicht rückgängig machen.',
    actions: [
      { label: 'Abbrechen', kind: 'btn--ghost' },
      { label: 'Ja, löschen', kind: 'btn--danger', onClick: () => { resetAll(); rerender(); toast('Alles auf Anfang.', { icon: '🧹' }); } },
    ],
  });

  return el('div.setting.setting--col', {}, [
    el('div.setting__text', {}, [
      el('strong', { text: 'Fortschritt sichern' }),
      el('small', { text: 'Alles liegt nur auf diesem Gerät. Sichere ihn, bevor du den Browser aufräumst.' }),
    ]),
    el('div.btnrow', {}, [
      el('button.btn.btn--ghost', { type: 'button', text: '💾 Sichern', on: { click: download } }),
      el('button.btn.btn--ghost', { type: 'button', text: '📥 Laden', on: { click: upload } }),
      el('button.btn.btn--ghost.btn--quiet', { type: 'button', text: '🧹 Zurücksetzen', on: { click: wipe } }),
    ]),
  ]);
}

export function renderProfile(rerender) {
  const s = getState();
  const rank = rankFor(s.xp);
  const srs = srsStats();
  const doneLessons = ALL_LESSONS.filter((l) => s.lessons[l.id]?.done).length;
  const acc = s.stats.answers ? Math.round((s.stats.correct / s.stats.answers) * 100) : 0;
  const heartsLeft = hearts();
  const wait = heartTimer();

  const badgeGrid = el('div.badges', {}, BADGES.map((b) => {
    const owned = !!s.badges[b.id];
    return el('button.badge', {
      type: 'button', class: owned ? 'is-owned' : '',
      on: {
        click: () => sheet({
          title: `${b.icon} ${b.title}`,
          sub: b.de,
          content: [
            el('p.note__p', { text: b.hint }),
            el('p.note__p', { text: owned ? `Verdient am ${new Date(s.badges[b.id]).toLocaleDateString('de-DE')}.` : 'Noch nicht verdient.' }),
          ],
          actions: [{ label: 'Schließen', kind: 'btn--primary' }],
        }),
      },
    }, [
      el('span.badge__icon', { text: owned ? b.icon : '🔒' }),
      el('small.badge__title', { text: b.title }),
    ]);
  }));

  const owned = BADGES.filter((b) => s.badges[b.id]).length;

  return el('div.view', {}, [
    el('header.profile', {}, [
      ring(rank.progress, {
        size: 108, width: 10, color: 'var(--accent)',
        label: `${rank.level}`, sub: 'Rang',
      }),
      el('div.profile__meta', {}, [
        el('h1', { text: rank.name }),
        el('p.profile__de', { text: rank.de }),
        el('p.profile__xp', {
          text: rank.next
            ? `${s.xp} XP · noch ${rank.toNext} bis ${rank.next.name}`
            : `${s.xp} XP · höchster Rang erreicht`,
        }),
      ]),
    ]),

    el('div.tiles3', {}, [
      el('div.tile3', {}, [el('strong', { text: `🔥 ${currentStreak()}` }), el('small', { text: `beste: ${s.streak.best}` })]),
      el('div.tile3', {}, [el('strong', { text: `${doneLessons}/${ALL_LESSONS.length}` }), el('small', { text: 'Lektionen' })]),
      el('div.tile3', {}, [el('strong', { text: `${acc}%` }), el('small', { text: 'richtig gesamt' })]),
    ]),

    el('section.card', {}, [
      el('h2.section__title', { text: 'Diese Woche' }),
      weekChart(),
      el('p.section__sub', { text: `Heute: ${xpToday()} von ${settings().goal} XP` }),
    ]),

    el('section.card', {}, [
      el('h2.section__title', { text: 'Wortschatz' }),
      el('div.tiles3', {}, [
        el('div.tile3', {}, [el('strong', { text: srs.seen }), el('small', { text: 'geübt' })]),
        el('div.tile3', {}, [el('strong', { text: srs.strong }), el('small', { text: 'sitzen fest' })]),
        el('div.tile3', {}, [el('strong', { text: LEXICON.length }), el('small', { text: 'insgesamt' })]),
      ]),
    ]),

    el('section.card', {}, [
      el('h2.section__title', { text: `Abzeichen ${owned}/${BADGES.length}` }),
      badgeGrid,
    ]),

    el('section.card', {}, [
      el('h2.section__title', { text: 'Herzen' }),
      el('p.section__sub', {
        text: settings().hearts
          ? (heartsLeft >= HEARTS_MAX
            ? 'Alle Herzen voll.'
            : `${heartsLeft} von ${HEARTS_MAX} · nächstes in ${Math.ceil(wait / 60000)} Min.`)
          : 'Herzen sind ausgeschaltet — du lernst ohne Limit.',
      }),
      settings().hearts && heartsLeft < HEARTS_MAX
        ? el('button.btn.btn--ghost', { type: 'button', text: '❤️ Auffüllen', on: { click: () => { refillHearts(); rerender(); } } })
        : null,
    ]),

    el('section.card', {}, [
      el('h2.section__title', { text: 'Einstellungen' }),
      toggleRow('sound', 'Töne', 'Kleine Signale bei richtig und falsch'),
      toggleRow('haptics', 'Vibration', 'Kurzes Rütteln (nicht auf jedem iPhone)'),
      toggleRow('showStd', 'Standardalbanisch zeigen', 'Beim Lernen zusätzlich die Schulbuchform einblenden'),
      toggleRow('hearts', 'Mit Herzen spielen', 'Aus = üben ohne Fehlerlimit'),
      toggleRow('speech', 'Sprachausgabe', canSpeak()
        ? 'Hörknöpfe sind überall aktiv'
        : 'Aus oder keine Stimme gefunden'),
      toggleRow('autoplay', 'Automatisch vorlesen', 'Neue Wörter und Lösungen von allein anhören'),
      goalRow(rerender),
      dataRow(rerender),
    ]),

    voiceSection(rerender),

    el('section.card', {}, [
      el('h2.section__title', { text: 'Über diese App' }),
      el('p.note__p', { text: 'Diese App bringt dir Kosovarisch bei, wie es rund um Prizren gesprochen wird — Gegisch, mit den türkischen Lehnwörtern der Stadt. Wo der Schulbuch-Standard abweicht, steht er dabei.' }),
      el('p.note__p', { text: 'Alles läuft offline auf deinem Gerät. Kein Konto, keine Werbung, keine Datenübertragung.' }),
      el('p.note__p', { text: 'Tipp: In Safari über „Teilen → Zum Home-Bildschirm" wird daraus eine richtige App im Vollbild.' }),
    ]),
  ]);
}
