// ============================================================
// settings.js — Einstellungen
// ============================================================

let N;

const ACCENTS = {
  indigo: { a: '#6d5ef7', b: '#22d3ee' },
  emerald: { a: '#10b981', b: '#a3e635' },
  rose: { a: '#f43f5e', b: '#fb923c' },
  amber: { a: '#f59e0b', b: '#facc15' },
};
const FONT_SIZES = { small: '14px', medium: '16px', large: '18px' };

export function initSettings(nexus) {
  N = nexus;
  const area = document.getElementById('settingsArea');
  const prefs = N.storage.get('prefs', { theme: 'dark', accent: 'indigo', animations: true, fontSize: 'medium' });

  area.innerHTML = `
    <div class="card">
      <h3>Theme</h3>
      <div class="field-row">
        <button class="btn btn-sm" data-theme="dark">Dunkel</button>
        <button class="btn btn-sm" data-theme="light">Hell</button>
      </div>
    </div>

    <div class="card">
      <h3>Akzentfarbe</h3>
      <div class="swatch-row" id="accentSwatches">
        ${Object.entries(ACCENTS).map(([key, c]) => `
          <div class="swatch ${key === prefs.accent ? 'is-active' : ''}" data-accent="${key}"
               style="background:linear-gradient(135deg, ${c.a}, ${c.b});"></div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <h3>Schriftgröße</h3>
      <div class="field-row">
        <button class="btn btn-sm" data-fontsize="small">Klein</button>
        <button class="btn btn-sm" data-fontsize="medium">Mittel</button>
        <button class="btn btn-sm" data-fontsize="large">Groß</button>
      </div>
    </div>

    <div class="card">
      <h3>Animationen</h3>
      <div class="field-row">
        <span class="muted">Übergänge und Micro-Animationen</span>
        <div class="toggle ${prefs.animations ? 'is-on' : ''}" id="animToggle"></div>
      </div>
    </div>

    <div class="card">
      <h3>Benachrichtigungen</h3>
      <p class="muted">Für Notepad-Erinnerungen als echte Browser-Benachrichtigung statt nur Toast.</p>
      <button class="btn btn-sm" id="notifPermBtn">Berechtigung anfragen</button>
      <span class="muted" id="notifStatus" style="margin-left:10px;"></span>
    </div>

    <div class="card">
      <h3>Daten</h3>
      <p class="muted">Alle Notizen, Einstellungen und der Verlauf werden nur lokal in deinem Browser gespeichert.</p>
      <div class="field-row">
        <button class="btn btn-sm" id="exportData">Exportieren</button>
        <button class="btn btn-sm" id="importDataBtn">Importieren</button>
        <input type="file" id="importDataFile" accept="application/json" style="display:none;">
      </div>
      <button class="btn btn-sm btn-danger" style="margin-top:10px;" id="resetData">Alle lokalen Daten löschen</button>
    </div>

    <div class="card">
      <h3>Tastenkürzel</h3>
      <button class="btn btn-sm" id="shortcutsBtn">Übersicht anzeigen</button>
    </div>
  `;

  applyPrefs(prefs);
  updateNotifStatus();

  area.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => {
    prefs.theme = btn.dataset.theme; N.storage.set('prefs', prefs); applyPrefs(prefs); N.toast('Theme geändert', 'ok');
  }));

  area.querySelectorAll('[data-accent]').forEach(sw => sw.addEventListener('click', () => {
    prefs.accent = sw.dataset.accent; N.storage.set('prefs', prefs); applyPrefs(prefs);
    area.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-active'));
    sw.classList.add('is-active');
  }));

  area.querySelectorAll('[data-fontsize]').forEach(btn => btn.addEventListener('click', () => {
    prefs.fontSize = btn.dataset.fontsize; N.storage.set('prefs', prefs); applyPrefs(prefs);
  }));

  const animToggle = area.querySelector('#animToggle');
  animToggle.addEventListener('click', () => {
    prefs.animations = !prefs.animations; N.storage.set('prefs', prefs); applyPrefs(prefs);
    animToggle.classList.toggle('is-on', prefs.animations);
  });

  area.querySelector('#notifPermBtn').addEventListener('click', async () => {
    if (typeof Notification === 'undefined') { N.toast('Dein Browser unterstützt keine Benachrichtigungen.', 'error'); return; }
    await Notification.requestPermission();
    updateNotifStatus();
  });

  area.querySelector('#exportData').addEventListener('click', () => {
    const all = {};
    Object.keys(localStorage).filter(k => k.startsWith('nexus:')).forEach(k => { all[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nexus-backup.json'; a.click();
    N.toast('Daten exportiert', 'ok');
  });

  area.querySelector('#importDataBtn').addEventListener('click', () => area.querySelector('#importDataFile').click());
  area.querySelector('#importDataFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      Object.entries(data).forEach(([k, v]) => { if (k.startsWith('nexus:')) localStorage.setItem(k, v); });
      N.toast('Daten importiert — Seite wird neu geladen', 'ok');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      N.toast('Import fehlgeschlagen: ungültige Datei', 'error');
    }
  });

  area.querySelector('#resetData').addEventListener('click', () => {
    N.openModal('Wirklich alle Daten löschen?', `
      <p>Das entfernt alle Notizen, Einstellungen und deinen Verlauf unwiderruflich aus diesem Browser.</p>
      <div class="field-row" style="margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-sm" id="cancelReset">Abbrechen</button>
        <button class="btn btn-sm btn-danger" id="confirmReset">Endgültig löschen</button>
      </div>
    `);
    document.getElementById('cancelReset').addEventListener('click', N.closeModal);
    document.getElementById('confirmReset').addEventListener('click', () => {
      Object.keys(localStorage).filter(k => k.startsWith('nexus:')).forEach(k => localStorage.removeItem(k));
      N.closeModal();
      N.toast('Alle lokalen Daten gelöscht', 'info');
      setTimeout(() => location.reload(), 800);
    });
  });

  area.querySelector('#shortcutsBtn').addEventListener('click', () => {
    N.openModal('Tastenkürzel', `
      <ul style="margin:0;padding-left:18px;line-height:2;">
        <li><kbd>Strg</kbd> + <kbd>K</kbd> — Command Palette öffnen</li>
        <li><kbd>↑</kbd> / <kbd>↓</kbd> — in der Palette navigieren</li>
        <li><kbd>Enter</kbd> — Auswahl bestätigen</li>
        <li><kbd>Esc</kbd> — Palette oder Modal schließen</li>
      </ul>
    `);
  });

  N.registerSearchItems([
    { id: 'settings', label: 'Einstellungen', icon: 'settings', action: () => N.navigateTo('settings') },
  ]);
}

function updateNotifStatus() {
  const el = document.getElementById('notifStatus');
  if (!el) return;
  if (typeof Notification === 'undefined') { el.textContent = 'Nicht unterstützt'; return; }
  const map = { granted: 'Erlaubt ✓', denied: 'Blockiert ✗', default: 'Noch nicht angefragt' };
  el.textContent = map[Notification.permission] || '';
}

function applyPrefs(prefs) {
  document.documentElement.setAttribute('data-theme', prefs.theme);
  const c = ACCENTS[prefs.accent] || ACCENTS.indigo;
  document.documentElement.style.setProperty('--accent-a', c.a);
  document.documentElement.style.setProperty('--accent-b', c.b);
  document.documentElement.style.fontSize = FONT_SIZES[prefs.fontSize] || FONT_SIZES.medium;
  document.documentElement.style.setProperty('--transition', prefs.animations ? '180ms cubic-bezier(.4,0,.2,1)' : '0ms');
}
