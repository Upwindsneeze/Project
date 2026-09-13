// ============================================================
// media.js — Media Tools
//
// GRENZEN (bewusst so umgesetzt):
// Diese Sektion lädt NICHTS von Streaming-/Social-Plattformen wie
// YouTube, Spotify, Instagram, TikTok, Netflix etc. herunter — das
// würde deren Nutzungsbedingungen umgehen und in den allermeisten
// Fällen Urheberrecht verletzen, unabhängig von der Absicht.
//
// Was HIER funktioniert (sobald das Backend läuft, siehe README):
//  1. Eigene Datei hochladen → Format/Qualität ändern (via ffmpeg)
//  2. Direkter Datei-Link (z. B. https://dein-server.de/clip.mp4)
//     → wird geprüft, heruntergeladen und konvertiert
// Für (2) blockt das Backend bekannte Streaming-Plattformen aktiv.
// ============================================================

let N;
const BACKEND_URL = 'http://127.0.0.1:5000';

const AUDIO_FORMATS = ['mp3', 'wav', 'm4a'];
const VIDEO_FORMATS = ['mp4', 'webm'];
const QUALITIES = ['niedrig', 'mittel', 'hoch', 'original'];

export function initMedia(nexus) {
  N = nexus;
  const area = document.getElementById('mediaArea');
  area.innerHTML = `
    <div class="card">
      <div class="field-row" style="justify-content:space-between;">
        <h3 style="margin:0;">Eigene Datei konvertieren</h3>
      </div>
      <p class="muted">Lade eine eigene Audio-/Videodatei hoch und wandle sie in ein anderes Format oder eine andere Qualität um. Läuft über das lokale Backend (ffmpeg).</p>
      <input type="file" id="uploadFile" accept="audio/*,video/*">
      ${renderFormatControls('upload')}
      <button class="btn btn-primary" id="uploadConvertBtn" style="margin-top:10px;">Konvertieren</button>
      <div class="result-box" id="uploadStatus">Noch keine Datei ausgewählt.</div>
    </div>

    <div class="card">
      <div class="field-row" style="justify-content:space-between;">
        <h3 style="margin:0;">Direkter Datei-Link</h3>
      </div>
      <p class="muted">Funktioniert für direkte Links auf eine einzelne Mediendatei (z. B. „…/video.mp4"). <strong>Nicht</strong> für YouTube, Spotify, Instagram, TikTok & Co. — das Backend blockt solche Hosts aktiv, weil ein Download dort deren Nutzungsbedingungen und meist Urheberrecht verletzen würde.</p>
      <input type="text" id="urlMediaInput" placeholder="https://deinserver.de/clip.mp4">
      ${renderFormatControls('url')}
      <button class="btn btn-primary" id="urlConvertBtn" style="margin-top:10px;">Abrufen & konvertieren</button>
      <div class="result-box" id="urlStatus">Noch keine URL geprüft.</div>
    </div>

    <div class="card">
      <h3>Lokale Metadaten-Vorschau</h3>
      <p class="muted">Liest Dauer/Auflösung direkt im Browser aus, ohne Upload.</p>
      <input type="file" id="mediaFileInput" accept="audio/*,video/*">
      <div class="result-box" id="mediaFileOut" style="margin-top:10px;">Wähle eine Datei aus.</div>
    </div>
  `;

  initFormatControlLogic(area, 'upload');
  initFormatControlLogic(area, 'url');

  // ---- Upload-Konvertierung ----
  area.querySelector('#uploadConvertBtn').addEventListener('click', async () => {
    const fileInput = area.querySelector('#uploadFile');
    const status = area.querySelector('#uploadStatus');
    const file = fileInput.files[0];
    if (!file) { status.textContent = 'Bitte zuerst eine Datei auswählen.'; return; }

    const format = area.querySelector('#upload-format').value;
    const quality = area.querySelector('#upload-quality').value;

    status.textContent = 'Lade hoch und konvertiere … das kann je nach Dateigröße etwas dauern.';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_format', format);
    formData.append('quality', quality);

    try {
      const res = await fetch(`${BACKEND_URL}/api/convert`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        status.textContent = 'Fehler: ' + (err.error || res.statusText);
        return;
      }
      const blob = await res.blob();
      offerDownload(blob, `konvertiert.${format}`, status);
    } catch (e) {
      status.textContent = 'Backend nicht erreichbar. Läuft "python app.py" im backend-Ordner? (siehe README)';
    }
  });

  // ---- URL-Konvertierung ----
  area.querySelector('#urlConvertBtn').addEventListener('click', async () => {
    const url = area.querySelector('#urlMediaInput').value.trim();
    const status = area.querySelector('#urlStatus');
    if (!url) { status.textContent = 'Bitte eine URL eingeben.'; return; }

    const format = area.querySelector('#url-format').value;
    const quality = area.querySelector('#url-quality').value;

    status.textContent = 'Prüfe und lade herunter … das kann etwas dauern.';
    try {
      const res = await fetch(`${BACKEND_URL}/api/fetch-convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, target_format: format, quality }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        status.textContent = 'Abgelehnt: ' + (err.error || res.statusText);
        return;
      }
      const blob = await res.blob();
      offerDownload(blob, `konvertiert.${format}`, status);
    } catch (e) {
      status.textContent = 'Backend nicht erreichbar. Läuft "python app.py" im backend-Ordner? (siehe README)';
    }
  });

  // ---- Lokale Metadaten (bereits vorher funktionierend) ----
  const fileInput = area.querySelector('#mediaFileInput');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    el.src = URL.createObjectURL(file);
    el.addEventListener('loadedmetadata', () => {
      const out = area.querySelector('#mediaFileOut');
      const lines = [
        `Name: ${file.name}`, `Typ: ${file.type}`,
        `Größe: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        `Dauer: ${el.duration.toFixed(1)} s`,
      ];
      if (el.videoWidth) lines.push(`Auflösung: ${el.videoWidth}×${el.videoHeight}`);
      out.textContent = lines.join('\n');
    });
  });

  N.registerSearchItems([
    { id: 'media-tools', label: 'Media Tools', icon: 'film', action: () => N.navigateTo('media') },
  ]);
}

function renderFormatControls(prefix) {
  return `
    <div class="field-row" style="margin-top:10px;">
      <label>Zielformat</label>
      <select id="${prefix}-format">
        <optgroup label="Audio">
          ${AUDIO_FORMATS.map(f => `<option value="${f}">${f.toUpperCase()}</option>`).join('')}
        </optgroup>
        <optgroup label="Video">
          ${VIDEO_FORMATS.map(f => `<option value="${f}">${f.toUpperCase()}</option>`).join('')}
        </optgroup>
      </select>
      <label>Qualität</label>
      <select id="${prefix}-quality">
        ${QUALITIES.map(q => `<option value="${q}">${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}
      </select>
    </div>
  `;
}
function initFormatControlLogic() { /* aktuell keine dynamische Logik nötig, Platzhalter für spätere Validierung */ }

function offerDownload(blob, filename, statusEl) {
  const url = URL.createObjectURL(blob);
  statusEl.innerHTML = '';
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.className = 'btn btn-primary btn-sm';
  link.textContent = 'Datei herunterladen';
  link.style.display = 'inline-flex';
  statusEl.appendChild(link);
  N.toast('Konvertierung abgeschlossen', 'ok');
}
