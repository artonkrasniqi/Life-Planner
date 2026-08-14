/* ============================================================
   lexicon.js — Wortschatz & Sätze

   Gelehrt wird das Kosovarische, wie es in und um Prizren
   gesprochen wird (Gegisch). Das ist NICHT identisch mit dem
   Standardalbanischen aus dem Schulbuch — deshalb steht bei
   jedem Eintrag, der abweicht, zusätzlich die Standardform.

   Felder:
     u    Einheit (Unit), l = Lektion innerhalb der Einheit
     al   so, wie man es in Prizren sagt/schreibt
     std  Standardalbanisch, falls abweichend
     de   Deutsch
     ph   Aussprache in deutscher Lautschrift
     note kurzer Hinweis (Kultur, Grammatik, Stolperfalle)
     kind 'w' = Wort, 's' = Satz/Wendung

   Die Lautschrift ist bewusst grob: "ö" steht für das
   albanische ë, "kj" für q, "dj" für gj, "dsch" für xh.
   Details erklärt die Aussprache-Karte in der Grammatik.
   ============================================================ */

const entries = [];

/* Wort */
function w(u, l, al, de, ph, extra) {
  entries.push({ kind: 'w', u, l, al, de, ph, ...(extra || {}) });
}
/* Satz oder feste Wendung */
function s(u, l, al, de, ph, extra) {
  entries.push({ kind: 's', u, l, al, de, ph, ...(extra || {}) });
}

/* ---------- 1 · Përshëndetje — Erste Worte ---------- */

w(1, 1, 'Tung', 'Hallo / Tschüss', 'tung', { std: 'Tungjatjeta', note: 'Kurzform von "Tungjatjeta" — geht zur Begrüßung UND zum Abschied.' });
w(1, 1, 'Tungjatjeta', 'Guten Tag (förmlich)', 'tun-djat-je-ta', { note: 'Wörtlich: "Lang sei dein Leben".' });
w(1, 1, 'Selam', 'Hallo (muslimischer Gruß)', 'se-lam', { note: 'In Prizren sehr verbreitet. Lange Form: "Selamun alejkum", Antwort: "Alejkum selam".' });
w(1, 1, 'Mirupafshim', 'Auf Wiedersehen', 'mi-ru-paf-schim');
w(1, 1, 'Shihemi', 'Bis bald / Man sieht sich', 'schi-he-mi');
w(1, 1, 'Kalofsh mirë', 'Mach\'s gut', 'ka-lofsch mir');
w(1, 1, 'Natën e mirë', 'Gute Nacht', 'na-tön e mir');

w(1, 2, 'Mirmëngjes', 'Guten Morgen', 'mir-mönd-jes', { std: 'Mirëmëngjes' });
w(1, 2, 'Mirdita', 'Guten Tag', 'mir-di-ta', { std: 'Mirëdita' });
w(1, 2, 'Mirmbrëma', 'Guten Abend', 'mir-mbrö-ma', { std: 'Mirëmbrëma' });
w(1, 2, 'Mirë se erdhe', 'Willkommen', 'mir se er-dhe', { note: 'Antwort darauf: "Mirë se të gjeta".' });
w(1, 2, 'Mirë se të gjeta', 'Danke, schön hier zu sein', 'mir se tö dje-ta', { note: 'Die feste Antwort auf "Mirë se erdhe".' });
s(1, 2, 'Mirmëngjes, qysh je?', 'Guten Morgen, wie geht es dir?', 'mir-mönd-jes, kjüsch je');

w(1, 3, 'Qysh je?', 'Wie geht es dir?', 'kjüsch je', { std: 'Si je?', note: '"Qysh" statt "si" ist DAS Erkennungszeichen des Kosovarischen.' });
w(1, 3, 'A je mirë?', 'Geht es dir gut?', 'a je mir', { note: '"A" macht aus einer Aussage eine Frage.' });
w(1, 3, 'Jam mirë', 'Mir geht es gut', 'jam mir');
w(1, 3, 'Shumë mirë', 'Sehr gut', 'schum mir', { note: 'Gesprochen oft kurz: "shum mir".' });
w(1, 3, 'Ashtu-ashtu', 'So lala', 'asch-tu-asch-tu');
w(1, 3, 'Edhe ti?', 'Und du?', 'e-dhe ti');
s(1, 3, 'Jam mirë, faleminderit', 'Mir geht es gut, danke', 'jam mir, fa-le-min-de-rit');

w(1, 4, 'Faleminderit', 'Danke', 'fa-le-min-de-rit', { note: 'Umgangssprachlich hört man auch "falemnderit" oder kurz "faleminneres".' });
w(1, 4, 'Të lutem', 'Bitte (bittend)', 'tö lu-tem', { note: 'Wenn du um etwas bittest.' });
w(1, 4, 'Urdhno', 'Bitte sehr / Hier bitte', 'urdh-no', { std: 'Urdhëro', note: 'Wenn du etwas reichst oder jemanden hereinbittest.' });
w(1, 4, 'S\'ka gjë', 'Keine Ursache', 'ska djö', { note: 'Wörtlich: "es gibt nichts".' });
w(1, 4, 'Më fal', 'Entschuldigung', 'mö fal');
w(1, 4, 'Po', 'Ja', 'po');
w(1, 4, 'Jo', 'Nein', 'jo');
s(1, 4, 'Faleminderit shumë', 'Vielen Dank', 'fa-le-min-de-rit schum');

