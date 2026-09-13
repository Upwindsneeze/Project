"""
Nexus Backend
=============
Erweitert um:
  - /api/convert         : hochgeladene Datei per ffmpeg umwandeln
  - /api/fetch-convert    : direkte Datei-URL herunterladen + umwandeln
  - /api/scan/hash/<hash> : VirusTotal-Lookup per Datei-Hash
  - /api/scan/upload       : Datei zur VirusTotal-Analyse hochladen
  - /api/scan/status/<id>  : Analyse-Ergebnis abfragen

WICHTIGE GRENZEN (bewusst so umgesetzt):
  - /api/fetch-convert lehnt bekannte Streaming-/Social-Plattformen
    (YouTube, Spotify, Instagram, TikTok, Netflix, ...) explizit ab.
    Es gibt keine Extraktionslogik für solche Seiten — das würde
    deren Nutzungsbedingungen umgehen und in aller Regel Urheberrecht
    verletzen. Unterstützt werden nur direkte Datei-Links.
  - ffmpeg wird ausschließlich mit einer festen, geprüften Argument-
    liste aufgerufen (kein shell=True, keine freie Nutzereingabe im
    Kommando) — das verhindert Command Injection.
  - Downloads werden während des Streamens auf eine Maximalgröße
    begrenzt (nicht nur anhand des Content-Length-Headers, der sich
    fälschen lässt).

Starten:
    pip install -r requirements.txt
    cp .env.example .env      # Werte eintragen
    # ffmpeg muss zusätzlich auf dem System installiert sein:
    #   Windows: https://ffmpeg.org/download.html (zum PATH hinzufügen)
    #   Mac: brew install ffmpeg
    #   Linux: sudo apt install ffmpeg
    python app.py
"""

import os
import ipaddress
import socket
import subprocess
import tempfile
import uuid
from urllib.parse import urlparse

import requests
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 300 * 1024 * 1024  # 300 MB harte Obergrenze pro Request

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5500")
CORS(app, origins=[FRONTEND_ORIGIN])

GAME_API_KEY = os.getenv("GAME_API_KEY", "")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")

# ------------------------------------------------------------------
# Konfiguration: erlaubte Formate & Qualitätsstufen für ffmpeg
# ------------------------------------------------------------------
AUDIO_FORMATS = {"mp3", "wav", "m4a"}
VIDEO_FORMATS = {"mp4", "webm"}
ALL_FORMATS = AUDIO_FORMATS | VIDEO_FORMATS

AUDIO_BITRATES = {"niedrig": "96k", "mittel": "160k", "hoch": "256k", "original": "320k"}
VIDEO_CRF = {"niedrig": "32", "mittel": "26", "hoch": "20", "original": "18"}

MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024  # 200 MB für /api/fetch-convert

# Bekannte Streaming-/Social-Plattformen — hier NIEMALS Downloads erlauben,
# auch nicht wenn eine URL "direkt" aussieht (z. B. CDN-Segmente).
BLOCKED_HOST_KEYWORDS = [
    "youtube.com", "youtu.be", "spotify.com", "tiktok.com", "instagram.com",
    "facebook.com", "twitter.com", "x.com", "netflix.com", "twitch.tv",
    "soundcloud.com", "vimeo.com", "primevideo.com", "disneyplus.com",
    "hulu.com", "deezer.com", "tidal.com",
]


# ------------------------------------------------------------------
# Sicherheits-Hilfsfunktionen
# ------------------------------------------------------------------
def validate_url(raw_url: str) -> tuple[bool, str]:
    """SSRF- und Plattform-Schutz. Gibt (ok, fehlermeldung) zurück."""
    try:
        parsed = urlparse(raw_url)
        if parsed.scheme not in ("http", "https"):
            return False, "Nur http/https-URLs erlaubt."
        if not parsed.hostname:
            return False, "Ungültige URL."

        host = parsed.hostname.lower()
        if any(blocked in host for blocked in BLOCKED_HOST_KEYWORDS):
            return False, (
                "Diese Plattform wird bewusst nicht unterstützt — ein Download "
                "dort würde die Nutzungsbedingungen und meist auch Urheberrecht "
                "verletzen. Unterstützt werden nur direkte Datei-Links."
            )

        resolved_ip = socket.gethostbyname(host)
        ip = ipaddress.ip_address(resolved_ip)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False, "Zugriff auf lokale/private Adressen ist nicht erlaubt."

        return True, ""
    except Exception as e:
        return False, f"URL konnte nicht geprüft werden: {e}"


