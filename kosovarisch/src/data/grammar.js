/* ============================================================
   grammar.js — Grammatik- und Kulturkarten

   Alles auf Deutsch erklärt, kurz gehalten und immer mit
   Beispielen aus dem gesprochenen Kosovarischen. Jede Karte
   gehört zu einer Einheit und wird im Lernpfad freigeschaltet,
   sobald man dort ankommt.

   Format der Abschnitte:
     { p: 'Absatz' }                       — Fließtext
     { list: ['Punkt', ...] }              — Aufzählung
     { table: [['links','rechts'], ...] }  — zwei Spalten
     { tip: 'Merksatz' }                   — hervorgehobener Kasten
   ============================================================ */

export const CARDS = [
  {
    id: 'aussprache',
    unit: 1,
    kind: 'grammatik',
    icon: '🔊',
    title: 'Aussprache: 36 Buchstaben, keine Ausnahmen',
    teaser: 'Albanisch wird gesprochen wie geschrieben — man muss nur neun Sonderzeichen kennen.',
    body: [
      { p: 'Die gute Nachricht zuerst: Albanisch hat keine stummen Buchstaben und keine Überraschungen. Wenn du die Buchstaben kennst, kannst du jedes Wort vorlesen, auch wenn du es nicht verstehst.' },
      { p: 'Diese neun Zeichen musst du dir merken:' },
      {
        table: [
          ['ë', 'wie das "e" in "bitte", oft fast verschluckt'],
          ['ç', 'wie "tsch" in "Tschüss"'],
          ['q', 'weiches "kj" — in Prizren fast wie "tsch"'],
          ['gj', 'weiches "dj" — wie "dj" in "Adjektiv", schnell gesprochen'],
          ['xh', 'wie "dsch" in "Dschungel"'],
          ['x', 'wie "ds" in "Landsmann"'],
          ['dh', 'stimmhaftes "th" wie im Englischen "this"'],
          ['th', 'stimmloses "th" wie im Englischen "thing"'],
          ['y', 'wie deutsches "ü"'],
        ],
      },
      { p: 'Dazu drei Kleinigkeiten: "c" ist ein "z", "v" ist ein "w", "rr" wird gerollt, "ll" klingt dunkel (wie im Englischen "ball"), "nj" wie das "gn" in "Cognac".' },
      { tip: 'In Prizren fallen "q" und "ç" oft zusammen — beide klingen nach "tsch". Wer das hört, hört Prizren.' },
    ],
    quiz: [
      { q: 'Wie spricht man "xh" aus?', a: 'wie "dsch" in Dschungel', wrong: ['wie "ch" in Bach', 'wie "sch" in Schule', 'wie "z" in Zeit'] },
      { q: 'Was ist "ë"?', a: 'ein kurzes, dumpfes "e" wie in "bitte"', wrong: ['ein langes "ee"', 'ein stummes Zeichen ohne Laut', 'wie deutsches "ä"'] },
      { q: 'Wie klingt "y" im Albanischen?', a: 'wie deutsches "ü"', wrong: ['wie "j"', 'wie "i"', 'wie "ei"'] },
    ],
  },

  {
    id: 'gegisch',
    unit: 1,
    kind: 'kultur',
    icon: '🗺️',
    title: 'Was du hier lernst: Gegisch aus Prizren',
    teaser: 'Warum "osht" im Wörterbuch nicht steht — und trotzdem alle es sagen.',
    body: [
      { p: 'Albanisch hat zwei große Hauptdialekte: Gegisch im Norden (Kosovo, Nordalbanien, Mazedonien, Montenegro) und Toskisch im Süden. Die Schriftsprache von 1972 baut auf dem Toskischen auf — deshalb steht im Lehrbuch "është", während in Prizren "osht" oder "âsht" gesagt wird.' },
      { p: 'Diese App bringt dir die gesprochene Sprache bei, so wie sie in Prizren im Café klingt. Wo die Standardform abweicht, steht sie mit dabei — du erkennst sie an der Zeile "Standard".' },
      {
        table: [
          ['Prizren / Kosovo', 'Standard'],
          ['qysh je?', 'si je?'],
          ['osht', 'është'],
          ['qka', 'çfarë'],
          ['tash', 'tani'],
          ['shpia', 'shtëpia'],
          ['veç', 'vetëm'],
          ['prej kah je?', 'nga je?'],
        ],
      },
      { tip: 'Beides ist richtig. Mit dem Standard verstehst du Nachrichten und Bücher, mit dem Gegischen die Leute.' },
    ],
  },

  {
    id: 'sein',
    unit: 2,
    kind: 'grammatik',
    icon: '🧍',
    title: 'Sein: jam, je, osht',
    teaser: 'Das wichtigste Verb überhaupt — und es ist kurz.',
    body: [
      { p: 'Ohne "sein" geht kein Satz. Im Kosovarischen sieht es so aus:' },
      {
        table: [
          ['un jam', 'ich bin'],
          ['ti je', 'du bist'],
          ['ai / ajo osht', 'er / sie ist'],
          ['na jena', 'wir sind'],
          ['ju jeni', 'ihr seid / Sie sind'],
          ['ata / ato janë', 'sie sind'],
        ],
      },
      { p: 'Das Personalpronomen kann man weglassen, weil die Verbform schon verrät, wer gemeint ist: "Jam mirë" heißt "(Ich) bin gut".' },
      { tip: 'Standard sagt "jemi" statt "jena" und "është" statt "osht". In Prizren hörst du auch "âsht" — mit nasalem a.' },
    ],
    quiz: [
      { q: 'Wie sagt man "wir sind" in Prizren?', a: 'na jena', wrong: ['na jemi', 'na janë', 'na jeni'] },
      { q: '"Ajo ___ mirë." — was fehlt?', a: 'osht', wrong: ['jam', 'je', 'jena'] },
    ],
  },

  {
    id: 'haben',
    unit: 2,
    kind: 'grammatik',
    icon: '🤲',
    title: 'Haben: kam, ki, ka',
    teaser: '"Kam uri" — im Albanischen HAT man Hunger, man ist ihn nicht.',
    body: [
      {
        table: [
          ['un kam', 'ich habe'],
          ['ti ki', 'du hast (Standard: ke)'],
          ['ai / ajo ka', 'er / sie hat'],
          ['na kena', 'wir haben (Standard: kemi)'],
          ['ju keni', 'ihr habt'],
          ['ata kanë', 'sie haben'],
        ],
      },
      { p: 'Viele Zustände werden mit "kam" gebaut, wo das Deutsche "sein" nimmt:' },
      { list: ['Kam uri — ich habe Hunger', 'Kam etje — ich habe Durst', 'Kam ftoftë — mir ist kalt', 'Kam 25 vjeç — ich bin 25 Jahre alt'] },
      { tip: '"A ki ...?" ist die Alltagsfrage schlechthin: "A ki kohë?" — Hast du Zeit?' },
    ],
    quiz: [
      { q: 'Wie sagt man "Ich habe Hunger"?', a: 'Kam uri', wrong: ['Jam uri', 'Osht uri', 'Kam etje'] },
      { q: '"A ___ kohë?" — Hast du Zeit?', a: 'ki', wrong: ['kam', 'ka', 'kena'] },
    ],
  },

  {
    id: 'fragen',
    unit: 2,
    kind: 'grammatik',
    icon: '❓',
    title: 'Fragen stellen: das kleine "a"',
    teaser: 'Ein Buchstabe vorne dran — fertig ist die Ja-Nein-Frage.',
    body: [
      { p: 'Für eine Ja-Nein-Frage stellst du einfach ein "a" vor den Satz. Die Wortstellung bleibt gleich:' },
      {
        table: [
          ['Je mirë.', 'Du bist gut.'],
          ['A je mirë?', 'Geht es dir gut?'],
          ['Ki kohë.', 'Du hast Zeit.'],
          ['A ki kohë?', 'Hast du Zeit?'],
        ],
      },
      { p: 'Für alles andere gibt es die Fragewörter: qka (was), kush (wer), kur (wann), ku (wo), kah (wohin), pse (warum), qysh (wie), sa (wie viel).' },
      { tip: 'Antworten kurz halten ist völlig normal: "A je mirë?" — "Po, mirë." Fertig.' },
    ],
    quiz: [
      { q: 'Was heißt "kah"?', a: 'wohin', wrong: ['warum', 'wer', 'wie viel'] },
      { q: 'Wie macht man aus "Ki kohë" eine Frage?', a: 'A ki kohë?', wrong: ['Ki kohë a?', 'Kohë ki?', 'Qka ki kohë?'] },
    ],
  },

  {
    id: 'zahlen',
    unit: 3,
    kind: 'grammatik',
    icon: '🔢',
    title: 'Zählen: drei kleine Fallen',
    teaser: 'Zahlen sind leicht — bis auf "tre/tri" und das, was danach kommt.',
    body: [
      { p: 'Erstens: „drei" hat zwei Formen. Vor männlichen Wörtern „tre", vor weiblichen „tri": tre djem (drei Jungen), tri çika (drei Mädchen).' },
      { p: 'Zweitens: Nach einer Zahl steht das Hauptwort ohne angehängten Artikel — also die unbestimmte Form:' },
      {
        table: [
          ['një kafe', 'ein Kaffee'],
          ['dy kafe', 'zwei Kaffee'],
          ['tre libra', 'drei Bücher'],
          ['pesë ditë', 'fünf Tage'],
        ],
      },
      { p: 'Drittens: In Prizren wird gekürzt gesprochen. Geschrieben „pesë", gesagt „pes"; „nëntë" wird zu „nând", „një" oft zu „nji". Beim Lesen erkennst du die Langform, beim Hören die kurze.' },
      { p: 'Zusammengesetzt wird mit „e" (und): njëzet e një (21), tridhjetë e pesë (35), njëqind e dhjetë (110).' },
      { tip: 'Beim Bezahlen reicht dir meist ein Satz: „Sa kushton?" — und dann Zahl plus „euro".' },
    ],
    quiz: [
      { q: 'Wie heißt „drei Mädchen"?', a: 'tri çika', wrong: ['tre çika', 'tre çikat', 'tri çikat'] },
      { q: 'Was bedeutet „njëzet e pesë"?', a: '25', wrong: ['15', '52', '205'] },
      { q: 'Wie sagt man in Prizren „neun"?', a: 'nând', wrong: ['nânë', 'nëntëdhjetë', 'njëqind'] },
    ],
  },

  {
    id: 'orientierung',
    unit: 6,
    kind: 'grammatik',
    icon: '🧭',
    title: 'Ku, kah, te — wo und wohin',
    teaser: 'Drei kleine Wörter, und du findest dich durch die ganze Altstadt.',
    body: [
      {
        table: [
          ['Ku osht ...?', 'Wo ist ...?'],
          ['Kah po shkon?', 'Wohin gehst du?'],
          ['te xhamia', 'bei / zur Moschee'],
          ['në qytet', 'in der Stadt / in die Stadt'],
          ['prej Prizrenit', 'aus Prizren'],
        ],
      },
      { p: '„Ku" fragt nach dem Ort, „kah" nach der Richtung. „Te" benutzt du für ein Ziel, das man sehen kann (te ura — an der Brücke), „në" für Orte und Gebiete (në shpi — zu Hause).' },
      { p: 'Die Antwort besteht meistens aus drei Bausteinen: Richtung, Entfernung, Merkpunkt.' },
      { list: ['Shko drejt — geh geradeaus', 'Kthehu majtas te sokaku — bieg links in die Gasse ein', 'Osht afër urës — es ist nahe der Brücke', 'Njëqind metra tutje — hundert Meter weiter'] },
      { tip: 'Wenn du gar nicht weiterkommst: „Jam humb, a mundesh me m\'ndihmu?" — Ich habe mich verlaufen, kannst du mir helfen?' },
    ],
    quiz: [
      { q: 'Womit fragst du nach der Richtung?', a: 'kah', wrong: ['ku', 'qka', 'kur'] },
      { q: 'Was heißt „Ku osht çarshia?"', a: 'Wo ist der Basar?', wrong: ['Wohin geht der Basar?', 'Wann öffnet der Basar?', 'Wie weit ist der Basar?'] },
    ],
  },

  {
    id: 'prizrenguide',
    unit: 6,
    kind: 'kultur',
    icon: '🌉',
    title: 'Prizren in sieben Orten',
    teaser: 'Wo man sich trifft, wo man hochsteigt, wo im August die Leinwände hängen.',
    body: [
      {
        table: [
          ['Sheshi i Shadërvanit', 'Der Brunnenplatz — Treffpunkt der Stadt'],
          ['Ura e gurit', 'Die alte Steinbrücke über den Lumbardhi'],
          ['Kalaja', 'Die Festung über der Stadt, bester Blick bei Sonnenuntergang'],
          ['Xhamia e Sinan Pashës', 'Die große Moschee am Fluss (1615)'],
          ['Lidhja e Prizrenit', 'Museum zur Liga von Prizren, 1878'],
          ['Çarshia', 'Die Gassen mit Läden, Cafés und Filigranschmuck'],
          ['Malet e Sharrit', 'Das Sharr-Gebirge im Rücken der Stadt'],
        ],
      },
      { p: 'Prizren gilt als die mehrsprachigste Stadt des Kosovo: Albanisch, Türkisch, Bosnisch und Romanes an einem Nachmittag am selben Platz. Deshalb klingt das Albanische hier anders als in Prishtina — weicher, mit mehr türkischen Wörtern.' },
      { p: 'Jeden August läuft das DokuFest: Dokumentarfilme auf Leinwänden im Freien, teils direkt im Flussbett und auf der Festung.' },
      { tip: 'Ein Klassiker als Gesprächseinstieg: „A ki qenë te kalaja?" — Warst du schon auf der Festung? Darauf hat jeder in Prizren eine Meinung.' },
    ],
  },

  {
    id: 'artikel',
    unit: 4,
    kind: 'grammatik',
    icon: '🔚',
    title: 'Der Artikel hängt hinten dran',
    teaser: 'shpi = ein Haus, shpia = das Haus. Der Artikel ist eine Endung.',
    body: [
      { p: 'Albanisch hat keinen Artikel vor dem Wort. Stattdessen wird er angehängt. Das ist der größte Unterschied zum Deutschen — und der Grund, warum dasselbe Wort in zwei Formen auftaucht.' },
      {
        table: [
          ['shpi → shpia', 'Haus → das Haus'],
          ['djalë → djali', 'Junge → der Junge'],
          ['motër → motra', 'Schwester → die Schwester'],
          ['kafe → kafja', 'Kaffee → der Kaffee'],
          ['qytet → qyteti', 'Stadt → die Stadt'],
        ],
      },
      { p: 'Faustregel: männliche Wörter bekommen -i oder -u, weibliche -a oder -ja. Im Wörterbuch dieser App steht meistens die bestimmte Form, weil man sie im Alltag häufiger hört.' },
      { tip: 'Nach Zahlen und nach "një" nimmst du die unbestimmte Form: "një kafe" — ein Kaffee.' },
    ],
    quiz: [
      { q: 'Was heißt "shpia"?', a: 'das Haus', wrong: ['ein Haus', 'zu Hause', 'die Häuser'] },
      { q: 'Wie lautet die bestimmte Form von "qytet"?', a: 'qyteti', wrong: ['qyteta', 'qytetja', 'qytetu'] },
    ],
  },

  {
    id: 'possessiv',
    unit: 4,
    kind: 'grammatik',
    icon: '🫱',
    title: 'Mein, dein, unser',
    teaser: 'Auch das Besitzwort steht hinter dem Hauptwort.',
    body: [
      { p: 'Im Albanischen sagt man "die Mutter meine" statt "meine Mutter":' },
      {
        table: [
          ['nana ime', 'meine Mutter'],
          ['babai im', 'mein Vater'],
          ['shpia jem', 'mein Haus (Standard: ime)'],
          ['vllau yt', 'dein Bruder'],
          ['motra jote', 'deine Schwester'],
          ['familja jonë', 'unsere Familie'],
        ],
      },
      { p: 'Die Form richtet sich danach, ob das Hauptwort männlich oder weiblich ist: "im/yt" bei männlichen, "ime/jote" bei weiblichen Wörtern.' },
      { tip: 'Am Anfang reicht es, die Paare als Ganzes zu lernen: "nana ime", "babai im". Das Gefühl für die Endungen kommt von selbst.' },
    ],
    quiz: [
      { q: 'Wie sagt man "meine Mutter"?', a: 'nana ime', wrong: ['ime nana', 'nana im', 'nanë ime'] },
      { q: 'Wo steht im Albanischen das Besitzwort?', a: 'hinter dem Hauptwort', wrong: ['vor dem Hauptwort', 'am Satzende', 'ganz vorne im Satz'] },
    ],
  },

  {
    id: 'praesens',
    unit: 5,
    kind: 'grammatik',
    icon: '🏃',
    title: 'Gegenwart und das kleine "po"',
    teaser: '"Shkoj" heißt ich gehe. "Po shkoj" heißt: ich gehe gerade jetzt.',
    body: [
      { p: 'Regelmäßige Verben auf -oj gehen so:' },
      {
        table: [
          ['un punoj', 'ich arbeite'],
          ['ti punon', 'du arbeitest'],
          ['ai punon', 'er arbeitet'],
          ['na punojmë', 'wir arbeiten'],
          ['ju punoni', 'ihr arbeitet'],
          ['ata punojnë', 'sie arbeiten'],
        ],
      },
      { p: 'Setzt du "po" davor, passiert es gerade in diesem Moment — genau wie die englische -ing-Form:' },
      { list: ['Mësoj shqip — ich lerne Albanisch (allgemein)', 'Po mësoj shqip — ich lerne gerade Albanisch', 'Qka po bon? — Was machst du gerade?'] },
      { tip: 'Im Kosovo hörst du "po" ständig. Wer es weglässt, klingt wie aus dem Lehrbuch.' },
    ],
    quiz: [
      { q: 'Was heißt "Po mësoj shqip"?', a: 'Ich lerne gerade Albanisch', wrong: ['Ich habe Albanisch gelernt', 'Ich werde Albanisch lernen', 'Lern Albanisch!'] },
      { q: 'Wie heißt "wir arbeiten"?', a: 'punojmë', wrong: ['punoni', 'punojnë', 'punon'] },
    ],
  },

  {
    id: 'verneinung',
    unit: 5,
    kind: 'grammatik',
    icon: '🚫',
    title: 'Nein sagen: nuk, s\' und mos',
    teaser: 'Drei Wörter für "nicht" — aber die Aufteilung ist einfach.',
    body: [
      {
        table: [
          ['nuk kuptoj', 'ich verstehe nicht (neutral)'],
          ['s\'po kuptoj', 'ich verstehe gerade nicht (alltäglich)'],
          ['mos shko!', 'geh nicht! (Befehl)'],
        ],
      },
      { p: '"Nuk" ist die Grundform. Im Alltag wird sie zu "s\'" verkürzt und direkt ans Verb geklebt: s\'kam (ich habe nicht), s\'di (ich weiß nicht), s\'ka problem (kein Problem).' },
      { p: '"Mos" nimmst du nur bei Aufforderungen: "Mos u merakos" — mach dir keine Sorgen.' },
      { tip: 'Merksatz für den Alltag: "S\'ka gjë" (keine Ursache) und "S\'ka problem" hörst du in Prizren zwanzigmal am Tag.' },
    ],
    quiz: [
      { q: 'Wie sagt man "Mach dir keine Sorgen"?', a: 'Mos u merakos', wrong: ['Nuk merakos', 'S\'merakos', 'Jo merakos'] },
      { q: 'Was bedeutet "s\'kam"?', a: 'ich habe nicht', wrong: ['ich bin nicht', 'ich will nicht', 'ich weiß nicht'] },
    ],
  },

  {
    id: 'kafekultur',
    unit: 5,
    kind: 'kultur',
    icon: '☕',
    title: 'Kaffee ist keine Nebensache',
    teaser: 'In Prizren ist der Kaffee die Einheit, in der man Zeit misst.',
    body: [
      { p: '"A pi një kafe?" ist keine Frage nach einem Getränk, sondern eine Einladung zu einer Stunde. Kaffee trinkt man langsam, im Sitzen, mit Gesprächen dazwischen — Tempo gilt als unhöflich.' },
      { p: 'Bestellt wird meistens "kafe turke" (Mokka im Kupferkännchen), "makiato" (klein, mit Milchschaum) oder "nes" (Instant mit Schaum). "Makiato e vogël" ist der Standard-Nachmittagskaffee im ganzen Kosovo.' },
      { list: ['Urdhno — bitte sehr, greif zu', 'Të bëftë mirë — guten Appetit', 'Faleminderit për kafen — danke für den Kaffee', 'Unë e paguaj — ich zahle (Streit darüber ist Teil des Rituals)'] },
      { tip: 'Wer eingeladen wird und ablehnt, lehnt nicht den Kaffee ab, sondern die Gesellschaft. Ein "veç pak" (nur kurz) rettet dich.' },
    ],
  },

  {
    id: 'infinitiv',
    unit: 8,
    kind: 'grammatik',
    icon: '🧩',
    title: 'Das gegische "me" — der Infinitiv des Nordens',
    teaser: '"Du me ble" statt "dua të blej" — daran erkennt man Gegisch sofort.',
    body: [
      { p: 'Der auffälligste Unterschied zwischen Nord und Süd: Im Gegischen gibt es einen echten Infinitiv mit "me" (wie das deutsche "zu"). Der Standard baut stattdessen mit "të" + Verbform.' },
      {
        table: [
          ['Prizren / Kosovo', 'Standard'],
          ['du me ble', 'dua të blej — ich will kaufen'],
          ['du me shku', 'dua të shkoj — ich will gehen'],
          ['duhet me pritë', 'duhet të pres — ich muss warten'],
          ['a mundesh me fol?', 'a mund të flasësh? — kannst du sprechen?'],
        ],
      },
      { p: 'Damit baust du sofort die Zukunft: "kam me shku" = ich werde gehen (Standard: "do të shkoj").' },
      { tip: 'Lern die Bausteine als Paar: "du me ..." (ich will ...), "duhet me ..." (ich muss ...), "kam me ..." (ich werde ...).' },
    ],
    quiz: [
      { q: 'Wie sagt man in Prizren "Ich will kaufen"?', a: 'Du me ble', wrong: ['Dua të blej', 'Blej dua', 'Kam ble'] },
      { q: 'Was heißt "kam me shku"?', a: 'ich werde gehen', wrong: ['ich bin gegangen', 'ich gehe gerade', 'ich muss gehen'] },
    ],
  },

  {
    id: 'handeln',
    unit: 8,
    kind: 'kultur',
    icon: '🧿',
    title: 'Handeln in der Çarshi',
    teaser: 'Ein Preis ist ein Vorschlag — höflich, aber verhandelbar.',
    body: [
      { p: 'Im Basar von Prizren gehört Feilschen zum guten Ton, im Supermarkt dagegen nicht. Die Regel: Ware ohne Preisschild = handeln erlaubt.' },
      { list: ['Sa kushton kjo? — Was kostet das?', 'A ban ma lirë? — Geht es billiger?', 'Osht shtrenjtë për mua — das ist mir zu teuer', 'Veç po shikoj — ich schaue nur', 'E marr — ich nehme es'] },
      { tip: 'Freundlich bleiben, lächeln, notfalls langsam Richtung Tür gehen. Wer laut wird, verliert — wer scherzt, gewinnt.' },
    ],
  },

  {
    id: 'mysafir',
    unit: 9,
    kind: 'kultur',
    icon: '🫖',
    title: 'Mysafir: Zu Gast in Prizren',
    teaser: 'Gastfreundschaft ist hier eine Verpflichtung — für beide Seiten.',
    body: [
      { p: 'Ein Gast ("mysafir") wird nie gefragt, ob er etwas möchte — es wird gebracht. Kaffee, Saft, Süßes, oft alles gleichzeitig. Ablehnen wirkt schroff; ein bisschen probieren genügt.' },
      { list: ['Mirë se erdhe! — Willkommen! (Antwort: Mirë se të gjeta)', 'Urdhno, ulu — bitte, setz dich', 'A pi kafe apo çaj? — Kaffee oder Tee?', 'Faleminderit, jam mirë — danke, mir reicht es'] },
      { p: 'Schuhe zieht man an der Tür aus. Der beste Platz im Raum gehört dem Gast. Und wer gehen will, kündigt es zweimal an — beim ersten Mal wird es sowieso überhört.' },
      { tip: 'Wer eingeladen wird, bringt Kleinigkeiten mit: Süßes, Obst, Kaffee. Blumen sind eher für Anlässe.' },
    ],
  },

  {
    id: 'uhrzeit',
    unit: 7,
    kind: 'grammatik',
    icon: '⏰',
    title: 'Die Uhrzeit sagen',
    teaser: '"Sa osht sahati?" — und die Antwort ist einfacher als gedacht.',
    body: [
      {
        table: [
          ['Sa osht sahati?', 'Wie spät ist es?'],
          ['Osht ora tre.', 'Es ist drei Uhr.'],
          ['Tre e gjysmë.', 'Halb vier (wörtlich: drei und halb).'],
          ['Tre e pesëmbëdhjetë.', 'Viertel nach drei.'],
          ['Në ora tetë.', 'Um acht Uhr.'],
        ],
      },
      { p: 'Achtung, Falle für Deutsche: "tre e gjysmë" ist halb VIER im deutschen Sinn — gezählt wird die volle Stunde plus eine halbe, nicht die kommende Stunde.' },
      { tip: '"Sahat" ist türkisch entlehnt und in Prizren üblicher als das Standardwort "orë". Beides versteht jeder.' },
    ],
    quiz: [
      { q: 'Was bedeutet "tre e gjysmë"?', a: 'halb vier', wrong: ['halb drei', 'drei Uhr', 'Viertel nach drei'] },
      { q: 'Wie fragt man in Prizren nach der Uhrzeit?', a: 'Sa osht sahati?', wrong: ['Qka osht ora?', 'Kur osht sahati?', 'Sa kushton ora?'] },
    ],
  },

  {
    id: 'vergangenheit',
    unit: 13,
    kind: 'grammatik',
    icon: '⏪',
    title: 'Über Gestern reden',
    teaser: 'Zwei Bausteine reichen für den Anfang: "isha" und "kam + Partizip".',
    body: [
      { p: 'Für die Vergangenheit von "sein" merkst du dir:' },
      {
        table: [
          ['isha', 'ich war'],
          ['ishe', 'du warst'],
          ['ishte', 'er / sie war'],
        ],
      },
      { p: 'Alles andere baust du wie im Deutschen mit "haben" + Partizip:' },
      { list: ['Kam shku — ich bin gegangen', 'Kam ngranë — ich habe gegessen', 'Kam pa — ich habe gesehen', 'Kam punu — ich habe gearbeitet'] },
      { tip: 'Im Gegischen enden die Partizipien oft auf -u statt -uar: "punu" statt "punuar", "mësu" statt "mësuar".' },
    ],
    quiz: [
      { q: 'Was heißt "Kam shku"?', a: 'Ich bin gegangen', wrong: ['Ich gehe', 'Ich werde gehen', 'Ich will gehen'] },
      { q: 'Wie sagt man "ich war"?', a: 'isha', wrong: ['jam', 'ishte', 'kam'] },
    ],
  },

  {
    id: 'hoeflich',
    unit: 10,
    kind: 'grammatik',
    icon: '🙏',
    title: 'Du oder Sie?',
    teaser: '"Ju" ist das höfliche Sie — und wird schneller abgelegt als im Deutschen.',
    body: [
      { p: '"Ti" ist das Du, "Ju" das Sie. Gesiezt wird bei Älteren, Ämtern und Fremden — aber schon nach dem ersten Kaffee wechseln viele zum Du.' },
      {
        table: [
          ['Qysh je?', 'Wie geht es dir?'],
          ['Qysh jeni?', 'Wie geht es Ihnen?'],
          ['Të lutem', 'Bitte (du)'],
          ['Ju lutem', 'Bitte (Sie)'],
          ['Faleminderit', 'Danke (immer gleich)'],
        ],
      },
      { tip: 'Ältere Menschen spricht man gerne mit "xhaxha" (Onkel) oder "teze" (Tante) an, auch ohne Verwandtschaft. Das gilt als warm, nicht als aufdringlich.' },
    ],
    quiz: [
      { q: 'Wie fragst du höflich "Wie geht es Ihnen?"', a: 'Qysh jeni?', wrong: ['Qysh je?', 'Qysh osht?', 'Qysh jena?'] },
      { q: 'Was ist die höfliche Form von "Të lutem"?', a: 'Ju lutem', wrong: ['Ti lutem', 'Na lutem', 'Lutem ju'] },
    ],
  },

  {
    id: 'turcizma',
    unit: 9,
    kind: 'kultur',
    icon: '🏙️',
    title: 'Prizren spricht mehrsprachig',
    teaser: 'Sokak, penxhere, sahat, merak — Prizrens Wortschatz erzählt seine Geschichte.',
    body: [
      { p: 'Prizren war jahrhundertelang osmanische Handelsstadt und ist bis heute mehrsprachig: Albanisch, Türkisch, Bosnisch und Romanes hört man an einem Nachmittag am Shadërvan-Platz.' },
      { p: 'Deshalb steckt der Alltagswortschatz voller türkischer Wörter, die im Standardalbanischen anders heißen:' },
      {
        table: [
          ['sokak', 'Gasse (Standard: rrugicë)'],
          ['penxhere', 'Fenster (Standard: dritare)'],
          ['sahat', 'Uhr (Standard: orë)'],
          ['dyqan', 'Laden (Standard: shitore)'],
          ['hesap', 'Rechnung (Standard: faturë)'],
          ['merak', 'Sorge / Sehnsucht'],
          ['jorgan', 'Bettdecke'],
          ['mysafir', 'Gast'],
        ],
      },
      { tip: 'Diese Wörter sind kein schlechtes Albanisch, sondern Prizrener Alltag. Im Aufsatz nimmst du die Standardform, im Café die hier.' },
    ],
    quiz: [
      { q: 'Was ist eine "penxhere"?', a: 'ein Fenster', wrong: ['eine Tür', 'ein Teppich', 'eine Gasse'] },
      { q: 'Was bedeutet "sahat" in Prizren?', a: 'Uhr / Stunde', wrong: ['Rechnung', 'Gast', 'Laden'] },
    ],
  },

  {
    id: 'plural',
    unit: 11,
    kind: 'grammatik',
    icon: '➕',
    title: 'Mehrzahl: leider unregelmäßig',
    teaser: 'Es gibt Muster, aber die häufigen Wörter lernt man einzeln.',
    body: [
      { p: 'Ehrlich gesagt: die albanische Mehrzahl ist der unordentlichste Teil der Sprache. Die häufigsten Wege:' },
      {
        table: [
          ['-a anhängen', 'mal → mala (Berge)'],
          ['-e anhängen', 'lule → lule, vend → vende (Orte)'],
          ['Vokalwechsel', 'dash → desh, natë → net (Nächte)'],
          ['gleich bleiben', 'shtëpi → shtëpi'],
          ['-ë bei Personen', 'mësues → mësues(a)'],
        ],
      },
      { p: 'Praktischer Rat: lerne die Mehrzahl gleich mit dem Wort mit, so wie im Deutschen "das Haus – die Häuser". Bei Zahlen brauchst du sie ohnehin oft nicht: "dy kafe", "tre libra".' },
      { tip: 'Für den Anfang reicht: "shumë" (viel) davor und die Sache ist verstanden — "shumë njerëz" (viele Leute).' },
    ],
    quiz: [
      { q: 'Was heißt "shumë lule"?', a: 'viele Blumen', wrong: ['eine Blume', 'schöne Blumen', 'keine Blumen'] },
      { q: 'Wie lautet die Mehrzahl von "mal" (Berg)?', a: 'male', wrong: ['mali', 'malët e', 'malas'] },
    ],
  },

  {
    id: 'levizje',
    unit: 12,
    kind: 'grammatik',
    icon: '🧳',
    title: 'Hin, her und zurück',
    teaser: 'shkoj, vij, kthehem — drei Verben, und du kommst überall hin.',
    body: [
      {
        table: [
          ['po shkoj', 'ich gehe / fahre (gerade)'],
          ['po vij', 'ich komme (gerade)'],
          ['kthehem', 'ich komme zurück'],
          ['niset', 'es fährt ab (Bus, Zug)'],
          ['arrij', 'ich komme an'],
        ],
      },
      { p: 'Für die Zukunft nimmst du das gegische "kam me": „Kam me shku në Prizren" — ich werde nach Prizren fahren. Im Standard hieße das „Do të shkoj në Prizren".' },
      { list: ['Kah po shkon? — Wohin fährst du?', 'Po shkoj në Prishtinë. — Ich fahre nach Prishtina.', 'Kur niset autobusi? — Wann fährt der Bus?', 'Kthehna nesër. — Wir kommen morgen zurück.'] },
      { tip: 'Ortsangabe mit „në" für Städte und Länder: në Prizren, në Gjermani. Für Personen und sichtbare Ziele „te": te daja (zum Onkel), te stacioni (zur Haltestelle).' },
    ],
    quiz: [
      { q: 'Was heißt "Kur niset autobusi?"', a: 'Wann fährt der Bus ab?', wrong: ['Wo hält der Bus?', 'Wie viel kostet der Bus?', 'Wohin fährt der Bus?'] },
      { q: 'Wie sagst du in Prizren "Ich werde fahren"?', a: 'Kam me shku', wrong: ['Do të shkoj', 'Kam shku', 'Po shkoj'] },
    ],
  },

  {
    id: 'dhemb',
    unit: 14,
    kind: 'grammatik',
    icon: '🤕',
    title: 'Mir tut weh: më dhemb',
    teaser: 'Nicht "ich habe Kopfschmerzen", sondern "mir schmerzt der Kopf".',
    body: [
      { p: 'Beim Arzt brauchst du nur ein Muster: kleines Wörtchen für die Person, dann „dhemb", dann das Körperteil.' },
      {
        table: [
          ['më dhemb koka', 'mir tut der Kopf weh'],
          ['të dhemb barku?', 'tut dir der Bauch weh?'],
          ['i dhemb dhëmbi', 'ihm / ihr tut der Zahn weh'],
          ['na dhemb', 'uns tut weh'],
          ['u dhemb', 'ihnen tut weh'],
        ],
      },
      { p: 'Bei mehreren Stellen wird aus „dhemb" ein „dhembin": „Më dhembin këmbët" — mir tun die Beine weh.' },
      { list: ['Jam i sëmurë — ich bin krank (Frauen: jam e sëmurë)', 'Kam temperaturë — ich habe Fieber', 'Më duhet ilaç — ich brauche ein Medikament', 'Ku osht spitali? — Wo ist das Krankenhaus?'] },
      { tip: 'Als Antwort auf eine Krankheit sagt man „Shërim të shpejtë" — gute Besserung. Immer passend.' },
    ],
    quiz: [
      { q: 'Wie sagst du "Mir tut der Kopf weh"?', a: 'Më dhemb koka', wrong: ['Kam koka dhemb', 'Koka më osht', 'Dhemb un koka'] },
      { q: 'Was antwortet man einem Kranken?', a: 'Shërim të shpejtë', wrong: ['Të lumtë', 'Për shumë vjet', 'Urime'] },
    ],
  },

  {
    id: 'urime',
    unit: 15,
    kind: 'kultur',
    icon: '🥂',
    title: 'Der richtige Glückwunsch',
    teaser: 'Urime, gëzuar, për shumë vjet — jedes gehört zu einem anderen Anlass.',
    body: [
      {
        table: [
          ['Urime!', 'Glückwunsch — Geburtstag, Hochzeit, Prüfung, neuer Job'],
          ['Për shumë vjet!', 'Auf viele Jahre — Geburtstag und Feiertage'],
          ['Gëzuar!', 'Prost — und "frohes ..." vor Festnamen'],
          ['Gëzuar Bajramin!', 'Frohes Bajram-Fest'],
          ['Të lumtë!', 'Gut gemacht, Respekt'],
          ['Me fat!', 'Viel Glück / alles Gute für den Neuanfang'],
          ['Ngushëllime', 'Mein Beileid'],
        ],
      },
      { p: 'Bei einer Hochzeit gilt der Glückwunsch nicht nur dem Paar, sondern der ganzen Familie: „Urime për familjen!" Wer eingeladen ist, bringt ein Geschenk und bleibt lange — eine Dasma in Prizren dauert selten nur einen Abend.' },
      { p: 'Zum Bajram besucht man ältere Verwandte zuerst. Der Standardgruß beim Eintreten: „Gëzuar Bajramin, u trashëgofshi!" — frohes Fest, mögt ihr es noch viele Male erleben.' },
      { tip: 'Wenn du unsicher bist, funktioniert „Urime!" fast immer — außer bei Trauer. Da nur: „Ngushëllime."' },
    ],
    quiz: [
      { q: 'Was sagst du beim Anstoßen?', a: 'Gëzuar!', wrong: ['Urime!', 'Me fat!', 'Ngushëllime'] },
      { q: 'Womit gratulierst du zum Geburtstag?', a: 'Urime ditëlindjen!', wrong: ['Shërim të shpejtë!', 'Ngushëllime', 'Mirupafshim!'] },
    ],
  },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id) || null;
}

export function cardsForUnit(n) {
  return CARDS.filter((c) => c.unit === n);
}