/* ---------- 2 · Un & ti — Kennenlernen ---------- */

w(2, 1, 'un', 'ich', 'un', { std: 'unë' });
w(2, 1, 'ti', 'du', 'ti');
w(2, 1, 'ai', 'er', 'ai');
w(2, 1, 'ajo', 'sie (Einzahl)', 'a-jo');
w(2, 1, 'na', 'wir', 'na', { std: 'ne' });
w(2, 1, 'ju', 'ihr / Sie', 'ju', { note: '"Ju" ist auch die höfliche Anrede.' });
w(2, 1, 'ata', 'sie (Mehrzahl)', 'a-ta', { note: 'Für reine Frauengruppen: "ato".' });

w(2, 2, 'jam', 'ich bin', 'jam');
w(2, 2, 'je', 'du bist', 'je');
w(2, 2, 'osht', 'er/sie ist', 'oscht', { std: 'është', note: 'In Prizren hört man auch "âsht". Beides meint "ist".' });
w(2, 2, 'jena', 'wir sind', 'je-na', { std: 'jemi' });
w(2, 2, 'jeni', 'ihr seid', 'je-ni' );
w(2, 2, 'janë', 'sie sind', 'ja-nö');
s(2, 2, 'Un jam prej Gjermanie', 'Ich komme aus Deutschland', 'un jam prej djer-ma-ni-e', { std: 'Unë jam nga Gjermania' });

w(2, 3, 'emri', 'der Name', 'em-ri');
w(2, 3, 'Qysh të thonë?', 'Wie heißt du?', 'kjüsch tö tho-nö', { std: 'Si quhesh?', note: 'Wörtlich: "wie sagen sie zu dir?"' });
w(2, 3, 'Un quhem', 'Ich heiße', 'un kju-hem', { note: 'Genauso gebräuchlich: "Mua më thonë ..."' });
w(2, 3, 'Prej kah je?', 'Woher kommst du?', 'prej kah je', { std: 'Nga je?' });
w(2, 3, 'Gjermani', 'Deutschland', 'djer-ma-ni');
w(2, 3, 'Kosovë', 'Kosovo', 'ko-so-wö');
w(2, 3, 'Prizren', 'Prizren', 'priz-ren');
s(2, 3, 'Gëzohem që u njohtëm', 'Freut mich, dich kennenzulernen', 'gö-zo-hem kjö u njoh-töm');

w(2, 4, 'shqip', 'albanisch (Sprache)', 'schkjip');
w(2, 4, 'gjermanisht', 'deutsch (Sprache)', 'djer-ma-nischt');
w(2, 4, 'flas', 'ich spreche', 'flas');
w(2, 4, 'kuptoj', 'ich verstehe', 'kup-toj');
w(2, 4, 'pak', 'ein bisschen / wenig', 'pak');
w(2, 4, 'ngadalë', 'langsam', 'nga-da-lö');
s(2, 4, 'A flet shqip?', 'Sprichst du Albanisch?', 'a flet schkjip');
s(2, 4, 'Flas veç pak shqip', 'Ich spreche nur ein bisschen Albanisch', 'flas wetsch pak schkjip');
s(2, 4, 'S\'po kuptoj', 'Ich verstehe nicht', 'spo kup-toj', { std: 'Nuk kuptoj' });
s(2, 4, 'A mundesh me fol ma ngadalë?', 'Kannst du langsamer sprechen?', 'a mun-desch me fol ma nga-da-lö');

w(2, 5, 'qka', 'was', 'kj-ka', { std: 'çfarë', note: 'Wird oft "çka" geschrieben — gleiche Aussprache.' });
w(2, 5, 'kush', 'wer', 'kusch');
w(2, 5, 'kur', 'wann', 'kur');
w(2, 5, 'kah', 'wohin / in welche Richtung', 'kah', { std: 'ku / nga' });
w(2, 5, 'ku', 'wo', 'ku');
w(2, 5, 'sa', 'wie viel', 'sa');
w(2, 5, 'pse', 'warum', 'pse');
s(2, 5, 'Qka po bon?', 'Was machst du?', 'kj-ka po bon', { std: 'Çfarë po bën?' });

/* ---------- 3 · Numrat — Zahlen ---------- */

w(3, 1, 'një', 'eins', 'njö', { note: 'Gesprochen in Prizren oft "nji".' });
w(3, 1, 'dy', 'zwei', 'dü');
w(3, 1, 'tre', 'drei', 'tre', { note: 'Vor weiblichen Wörtern: "tri".' });
w(3, 1, 'katër', 'vier', 'ka-tör');
w(3, 1, 'pesë', 'fünf', 'pe-sö', { note: 'Gesprochen kurz: "pes".' });
w(3, 1, 'gjashtë', 'sechs', 'djasch-tö');
w(3, 1, 'shtatë', 'sieben', 'schta-tö');
w(3, 1, 'tetë', 'acht', 'te-tö');
w(3, 1, 'nëntë', 'neun', 'nön-tö', { note: 'In Prizren "nând" — klingt fast wie "nânë" (Mutter). Aufpassen!' });
w(3, 1, 'dhjetë', 'zehn', 'dhje-tö');