def run_ffmpeg(input_path: str, output_path: str, target_format: str, quality: str) -> None:
    """
    Ruft ffmpeg mit einer festen, validierten Argumentliste auf.
    target_format und quality kommen NIE ungeprüft vom Client in den
    Kommandozeilenaufruf — sie werden vorher gegen Allowlists geprüft
    (siehe Aufrufer) und hier nur noch in feste Parameter übersetzt.
    """
    cmd = ["ffmpeg", "-y", "-i", input_path]

    if target_format in AUDIO_FORMATS:
        bitrate = AUDIO_BITRATES.get(quality, "160k")
        cmd += ["-vn", "-b:a", bitrate]
    else:  # Video
        crf = VIDEO_CRF.get(quality, "26")
        codec = "libvpx-vp9" if target_format == "webm" else "libx264"
        cmd += ["-c:v", codec, "-crf", crf, "-preset", "fast", "-c:a", "aac"]

    cmd.append(output_path)

    result = subprocess.run(cmd, capture_output=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg-Fehler: {result.stderr.decode(errors='ignore')[-500:]}")


def download_with_limit(url: str, dest_path: str, max_bytes: int) -> None:
    """Lädt eine URL herunter und bricht ab, sobald das Größenlimit
    überschritten wird — unabhängig davon, was der Content-Length-Header
    behauptet (der lässt sich fälschen)."""
    with requests.get(url, stream=True, timeout=30) as r:
        r.raise_for_status()
        content_type = r.headers.get("Content-Type", "")
        if not (content_type.startswith("audio/") or content_type.startswith("video/")
                or content_type == "application/octet-stream"):
            raise ValueError(f"Kein erkennbarer Medien-Content-Type ({content_type}).")

        written = 0
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 256):
                written += len(chunk)
                if written > max_bytes:
                    raise ValueError("Datei überschreitet das Größenlimit (200 MB).")
                f.write(chunk)


# ------------------------------------------------------------------
# Health-Check
# ------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------
# Game-Lookup-Proxy (Platzhalter, siehe games.js für Details)
# ------------------------------------------------------------------
@app.route("/api/games/<string:slug>", methods=["GET"])
def get_game(slug: str):
    if not GAME_API_KEY:
        return jsonify({
            "error": "Keine Game-API konfiguriert.",
            "hint": "Trage GAME_API_KEY in backend/.env ein.",
        }), 501
    return jsonify({"error": "Noch nicht implementiert."}), 501


