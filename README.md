# Nexus — Digital Toolbox

Eine private All-in-One-Web-App für dich und deine Freunde: Game-Lookup, Alltags-Tools, URL-Tools, File-Tools, Notepad und mehr, in einem modernen Dark-Dashboard.

## Projektstruktur

```
project/
├── frontend/
│   ├── index.html          Haupt-HTML, Layout & alle Sektionen
│   ├── style.css            Design-System (Farben, Typografie, Komponenten)
│   ├── app.js                Kern: Navigation, Suche, Toasts, Modal, State
│   └── modules/
│       ├── tools.js          Calculator, Unit Converter, Text, Generatoren, JSON, Base64, Zeit
│       ├── games.js          Game-Lookup (Demo-Daten + API-Abstraktion)
│       ├── urls.js            URL Encode/Decode/Parser
│       ├── files.js           Lokale Dateiinfos & Hash-Generator
│       ├── notes.js           Notepad mit LocalStorage
│       ├── media.js           Media-Tools-UI (teilweise "Coming Soon")
│       └── settings.js        Theme, Akzentfarbe, Datenverwaltung
├── backend/
│   ├── app.py                 Flask-Grundgerüst mit Beispiel-Endpunkten
│   ├── requirements.txt
│   └── .env.example
└── .gitignore
```

## Starten

**Frontend (reicht für fast alles):**
Öffne `frontend/index.html` direkt im Browser, oder starte einen einfachen lokalen Server, z. B. mit der VS-Code-Erweiterung "Live Server". Ein Server ist nur nötig, weil `app.js` als ES-Modul (`type="module"`) eingebunden ist — manche Browser blockieren Module bei direktem `file://`-Zugriff.

**Backend (optional, nur für echte APIs/Media-Verarbeitung nötig):**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python app.py
```
Das Backend läuft dann auf `http://127.0.0.1:5000`.

## Was funktioniert bereits

- ✅ Dashboard mit Quick Actions und "Zuletzt verwendet"
- ✅ Calculator, Unit Converter, Text Tools, Generatoren (Passwort/UUID/Zufallszahl/Farbe), JSON-Tool, Base64
- ✅ Zeit-Tools: Stoppuhr, Countdown, Weltzeit
- ✅ URL Encode/Decode/Parser (rein clientseitig)
- ✅ File Tools: Dateiinfos & SHA-256-Hash, komplett lokal im Browser
- ✅ Notepad mit Suche, gespeichert in LocalStorage
- ✅ Einstellungen: Dark/Light-Theme, Akzentfarbe, Animationen an/aus, Daten zurücksetzen
- ✅ Command Palette (Strg/Cmd + K) über alle Bereiche hinweg
- ✅ Vollständig responsiv (Sidebar wird auf Mobilgeräten zum Menü)

## Neu in dieser Version

- 🔍 **Games:** Substring-Suche (kein ganzes Wort mehr nötig), 20 Demo-Spiele, Detail-Tabs (Übersicht/Guides/Community).
- 🧰 **Tools:** kategorisiert, plus Markdown-Preview, Farbpaletten-Generator, BMI-/Trinkgeld-Rechner.
- 🎬 **Media:** echte Format-/Qualitätskonvertierung für eigene Uploads und direkte Datei-Links (braucht laufendes Backend + installiertes ffmpeg).
- 🔗 **URL Tools:** Encode und Decode haben jetzt getrennte Ein-/Ausgabefelder (behebt die vorige Verwechslung).
- 📝 **Notepad:** optionale Erinnerung mit Datum/Zeit + Browser-Benachrichtigung (nur bei offenem Tab).
- 🛡️ **Neu: Sicherheit** — Datei-Upload mit Virenscan via VirusTotal, sinnvoll z. B. für `.exe`-Dateien aus unklarer Quelle.
- ⚙️ **Einstellungen:** zusätzlich Schriftgröße, Daten-Export/Import, Benachrichtigungs-Berechtigung, Tastenkürzel-Übersicht.

## Was noch konfiguriert werden muss

- ⏳ **Game-Lookup mit echten Daten:** Aktuell nur Demo-Datensatz (20 Spiele). Für echte Daten: API-Key einer Game-Datenbank (z. B. [RAWG.io](https://rawg.io/apidocs)) in `backend/.env` unter `GAME_API_KEY` eintragen und den Request in `get_game()` in `backend/app.py` ergänzen (Beispiel steht dort als Kommentar).
- ⏳ **Media-Konvertierung:** Braucht **ffmpeg** installiert auf dem Rechner, der das Backend ausführt (`brew install ffmpeg` / `sudo apt install ffmpeg` / [Windows-Download](https://ffmpeg.org/download.html) + zum PATH hinzufügen). Ohne ffmpeg gibt die Konvertierung eine klare Fehlermeldung zurück.
- ⏳ **Virenscan:** Braucht einen kostenlosen API-Key von [virustotal.com](https://www.virustotal.com/gui/join-us) in `backend/.env` unter `VIRUSTOTAL_API_KEY`. Der kostenlose Tier ist auf ca. 4 Anfragen/Minute und 32 MB pro Upload begrenzt.

## Bewusste Grenze bei Media

Es werden **keine** Inhalte von YouTube, Spotify, Instagram, TikTok, Netflix, Twitch & Co. heruntergeladen — das Backend blockt diese Hosts aktiv (Liste in `BLOCKED_HOST_KEYWORDS` in `backend/app.py`). Unterstützt werden ausschließlich (a) eigene Datei-Uploads und (b) direkte Datei-Links auf eine einzelne Mediendatei, bei denen der Nutzer die entsprechenden Rechte hat.

## Sicherheitshinweise

- API-Keys liegen ausschließlich in `backend/.env` (durch `.gitignore` von Git ausgeschlossen) — niemals im Frontend-Code.
- Das Backend validiert externe URLs gegen SSRF (keine Anfragen an `localhost`, private IP-Bereiche etc.).
- CORS ist auf die eigene Frontend-Origin beschränkt.
- Datei-Tools arbeiten rein lokal im Browser; es wird nichts hochgeladen.
- Ein Größenlimit (200 MB) verhindert, dass sehr große Dateien den Browser beim Hashing blockieren.

## Nächste sinnvolle Schritte

1. Eigenes Logo/Branding statt Platzhalter "N".
2. Echte Game-API anbinden (siehe oben).
3. Ein zweites Backend-Modul für Freunde-spezifische Features ergänzen, z. B. einen Werwolf-Rollen-Generator oder einen Spieleabend-Voting-Tool, wie besprochen.
4. Bei Bedarf: Mehrsprachigkeit über die Einstellungsseite (aktuell nur vorbereitet, nicht aktiv).