w(3, 2, 'njëmbëdhjetë', 'elf', 'njöm-bö-dhje-tö');
w(3, 2, 'dymbëdhjetë', 'zwölf', 'düm-bö-dhje-tö');
w(3, 2, 'trembëdhjetë', 'dreizehn', 'trem-bö-dhje-tö');
w(3, 2, 'katërmbëdhjetë', 'vierzehn', 'ka-törm-bö-dhje-tö');
w(3, 2, 'pesëmbëdhjetë', 'fünfzehn', 'pe-söm-bö-dhje-tö');
w(3, 2, 'njëzet', 'zwanzig', 'njö-zet');
s(3, 2, 'Numri im osht dyzet e pesë', 'Meine Nummer ist fünfundvierzig', 'num-ri im oscht dü-zet e pe-sö');

w(3, 3, 'tridhjetë', 'dreißig', 'tri-dhje-tö');
w(3, 3, 'dyzet', 'vierzig', 'dü-zet');
w(3, 3, 'pesëdhjetë', 'fünfzig', 'pe-sö-dhje-tö');
w(3, 3, 'njëqind', 'hundert', 'njö-kjind');
w(3, 3, 'njëmijë', 'tausend', 'njö-mi-jö');
w(3, 3, 'gjysmë', 'halb / Hälfte', 'djüs-mö');
w(3, 3, 'zero', 'null', 'ze-ro');

w(3, 4, 'vjeç', 'Jahre alt', 'wjetsch');
w(3, 4, 'euro', 'Euro', 'eu-ro');
w(3, 4, 'numër', 'die Nummer', 'nu-mör');
s(3, 4, 'Sa vjeç je?', 'Wie alt bist du?', 'sa wjetsch je');
s(3, 4, 'Jam njëzet e pesë vjeç', 'Ich bin fünfundzwanzig Jahre alt', 'jam njö-zet e pe-sö wjetsch');
s(3, 4, 'Sa kushton?', 'Was kostet das?', 'sa kusch-ton');
s(3, 4, 'Kushton dhjetë euro', 'Es kostet zehn Euro', 'kusch-ton dhje-tö eu-ro');

/* ---------- 4 · Familja — Familie ---------- */

w(4, 1, 'nana', 'die Mutter', 'na-na', { std: 'nëna', note: 'In Prizren "nânë/nana". Standard: "nëna".' });
w(4, 1, 'babai', 'der Vater', 'ba-ba-i', { note: 'Auch kurz "baba".' });
w(4, 1, 'vllau', 'der Bruder', 'wllau', { std: 'vëllai' });
w(4, 1, 'motra', 'die Schwester', 'mo-tra');
w(4, 1, 'fëmija', 'das Kind', 'fö-mi-ja', { note: 'In Prizren oft "fmija", Mehrzahl "fmijët".' });
w(4, 1, 'familja', 'die Familie', 'fa-mil-ja');

w(4, 2, 'gjyshi', 'der Großvater', 'djü-schi');
w(4, 2, 'gjyshja', 'die Großmutter', 'djüsch-ja');
w(4, 2, 'daja', 'der Onkel (mütterlicherseits)', 'da-ja');
w(4, 2, 'mixha', 'der Onkel (väterlicherseits)', 'mi-dscha', { std: 'xhaxhai' });
w(4, 2, 'tezja', 'die Tante (mütterlicherseits)', 'tez-ja');
w(4, 2, 'halla', 'die Tante (väterlicherseits)', 'ha-lla');
w(4, 2, 'kusheri', 'der Cousin', 'ku-sche-ri', { std: 'kushëri' });

w(4, 3, 'burri', 'der Mann / Ehemann', 'bu-rri');
w(4, 3, 'gruaja', 'die Frau / Ehefrau', 'gru-a-ja');
w(4, 3, 'djali', 'der Junge / Sohn', 'dja-li');
w(4, 3, 'çika', 'das Mädchen / die Tochter', 'tschi-ka', { std: 'vajza', note: '"Çikë" ist die kosovarische Alltagsform.' });
w(4, 3, 'i martuar', 'verheiratet', 'i mar-tu-ar');
w(4, 3, 'beqar', 'ledig / Single', 'be-kjar');

s(4, 4, 'Kjo osht nana ime', 'Das ist meine Mutter', 'kjo oscht na-na i-me');
s(4, 4, 'A ki vlla?', 'Hast du einen Bruder?', 'a ki wlla', { std: 'A ke vëlla?' });
s(4, 4, 'Kam dy motra', 'Ich habe zwei Schwestern', 'kam dü mo-tra');
s(4, 4, 'Familja jem osht prej Prizreni', 'Meine Familie ist aus Prizren', 'fa-mil-ja jem oscht prej priz-re-ni');

/* ---------- 5 · Kafe & ushqim — Essen & Trinken ---------- */

w(5, 1, 'kafe', 'der Kaffee', 'ka-fe', { note: 'In Prizren gehört Kaffee zu jedem Besuch. "Kafe turke" = Mokka.' });
w(5, 1, 'çaj', 'der Tee', 'tschaj');
w(5, 1, 'ujë', 'das Wasser', 'u-jö');
w(5, 1, 'birrë', 'das Bier', 'bi-rrö');
w(5, 1, 'verë', 'der Wein', 'we-rö', { note: 'Gleiches Wort wie "Sommer" — der Zusammenhang klärt es.' });
w(5, 1, 'qumësht', 'die Milch', 'kju-möscht');
w(5, 1, 'lëng', 'der Saft', 'löng');

