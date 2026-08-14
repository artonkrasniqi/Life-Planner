# Kosovarisch lernen

Eine spielerische Lern-App für **Kosovarisch, wie es in und um Prizren gesprochen wird** — auf Deutsch erklärt, von null an, ohne Vorkenntnisse. Jedes Wort und jeder Satz lässt sich **anhören**.

Läuft im Browser, lässt sich über Safari auf den Home-Bildschirm legen und funktioniert danach wie eine normale iPhone-App: Vollbild, offline, ohne Konto.

---

## Aufs iPhone holen

**1.** Adresse im **Safari** öffnen:
`https://artonkrasniqi.github.io/Life-Planner/kosovarisch/`

**2.** Unten auf das **Teilen-Symbol** (Viereck mit Pfeil nach oben) tippen.

**3.** Runterscrollen → **Zum Home-Bildschirm** → *Hinzufügen*.

Fertig. Das Brücken-Icon liegt auf dem Startbildschirm, die App startet im Vollbild und läuft auch **ohne Internet** — sämtliche Inhalte liegen nach dem ersten Start auf dem Gerät, die Sprachausgabe eingeschlossen.

> Am Android geht es genauso über *Menü ⋮ → App installieren*.

Lokal ausprobieren (ES-Module brauchen einen Server, `file://` reicht nicht):

```bash
cd Life-Planner
npm start                 # http://localhost:5173/kosovarisch/
```

---

## Was drin ist

| | |
|---|---|
| **15 Einheiten** | Von „Hallo sagen" bis „Hochzeit und Bajram" |
| **76 Lektionen** | inklusive einer Prüfung am Ende jeder Einheit |
| **399 Einträge** | Wörter und ganze Sätze, alle mit Lautschrift |
| **24 Karten** | Grammatik und Kultur, jede in zwei Minuten gelesen |
| **23 Abzeichen** | vom ersten Schritt bis zum ganzen Kurs |
| **Alles hörbar** | Hörknopf an jedem Wort, Hörliste zum Durchlaufen, Hör-Aufgaben |

### Die Einheiten

1. **Përshëndetje** — Erste Worte: Hallo, danke, wie geht's
2. **Un & ti** — Kennenlernen, Name, Herkunft, Fragewörter
3. **Numrat** — Zahlen, Alter, Preise
4. **Familja** — Familie und Verwandtschaft
5. **Kafe & ushqim** — Essen, Trinken, im Café bestellen
6. **Prizreni** — Orte der Stadt, nach dem Weg fragen
7. **Koha** — Zeit, Wochentage, Uhrzeit
8. **Blerje** — Einkaufen, Farben, Handeln auf dem Basar
9. **Në shpi** — Zuhause, Möbel, Gast sein
10. **Ndjenja** — Gefühle und Small Talk
11. **Moti & natyra** — Wetter, Natur, Tiere
12. **Udhëtim** — Bus, Taxi, unterwegs
13. **Punë & shkollë** — Arbeit, Berufe, Schule
14. **Shëndeti** — Körper, beim Arzt, Hilfe holen
15. **Festa** — Feste, Feiern, Gratulieren

---

## Warum „Prizrener Kosovarisch" und nicht Schulbuch-Albanisch?

Albanisch hat zwei große Hauptdialekte: **Gegisch** im Norden (Kosovo, Nordalbanien) und **Toskisch** im Süden. Die Schriftsprache von 1972 baut auf dem Toskischen auf. Wer nach dem Lehrbuch lernt, sagt in Prizren also Sätze, die zwar richtig, aber fremd klingen.

Diese App bringt die **gesprochene Form** bei — und nennt die Standardform überall dazu:

| Prizren / Kosovo | Standard | Deutsch |
|---|---|---|
| qysh je? | si je? | wie geht's? |
| osht | është | ist |
| qka | çfarë | was |
| tash | tani | jetzt |
| shpia | shtëpia | das Haus |
| prej kah je? | nga je? | woher kommst du? |
| du me ble | dua të blej | ich will kaufen |

Dazu kommt der türkische Wortschatz, der Prizrens Alltag prägt: *sokak* (Gasse), *penxhere* (Fenster), *sahat* (Uhr), *dyqan* (Laden), *hesap* (Rechnung), *mysafir* (Gast).

