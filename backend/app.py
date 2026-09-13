"""
Nexus Backend — Grundgerüst
============================
Dieses Backend ist absichtlich schlank gehalten. Es zeigt exemplarisch,
wie serverseitige Endpunkte für Nexus aussehen könnten, sobald echte
externe APIs (z. B. eine Game-Datenbank) eingebunden werden.

WICHTIG ZUR SICHERHEIT:
- API-Keys werden ausschließlich über Umgebungsvariablen geladen
  (siehe .env.example), niemals hart codiert oder ans Frontend
  ausgeliefert.
- Jede Route, die eine externe URL entgegennimmt, validiert diese
  gegen SSRF (Server-Side Request Forgery) — siehe validate_url().
- CORS ist bewusst eng konfiguriert (nur die eigene Frontend-Origin).

Starten:
    pip install -r requirements.txt
    cp .env.example .env      # und Werte eintragen
    python app.py
"""

import os
import ipaddress
import socket
from urllib.parse import urlparse

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Nur die eigene Frontend-Origin erlauben (in .env konfigurierbar)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5500")
CORS(app, origins=[FRONTEND_ORIGIN])

# Beispiel: Key für eine echte Game-API (z. B. RAWG). Bleibt serverseitig.
GAME_API_KEY = os.getenv("GAME_API_KEY", "")


# ------------------------------------------------------------------
# Hilfsfunktionen
# ------------------------------------------------------------------
def validate_url(raw_url: str) -> bool:
    """
    Einfacher SSRF-Schutz: nur http/https, kein Zugriff auf
    private/lokale Adressen (localhost, 127.0.0.1, 10.x, 192.168.x, ...).
    Für produktiven Einsatz sollte diese Prüfung durch eine
    ausführlichere Bibliothek ergänzt werden.
    """
    try:
        parsed = urlparse(raw_url)
        if parsed.scheme not in ("http", "https"):
            return False
        if not parsed.hostname:
            return False

        resolved_ip = socket.gethostbyname(parsed.hostname)
        ip = ipaddress.ip_address(resolved_ip)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False
        return True
    except Exception:
        return False


# ------------------------------------------------------------------
# Health-Check
# ------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------
# Beispiel: Game-Lookup-Proxy (Platzhalter)
# ------------------------------------------------------------------
@app.route("/api/games/<string:slug>", methods=["GET"])
def get_game(slug: str):
    """
    Platzhalter-Endpunkt. Sobald eine echte Game-API angebunden wird,
    ersetzt dieser Code den Demo-Response durch einen echten Request,
    z. B.:

        import requests
        res = requests.get(
            "https://api.rawg.io/api/games/" + slug,
            params={"key": GAME_API_KEY},
            timeout=5,
        )
        return jsonify(res.json()), res.status_code

    So bleibt der API-Key serverseitig und taucht nie im Frontend-Code auf.
    """
    if not GAME_API_KEY:
        return jsonify({
            "error": "Keine Game-API konfiguriert.",
            "hint": "Trage GAME_API_KEY in backend/.env ein, "
                    "um echte Daten statt Demo-Daten zu erhalten.",
        }), 501

    return jsonify({"error": "Noch nicht implementiert."}), 501


# ------------------------------------------------------------------
# Beispiel: URL-Validierung (für zukünftige Media-/URL-Tools)
# ------------------------------------------------------------------
@app.route("/api/url-info", methods=["POST"])
def url_info():
    data = request.get_json(silent=True) or {}
    raw_url = data.get("url", "")

    if not raw_url or not validate_url(raw_url):
        return jsonify({"error": "Ungültige oder nicht erlaubte URL."}), 400

    # Hier könnte z. B. ein HEAD-Request gemacht werden, um Content-Type
    # und Größe zu ermitteln — mit Timeout und Größenlimit gegen Missbrauch.
    return jsonify({"url": raw_url, "status": "gültig", "note": "Demo-Antwort."})


# ------------------------------------------------------------------
# Hinweis zu Media-Downloads
# ------------------------------------------------------------------
# Ein echter Media-Download-Endpunkt würde:
#   1. die URL gegen validate_url() prüfen,
#   2. nur gegen eine Allowlist erlaubter, rechtekonformer Quellen
#      auflösen (z. B. eigene Uploads oder Quellen mit ausdrücklicher
#      Erlaubnis) — niemals DRM oder Bezahlschranken umgehen,
#   3. den Download über ein Tool wie yt-dlp serverseitig ausführen,
#   4. bei Bedarf mit ffmpeg das Zielformat/die Qualität konvertieren,
#   5. Größen- und Zeitlimits durchsetzen (Rate Limiting),
#   6. die fertige Datei über eine zeitlich begrenzte, signierte URL
#      bereitstellen statt sie direkt im Response-Body zu inlinen.
#
# Das ist bewusst noch nicht implementiert (siehe Frontend: "Coming Soon"),
# bis eine konkrete, rechtlich geprüfte Quelle feststeht.


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="127.0.0.1", port=5000, debug=debug_mode)