w(5, 2, 'bukë', 'das Brot', 'bu-kö');
w(5, 2, 'djathë', 'der Käse', 'dja-thö');
w(5, 2, 'mish', 'das Fleisch', 'misch');
w(5, 2, 'pulë', 'das Hähnchen', 'pu-lö');
w(5, 2, 'peshk', 'der Fisch', 'peschk');
w(5, 2, 'oriz', 'der Reis', 'o-riz');
w(5, 2, 'patate', 'die Kartoffel', 'pa-ta-te');
w(5, 2, 'vezë', 'das Ei', 'we-zö');

w(5, 3, 'byrek', 'Byrek (Blätterteigrolle)', 'bü-rek', { note: 'Das Frühstück schlechthin — mit Fleisch, Käse oder Spinat.' });
w(5, 3, 'fli', 'Fli (Schichtfladen)', 'fli', { note: 'Festessen aus dem Kosovo, in Schichten gebacken.' });
w(5, 3, 'pite', 'Pite (Blätterteigkuchen)', 'pi-te');
w(5, 3, 'sarma', 'Sarma (gefüllte Blätter)', 'sar-ma');
w(5, 3, 'tavë', 'Auflauf aus dem Ofen', 'ta-wö');
w(5, 3, 'supë', 'die Suppe', 'su-pö');
w(5, 3, 'bakllava', 'Baklava', 'bak-lla-wa');
w(5, 3, 'akullore', 'das Eis', 'a-ku-llo-re');

w(5, 4, 'mollë', 'der Apfel', 'mo-llö');
w(5, 4, 'dardhë', 'die Birne', 'dar-dhö');
w(5, 4, 'rrush', 'die Trauben', 'rrusch');
w(5, 4, 'pjeshkë', 'der Pfirsich', 'pjesch-kö');
w(5, 4, 'domate', 'die Tomate', 'do-ma-te');
w(5, 4, 'spec', 'die Paprika', 'spez');
w(5, 4, 'qepë', 'die Zwiebel', 'kje-pö');
w(5, 4, 'sallatë', 'der Salat', 'sa-lla-tö');

s(5, 5, 'Një kafe, të lutem', 'Einen Kaffee, bitte', 'njö ka-fe, tö lu-tem');
s(5, 5, 'Kam uri', 'Ich habe Hunger', 'kam u-ri');
s(5, 5, 'Kam etje', 'Ich habe Durst', 'kam et-je');
s(5, 5, 'Sa kushton kafja?', 'Was kostet der Kaffee?', 'sa kusch-ton kaf-ja');
s(5, 5, 'Të bëftë mirë', 'Guten Appetit', 'tö böf-tö mir');
s(5, 5, 'Osht shumë e shijshme', 'Das ist sehr lecker', 'oscht schum e schijsch-me');
s(5, 5, 'Hesapin, të lutem', 'Die Rechnung, bitte', 'he-sa-pin, tö lu-tem', { std: 'Faturën, ju lutem', note: '"Hesap" ist türkisch entlehnt und in Prizren Alltag.' });

/* ---------- 6 · Prizreni — In der Stadt ---------- */

w(6, 1, 'qyteti', 'die Stadt', 'kjü-te-ti');
w(6, 1, 'çarshia', 'der Basar / die Altstadtgasse', 'tschar-schi-a', { note: 'Das alte Handelsviertel — in Prizren das Herz der Stadt.' });
w(6, 1, 'kalaja', 'die Festung', 'ka-la-ja', { note: 'Die Kalaja über Prizren: bester Sonnenuntergang der Stadt.' });
w(6, 1, 'xhamia', 'die Moschee', 'dscha-mi-a');
w(6, 1, 'kisha', 'die Kirche', 'ki-scha');
w(6, 1, 'ura', 'die Brücke', 'u-ra', { note: '"Ura e gurit" = die Steinbrücke im Zentrum.' });
w(6, 1, 'sheshi', 'der Platz', 'sche-schi', { note: 'Sheshi i Shadërvanit ist Prizrens Treffpunkt.' });
w(6, 1, 'lumi', 'der Fluss', 'lu-mi', { note: 'Der Lumbardhi fließt mitten durch Prizren.' });

w(6, 2, 'dyqani', 'der Laden', 'dü-kja-ni', { std: 'shitorja' });
w(6, 2, 'tregu', 'der Markt', 'tre-gu');
w(6, 2, 'banka', 'die Bank', 'ban-ka');
w(6, 2, 'spitali', 'das Krankenhaus', 'spi-ta-li');
w(6, 2, 'farmacia', 'die Apotheke', 'far-ma-zi-a', { std: 'barnatorja' });
w(6, 2, 'shkolla', 'die Schule', 'schko-lla');
w(6, 2, 'hoteli', 'das Hotel', 'ho-te-li');
w(6, 2, 'sokaku', 'die Gasse', 'so-ka-ku', { note: 'Türkisches Lehnwort, typisch für Prizrens Altstadt.' });

w(6, 3, 'majtas', 'links', 'maj-tas');
w(6, 3, 'djathtas', 'rechts', 'djath-tas');
w(6, 3, 'drejt', 'geradeaus', 'drejt');
w(6, 3, 'afër', 'nah', 'a-för');
w(6, 3, 'larg', 'weit', 'larg');
w(6, 3, 'këtu', 'hier', 'kö-tu');
w(6, 3, 'atje', 'dort', 'at-je');

s(6, 4, 'Ku osht çarshia?', 'Wo ist der Basar?', 'ku oscht tschar-schi-a');
s(6, 4, 'Kah me shku te kalaja?', 'Wie komme ich zur Festung?', 'kah me schku te ka-la-ja', { std: 'Si të shkoj te kalaja?' });
s(6, 4, 'A osht larg?', 'Ist es weit?', 'a oscht larg');
s(6, 4, 'Shko drejt, pastaj majtas', 'Geh geradeaus, dann links', 'schko drejt, pas-taj maj-tas');
s(6, 4, 'Jam humb', 'Ich habe mich verlaufen', 'jam humb');