Über den Schalter **Profil → Standardalbanisch zeigen** lässt sich die Schulbuchform beim Lernen ein- und ausblenden.

---

## Wie gelernt wird

**Sechs Bereiche:** Lernen (Pfad), Hören, Üben, Wörter, Regeln, Profil.

**Lernpfad.** Die Lektionen sind der Reihe nach freigeschaltet: erst wenn eine sitzt, öffnet sich die nächste. Fehlerfreie Durchgänge geben drei Sterne.

**Acht Aufgabentypen**, aus dem Wortschatz jedes Mal neu gemischt — dieselbe Lektion läuft beim zweiten Mal anders:

* Bedeutung wählen (Kosovarisch → Deutsch)
* Wort wählen (Deutsch → Kosovarisch)
* Hören und erkennen (nur Ton)
* Nach Lautschrift erkennen
* Satz aus Kacheln bauen
* Übersetzung eintippen
* Paare verbinden
* Regelfrage aus der Grammatikkarte (in Prüfungen)

**Wiederholung nach Plan.** Jedes Wort bekommt einen eigenen Terminplan (vereinfachtes SM-2): Was sitzt, kommt immer seltener; was danebengeht, schon morgen wieder. Der Reiter *Üben* zeigt, was heute fällig ist.

**Zwei Spiele.** *Blitzrunde* (60 Sekunden, so viele richtige wie möglich) und *Paarspiel* (sechs Paare gegen die Uhr) — mit Bestwerten.

**Spielmechanik.** XP mit Kombo-Bonus, zehn Ränge (Mysafir → Legjendë), Tagesziel, Tagesserie, fünf Herzen, Konfetti und Abzeichen. Herzen lassen sich unter *Profil* abschalten, wer lieber ohne Druck lernt.

---

## Aussprache und Sprachausgabe

Bei jedem Eintrag steht die Aussprache in deutscher Lautschrift: `qysh je` → *kjüsch je*. Die Regeln dahinter stehen in der Karte **Aussprache** (Grammatik).

Kurz gefasst: `ë` = dumpfes e wie in *bitte*, `y` = ü, `ç` = tsch, `q` = weiches kj (in Prizren fast tsch), `gj` = dj, `xh` = dsch, `x` = ds, `c` = z, `v` = w, `rr` = gerollt, `ll` = dunkel, `nj` wie in *Cognac*.

### Wie die App spricht, obwohl es keine albanische Stimme gibt

Apple bietet für Albanisch **keine Stimme an** — auf keinem iPhone, in keiner Einstellung. Eine deutsche Stimme, der man einfach „qysh je" hinwirft, sagt „kwüsch jeh". Deshalb geht die App einen Umweg:

1. Sie sucht die beste Stimme, die das Gerät hat. Reihenfolge: **Albanisch** (falls doch vorhanden) → **Türkisch** → **Italienisch** → **Deutsch** → **Spanisch**.
2. Sie zerlegt das albanische Wort in seine Laute.
3. Sie schreibt es in der Rechtschreibung dieser Stimme neu — und lässt *das* vorlesen.

| Wort | Türkische Stimme | Italienische Stimme | Deutsche Stimme |
|---|---|---|---|
| qysh je | kyüş ye | ciusci ie | kjüsch je |
| faleminderit | faleminderit | faleminderit | faleminderit |
| gëzohem | gızohem | ghesoem | gesohem |
| shpia | şpia | scipia | schpia |
| dyqan | dükyan | ducian | dükjan |

