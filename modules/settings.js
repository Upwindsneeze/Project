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

export function initSettings(nexus) {
  N = nexus;
  const area = document.getElementById('settingsArea');
  const prefs = N.storage.get('prefs', { theme: 'dark', accent: 'indigo', animations: true });

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
      <h3>Animationen</h3>
      <div class="field-row">
        <span class="muted">Übergänge und Micro-Animationen</span>
        <div class="toggle ${prefs.animations ? 'is-on' : ''}" id="animToggle"></div>
      </div>
    </div>

    <div class="card">
      <h3>Daten</h3>
      <p class="muted">Alle Notizen, Einstellungen und der Verlauf werden nur lokal in deinem Browser gespeichert.</p>
      <button class="btn btn-sm btn-danger" id="resetData">Alle lokalen Daten löschen</button>
    </div>
  `;

  applyPrefs(prefs);

  area.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.theme = btn.dataset.theme;
      N.storage.set('prefs', prefs);
      applyPrefs(prefs);
      N.toast('Theme geändert', 'ok');
    });
  });

  area.querySelectorAll('[data-accent]').forEach(sw => {
    sw.addEventListener('click', () => {
      prefs.accent = sw.dataset.accent;
      N.storage.set('prefs', prefs);
      applyPrefs(prefs);
      area.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-active'));
      sw.classList.add('is-active');
    });
  });

  const animToggle = area.querySelector('#animToggle');
  animToggle.addEventListener('click', () => {
    prefs.animations = !prefs.animations;
    N.storage.set('prefs', prefs);
    applyPrefs(prefs);
    animToggle.classList.toggle('is-on', prefs.animations);
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

  N.registerSearchItems([
    { id: 'settings', label: 'Einstellungen', icon: 'settings', action: () => N.navigateTo('settings') },
  ]);
}

function applyPrefs(prefs) {
  document.documentElement.setAttribute('data-theme', prefs.theme);
  const c = ACCENTS[prefs.accent] || ACCENTS.indigo;
  document.documentElement.style.setProperty('--accent-a', c.a);
  document.documentElement.style.setProperty('--accent-b', c.b);
  document.body.style.setProperty('--transition-override', prefs.animations ? '' : '0ms');
  if (!prefs.animations) {
    document.documentElement.style.setProperty('--transition', '0ms');
  } else {
    document.documentElement.style.setProperty('--transition', '180ms cubic-bezier(.4,0,.2,1)');
  }
}