/* ---------- 7 · Koha — Zeit ---------- */

w(7, 1, 'tash', 'jetzt', 'tasch', { std: 'tani' });
w(7, 1, 'sot', 'heute', 'sot');
w(7, 1, 'nesër', 'morgen', 'ne-sör');
w(7, 1, 'dje', 'gestern', 'dje');
w(7, 1, 'sonte', 'heute Abend', 'son-te');
w(7, 1, 'pasnesër', 'übermorgen', 'pas-ne-sör');
w(7, 1, 'hala', 'noch', 'ha-la', { std: 'ende' });

w(7, 2, 'mëngjes', 'der Morgen', 'mönd-jes');
w(7, 2, 'drekë', 'der Mittag', 'dre-kö');
w(7, 2, 'mbrëmje', 'der Abend', 'mbröm-je');
w(7, 2, 'natë', 'die Nacht', 'na-tö');
w(7, 2, 'sahat', 'die Uhr / Stunde', 'sa-hat', { std: 'orë', note: 'Türkisches Lehnwort — in Prizren üblicher als "orë".' });
w(7, 2, 'minutë', 'die Minute', 'mi-nu-tö');
w(7, 2, 'herët', 'früh', 'he-röt');
w(7, 2, 'vonë', 'spät', 'wo-nö');

w(7, 3, 'e hënë', 'Montag', 'e hö-nö');
w(7, 3, 'e martë', 'Dienstag', 'e mar-tö');
w(7, 3, 'e mërkurë', 'Mittwoch', 'e mör-ku-rö');
w(7, 3, 'e enjte', 'Donnerstag', 'e enj-te');
w(7, 3, 'e premte', 'Freitag', 'e prem-te');
w(7, 3, 'e shtunë', 'Samstag', 'e schtu-nö');
w(7, 3, 'e diel', 'Sonntag', 'e di-el');

w(7, 4, 'javë', 'die Woche', 'ja-wö');
w(7, 4, 'muaj', 'der Monat', 'mu-aj');
w(7, 4, 'vit', 'das Jahr', 'wit');
w(7, 4, 'pranverë', 'der Frühling', 'pran-we-rö');
w(7, 4, 'verë', 'der Sommer', 'we-rö');
w(7, 4, 'vjeshtë', 'der Herbst', 'wjesch-tö');
w(7, 4, 'dimër', 'der Winter', 'di-mör');

s(7, 5, 'Sa osht sahati?', 'Wie spät ist es?', 'sa oscht sa-ha-ti', { std: 'Sa është ora?' });
s(7, 5, 'Osht ora tre', 'Es ist drei Uhr', 'oscht o-ra tre');
s(7, 5, 'Shihemi nesër', 'Wir sehen uns morgen', 'schi-he-mi ne-sör');
s(7, 5, 'Tash s\'kam kohë', 'Jetzt habe ich keine Zeit', 'tasch skam ko-hö');

/* ---------- 8 · Blerje — Einkaufen ---------- */

w(8, 1, 'pare', 'das Geld', 'pa-re', { std: 'para' });
w(8, 1, 'lirë', 'billig', 'li-rö');
w(8, 1, 'shtrenjtë', 'teuer', 'schtrenj-tö');
w(8, 1, 'hesap', 'die Rechnung', 'he-sap', { std: 'faturë' });
w(8, 1, 'kesh', 'bar (Bargeld)', 'kesch');
w(8, 1, 'kartë', 'die Karte', 'kar-tö');
w(8, 1, 'qese', 'die Tüte', 'kje-se');

w(8, 2, 'kuq', 'rot', 'kukj');
w(8, 2, 'zi', 'schwarz', 'zi');
w(8, 2, 'bardhë', 'weiß', 'bar-dhö');
w(8, 2, 'kaltër', 'blau', 'kal-tör');
w(8, 2, 'gjelbër', 'grün', 'djel-bör');
w(8, 2, 'verdhë', 'gelb', 'wer-dhö');
w(8, 2, 'i madh', 'groß', 'i madh');
w(8, 2, 'i vogël', 'klein', 'i wo-göl');

w(8, 3, 'dua', 'ich will / ich möchte', 'du-a', { note: 'In Prizren oft kurz "du".' });
w(8, 3, 'blej', 'ich kaufe', 'blej');
w(8, 3, 'jep', 'gib', 'jep');
w(8, 3, 'merr', 'nimm', 'merr');
w(8, 3, 'shikoj', 'ich schaue', 'schi-koj', { note: 'Im Alltag hört man "kqyri" = schau mal.' });
w(8, 3, 'provoj', 'ich probiere / anprobieren', 'pro-woj');

s(8, 4, 'Sa kushton kjo?', 'Was kostet das hier?', 'sa kusch-ton kjo');
s(8, 4, 'A ban ma lirë?', 'Geht es auch billiger?', 'a ban ma li-rö', { note: 'Auf dem Basar völlig normal — Handeln gehört dazu.' });
s(8, 4, 'Veç po shikoj', 'Ich schaue nur', 'wetsch po schi-koj');
s(8, 4, 'E marr këtë', 'Ich nehme das', 'e marr kö-tö');
s(8, 4, 'A mund të paguaj me kartë?', 'Kann ich mit Karte zahlen?', 'a mund tö pa-gu-aj me kar-tö');

