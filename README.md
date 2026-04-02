# Ladeschweinle

![Ladeschweinle App-Logo](public/assets/applogo_ladesau.png)

Schlichte Progressive Web App fuer einen Raspberry Pi mit Raspberry Pi OS. Die Anwendung erfasst monatliche Fahrleistung und einzelne Ladevorgaenge, speichert alles in JSON-Dateien und nutzt eine reine Weboberflaeche ohne separate API.

## Funktionen

- Monatliche Kilometerwerte pro `YYYY-MM` anlegen und bearbeiten
- Ladevorgaenge mit Datum, kWh, Preis pro kWh und optionaler Gebuehr erfassen
- Automatische Berechnung der Gesamtkosten je Ladevorgang
- Dashboard mit drei Diagrammen fuer 3, 6 oder 12 Monate
- Installierbare PWA mit Service Worker und statischem Asset-Caching
- JSON-Dateien statt Datenbank
- Einstellungen-Menue fuer JSON-Import, JSON-Export und CSV-Tarifimporte
- CSV-Import fuer `Mercedes Benz Public Charge`
- CSV-Import fuer `Legacy Ladeschweinle Tarif`

## Architektur

- `server.js`: Express-Server, statische Auslieferung und Formularaktionen
- `lib/storage.js`: Erzeugt Datenverzeichnis und liest/schreibt JSON-Dateien
- `lib/validation.js`: Validierung aller API-Eingaben
- `lib/stats.js`: Monatliche Aggregationen fuer die Diagramme
- `public/`: HTML, CSS, JavaScript, Manifest, Service Worker und Icons
- `lib/importers.js`: CSV-Importlogik und Dublettenfilter fuer Tarifdateien
- `data/`: Persistente JSON-Dateien fuer Kilometer und Ladevorgaenge

## Lokaler Start

### Voraussetzungen

- Node.js 20 oder neuer

### Starten

```bash
npm install
npm start
```

Die App ist danach lokal unter `http://localhost:1337` erreichbar.

## Docker-Start

### Mit Docker

```bash
docker build -t ladeschweinle .
docker run -d -p 1337:1337 -v "$(pwd)/data:/app/data" --name ladeschweinle ladeschweinle
```

### Mit Docker Compose

```bash
docker compose up -d --build
```

## Update-Prozess

Wenn die Anwendung bereits auf dem Raspberry Pi ausgecheckt ist und per Docker Compose läuft:

```bash
cd /pfad/zu/ladeschweinle
git pull
docker compose up -d --build
```

Optional zur Kontrolle:

```bash
docker compose ps
docker compose logs --tail=100
```

Die vorhandenen Daten in `data/monthly-km.json` und `data/transactions.json` bleiben dabei erhalten.

## Datenablage

Die Daten liegen im Projektordner unter:

- `data/monthly-km.json`
- `data/transactions.json`

Fehlende Dateien und Verzeichnisse werden beim Start automatisch erzeugt.

## Im lokalen Netzwerk aufrufen

Der Server lauscht auf `0.0.0.0:1337`. Auf einem Raspberry Pi ist die App damit von anderen Geraeten im selben Netzwerk ueber die IP des Pi erreichbar.

Die IP-Adresse des Raspberry Pi laesst sich zum Beispiel mit `hostname -I` ermitteln.

## Webaktionen

- Formular fuer Monatskilometer
- Formular fuer Ladevorgaenge
- Browserbasierter JSON-Import
- Browserbasierter CSV-Import
- Direkte JSON-Downloads fuer Exporte

## PWA-Hinweise

- `manifest.json` definiert App-Name, Farbe und Icons
- `sw.js` cached App-Shell und bereits geladene GET-Anfragen
- Nach dem ersten Laden ist die Oberflaeche offline weiterhin verfuegbar

## Import und Export

- Im Einstellungen-Menue lassen sich alle Daten als JSON herunterladen
- JSON-Import akzeptiert entweder einen Gesamtexport oder einzelne Datenbestaende
- CSV-Import ist aktuell fuer `Mercedes Benz Public Charge` vorbereitet
- CSV-Import ist aktuell fuer `Mercedes Benz Public Charge` und `Legacy Ladeschweinle Tarif` vorbereitet
- Beim CSV-Import werden nur Datum, Energie, Preis pro kWh, Gebuehr und Gesamtkosten uebernommen
- Der Legacy-Ladeschweinle-Import uebernimmt zusaetzlich Monatskilometer aus den `mileage`-Zeilen
- Bereits vorhandene Ladevorgaenge werden beim CSV-Import ueber eine inhaltliche Signatur gegen Dubletten geprueft

## Ideen fuer spaetere Erweiterungen

- CSV-Export fuer Monats- und Ladedaten
- Bearbeiten einzelner Ladevorgaenge
- Import bestehender Abrechnungsdaten
- Separates Diagramm fuer monatliche Gesamtkosten

## GitHub Actions: PWA-Demo Deployment

Ein Deployment über GitHub Actions ist **möglich**, aber mit einer wichtigen Einschränkung:

- Die Anwendung ist technisch eine Node.js-/Express-App mit serverseitigen POST-Routen und Dateispeicherung in `data/`.
- GitHub Pages kann nur statische Dateien ausliefern.

Daher deployt der Workflow `.github/workflows/deploy-pages.yml` eine **statische Demo** der PWA auf GitHub Pages. Funktionen mit Server-Schreibzugriff (z. B. Import, Speichern, Löschen, Export-Endpunkte) sind dort nicht nutzbar.

### Aktivierung

1. In GitHub unter **Settings → Pages** als Source **GitHub Actions** auswählen.
2. Den Workflow **Deploy PWA Demo to GitHub Pages** starten (manuell oder per Push auf `main`).
3. Die erzeugte URL ist im Deploy-Job unter `page_url` sichtbar.
