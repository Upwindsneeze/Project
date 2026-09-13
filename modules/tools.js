// ============================================================
// tools.js — Digitaler Werkzeugkasten
// Jedes Tool ist { id, label, icon, desc, render(container) }
// render() baut die Bedienoberfläche in den Workspace-Container.
// ============================================================

let N; // Nexus reference

const TOOLS = [
  { id: 'calculator', label: 'Calculator', icon: 'calculator', desc: 'Grundrechenarten & Prozent', render: renderCalculator },
  { id: 'unit-converter', label: 'Unit Converter', icon: 'arrow-left-right', desc: 'Länge, Gewicht, Temperatur…', render: renderUnitConverter },
  { id: 'text-tools', label: 'Text Tools', icon: 'type', desc: 'Zählen, formatieren, sortieren', render: renderTextTools },
  { id: 'random-generator', label: 'Generators', icon: 'dices', desc: 'Passwort, UUID, Farbe, Zahl', render: renderGenerators },
  { id: 'time-tools', label: 'Zeit', icon: 'timer', desc: 'Countdown, Stoppuhr, Weltzeit', render: renderTimeTools },
  { id: 'json-tool', label: 'JSON Tool', icon: 'braces', desc: 'Pretty-print & validieren', render: renderJsonTool },
  { id: 'base64', label: 'Base64', icon: 'binary', desc: 'Encode / Decode', render: renderBase64 },
];

export function initTools(nexus) {
  N = nexus;
  const grid = document.getElementById('toolGrid');
  grid.innerHTML = TOOLS.map(t => `
    <button class="tool-card" data-tool="${t.id}">
      <i class="icon" data-icon="${t.icon}"></i>
      <div class="tool-card-text"><strong>${t.label}</strong><span>${t.desc}</span></div>
    </button>
  `).join('');

  grid.querySelectorAll('.tool-card').forEach(btn => {
    btn.addEventListener('click', () => openTool(btn.dataset.tool));
  });

  // Quick-action cards on the dashboard use data-tool too
  document.querySelectorAll('.quick-card[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      N.navigateTo('tools');
      openTool(btn.dataset.tool);
    });
  });

  document.addEventListener('nexus:open-tool', e => {
    const tool = TOOLS.find(t => t.id === e.detail);
    if (tool) { N.navigateTo('tools'); openTool(tool.id); }
  });

  N.registerSearchItems(TOOLS.map(t => ({
    id: 'tool-' + t.id,
    label: t.label + ' (Tool)',
    icon: t.icon,
    action: () => { N.navigateTo('tools'); openTool(t.id); },
  })));

  document.dispatchEvent(new CustomEvent('nexus:icons-changed'));
}

