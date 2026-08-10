# L.I.F.E. OS — Life Planner

Interaktiver Life-Planner im HUD-Stil: **Termine, To-dos, Finanzen, Schulden und Whoop-Daten** (Garmin vorbereitet) in einer einzigen Kommandozentrale.

Keine Abhängigkeiten, kein Build-Schritt, kein Server. Alle Daten bleiben lokal im Browser (`localStorage`).

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
> Für eine dauerhafte URL ist ein GitHub-Pages-Workflow enthalten (`.github/workflows/pages.yml`): In den Repo-Einstellungen unter *Pages* als Quelle **GitHub Actions** wählen, dann ist die App unter `https://artonkrasniqi.github.io/Life-Planner/` erreichbar.

Beim ersten Start fragt die App, ob ein Demo-Datensatz geladen werden soll (Termine, 5 Monate Buchungen, 4 Schuldenposten, 60 Tage Whoop-Werte). Löschbar unter **System → Alles löschen**.

---

## Module

| Ansicht | Inhalt |
|---|---|
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

## Kurzsyntax für Aufgaben

Im Schnellerfassungsfeld direkt lostippen:

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
index.html               Grundgerüst (Topbar, Rail, View, Modal-Root)
styles/main.css          Komplettes HUD-Design
src/
  main.js                Boot-Sequenz, Router, Navigation, Tastenkürzel
  store.js               Zustand, Persistenz, Pub/Sub, Domänenaktionen
  util.js                DOM-Helfer, Datum, Formatierung, Icons, CSV-Parser
  charts.js              Canvas-Diagramme: Linie, Balken, Donut, Gauge, Sparkline
  seed.js                Demo-Datensatz
  nav.js                 Vermittler für Navigation/Neurendern
  ui/
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
