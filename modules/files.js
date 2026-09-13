// ============================================================
// files.js — File Tools
// Alles läuft rein clientseitig via File API / SubtleCrypto.
// Dateien verlassen nie den Browser.
// ============================================================

let N;

export function initFiles(nexus) {
  N = nexus;
  const area = document.getElementById('filesArea');
  area.innerHTML = `
    <div class="card">
      <h3>Dateiinformationen & Hash</h3>
      <input type="file" id="fileInput">
      <div class="result-box" id="fileInfoOut" style="margin-top:10px;">Wähle eine Datei aus.</div>
    </div>
  `;

  const input = area.querySelector('#fileInput');
  const out = area.querySelector('#fileInfoOut');

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    const MAX_SIZE = 200 * 1024 * 1024; // 200 MB Client-seitiges Limit
    if (file.size > MAX_SIZE) {
      out.textContent = 'Datei zu groß für die Hash-Berechnung im Browser (Limit: 200 MB). Größe/Metadaten werden trotzdem angezeigt.';
    } else {
      out.textContent = 'Berechne…';
    }

    const lines = [
      `Name: ${file.name}`,
      `Typ: ${file.type || 'unbekannt'}`,
      `Größe: ${formatBytes(file.size)}`,
      `Zuletzt geändert: ${new Date(file.lastModified).toLocaleString('de-DE')}`,
    ];

    if (file.type.startsWith('image/')) {
      const dims = await getImageDimensions(file).catch(() => null);
      if (dims) lines.push(`Bildmaße: ${dims.width} × ${dims.height} px`);
    }

    if (file.size <= MAX_SIZE) {
      try {
        const hash = await hashFile(file);
        lines.push(`SHA-256: ${hash}`);
      } catch (e) {
        lines.push('Hash konnte nicht berechnet werden.');
      }
    }

    out.textContent = lines.join('\n');
  });

  N.registerSearchItems([
    { id: 'file-tools', label: 'File Tools', icon: 'file-cog', action: () => N.navigateTo('files') },
  ]);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = reject;
    img.src = url;
  });
}