function openTool(id) {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;
  const workspace = document.getElementById('toolWorkspace');
  workspace.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h3>${tool.label}</h3><div class="tool-body"></div>`;
  workspace.appendChild(card);
  tool.render(card.querySelector('.tool-body'));
  N.trackRecent({ id: tool.id, label: tool.label, icon: tool.icon, view: 'tools' });
  workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.dispatchEvent(new CustomEvent('nexus:icons-changed'));
}

// ------------------------------------------------------------
// Calculator
// ------------------------------------------------------------
function renderCalculator(el) {
  el.innerHTML = `
    <div class="field-row">
      <input type="number" id="calcA" placeholder="Zahl A">
      <select id="calcOp">
        <option value="+">+</option>
        <option value="-">−</option>
        <option value="*">×</option>
        <option value="/">÷</option>
        <option value="%">Prozent von</option>
      </select>
      <input type="number" id="calcB" placeholder="Zahl B">
      <button class="btn btn-primary" id="calcRun">Berechnen</button>
    </div>
    <div class="result-box" id="calcResult">Ergebnis erscheint hier.</div>
  `;
  el.querySelector('#calcRun').addEventListener('click', () => {
    const a = parseFloat(el.querySelector('#calcA').value);
    const b = parseFloat(el.querySelector('#calcB').value);
    const op = el.querySelector('#calcOp').value;
    const out = el.querySelector('#calcResult');
    if (Number.isNaN(a) || Number.isNaN(b)) {
      out.textContent = 'Bitte beide Zahlen ausfüllen.';
      return;
    }
    let result;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b === 0 ? 'Division durch 0 ist nicht möglich.' : a / b; break;
      case '%': result = `${(a / 100) * b} (${a}% von ${b})`; break;
    }
    out.textContent = String(result);
  });
}

// ------------------------------------------------------------
// Unit Converter
// ------------------------------------------------------------
const UNIT_GROUPS = {
  length: { label: 'Länge', base: 'm', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.34 } },
  weight: { label: 'Gewicht', base: 'kg', units: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, lb: 0.453592, oz: 0.0283495 } },
  speed: { label: 'Geschwindigkeit', base: 'm/s', units: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knots: 0.514444 } },
  data: { label: 'Datenmenge', base: 'MB', units: { KB: 0.000977, MB: 1, GB: 1024, TB: 1048576 } },
  time: { label: 'Zeit', base: 's', units: { s: 1, min: 60, h: 3600, day: 86400 } },
};

function renderUnitConverter(el) {
  el.innerHTML = `
    <div class="field-row">
      <label>Kategorie</label>
      <select id="ucGroup">
        ${Object.entries(UNIT_GROUPS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('')}
      </select>
    </div>
    <div class="field-row">
      <input type="number" id="ucValue" placeholder="Wert" value="1">
      <select id="ucFrom"></select>
      <span>→</span>
      <select id="ucTo"></select>
    </div>
    <div class="result-box" id="ucResult">Ergebnis erscheint hier.</div>
  `;
  const groupSel = el.querySelector('#ucGroup');
  const fromSel = el.querySelector('#ucFrom');
  const toSel = el.querySelector('#ucTo');

  function populateUnits() {
    const g = UNIT_GROUPS[groupSel.value];
    const opts = Object.keys(g.units).map(u => `<option value="${u}">${u}</option>`).join('');
    fromSel.innerHTML = opts;
    toSel.innerHTML = opts;
    toSel.selectedIndex = 1 % Object.keys(g.units).length;
    convert();
  }
  function convert() {
    const g = UNIT_GROUPS[groupSel.value];
    const val = parseFloat(el.querySelector('#ucValue').value);
    const out = el.querySelector('#ucResult');
    if (Number.isNaN(val)) { out.textContent = 'Bitte einen Wert eingeben.'; return; }
    if (groupSel.value === 'temperature') return; // handled separately if added
    const baseVal = val * g.units[fromSel.value];
    const result = baseVal / g.units[toSel.value];
    out.textContent = `${val} ${fromSel.value} = ${round(result)} ${toSel.value}`;
  }

  [groupSel].forEach(s => s.addEventListener('change', populateUnits));
  [fromSel, toSel, el.querySelector('#ucValue')].forEach(s => s.addEventListener('input', convert));
  populateUnits();
}

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}

// ------------------------------------------------------------
// Text Tools
// ------------------------------------------------------------
function renderTextTools(el) {
  el.innerHTML = `
    <textarea id="ttInput" placeholder="Text hier einfügen…"></textarea>
    <div class="field-row" style="margin-top:10px;">
      <button class="btn btn-sm" data-act="upper">GROSS</button>
      <button class="btn btn-sm" data-act="lower">klein</button>
      <button class="btn btn-sm" data-act="title">Titel-Fall</button>
      <button class="btn btn-sm" data-act="trim">Leerzeichen entfernen</button>
      <button class="btn btn-sm" data-act="sort">Zeilen sortieren</button>
      <button class="btn btn-sm" data-act="dedupe">Duplikate entfernen</button>
    </div>
    <div class="result-box" id="ttStats">0 Zeichen · 0 Wörter · 0 Zeilen</div>
  `;
  const input = el.querySelector('#ttInput');
  const stats = el.querySelector('#ttStats');

  function updateStats() {
    const v = input.value;
    const words = v.trim() ? v.trim().split(/\s+/).length : 0;
    const lines = v ? v.split('\n').length : 0;
    stats.textContent = `${v.length} Zeichen · ${words} Wörter · ${lines} Zeilen`;
  }
  input.addEventListener('input', updateStats);
  updateStats();

  el.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = input.value;
      switch (btn.dataset.act) {
        case 'upper': input.value = v.toUpperCase(); break;
        case 'lower': input.value = v.toLowerCase(); break;
        case 'title': input.value = v.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()); break;
        case 'trim': input.value = v.split('\n').map(l => l.trim()).filter(Boolean).join('\n'); break;
        case 'sort': input.value = v.split('\n').sort((a, b) => a.localeCompare(b)).join('\n'); break;
        case 'dedupe': input.value = [...new Set(v.split('\n'))].join('\n'); break;
      }
      updateStats();
    });
  });
}

// ------------------------------------------------------------
// Generators
// ------------------------------------------------------------
function renderGenerators(el) {
  el.innerHTML = `
    <div class="card" style="margin:0 0 14px;">
      <h3 style="font-size:.9rem;">Passwortgenerator</h3>
      <div class="field-row">
        <label>Länge</label>
        <input type="number" id="pwLen" value="16" min="4" max="64">
      </div>
      <div class="field-row">
        <label><input type="checkbox" id="pwSymbols" checked> Sonderzeichen</label>
        <label><input type="checkbox" id="pwNumbers" checked> Zahlen</label>
      </div>
      <button class="btn btn-primary btn-sm" id="pwGen">Generieren</button>
      <div class="result-box" id="pwOut"></div>
    </div>

    <div class="card" style="margin:0 0 14px;">
      <h3 style="font-size:.9rem;">UUID</h3>
      <button class="btn btn-sm" id="uuidGen">Neue UUID</button>
      <div class="result-box" id="uuidOut"></div>
    </div>

    <div class="card" style="margin:0 0 14px;">
      <h3 style="font-size:.9rem;">Zufallszahl</h3>
      <div class="field-row">
        <input type="number" id="randMin" placeholder="Min" value="1">
        <input type="number" id="randMax" placeholder="Max" value="100">
        <button class="btn btn-sm" id="randGen">Würfeln</button>
      </div>
      <div class="result-box" id="randOut"></div>
    </div>

    <div class="card" style="margin:0;">
      <h3 style="font-size:.9rem;">Zufällige Farbe</h3>
      <button class="btn btn-sm" id="colorGen">Neue Farbe</button>
      <div class="result-box" id="colorOut" style="display:flex;align-items:center;gap:12px;"></div>
    </div>
  `;

  el.querySelector('#pwGen').addEventListener('click', () => {
    const len = Math.min(64, Math.max(4, parseInt(el.querySelector('#pwLen').value) || 16));
    const useSymbols = el.querySelector('#pwSymbols').checked;
    const useNumbers = el.querySelector('#pwNumbers').checked;
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()-_=+[]{}';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    const pw = Array.from(arr, n => chars[n % chars.length]).join('');
    el.querySelector('#pwOut').textContent = pw;
  });

  el.querySelector('#uuidGen').addEventListener('click', () => {
    el.querySelector('#uuidOut').textContent = crypto.randomUUID();
  });

  el.querySelector('#randGen').addEventListener('click', () => {
    const min = parseInt(el.querySelector('#randMin').value) || 0;
    const max = parseInt(el.querySelector('#randMax').value) || 100;
    if (min > max) { el.querySelector('#randOut').textContent = 'Min muss kleiner als Max sein.'; return; }
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    el.querySelector('#randOut').textContent = String(result);
  });

  el.querySelector('#colorGen').addEventListener('click', () => {
    const hex = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    const out = el.querySelector('#colorOut');
    out.innerHTML = `<span style="width:26px;height:26px;border-radius:6px;background:${hex};border:1px solid var(--border-strong);display:inline-block;"></span> ${hex}`;
  });
}

// ------------------------------------------------------------
// Time Tools
// ------------------------------------------------------------
function renderTimeTools(el) {
  el.innerHTML = `
    <div class="card" style="margin:0 0 14px;">
      <h3 style="font-size:.9rem;">Stoppuhr</h3>
      <div class="result-box" id="swDisplay">00:00.0</div>
      <div class="field-row">
        <button class="btn btn-sm" id="swStart">Start</button>
        <button class="btn btn-sm" id="swStop">Stopp</button>
        <button class="btn btn-sm" id="swReset">Reset</button>
      </div>
    </div>
    <div class="card" style="margin:0 0 14px;">
      <h3 style="font-size:.9rem;">Countdown</h3>
      <div class="field-row">
        <input type="number" id="cdMinutes" placeholder="Minuten" value="5">
        <button class="btn btn-sm" id="cdStart">Starten</button>
      </div>
      <div class="result-box" id="cdDisplay">00:00</div>
    </div>
    <div class="card" style="margin:0;">
      <h3 style="font-size:.9rem;">Weltzeit</h3>
      <div class="result-box" id="worldClocks"></div>
    </div>
  `;

  // Stopwatch
  let swInterval = null, swStart = 0, swElapsed = 0;
  const swDisplay = el.querySelector('#swDisplay');
  function formatTime(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const d = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
  }
  el.querySelector('#swStart').addEventListener('click', () => {
    if (swInterval) return;
    swStart = Date.now() - swElapsed;
    swInterval = setInterval(() => {
      swElapsed = Date.now() - swStart;
      swDisplay.textContent = formatTime(swElapsed);
    }, 100);
  });
  el.querySelector('#swStop').addEventListener('click', () => { clearInterval(swInterval); swInterval = null; });
  el.querySelector('#swReset').addEventListener('click', () => { clearInterval(swInterval); swInterval = null; swElapsed = 0; swDisplay.textContent = '00:00.0'; });

  // Countdown
  let cdInterval = null;
  el.querySelector('#cdStart').addEventListener('click', () => {
    clearInterval(cdInterval);
    let remaining = (parseFloat(el.querySelector('#cdMinutes').value) || 0) * 60;
    const cdDisplay = el.querySelector('#cdDisplay');
    const tick = () => {
      if (remaining <= 0) {
        clearInterval(cdInterval);
        cdDisplay.textContent = 'Fertig!';
        N.toast('Countdown abgelaufen', 'info');
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = Math.floor(remaining % 60);
      cdDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      remaining--;
    };
    tick();
    cdInterval = setInterval(tick, 1000);
  });

  // World clocks
  const zones = [
    { label: 'Berlin', tz: 'Europe/Berlin' },
    { label: 'London', tz: 'Europe/London' },
    { label: 'New York', tz: 'America/New_York' },
    { label: 'Tokio', tz: 'Asia/Tokyo' },
  ];
  const worldEl = el.querySelector('#worldClocks');
  function renderWorld() {
    worldEl.textContent = zones.map(z => {
      const t = new Date().toLocaleTimeString('de-DE', { timeZone: z.tz, hour: '2-digit', minute: '2-digit' });
      return `${z.label}: ${t}`;
    }).join('   ·   ');
  }
  renderWorld();
  setInterval(renderWorld, 15000);
}

// ------------------------------------------------------------
// JSON Tool
// ------------------------------------------------------------
function renderJsonTool(el) {
  el.innerHTML = `
    <textarea id="jsonInput" placeholder='{"beispiel": true}'></textarea>
    <div class="field-row" style="margin-top:10px;">
      <button class="btn btn-primary btn-sm" id="jsonPretty">Pretty Print</button>
      <button class="btn btn-sm" id="jsonMinify">Minify</button>
      <button class="btn btn-sm" id="jsonValidate">Validieren</button>
    </div>
    <div class="result-box" id="jsonOut">Ergebnis erscheint hier.</div>
  `;
  const input = el.querySelector('#jsonInput');
  const out = el.querySelector('#jsonOut');

  function withParsed(fn) {
    try {
      const parsed = JSON.parse(input.value);
      fn(parsed);
    } catch (e) {
      out.textContent = 'Ungültiges JSON: ' + e.message;
    }
  }
  el.querySelector('#jsonPretty').addEventListener('click', () => withParsed(p => out.textContent = JSON.stringify(p, null, 2)));
  el.querySelector('#jsonMinify').addEventListener('click', () => withParsed(p => out.textContent = JSON.stringify(p)));
  el.querySelector('#jsonValidate').addEventListener('click', () => withParsed(() => { out.textContent = '✓ Gültiges JSON.'; N.toast('JSON ist gültig', 'ok'); }));
}

// ------------------------------------------------------------
// Base64
// ------------------------------------------------------------
function renderBase64(el) {
  el.innerHTML = `
    <textarea id="b64Input" placeholder="Text eingeben…"></textarea>
    <div class="field-row" style="margin-top:10px;">
      <button class="btn btn-primary btn-sm" id="b64Encode">Encode</button>
      <button class="btn btn-sm" id="b64Decode">Decode</button>
    </div>
    <div class="result-box" id="b64Out">Ergebnis erscheint hier.</div>
  `;
  const input = el.querySelector('#b64Input');
  const out = el.querySelector('#b64Out');
  el.querySelector('#b64Encode').addEventListener('click', () => {
    try { out.textContent = btoa(unescape(encodeURIComponent(input.value))); }
    catch (e) { out.textContent = 'Fehler beim Encodieren: ' + e.message; }
  });
  el.querySelector('#b64Decode').addEventListener('click', () => {
    try { out.textContent = decodeURIComponent(escape(atob(input.value))); }
    catch (e) { out.textContent = 'Ungültiger Base64-Text.'; }
  });
}