/* ---------- 9 · Në shpi — Zuhause & Gastfreundschaft ---------- */

w(9, 1, 'shpia', 'das Haus / Zuhause', 'schpi-a', { std: 'shtëpia', note: 'Das "ë" fällt weg — typisch gegisch.' });
w(9, 1, 'oda', 'die gute Stube / das Zimmer', 'o-da', { note: 'Die "odë" ist traditionell der Raum für Gäste.' });
w(9, 1, 'kuzhina', 'die Küche', 'ku-schi-na');
w(9, 1, 'banjo', 'das Bad', 'ban-jo');
w(9, 1, 'dera', 'die Tür', 'de-ra');
w(9, 1, 'penxherja', 'das Fenster', 'pen-dsche-rja', { std: 'dritarja', note: 'Türkisches Lehnwort, in Prizren sehr gebräuchlich.' });
w(9, 1, 'oborri', 'der Hof', 'o-bo-rri', { note: 'In Prizren auch "avlli".' });

w(9, 2, 'krevet', 'das Bett', 'kre-wet');
w(9, 2, 'tavolinë', 'der Tisch', 'ta-wo-li-nö');
w(9, 2, 'karrige', 'der Stuhl', 'ka-rri-ge');
w(9, 2, 'qilim', 'der Teppich', 'kji-lim');
w(9, 2, 'jorgan', 'die Bettdecke', 'jor-gan');
w(9, 2, 'drita', 'das Licht', 'dri-ta');
w(9, 2, 'çelësi', 'der Schlüssel', 'tsche-lö-si');

w(9, 3, 'mysafir', 'der Gast', 'mü-sa-fir', { note: 'Gast sein ist in Prizren fast ein Amt: Kaffee, Süßes, Zeit.' });
w(9, 3, 'Ulu', 'Setz dich', 'u-lu');
w(9, 3, 'Hajde', 'Komm / Los', 'haj-de');
w(9, 3, 'Rri', 'Bleib', 'rri');
w(9, 3, 'Hajt', 'Na dann / Auf geht\'s', 'hajt');

s(9, 4, 'Urdhno, hajde brenda', 'Bitte, komm herein', 'urdh-no, haj-de bren-da');
s(9, 4, 'A pi kafe?', 'Trinkst du einen Kaffee?', 'a pi ka-fe');
s(9, 4, 'Hajde te na', 'Komm zu uns', 'haj-de te na');
s(9, 4, 'Faleminderit për kafen', 'Danke für den Kaffee', 'fa-le-min-de-rit pör ka-fen');
s(9, 4, 'Duhet me shku tash', 'Ich muss jetzt gehen', 'du-het me schku tasch');

/* ---------- 10 · Ndjenja — Gefühle & Small Talk ---------- */

w(10, 1, 'mirë', 'gut', 'mir');
w(10, 1, 'keq', 'schlecht', 'kekj');
w(10, 1, 'lodhur', 'müde', 'lo-dhur');
w(10, 1, 'gëzuar', 'froh', 'gö-zu-ar', { note: 'Als Zuruf: "Gëzuar!" = Prost!' });
w(10, 1, 'mërzitur', 'traurig / gelangweilt', 'mör-zi-tur');
w(10, 1, 'nervoz', 'nervös / genervt', 'ner-woz');
w(10, 1, 'sëmurë', 'krank', 'sö-mu-rö');

w(10, 2, 'më pëlqen', 'es gefällt mir', 'mö pöl-kjen');
w(10, 2, 'të dua', 'ich liebe dich', 'tö du-a');
w(10, 2, 'dashuri', 'die Liebe', 'da-schu-ri');
w(10, 2, 'shoku', 'der Freund / Kumpel', 'scho-ku');
w(10, 2, 'shoqja', 'die Freundin', 'schokj-ja');
w(10, 2, 'miku', 'der Freund (herzlich)', 'mi-ku');

w(10, 3, 'vallah', 'echt jetzt / ich schwöre', 'wa-llah', { note: 'Alltagsbeteuerung, in Prizren sehr häufig.' });
w(10, 3, 'mashallah', 'wow, toll (anerkennend)', 'ma-scha-llah');
w(10, 3, 'inshallah', 'hoffentlich / so Gott will', 'in-scha-llah');
w(10, 3, 'bre', 'he, Mensch (Anrede)', 'bre', { note: 'Verstärkt einen Satz: "Hajde bre!"' });
w(10, 3, 'krejt', 'alles / ganz', 'krejt', { std: 'gjithçka' });
w(10, 3, 'veç', 'nur / schon', 'wetsch', { std: 'vetëm' });

s(10, 4, 'Qka ka t\'re?', 'Was gibt\'s Neues?', 'kj-ka ka tre');
s(10, 4, 'S\'ka problem', 'Kein Problem', 'ska pro-blem');
s(10, 4, 'Mos u merakos', 'Mach dir keine Sorgen', 'mos u me-ra-kos', { note: '"Merak" = Sorge, türkisch entlehnt.' });
s(10, 4, 'Jam shumë i lodhur', 'Ich bin sehr müde', 'jam schum i lo-dhur');
s(10, 4, 'Më pëlqen shumë Prizreni', 'Prizren gefällt mir sehr', 'mö pöl-kjen schum priz-re-ni');

/* ---------- 11 · Moti & natyra — Wetter & Natur ---------- */

