# Ladeschweinle

<img src="public/assets/applogo_ladesau.png" alt="Ladeschweinle App-Logo" width="180" />

Dein persönliches Lade- und Fahrtenbuch fürs E‑Auto: **Ladeschweinle** ist eine schlanke Progressive Web App (PWA), die auf einem Raspberry Pi oder jedem kleinen Server laufen kann. Die App hilft dir, monatliche Kilometer, einzelne Ladevorgänge und Ladekosten sauber zu dokumentieren – ohne Cloud-Zwang und ohne Datenbank.

## Was macht die App genau?

Nach dem Scan des Repos lässt sich die App so zusammenfassen:

- **Erfasst Monatswerte** (`YYYY-MM`) mit gefahrenen Kilometern und optionalem Kilometerstand (Odometer).
- **Erfasst Ladevorgänge** mit Datum, kWh, Preis pro kWh und optionaler Zusatzgebühr.
- **Berechnet automatisch** die Gesamtkosten pro Ladevorgang (`kWh * Preis + Gebühr`).
- **Zeigt Auswertungen im Dashboard** als Diagramme für 3, 6 oder 12 Monate (Energie, Kilometer, Kosten, Kosten/100 km).
- **Bietet Filter und Bearbeitung** für gespeicherte Einträge (anlegen, aktualisieren, löschen).
- **Import/Export inklusive**:
  - JSON-Import und JSON-Export (komplett oder getrennt)
  - CSV-Import für **Mercedes Benz Public Charge**
  - CSV-Import für **Legacy Ladeschweinle Tarif** (inkl. Monatskilometer)
  - Dublettenprüfung bei importierten Ladevorgängen über eine Signatur.
- **Läuft als PWA** mit Manifest + Service Worker (offline-fähige App-Shell nach erstem Laden).
- **Speichert lokal in JSON-Dateien** unter `data/` statt in einer externen Datenbank.

Kurz gesagt: Du bekommst ein lokales, datensparsames Cockpit für EV-Ladekosten und Fahrleistung.

## Funktionen im Alltag

- Monatskilometer einfach nachtragen
- Lade-Sessions schnell erfassen oder korrigieren
- Entwicklungen über mehrere Monate auf einen Blick sehen
- Daten jederzeit sichern (Export) und wieder einspielen (Import)
- Auf dem Smartphone wie eine App installierbar

## Architektur

- `server.js`: Express-Server, statische Auslieferung, Form-POSTs, Import/Export-Routen
- `lib/storage.js`: Datenverzeichnis + JSON-Dateien erzeugen/lesen/schreiben
- `lib/validation.js`: Validierung und Normalisierung aller Eingaben
- `lib/stats.js`: Monatliche Aggregationen für Diagramme
- `lib/importers.js`: CSV-Importlogik und Dublettenfilter
- `public/`: Frontend (HTML/CSS/JS), Manifest, Service Worker, Icons
- `data/`: Persistente Daten (`monthly-km.json`, `transactions.json`)

---

## Schnellstart lokal

### Voraussetzungen

- Node.js 20 oder neuer

### Starten

```bash
npm install
npm start
```

Danach erreichst du die App unter `http://localhost:1337`.

## Docker

### Mit Docker

```bash
docker build -t ladeschweinle .
docker run -d -p 1337:1337 -v "$(pwd)/data:/app/data" --name ladeschweinle ladeschweinle
```

### Mit Docker Compose

```bash
docker compose up -d --build
```

---

## Mini-Tutorial: Hosting auf einem Raspberry Pi mit Docker Compose

Diese Anleitung ist für Raspberry Pi OS (Bookworm/Bullseye) gedacht.

### 1) Raspberry Pi vorbereiten

System aktualisieren:

```bash
sudo apt update && sudo apt upgrade -y
```

Docker + Compose Plugin installieren (über apt):

```bash
sudo apt install -y docker.io docker-compose-plugin git
```

Deinen Benutzer zur Docker-Gruppe hinzufügen:

```bash
sudo usermod -aG docker $USER
```

Dann **einmal ab- und wieder anmelden** (oder neu starten), damit die Gruppenänderung greift.

### 2) Projekt auf den Pi holen

```bash
git clone <DEIN-REPO-URL> ladeschweinle
cd ladeschweinle
mkdir -p data
```

### 3) App mit Compose starten

```bash
docker compose up -d --build
```

Status prüfen:

```bash
docker compose ps
docker compose logs --tail=100
```

### 4) Im Netzwerk öffnen

IP-Adresse des Pi herausfinden:

```bash
hostname -I
```

Dann im Browser öffnen:

```text
http://<PI-IP>:1337
```

Beispiel: `http://192.168.178.42:1337`

### 5) Datenpersistenz verstehen

Die Compose-Datei mountet `./data` nach `/app/data` im Container. Dadurch bleiben deine Daten bei Updates/Neustarts erhalten.

Wichtige Dateien:

- `data/monthly-km.json`
- `data/transactions.json`

### 6) Update-Workflow

```bash
cd /pfad/zu/ladeschweinle
git pull
docker compose up -d --build
```

Optional aufräumen:

```bash
docker image prune -f
```

### 7) Optional: Autostart nach Reboot

In der Compose-Datei ist `restart: unless-stopped` gesetzt. Damit startet der Container nach einem Pi-Neustart automatisch wieder.

---

## Import und Export

- Im Einstellungen-Menü lassen sich alle Daten als JSON herunterladen
- JSON-Import akzeptiert Gesamtexporte oder einzelne Datenbestände
- CSV-Import unterstützt aktuell:
  - `Mercedes Benz Public Charge`
  - `Legacy Ladeschweinle Tarif`
- Beim CSV-Import werden passende Felder normalisiert, ungültige Zeilen verworfen und Dubletten gefiltert

## PWA-Hinweise

- `manifest.json` definiert Name, Farben und Icons
- `sw.js` cached App-Shell und bereits geladene GET-Anfragen
- Nach dem ersten Laden bleibt die Oberfläche im Kern offline nutzbar

## Ideen für spätere Erweiterungen

- CSV-Export für Monats- und Ladedaten
- Feineres Bearbeiten einzelner Sessions (z. B. Ladepunkt, Notizen)
- Weitere Importprofile für andere Anbieter
- Zusatzdiagramme (z. B. Monatssumme Kosten, Preis/kWh-Trend)
