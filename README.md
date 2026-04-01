# Ladesaeule

Schlichte Progressive Web App fuer einen Raspberry Pi mit Raspberry Pi OS. Die Anwendung erfasst monatliche Fahrleistung und einzelne Ladevorgaenge, speichert alles in JSON-Dateien und stellt die Daten ueber ein kleines Express-Backend bereit.

## Funktionen

- Monatliche Kilometerwerte pro `YYYY-MM` anlegen und bearbeiten
- Ladevorgaenge mit Datum, kWh, Preis pro kWh und optionaler Gebuehr erfassen
- Automatische Berechnung der Gesamtkosten je Ladevorgang
- Dashboard mit drei Diagrammen fuer 3, 6 oder 12 Monate
- Installierbare PWA mit Service Worker und statischem Asset-Caching
- JSON-Dateien statt Datenbank
- Einstellungen-Menue fuer JSON-Import, JSON-Export und CSV-Tarifimporte
- CSV-Import fuer `Mercedes Benz Public Charge`

## Architektur

- `server.js`: Express-Server, statische Auslieferung und REST-API
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

Die App ist danach lokal unter `http://localhost:3000` erreichbar.

## Docker-Start

### Mit Docker

```bash
docker build -t ladesaeule .
docker run -d -p 3000:3000 -v "$(pwd)/data:/app/data" --name ladesaeule ladesaeule
```

### Mit Docker Compose

```bash
docker compose up -d --build
```

## Datenablage

Die Daten liegen im Projektordner unter:

- `data/monthly-km.json`
- `data/transactions.json`

Fehlende Dateien und Verzeichnisse werden beim Start automatisch erzeugt.

## Im lokalen Netzwerk aufrufen

Der Server lauscht auf `0.0.0.0:3000`. Auf einem Raspberry Pi ist die App damit von anderen Geraeten im selben Netzwerk ueber die IP des Pi erreichbar, zum Beispiel:

```text
http://192.168.178.42:3000
```

Die IP-Adresse des Raspberry Pi laesst sich zum Beispiel mit `hostname -I` ermitteln.

## API-Uebersicht

- `GET /api/monthly-km`
- `PUT /api/monthly-km/:month`
- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions/:id`
- `GET /api/stats?range=3|6|12`
- `GET /api/export/all`
- `GET /api/export/monthly-km`
- `GET /api/export/transactions`
- `POST /api/import/json`
- `POST /api/import/csv?tariff=mercedes-benz-public-charge`

## PWA-Hinweise

- `manifest.json` definiert App-Name, Farbe und Icons
- `sw.js` cached App-Shell und bereits geladene GET-Anfragen
- Nach dem ersten Laden ist die Oberflaeche offline weiterhin verfuegbar

## Import und Export

- Im Einstellungen-Menue lassen sich alle Daten als JSON herunterladen
- JSON-Import akzeptiert entweder einen Gesamtexport oder einzelne Datenbestaende
- CSV-Import ist aktuell fuer `Mercedes Benz Public Charge` vorbereitet
- Beim CSV-Import werden nur Datum, Energie, Preis pro kWh, Gebuehr und Gesamtkosten uebernommen
- Bereits vorhandene Ladevorgaenge werden beim CSV-Import ueber eine inhaltliche Signatur gegen Dubletten geprueft

## Ideen fuer spaetere Erweiterungen

- CSV-Export fuer Monats- und Ladedaten
- Bearbeiten einzelner Ladevorgaenge
- Import bestehender Abrechnungsdaten
- Separates Diagramm fuer monatliche Gesamtkosten