w(11, 1, 'moti', 'das Wetter', 'mo-ti');
w(11, 1, 'dielli', 'die Sonne', 'di-e-lli');
w(11, 1, 'shi', 'der Regen', 'schi');
w(11, 1, 'borë', 'der Schnee', 'bo-rö');
w(11, 1, 'erë', 'der Wind', 'e-rö');
w(11, 1, 'vapë', 'die Hitze', 'wa-pö');
w(11, 1, 'ftoftë', 'kalt', 'ftof-tö', { std: 'ftohtë' });

w(11, 2, 'mali', 'der Berg', 'ma-li', { note: 'Über Prizren: das Sharr-Gebirge, "Malet e Sharrit".' });
w(11, 2, 'deti', 'das Meer', 'de-ti');
w(11, 2, 'pema', 'der Baum', 'pe-ma');
w(11, 2, 'lulja', 'die Blume', 'lul-ja');
w(11, 2, 'qielli', 'der Himmel', 'kji-e-lli');
w(11, 2, 'gurë', 'der Stein', 'gu-rö');

w(11, 3, 'qeni', 'der Hund', 'kje-ni');
w(11, 3, 'macja', 'die Katze', 'maz-ja');
w(11, 3, 'zogu', 'der Vogel', 'zo-gu');
w(11, 3, 'kali', 'das Pferd', 'ka-li');
w(11, 3, 'delja', 'das Schaf', 'del-ja');
w(11, 3, 'lopa', 'die Kuh', 'lo-pa');

s(11, 4, 'Qysh osht moti sot?', 'Wie ist das Wetter heute?', 'kjüsch oscht mo-ti sot');
s(11, 4, 'Po bi shi', 'Es regnet', 'po bi schi');
s(11, 4, 'Osht shumë nxeht', 'Es ist sehr heiß', 'oscht schum ndseht');
s(11, 4, 'Sot osht ftoftë', 'Heute ist es kalt', 'sot oscht ftof-tö');

/* ---------- 12 · Udhëtim — Unterwegs ---------- */

w(12, 1, 'autobusi', 'der Bus', 'au-to-bu-si');
w(12, 1, 'vetura', 'das Auto', 'we-tu-ra', { std: 'makina', note: 'Im Kosovo sagt man "veturë", in Albanien "makinë".' });
w(12, 1, 'taksi', 'das Taxi', 'tak-si');
w(12, 1, 'treni', 'der Zug', 'tre-ni');
w(12, 1, 'aeroporti', 'der Flughafen', 'a-e-ro-por-ti');
w(12, 1, 'bileta', 'das Ticket', 'bi-le-ta');
w(12, 1, 'stacioni', 'die Haltestelle', 'sta-zi-o-ni');

w(12, 2, 'rruga', 'die Straße / der Weg', 'rru-ga');
w(12, 2, 'valixhja', 'der Koffer', 'wa-li-dschja');
w(12, 2, 'pasaporta', 'der Reisepass', 'pa-sa-por-ta');
w(12, 2, 'dhoma', 'das Zimmer (Hotel)', 'dho-ma');
w(12, 2, 'udhëtim', 'die Reise', 'u-dhö-tim');
w(12, 2, 'shpejt', 'schnell', 'schpejt');

s(12, 3, 'Kah po shkon?', 'Wohin gehst du?', 'kah po schkon');
s(12, 3, 'Po shkoj në Prizren', 'Ich fahre nach Prizren', 'po schkoj nö priz-ren');
s(12, 3, 'Kur niset autobusi?', 'Wann fährt der Bus ab?', 'kur ni-set au-to-bu-si');
s(12, 3, 'Një biletë, të lutem', 'Ein Ticket, bitte', 'njö bi-le-tö, tö lu-tem');
s(12, 3, 'Sa larg osht?', 'Wie weit ist es?', 'sa larg oscht');

/* ---------- 13 · Punë & shkollë — Arbeit & Schule ---------- */

w(13, 1, 'puna', 'die Arbeit', 'pu-na');
w(13, 1, 'punoj', 'ich arbeite', 'pu-noj');
w(13, 1, 'zyra', 'das Büro', 'zü-ra');
w(13, 1, 'shefi', 'der Chef', 'sche-fi');
w(13, 1, 'rroga', 'der Lohn', 'rro-ga');
w(13, 1, 'pushim', 'die Pause / der Urlaub', 'pu-schim');

w(13, 2, 'mësues', 'der Lehrer', 'mö-su-es');
w(13, 2, 'mjek', 'der Arzt', 'mjek', { note: 'Im Alltag oft "doktor".' });
w(13, 2, 'polic', 'der Polizist', 'po-liz');
w(13, 2, 'kuzhinier', 'der Koch', 'ku-schi-ni-er');
w(13, 2, 'shofer', 'der Fahrer', 'scho-fer');
w(13, 2, 'student', 'der Student', 'stu-dent');

w(13, 3, 'libri', 'das Buch', 'li-bri');
w(13, 3, 'lapsi', 'der Stift', 'lap-si');
w(13, 3, 'fletore', 'das Heft', 'fle-to-re');
w(13, 3, 'mësoj', 'ich lerne', 'mö-soj');
w(13, 3, 'provimi', 'die Prüfung', 'pro-wi-mi');
w(13, 3, 'klasa', 'die Klasse', 'kla-sa');

