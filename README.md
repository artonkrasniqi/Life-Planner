# L.I.F.E. OS — Life Planner

Interaktiver Life-Planner im HUD-Stil: **Termine, To-dos, Finanzen, Schulden und Whoop-Daten** (Garmin vorbereitet) in einer einzigen Kommandozentrale.

Ganz oben liegt eine **Schnellnotizzeile**, die selbst erkennt, was aus dem Getippten werden soll — Termin, Aufgabe, Buchung, Schuld oder Ratenzahlung.

Keine Abhängigkeiten, kein Build-Schritt, kein Server. Alle Daten bleiben lokal im Browser (`localStorage`). Als PWA installierbar und offlinefähig.

---

## Schnellstart

```bash
git clone https://github.com/artonkrasniqi/Life-Planner.git
cd Life-Planner
npm start          # startet einen lokalen Server auf http://localhost:5173
```

Alternativ ohne npm:

```bash
python3 -m http.server 5173
```

> **Hinweis:** Ein lokaler Server ist nötig, weil die App ES-Module benutzt — ein direkter Doppelklick auf `index.html` (`file://`) wird vom Browser blockiert.
> Für eine dauerhafte URL und die Nutzung am Handy: siehe **[Auf dem Handy](#auf-dem-handy)**.

Beim ersten Start fragt die App, ob ein Demo-Datensatz geladen werden soll (Termine, 5 Monate Buchungen, 4 Schuldenposten, 60 Tage Whoop-Werte). Löschbar unter **System → Alles löschen**.

---

## Auf dem Handy

Drei Wege, je nachdem wie dauerhaft es sein soll.

### 1. Als App installieren (empfohlen)

Sobald die Seite unter einer `https://`-Adresse liegt — etwa über GitHub Pages —, lässt sie sich wie eine native App installieren:

* **Android / Chrome:** Seite öffnen → Menü `⋮` → *App installieren* (oder der Einblender unten)
* **iPhone / Safari:** Seite öffnen → Teilen-Symbol → *Zum Home-Bildschirm*

Danach startet sie im Vollbild ohne Browserleiste, mit eigenem Icon — und **funktioniert offline**, weil ein Service Worker die App zwischenspeichert. Ohne Netz startet sie genauso; sie holt sich Aktualisierungen beim nächsten Start mit Verbindung.

GitHub Pages einschalten: Repo → *Settings* → *Pages* → unter *Source* **GitHub Actions** wählen. Der Workflow liegt schon bei; nach dem nächsten Push auf `main` ist die App unter `https://artonkrasniqi.github.io/Life-Planner/` erreichbar.

### 2. Schnell aus dem Heimnetz testen

Rechner und Handy im selben WLAN:

```bash
npx serve . -l 5173        # oder: python3 -m http.server 5173 --bind 0.0.0.0
ipconfig getifaddr en0     # macOS · Linux: hostname -I
```

Am Handy `http://<IP-des-Rechners>:5173` aufrufen. Zum Ausprobieren reicht das — installieren und offline nutzen geht so allerdings nicht, dafür braucht es `https`.

### 3. Wichtig zu den Daten

Der Speicher hängt am jeweiligen Browser: **Handy und Rechner führen getrennte Datenbestände.** Es gibt keine Synchronisierung — das ist der Preis dafür, dass nichts das Gerät verlässt.

Zum Umziehen oder Abgleichen: **System → Backup exportieren** auf dem einen Gerät, die JSON-Datei aufs andere schieben (AirDrop, Mail, Cloud) und dort **Backup einspielen**. Das ersetzt den kompletten Bestand des Zielgeräts.

Praktischer Ansatz: ein Gerät als Hauptgerät führen und das andere per Backup nachziehen.

---

## Schnellnotizzeile

Die Zeile unter der Kopfleiste ist für alles zuständig. Tippen, Vorschau prüfen, Enter.

```
Zahnarzt übermorgen 10:30              →  Termin, Mi 12. Aug 10:30, 60 min, Gesundheit
Wocheneinkauf 82,40 € bezahlt          →  Buchung, −82,40 €, Lebensmittel
Steuerunterlagen sortieren !! #admin   →  Aufgabe, Priorität hoch, #admin
3000 € bei der Sparkasse 4,9 % Rate 90 →  Schuld, Sparkasse, 4,90 % p. a., 90 €/Monat
Rate Autokredit 420 € bezahlt          →  Zahlung auf den bestehenden Autokredit
Mama anrufen                           →  Aufgabe
```

**Die Vorschau erscheint vor dem Anlegen** und zeigt jedes erkannte Feld. Liegt die Zuordnung daneben, genügt ein Klick auf einen anderen Typ (oder `Tab`) — nichts wird ungefragt angelegt.

### Woran der Typ erkannt wird

| Signal | Wird zu |
|---|---|
| Uhrzeit, Dauer, Wörter wie *Termin, Meeting, Arzt, Training* | **Termin** |
| Betrag mit *bezahlt, gekauft, überwiesen, Gehalt, Miete* … | **Buchung** (Einnahme/Ausgabe automatisch) |
| Zinssatz oder Monatsrate, *Kredit, geliehen, schulde, Kreditkarte* | **Schuld** |
| Betrag + Name einer bereits erfassten Schuld + *Rate/bezahlt* | **Zahlung** auf diese Schuld |
| alles Übrige | **Aufgabe** |

### Bausteine

| Eingabe | Bedeutung |
|---|---|
| `heute`, `morgen`, `übermorgen`, `Freitag`, `nächsten Dienstag`, `in 3 Tagen`, `nächste Woche`, `am Wochenende`, `15.09.`, `2026-09-15`, `am 22.` | Datum |
| `10:30`, `14 Uhr`, `früh`, `mittags`, `nachmittags`, `abends` | Uhrzeit |
| `für 90 min`, `2 Stunden` | Dauer |
| `82,40 €`, `3000 EUR` | Betrag |
| `4,9 %`, `Zins 3,4` | Zinssatz |
| `Rate 90` | Monatsrate |
| `!` / `!!` / `!!!` | Priorität niedrig / hoch / kritisch |
| `#tag` | Tag |
| `termin:`, `aufgabe:`, `buchung:`, `einnahme:`, `schuld:` | Typ erzwingen |

Maßeinheiten bleiben unangetastet: `10 km Lauf morgen früh` wird ein Sporttermin und behält die Distanz im Titel.

Tastatur: `/` fokussiert die Zeile, `Enter` legt an, `⇧Enter` öffnet den vollen Dialog mit vorbelegten Feldern, `Tab` wechselt den Typ, `Esc` bricht ab.

---

## Module

| Ansicht | Inhalt |
|---|---|
| **Schnellnotiz** | Eine Zeile für alles — erkennt selbst, was daraus wird (siehe oben) |
| **Zentrale** | Arc-Reactor mit „Systemintegrität“ (Score aus Aufgaben, Finanzen, Schulden, Körper), nächster Termin, Cashflow, Agenda, Prioritäten, Vitalwerte |
| **Termine** | Monatsraster + Tagesagenda, Kategorien mit Farbcodierung, Dauer, Ort, Notizen. Doppelklick auf einen Tag legt direkt einen Termin an |
| **Aufgaben** | Prioritäten, Fälligkeiten, Tags, Filter, Auslastungsstatistik, Schnellerfassung mit Kurzsyntax |
| **Finanzen** | Konten, Buchungen, 12-Monats-Cashflow, Ausgabenstruktur als Donut, Budgets pro Kategorie, Nettovermögen |
| **Schulden** | Restschuld, Tilgungsfortschritt, Zinskosten, Restlaufzeit, Prognose über 36 Monate, Strategievergleich Avalanche/Snowball — **mit Auge zum Ein- und Ausblenden** |
| **Vitalwerte** | Recovery / Strain / Schlaf / HRV als Gauges, Verlaufsdiagramme, Kennzahlen mit Sparklines, Whoop- und Garmin-Import |
| **System** | Profil, Backup exportieren/einspielen, Demo-Daten, Zurücksetzen |

---

## Das Auge: Schulden ein- und ausblenden

Ein Klick auf das Auge-Symbol blendet **alle Schuldenbeträge** aus — gleichzeitig in der Kopfzeile, auf dem Dashboard und in der Schuldenansicht.

* Das Auge sitzt in der **Topbar**, auf der **Schulden-Kachel des Dashboards** und im **Kopf der Schuldenansicht**.
* Beträge werden **echt maskiert** (`••••••`), nicht bloß weichgezeichnet — die Zahlen stehen im verborgenen Zustand nicht im DOM.
* Die Schuldenansicht zeigt stattdessen einen Sperrbildschirm mit Einblenden-Schalter.
* Der Zustand wird gespeichert und ist beim nächsten Öffnen wieder aktiv. Standard: **verborgen**.
* Tastenkürzel: **`A`**

---

## Kurzsyntax im Aufgaben-Modul

Zusätzlich zur globalen Schnellnotizzeile hat die Aufgaben-Ansicht ein eigenes Erfassungsfeld, das immer eine Aufgabe anlegt — praktisch, wenn man mehrere hintereinander eintippt:

```
Steuer abgeben !!! @morgen #finanzen #admin
```

| Zeichen | Wirkung |
|---|---|
| `!` | Priorität niedrig |
| `!!` | Priorität hoch |
| `!!!` | Priorität kritisch |
| `@heute`, `@morgen`, `@übermorgen`, `@woche` | Fälligkeit |
| `@2026-09-01` | Fälligkeit als Datum |
| `#tag` | Tag (mehrere möglich) |

---

## Tastenkürzel

| Taste | Funktion |
|---|---|
| `/` | Schnellnotizzeile fokussieren |
| `1` … `7` | Ansicht wechseln |
| `N` | Neuer Eintrag in der aktuellen Ansicht |
| `A` | Schulden ein-/ausblenden |
| `T` | Zum heutigen Tag im Kalender |
| `Esc` | Dialog schließen |

---

## Whoop-Daten importieren

**Vitalwerte → Whoop importieren**

1. **CSV aus dem offiziellen Datenexport** (Whoop-App → *Einstellungen → Datenexport*). Die Datei `physiological_cycles.csv` enthält Recovery, Strain, HRV, Ruhepuls, Schlafdauer, Schlafqualität, Kalorien, SpO₂ und Atemfrequenz — alles wird automatisch zugeordnet.
2. **JSON aus der Whoop-API v2** (`/v2/recovery`, `/v2/cycle`, `/v2/activity/sleep`). Antworten mehrerer Endpunkte lassen sich nacheinander einspielen und werden pro Tag zusammengeführt.
3. **Eigener Proxy** über *API-Proxy*: Basis-URL und optionales Bearer-Token hinterlegen, die App ruft `{baseUrl}/{pfad}?limit=N` ab.

> Ein direkter Live-Abruf aus dem Browser ist nicht möglich: Whoop nutzt OAuth2 mit Client-Secret, das in einer reinen Frontend-App nicht sicher liegen kann. Dafür braucht es einen kleinen eigenen Dienst, der das Token hält — die Anbindung dafür ist in `src/integrations/whoop.js` fertig.

## Garmin

Derselbe Weg über **Vitalwerte → Garmin**: CSV-Export aus Garmin Connect oder JSON eines eigenen Proxys (z. B. auf Basis von `python-garminconnect`). Erkannt werden Schritte, Ruhepuls, HRV, Kalorien, Schlafdauer, Body Battery, Stress und VO₂max — deutsche wie englische Spaltennamen.

Whoop- und Garmin-Werte landen in **derselben Zeitreihe**. Stammen die Werte eines Tages aus beiden Geräten, wird das als Quelle `whoop+garmin` ausgewiesen.

---

## Datenhaltung

Alles liegt unter dem Schlüssel `life-os:state:v1` im `localStorage` des Browsers. Nichts verlässt das Gerät, es gibt keine Netzwerkaufrufe (außer einem selbst konfigurierten Proxy).

Praktische Konsequenz: Die Daten hängen an Browser **und** Profil. Für Backups und Gerätewechsel:

**System → Backup exportieren** schreibt eine JSON-Datei, **Backup einspielen** liest sie zurück.

---

## Projektstruktur

```
index.html               Grundgerüst (Topbar, Schnellnotiz, Rail, View, Modal-Root)
manifest.webmanifest     PWA-Manifest (Installation auf dem Handy)
sw.js                    Service Worker (Offline-Betrieb)
icons/                   App-Icons
styles/main.css          Komplettes HUD-Design
src/
  main.js                Boot-Sequenz, Router, Navigation, Tastenkürzel
  store.js               Zustand, Persistenz, Pub/Sub, Domänenaktionen
  quickparse.js          Freitext-Erkennung für die Schnellnotizzeile
  util.js                DOM-Helfer, Datum, Formatierung, Icons, CSV-Parser
  charts.js              Canvas-Diagramme: Linie, Balken, Donut, Gauge, Sparkline
  seed.js                Demo-Datensatz
  nav.js                 Vermittler für Navigation/Neurendern
  ui/
    quickbar.js          Schnellnotizzeile mit Live-Vorschau
    widgets.js           Panel, KPI, Fortschrittsbalken, Chips, Auge-Button
    modal.js             Generischer Formular-Dialog + Bestätigung
    reactor.js           Animierter Arc-Reactor (SVG)
  views/
    dashboard.js  calendar.js  todos.js  finance.js
    debts.js      bio.js       settings.js
  integrations/
    whoop.js             CSV-/JSON-Parser + Proxy-Abruf
    garmin.js            CSV-/JSON-Parser + Proxy-Abruf
```

Kein Framework, kein Bundler, keine Laufzeit-Abhängigkeit. `package.json` enthält nur einen Startbefehl für den lokalen Server.

---

## Design

Arc-Reactor-Palette auf Tiefschwarz: Cyan `#3ad7ff`, Gold `#ffb03a`, Alarm-Rot `#ff4d5f`, Grün `#2fe0a4`. Angeschrägte Panel-Ecken, HUD-Gitter im Hintergrund, Boot-Sequenz beim Start, animierter Reaktor als Fortschrittsanzeige für die Systemintegrität. Voll responsiv — auf schmalen Schirmen wandert die Navigation nach unten.

`prefers-reduced-motion` wird respektiert.
