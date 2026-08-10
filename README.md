# L.I.F.E. OS — Life Planner

Interaktiver Life-Planner im HUD-Stil: **Termine, To-dos, Finanzen, Schulden und Whoop-Daten** (Garmin vorbereitet) in einer einzigen Kommandozentrale.

Ganz oben liegt eine **Schnellnotizzeile**, die selbst erkennt, was aus dem Getippten werden soll — Termin, Aufgabe, Buchung, Schuld oder Ratenzahlung.

Keine Abhängigkeiten, kein Build-Schritt. Die Daten liegen lokal im Browser; auf Wunsch gleichen sich mehrere Geräte **Ende-zu-Ende-verschlüsselt** ab. Als App installierbar und offlinefähig.

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
> Fürs Handy und eine dauerhafte Adresse: siehe **[Aufs Handy holen](#aufs-handy-holen--in-5-schritten)**.

Beim ersten Start fragt die App, ob ein Demo-Datensatz geladen werden soll (Termine, 5 Monate Buchungen, 4 Schuldenposten, 60 Tage Whoop-Werte). Löschbar unter **System → Alles löschen**.

---

## Aufs Handy holen — in 5 Schritten

Du brauchst dafür einmalig eine Internet-Adresse für die App. GitHub macht das kostenlos, und das Nötige liegt schon im Projekt.

**1. Adresse einschalten**
Geh auf GitHub in dein Repo → oben auf **Settings** → links auf **Pages** → bei *Source* **GitHub Actions** auswählen. Fertig, mehr ist da nicht zu tun.

**2. Kurz warten**
Nach ein paar Minuten ist die App erreichbar unter:
`https://artonkrasniqi.github.io/Life-Planner/`

**3. Am Handy öffnen**
Diese Adresse im Handy-Browser aufrufen. Am iPhone bitte **Safari** benutzen, am Android **Chrome** — bei anderen Browsern fehlt der nächste Schritt.

**4. Auf den Startbildschirm legen**
* **iPhone:** unten auf das Teilen-Symbol (Viereck mit Pfeil nach oben) → runterscrollen → **Zum Home-Bildschirm** → *Hinzufügen*
* **Android:** oben rechts auf die drei Punkte `⋮` → **App installieren** (oder *Zum Startbildschirm hinzufügen*)

**5. Fertig**
Jetzt liegt das Arc-Reactor-Icon auf deinem Startbildschirm. Ein Tipp darauf öffnet die App im Vollbild — ohne Browserleiste, wie eine normale App. Sie startet auch **ohne Internet**.

> Solange Schritt 1 nicht gemacht ist, kannst du die App am Handy nur im gleichen WLAN testen: am Rechner `npm start` laufen lassen, die IP des Rechners herausfinden (`hostname -I` unter Linux, `ipconfig getifaddr en0` am Mac) und am Handy `http://<diese-IP>:5173` aufrufen. Installieren geht so nicht.

---

## Synchronisierung zwischen Handy und Rechner

Standardmäßig bleibt jedes Gerät für sich. Damit alle Geräte denselben Stand haben, richtest du den Abgleich einmal ein — unter **System → Synchronisierung**.

Die Daten liegen dabei **verschlüsselt** am Ablageort. Du vergibst ein Kennwort, und ohne dieses Kennwort sieht selbst jemand mit vollem Zugriff auf die Ablage nur Buchstabensalat. Das ist bei Schulden- und Kontodaten kein Luxus, sondern die Grundvoraussetzung.

### Einrichtung mit GitHub Gist (empfohlen)

Du hast GitHub schon — dann braucht es keinen weiteren Dienst.

**Auf dem ersten Gerät:**

1. Token erzeugen: [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
   * *Token name*: beliebig, z. B. „Life Planner“
   * *Expiration*: nach Geschmack (bei „No expiration“ musst du es nie erneuern)
   * *Repository access*: **Public Repositories** reicht
   * Unter **Account permissions** → **Gists** auf **Read and write** stellen
   * Unten **Generate token** und den Wert kopieren
2. In der App: **System → Synchronisierung** → Ablageort **GitHub Gist**
3. Token einfügen, **Kennwort** vergeben (frei wählbar, nur du kennst es), auf **Verbinden**

Die App legt dabei automatisch einen privaten Gist an und trägt dessen ID selbst ein.

**Auf dem zweiten Gerät:**

1. Auf dem ersten Gerät **Kopplungscode** antippen — der landet in der Zwischenablage
2. Den Code aufs zweite Gerät schicken (Nachricht an dich selbst, Notiz-App, egal)
3. Dort **System → Synchronisierung → Kopplungscode einfügen**
4. Dasselbe **Kennwort** eintragen und **Verbinden**

Nach ein paar Sekunden sind beide Geräte auf demselben Stand.

> Der Kopplungscode enthält dein Token — behandle ihn wie ein Passwort und lösche die Nachricht danach.

### Eigener Server statt Gist

Wer lieber selbst hostet, wählt **Eigener Server** und gibt eine Adresse an. Der Vertrag ist bewusst minimal:

* `GET <adresse>` → liefert die zuletzt abgelegte Nutzlast als JSON (oder `404`, wenn noch nichts da ist)
* `PUT <adresse>` → nimmt die Nutzlast entgegen und speichert sie
* optional: ein Bearer-Token, das die App mitschickt

Das sind ein paar Zeilen in einem Cloudflare Worker, einer Node-Funktion oder auf jedem Webspace mit Schreibrechten. Der Inhalt ist bereits verschlüsselt, wenn er dort ankommt.

### Wie der Abgleich arbeitet

* **Automatisch** — ein paar Sekunden nach einer Änderung, beim Öffnen der App, beim Zurückkehren in den Tab und sobald das Netz wiederkommt. Abschaltbar.
* **Zusammenführen statt überschreiben.** Jeder Eintrag trägt einen Zeitstempel. Beim Abgleich wird zuerst gelesen, dann zusammengeführt, dann geschrieben. Ein Gerät, das eine Woche offline war, kann den Stand des anderen nicht überbügeln — es steuert nur seine eigenen Änderungen bei.
* **Löschen wirkt.** Gelöschtes hinterlässt einen Vermerk, damit ein Eintrag nicht vom alten Stand des anderen Geräts wieder auftaucht.
* **Ändern beide Geräte denselben Eintrag**, gewinnt die spätere Änderung. Das ist Last-Write-Wins auf Eintragsebene, kein CRDT — für einen persönlichen Planer der richtige Kompromiss. Unterschiedliche Einträge gehen dabei nie verloren.
* **Ausgenommen bleiben:** das Auge (Schulden verbergen) gilt pro Gerät, ebenso Token und Kennwörter. Die verlassen dein Gerät nie.

### Wenn etwas klemmt

| Meldung | Ursache |
|---|---|
| *Falsches Kennwort* | Auf den Geräten unterschiedliche Kennwörter. Lokale Daten bleiben unberührt. |
| *Token abgelehnt (401)* | Token abgelaufen oder falsch kopiert. |
| *Zugriff verweigert (403)* | Dem Token fehlt die Gist-Berechtigung (Schritt 1, „Account permissions → Gists“). |
| *Gist nicht gefunden (404)* | Falsche Gist-ID auf dem zweiten Gerät. |
| *Verschlüsselung braucht https* | Über `http://` im WLAN geht Verschlüsselung nicht — dafür Schritt 1 der Handy-Anleitung erledigen. |

Ohne Abgleich bleibt der Weg über **System → Backup exportieren** und auf dem anderen Gerät **Backup einspielen**.

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
| **System** | Synchronisierung, Profil, Backup exportieren/einspielen, Demo-Daten, Zurücksetzen |

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

Der Ring oben rechts zeigt den Zustand des Abgleichs — ein Klick stößt ihn sofort an.

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

Alles liegt unter dem Schlüssel `life-os:state:v1` im `localStorage` des Browsers. Ohne eingerichteten Abgleich gibt es überhaupt keine Netzwerkaufrufe.

Mit Abgleich verlässt nur die verschlüsselte Nutzlast das Gerät — Token, Kennwort und die Auge-Einstellung bleiben lokal und stehen auch nicht im Backup.

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
  sync/
    merge.js             Zeitstempel, Grabsteine, Zusammenführen (rein)
    crypto.js            AES-GCM + PBKDF2 über Web Crypto
    providers.js         Ablageorte: GitHub Gist, eigener Server
    engine.js            Ablauf: lesen → zusammenführen → schreiben
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
