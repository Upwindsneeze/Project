// ============================================================
// media.js — Media Tools
//
// WICHTIG (siehe auch backend/app.py und README):
// Diese Sektion lädt keinerlei geschützte Inhalte herunter und
// umgeht keine DRM-, Bezahl- oder Zugriffsbeschränkungen.
// Für Quellen, bei denen der Nutzer die Rechte besitzt (z. B.
// eigene Uploads, gemeinfreie Inhalte, Inhalte mit ausdrücklicher
// Erlaubnis des Rechteinhabers), bräuchte eine echte Implementierung
// ein Backend mit einem Tool wie yt-dlp (nur für erlaubte Quellen
// konfiguriert) und ffmpeg für Format-/Qualitätskonvertierung.
// Bis das Backend existiert, ist die UI als "Coming Soon" markiert.
// ============================================================

let N;

export function initMedia(nexus) {
  N = nexus;
  const area = document.getElementById('mediaArea');
  area.innerHTML = `
    <div class="card">
      <div class="field-row" style="justify-content:space-between;">
        <h3 style="margin:0;">Audio/Video von URL</h3>
        <span class="badge">Coming Soon</span>
      </div>
      <p class="muted">Benötigt ein Backend mit einer Downloadkomponente (z. B. yt-dlp) und ffmpeg für Formatkonvertierung. Funktioniert nur für Inhalte, an denen du die nötigen Rechte hast — keine Umgehung von DRM oder Bezahlschranken.</p>
      <div class="field-row">
        <input type="text" id="mediaUrl" placeholder="https://…" disabled>
        <button class="btn btn-primary" disabled>Analysieren</button>
      </div>
      <div class="field-row">
        <label>Format</label>
        <select disabled>
          <option>MP3</option><option>WAV</option><option>M4A</option>
          <option>MP4</option><option>WebM</option>
        </select>
        <label>Qualität</label>
        <select disabled>
          <option>Niedrig</option><option>Mittel</option><option>Hoch</option><option>Original</option>
        </select>
      </div>
    </div>

    <div class="card">
      <h3>Lokale Audio-Metadaten</h3>
      <p class="muted">Funktioniert bereits: liest Metadaten aus einer lokal ausgewählten Datei, ohne Upload.</p>
      <input type="file" id="mediaFileInput" accept="audio/*,video/*">
      <div class="result-box" id="mediaFileOut" style="margin-top:10px;">Wähle eine Datei aus.</div>
    </div>
  `;

  const fileInput = area.querySelector('#mediaFileInput');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    el.src = URL.createObjectURL(file);
    el.addEventListener('loadedmetadata', () => {
      const out = area.querySelector('#mediaFileOut');
      const lines = [
        `Name: ${file.name}`,
        `Typ: ${file.type}`,
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
