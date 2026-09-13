// ============================================================
// security.js — Datei-Upload mit Virenscan
//
// Ablauf:
//  1. Datei wird lokal gehasht (SHA-256), nichts verlässt den Browser dabei.
//  2. Hash wird ans Backend geschickt, das bei VirusTotal nachschaut,
//     ob diese Datei (anhand des Hash) bereits bekannt/gescannt ist.
//  3. Falls unbekannt: Nutzer kann die Datei tatsächlich hochladen
//     lassen, damit sie bei VirusTotal neu analysiert wird.
//
// Braucht einen VIRUSTOTAL_API_KEY im Backend (.env) — siehe README.
// Ohne Key zeigt das Backend einen klaren Hinweis statt eines Fehlers.
// ============================================================

let N;
const BACKEND_URL = 'http://127.0.0.1:5000';

export function initSecurity(nexus) {
  N = nexus;
  const area = document.getElementById('securityArea');
  area.innerHTML = `
    <div class="card">
      <h3>Datei auf Viren prüfen</h3>
      <p class="muted">Besonders sinnvoll bei .exe, .zip, .dll oder anderen ausführbaren Dateien aus unklarer Quelle. Die Prüfung läuft über die VirusTotal-Datenbank (Kombination vieler Antiviren-Engines).</p>
      <input type="file" id="scanFileInput">
      <div class="result-box" id="scanStatus" style="margin-top:10px;">Wähle eine Datei aus.</div>
      <div id="scanActions" style="margin-top:10px;"></div>
    </div>
  `;

  const fileInput = area.querySelector('#scanFileInput');
  const status = area.querySelector('#scanStatus');
  const actions = area.querySelector('#scanActions');
  let currentFile = null;

  fileInput.addEventListener('change', async () => {
    currentFile = fileInput.files[0];
    actions.innerHTML = '';
    if (!currentFile) return;

    status.textContent = 'Berechne Hash …';
    const hash = await hashFile(currentFile);
    status.textContent = `Datei: ${currentFile.name}\nSHA-256: ${hash}\n\nFrage VirusTotal nach bekannten Ergebnissen …`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/scan/hash/${hash}`);
      const data = await res.json();

      if (res.status === 501) {
        status.textContent += `\n\n${data.error}\n${data.hint || ''}`;
        return;
      }
      if (res.status === 404) {
        status.textContent += '\n\nDiese Datei ist VirusTotal noch nicht bekannt.';
        actions.innerHTML = `<button class="btn btn-primary btn-sm" id="uploadScanBtn">Jetzt hochladen & neu scannen</button>`;
        actions.querySelector('#uploadScanBtn').addEventListener('click', () => uploadForScan(currentFile, status, actions));
        return;
      }
      if (!res.ok) {
        status.textContent += '\n\nFehler bei der Abfrage: ' + (data.error || res.statusText);
        return;
      }

      renderVerdict(data, status);
    } catch (e) {
      status.textContent += '\n\nBackend nicht erreichbar. Läuft "python app.py" im backend-Ordner?';
    }
  });

  N.registerSearchItems([
    { id: 'security', label: 'Datei-Sicherheitsprüfung', icon: 'shield-check', action: () => N.navigateTo('security') },
  ]);
}

async function uploadForScan(file, status, actions) {
  status.textContent = 'Lade Datei zur Analyse hoch … das kann 1-2 Minuten dauern.';
  actions.innerHTML = '';
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${BACKEND_URL}/api/scan/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { status.textContent = 'Fehler: ' + (data.error || res.statusText); return; }
    pollAnalysis(data.analysis_id, status);
  } catch (e) {
    status.textContent = 'Backend nicht erreichbar.';
  }
}

async function pollAnalysis(analysisId, status, attempt = 0) {
  if (attempt > 20) { status.textContent = 'Analyse dauert ungewöhnlich lange. Versuch es später erneut.'; return; }
  status.textContent = `Analyse läuft … (Versuch ${attempt + 1})`;
  try {
    const res = await fetch(`${BACKEND_URL}/api/scan/status/${analysisId}`);
    const data = await res.json();
    if (data.status === 'completed') {
      renderVerdict(data, status);
    } else {
      setTimeout(() => pollAnalysis(analysisId, status, attempt + 1), 6000);
    }
  } catch (e) {
    status.textContent = 'Backend nicht erreichbar während der Analyse.';
  }
}

function renderVerdict(data, status) {
  const malicious = data.malicious || 0;
  const suspicious = data.suspicious || 0;
  const harmless = data.harmless || 0;
  const verdict = malicious > 0
    ? `⚠️ ${malicious} Engine(s) stufen die Datei als schädlich ein.`
    : suspicious > 0
      ? `⚠️ ${suspicious} Engine(s) stufen die Datei als verdächtig ein.`
      : '✓ Keine Engine hat etwas Schädliches gefunden.';
  status.textContent = `${verdict}\n\nSchädlich: ${malicious} · Verdächtig: ${suspicious} · Unauffällig: ${harmless}`;
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