Türkisch trifft die albanischen Laute am genauesten (ş, ç, c, ü und das ı für „ë" sitzen fast eins zu eins), Deutsch ist am vertrautesten. Unter **Profil → Sprachausgabe** lässt sich die Stimme frei wählen, das Tempo einstellen und eine Probe abspielen.

Das ist eine Annäherung, keine muttersprachliche Aufnahme — aber sie funktioniert offline, auf jedem Gerät, ohne Konto und ohne heruntergeladene Tondateien. Findet die App gar keine brauchbare Stimme, verschwinden die Hörknöpfe und die Lautschrift übernimmt.

### Wo überall gehört werden kann

* **Hören** (eigener Reiter): Einheit wählen, einzeln antippen oder alles am Stück durchlaufen lassen — mit mitlaufender Markierung.
* **In der Lektion:** neue Wörter werden von allein vorgelesen, die richtige Lösung nach jeder Antwort ebenso. Dazu die Aufgabe *„Was hörst du?"* — nur Ton, kein Schriftbild.
* **Im Wörterbuch:** Hörknopf in jeder Zeile, in der Detailkarte zusätzlich langsam (🐢).
* **In den Grammatikkarten:** jedes albanische Beispiel in den Tabellen ist antippbar.

Automatisches Vorlesen lässt sich im Profil abschalten.

---

## Daten

Alles liegt in `localStorage` auf dem Gerät — kein Konto, kein Server, keine Übertragung. Unter **Profil → Fortschritt sichern** lässt sich der Stand als JSON-Datei speichern und auf einem anderen Gerät wieder laden.

> Wer in Safari die Website-Daten löscht, löscht auch den Lernstand. Vorher sichern.

Die Sprachausgabe läuft ebenfalls vollständig auf dem Gerät (die Stimmen des Betriebssystems) — es geht nichts an einen Sprachdienst.

---

## Aufbau

```
kosovarisch/
├── index.html              Grundgerüst
├── manifest.webmanifest    Installierbarkeit (Name, Icons, Startadresse)
├── sw.js                   Service Worker: Netz zuerst, Cache als Rückfall
├── styles/app.css          gesamtes Erscheinungsbild, hell und dunkel
├── icons/                  App-Icons (Steinbrücke unter der Sonne)
└── src/
    ├── main.js             App-Schale, Router, Navigation
    ├── state.js            Fortschritt, XP, Ränge, Serie, Herzen
    ├── util.js             kleine Helfer (Mischen, Datum, Normalisieren)
    ├── audio.js            Töne per Web Audio, Vibration
    ├── speech.js           Sprachausgabe, falls das Gerät sie kann
    ├── data/
    │   ├── lexicon.js      Wortschatz und Sätze (Quelle für alles)
    │   ├── course.js       Einheiten, Lektionen, Prüfungen
    │   ├── grammar.js      Grammatik- und Kulturkarten
    │   └── badges.js       Abzeichen mit Prüfbedingung
    ├── engine/
    │   ├── exercises.js    baut aus Wörtern die Aufgaben
    │   └── srs.js          Wiederholungsplan je Wort
    ├── ui/kit.js           Elemente, Toast, Sheet, Ring, Konfetti
    ├── ui/speaker.js       der Hörknopf
    └── views/              path · lesson · listen · practice · dict · notes · profile
```

Kein Build-Schritt, keine Abhängigkeiten: reine ES-Module, wie im Rest des Projekts.

### Inhalte erweitern

Neue Vokabeln kommen in `src/data/lexicon.js`:

```js
w(5, 2, 'bukë', 'das Brot', 'bu-kö', { std: 'buka', note: 'Hinweis …' });
//  ↑  ↑     ↑        ↑          ↑
//  │  │     │        │          Lautschrift
//  │  │     │        Deutsch
//  │  │     so sagt man es in Prizren
//  │  Lektion innerhalb der Einheit
//  Einheit
```

`s(...)` statt `w(...)` macht daraus einen Satz — Sätze bekommen zusätzlich Bau-Aufgaben. Lektionstitel stehen in `src/data/course.js`. Aufgaben, Prüfung und Wörterbuch ziehen sich den Rest automatisch.

Nach Änderungen an Dateien die Versionsnummer in `sw.js` (`const VERSION`) erhöhen, damit der Zwischenspeicher erneuert wird.

---

## Ehrliche Einordnung

Der Inhalt ist mit Sorgfalt zusammengestellt, aber **Dialekt lässt sich nicht normiert schreiben** — für „osht/âsht", „nân/nanë" oder „falemnderit/faleminderit" gibt es keine amtliche Rechtschreibung, und in Prizren spricht nicht jede Familie gleich. Wer Muttersprachler in der Nähe hat: einmal gegenlesen lassen und Abweichungen in `lexicon.js` nachziehen. Die Standardformen daneben sind der verlässliche Anker.