s(13, 4, 'Qka punon?', 'Was arbeitest du?', 'kj-ka pu-non');
s(13, 4, 'Po mësoj shqip', 'Ich lerne Albanisch', 'po mö-soj schkjip');
s(13, 4, 'Kam punë sot', 'Ich habe heute Arbeit', 'kam pu-nö sot');
s(13, 4, 'Punoj në Gjermani', 'Ich arbeite in Deutschland', 'pu-noj nö djer-ma-ni');

/* ---------- 14 · Shëndeti — Gesundheit ---------- */

w(14, 1, 'koka', 'der Kopf', 'ko-ka');
w(14, 1, 'syri', 'das Auge', 'sü-ri');
w(14, 1, 'veshi', 'das Ohr', 'we-schi');
w(14, 1, 'hunda', 'die Nase', 'hun-da');
w(14, 1, 'goja', 'der Mund', 'go-ja');
w(14, 1, 'dhëmbi', 'der Zahn', 'dhöm-bi');
w(14, 1, 'flokët', 'die Haare', 'flo-köt');

w(14, 2, 'dora', 'die Hand', 'do-ra');
w(14, 2, 'këmba', 'das Bein / der Fuß', 'köm-ba');
w(14, 2, 'barku', 'der Bauch', 'bar-ku');
w(14, 2, 'zemra', 'das Herz', 'zem-ra');
w(14, 2, 'shpina', 'der Rücken', 'schpi-na');
w(14, 2, 'gishti', 'der Finger', 'gisch-ti');

w(14, 3, 'ilaç', 'das Medikament', 'i-latsch');
w(14, 3, 'dhemb', 'es tut weh', 'dhemb');
w(14, 3, 'temperaturë', 'das Fieber', 'tem-pe-ra-tu-rö');
w(14, 3, 'shërim', 'die Genesung', 'schö-rim');
w(14, 3, 'ndihmë', 'die Hilfe', 'ndih-mö');

s(14, 4, 'Më dhemb koka', 'Ich habe Kopfschmerzen', 'mö dhemb ko-ka');
s(14, 4, 'Jam i sëmurë', 'Ich bin krank', 'jam i sö-mu-rö');
s(14, 4, 'Ku osht farmacia?', 'Wo ist die Apotheke?', 'ku oscht far-ma-zi-a');
s(14, 4, 'Shërim të shpejtë', 'Gute Besserung', 'schö-rim tö schpej-tö');
s(14, 4, 'Më ndihmo, të lutem', 'Hilf mir bitte', 'mö ndih-mo, tö lu-tem');

/* ---------- 15 · Festa — Feste & Glückwünsche ---------- */

w(15, 1, 'dasma', 'die Hochzeit', 'das-ma', { note: 'Eine Prizrener Dasma dauert gerne mehrere Tage.' });
w(15, 1, 'Bajrami', 'das Bajram-Fest', 'baj-ra-mi');
w(15, 1, 'Krishtlindja', 'Weihnachten', 'krischt-lind-ja');
w(15, 1, 'Viti i Ri', 'Neujahr', 'wi-ti i ri');
w(15, 1, 'ditëlindja', 'der Geburtstag', 'di-tö-lind-ja');
w(15, 1, 'festa', 'das Fest', 'fes-ta');

w(15, 2, 'urime', 'Glückwunsch', 'u-ri-me');
w(15, 2, 'dhurata', 'das Geschenk', 'dhu-ra-ta');
w(15, 2, 'vallja', 'der Tanz', 'wall-ja', { note: 'Die "valle" wird in der Reihe getanzt, Hand in Hand.' });
w(15, 2, 'kënga', 'das Lied', 'kön-ga');
w(15, 2, 'muzika', 'die Musik', 'mu-zi-ka');
w(15, 2, 'nusja', 'die Braut', 'nus-ja');
w(15, 2, 'dhëndri', 'der Bräutigam', 'dhön-dri');

s(15, 3, 'Urime ditëlindjen!', 'Herzlichen Glückwunsch zum Geburtstag!', 'u-ri-me di-tö-lind-jen');
s(15, 3, 'Për shumë vjet!', 'Alles Gute! (wörtl. für viele Jahre)', 'pör schum wjet');
s(15, 3, 'Gëzuar Bajramin!', 'Frohes Bajram-Fest!', 'gö-zu-ar baj-ra-min');
s(15, 3, 'Gëzuar!', 'Prost!', 'gö-zu-ar');
s(15, 3, 'Të lumtë!', 'Gut gemacht! / Bravo!', 'tö lum-tö');

/* ============================================================
   Ableitungen: stabile IDs, Register, Hilfszugriffe
   ============================================================ */

function slug(text) {
  return text
    .toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const byId = new Map();
for (const e of entries) {
  let id = slug(e.al);
  if (byId.has(id)) id = `${id}-${e.u}${e.l}`;      // Doppelte eindeutig machen
  let n = 2;
  while (byId.has(id)) id = `${slug(e.al)}-${n++}`;
  e.id = id;
  byId.set(id, e);
}

export const LEXICON = entries;

export function entry(id) {
  return byId.get(id) || null;
}

/** Alle Einträge einer Lektion (Einheit u, Lektion l). */
export function lessonEntries(u, l) {
  return entries.filter((e) => e.u === u && e.l === l);
}

/** Alle Einträge einer Einheit. */
export function unitEntries(u) {
  return entries.filter((e) => e.u === u);
}

/** Wie viele Lektionen hat die Einheit? */
export function lessonCount(u) {
  return unitEntries(u).reduce((max, e) => Math.max(max, e.l), 0);
}