# ------------------------------------------------------------------
# Media: Datei-Upload konvertieren
# ------------------------------------------------------------------
@app.route("/api/convert", methods=["POST"])
def convert_upload():
    if "file" not in request.files:
        return jsonify({"error": "Keine Datei mitgeschickt."}), 400

    file = request.files["file"]
    target_format = request.form.get("target_format", "")
    quality = request.form.get("quality", "mittel")

    if target_format not in ALL_FORMATS:
        return jsonify({"error": f"Ungültiges Zielformat. Erlaubt: {sorted(ALL_FORMATS)}"}), 400

    filename = secure_filename(file.filename or "upload")
    with tempfile.TemporaryDirectory() as tmp:
        input_path = os.path.join(tmp, filename)
        output_path = os.path.join(tmp, f"output.{target_format}")
        file.save(input_path)

        try:
            run_ffmpeg(input_path, output_path, target_format, quality)
        except FileNotFoundError:
            return jsonify({"error": "ffmpeg ist nicht installiert oder nicht im PATH."}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return send_file(output_path, as_attachment=True, download_name=f"konvertiert.{target_format}")


# ------------------------------------------------------------------
# Media: direkte Datei-URL abrufen + konvertieren
# ------------------------------------------------------------------
@app.route("/api/fetch-convert", methods=["POST"])
def fetch_convert():
    data = request.get_json(silent=True) or {}
    url = data.get("url", "")
    target_format = data.get("target_format", "")
    quality = data.get("quality", "mittel")

    if target_format not in ALL_FORMATS:
        return jsonify({"error": f"Ungültiges Zielformat. Erlaubt: {sorted(ALL_FORMATS)}"}), 400

    ok, msg = validate_url(url)
    if not ok:
        return jsonify({"error": msg}), 400

    with tempfile.TemporaryDirectory() as tmp:
        input_path = os.path.join(tmp, "input_media")
        output_path = os.path.join(tmp, f"output.{target_format}")

        try:
            download_with_limit(url, input_path, MAX_DOWNLOAD_BYTES)
        except Exception as e:
            return jsonify({"error": f"Download fehlgeschlagen: {e}"}), 400

        try:
            run_ffmpeg(input_path, output_path, target_format, quality)
        except FileNotFoundError:
            return jsonify({"error": "ffmpeg ist nicht installiert oder nicht im PATH."}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return send_file(output_path, as_attachment=True, download_name=f"konvertiert.{target_format}")


# ------------------------------------------------------------------
# Sicherheit: Virenscan via VirusTotal
# ------------------------------------------------------------------
VT_BASE = "https://www.virustotal.com/api/v3"


def vt_headers():
    return {"x-apikey": VIRUSTOTAL_API_KEY}


@app.route("/api/scan/hash/<string:file_hash>", methods=["GET"])
def scan_by_hash(file_hash: str):
    if not VIRUSTOTAL_API_KEY:
        return jsonify({
            "error": "Kein VirusTotal-API-Key konfiguriert.",
            "hint": "Kostenlosen Key auf virustotal.com erstellen und als "
                    "VIRUSTOTAL_API_KEY in backend/.env eintragen.",
        }), 501

    res = requests.get(f"{VT_BASE}/files/{file_hash}", headers=vt_headers(), timeout=15)
    if res.status_code == 404:
        return jsonify({"error": "Unbekannt bei VirusTotal."}), 404
    if not res.ok:
        return jsonify({"error": f"VirusTotal-Fehler: {res.status_code}"}), 502

    stats = res.json()["data"]["attributes"]["last_analysis_stats"]
    return jsonify({
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
        "status": "completed",
    })


@app.route("/api/scan/upload", methods=["POST"])
def scan_upload():
    if not VIRUSTOTAL_API_KEY:
        return jsonify({"error": "Kein VirusTotal-API-Key konfiguriert."}), 501
    if "file" not in request.files:
        return jsonify({"error": "Keine Datei mitgeschickt."}), 400

    file = request.files["file"]
    # VirusTotal-Limit für Standard-Upload-Endpunkt: 32 MB (kostenloser Tier)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > 32 * 1024 * 1024:
        return jsonify({"error": "Datei zu groß für den kostenlosen VirusTotal-Upload (Limit 32 MB)."}), 400

    res = requests.post(
        f"{VT_BASE}/files",
        headers=vt_headers(),
        files={"file": (secure_filename(file.filename or "upload"), file.stream)},
        timeout=60,
    )
    if not res.ok:
        return jsonify({"error": f"VirusTotal-Fehler: {res.status_code}"}), 502

    analysis_id = res.json()["data"]["id"]
    return jsonify({"analysis_id": analysis_id})


@app.route("/api/scan/status/<string:analysis_id>", methods=["GET"])
def scan_status(analysis_id: str):
    if not VIRUSTOTAL_API_KEY:
        return jsonify({"error": "Kein VirusTotal-API-Key konfiguriert."}), 501

    res = requests.get(f"{VT_BASE}/analyses/{analysis_id}", headers=vt_headers(), timeout=15)
    if not res.ok:
        return jsonify({"error": f"VirusTotal-Fehler: {res.status_code}"}), 502

    attributes = res.json()["data"]["attributes"]
    if attributes["status"] != "completed":
        return jsonify({"status": "pending"})

    stats = attributes["stats"]
    return jsonify({
        "status": "completed",
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
    })


# ------------------------------------------------------------------
# URL-Validierung (Hilfsendpunkt, z. B. fürs Frontend nutzbar)
# ------------------------------------------------------------------
@app.route("/api/url-info", methods=["POST"])
def url_info():
    data = request.get_json(silent=True) or {}
    raw_url = data.get("url", "")
    ok, msg = validate_url(raw_url)
    if not ok:
        return jsonify({"error": msg}), 400
    return jsonify({"url": raw_url, "status": "gültig"})


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="127.0.0.1", port=5000, debug=debug_mode)
