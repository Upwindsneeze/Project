// ============================================================
// tools.js — Digitaler Werkzeugkasten
// Jedes Tool ist { id, label, icon, desc, category, render(container) }
// ============================================================

let N;

const CATEGORIES = ['Rechner', 'Umrechnung', 'Text', 'Generatoren', 'Entwickler', 'Zeit'];

const TOOLS = [
  { id: 'calculator', label: 'Calculator', icon: 'calculator', desc: 'Grundrechenarten & Prozent', category: 'Rechner', render: renderCalculator },
  { id: 'bmi-tip', label: 'BMI & Trinkgeld', icon: 'percent', desc: 'Körpermaße & Rechnung teilen', category: 'Rechner', render: renderBmiTip },
  { id: 'unit-converter', label: 'Unit Converter', icon: 'arrow-left-right', desc: 'Länge, Gewicht, Zeit…', category: 'Umrechnung', render: renderUnitConverter },
  { id: 'text-tools', label: 'Text Tools', icon: 'type', desc: 'Zählen, formatieren, sortieren', category: 'Text', render: renderTextTools },
  { id: 'markdown-preview', label: 'Markdown Preview', icon: 'file-text', desc: 'Live-Vorschau von Markdown', category: 'Text', render: renderMarkdownPreview },
  { id: 'random-generator', label: 'Generators', icon: 'dices', desc: 'Passwort, UUID, Farbe, Zahl', category: 'Generatoren', render: renderGenerators },
  { id: 'color-palette', label: 'Farbpalette', icon: 'palette', desc: 'Harmonische Farbschemata', category: 'Generatoren', render: renderColorPalette },
  { id: 'json-tool', label: 'JSON Tool', icon: 'braces', desc: 'Pretty-print & validieren', category: 'Entwickler', render: renderJsonTool },
  { id: 'base64', label: 'Base64', icon: 'binary', desc: 'Encode / Decode', category: 'Entwickler', render: renderBase64 },
  { id: 'time-tools', label: 'Zeit', icon: 'timer', desc: 'Countdown, Stoppuhr, Weltzeit', category: 'Zeit', render: renderTimeTools },
];

export function initTools(nexus) {
  N = nexus;
  const grid = document.getElementById('toolGrid');
  grid.innerHTML = CATEGORIES.map(cat => {
    const items = TOOLS.filter(t => t.category === cat);
    if (!items.length) return '';
    return `
      <div class="tool-category" style="grid-column:1/-1;margin-top:6px;">
        <h4 style="font-size:.8rem;text-transform:none;color:var(--text-dim);margin:14px 0 8px;font-weight:500;">${cat}</h4>
      </div>
      ${items.map(t => `
        <button class="tool-card" data-tool="${t.id}">
          <i class="icon" data-icon="${t.icon}"></i>
          <div class="tool-card-text"><strong>${t.label}</strong><span>${t.desc}</span></div>
        </button>
      `).join('')}
    `;
  }).join('');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';

  grid.querySelectorAll('.tool-card').forEach(btn => {
    btn.addEventListener('click', () => openTool(btn.dataset.tool));
  });

  document.querySelectorAll('.quick-card[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => { N.navigateTo('tools'); openTool(btn.dataset.tool); });
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
        <option value="+">+</option><option value="-">−</option>
        <option value="*">×</option><option value="/">÷</option>
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
    if (Number.isNaN(a) || Number.isNaN(b)) { out.textContent = 'Bitte beide Zahlen ausfüllen.'; return; }
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
// BMI & Trinkgeld/Rechnung teilen
// ------------------------------------------------------------
function renderBmiTip(el) {
  el.innerHTML = `
    <div class="card" style="margin:0 0 14px;">
      <h3 style="font-size:.9rem;">BMI-Rechner</h3>
      <div class="field-row">
        <input type="number" id="bmiHeight" placeholder="Größe (cm)">
        <input type="number" id="bmiWeight" placeholder="Gewicht (kg)">
        <button class="btn btn-sm" id="bmiRun">Berechnen</button>
      </div>
      <div class="result-box" id="bmiOut">Ergebnis erscheint hier.</div>
    </div>
    <div class="card" style="margin:0;">
      <h3 style="font-size:.9rem;">Rechnung teilen</h3>
      <div class="field-row">
        <input type="number" id="tipTotal" placeholder="Rechnungsbetrag (€)">
        <input type="number" id="tipPercent" placeholder="Trinkgeld %" value="10">
        <input type="number" id="tipPeople" placeholder="Anzahl Personen" value="1">
        <button class="btn btn-sm" id="tipRun">Berechnen</button>
      </div>
      <div class="result-box" id="tipOut">Ergebnis erscheint hier.</div>
    </div>
  `;

  el.querySelector('#bmiRun').addEventListener('click', () => {
    const h = parseFloat(el.querySelector('#bmiHeight').value) / 100;
    const w = parseFloat(el.querySelector('#bmiWeight').value);
    const out = el.querySelector('#bmiOut');
    if (!h || !w) { out.textContent = 'Bitte Größe und Gewicht eingeben.'; return; }
    const bmi = w / (h * h);
    let category = 'Normalgewicht';
    if (bmi < 18.5) category = 'Untergewicht';
    else if (bmi >= 25 && bmi < 30) category = 'Übergewicht';
    else if (bmi >= 30) category = 'Adipositas';
    out.textContent = `BMI: ${bmi.toFixed(1)} — ${category}\n(Hinweis: nur eine grobe Orientierung, ersetzt keine medizinische Einschätzung.)`;
  });

  el.querySelector('#tipRun').addEventListener('click', () => {
    const total = parseFloat(el.querySelector('#tipTotal').value);
    const pct = parseFloat(el.querySelector('#tipPercent').value) || 0;
    const people = Math.max(1, parseInt(el.querySelector('#tipPeople').value) || 1);
    const out = el.querySelector('#tipOut');
    if (!total) { out.textContent = 'Bitte einen Betrag eingeben.'; return; }
    const withTip = total * (1 + pct / 100);
    out.textContent = `Gesamt mit Trinkgeld: ${withTip.toFixed(2)} €\nPro Person: ${(withTip / people).toFixed(2)} €`;
  });
}

// ------------------------------------------------------------
// Unit Converter
// ------------------------------------------------------------
const UNIT_GROUPS = {
  length: { label: 'Länge', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.34 } },
  weight: { label: 'Gewicht', units: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, lb: 0.453592, oz: 0.0283495 } },
  speed: { label: 'Geschwindigkeit', units: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knots: 0.514444 } },
  data: { label: 'Datenmenge', units: { KB: 0.000977, MB: 1, GB: 1024, TB: 1048576 } },
  time: { label: 'Zeit', units: { s: 1, min: 60, h: 3600, day: 86400 } },
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
    const baseVal = val * g.units[fromSel.value];
    const result = baseVal / g.units[toSel.value];
    out.textContent = `${val} ${fromSel.value} = ${round(result)} ${toSel.value}`;
  }
  groupSel.addEventListener('change', populateUnits);
  [fromSel, toSel, el.querySelector('#ucValue')].forEach(s => s.addEventListener('input', convert));
  populateUnits();
}
function round(n) { return Math.round(n * 1e6) / 1e6; }

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
// Markdown Preview (einfacher, selbst geschriebener Parser —
// bewusst ohne externe Bibliothek, deckt die gängigsten Fälle ab)
// ------------------------------------------------------------
function renderMarkdownPreview(el) {
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <textarea id="mdInput" placeholder="# Überschrift&#10;**fett** _kursiv_&#10;- Punkt 1&#10;- Punkt 2&#10;[Link](https://example.com)" style="min-height:220px;"></textarea>
      <div class="result-box" id="mdOut" style="min-height:220px;white-space:normal;"></div>
    </div>
  `;
  const input = el.querySelector('#mdInput');
  const out = el.querySelector('#mdOut');
  function render() {
    out.innerHTML = simpleMarkdownToHtml(input.value);
  }
  input.addEventListener('input', render);
  render();
}

function simpleMarkdownToHtml(md) {
  const escaped = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = escaped.split('\n');
  let html = '';
  let inList = false;
  for (let line of lines) {
    if (/^###\s+/.test(line)) { html += `<h4>${line.replace(/^###\s+/, '')}</h4>`; continue; }
    if (/^##\s+/.test(line)) { html += `<h3>${line.replace(/^##\s+/, '')}</h3>`; continue; }
    if (/^#\s+/.test(line)) { html += `<h2>${line.replace(/^#\s+/, '')}</h2>`; continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += '<ul style="margin:6px 0;padding-left:20px;">'; inList = true; }
      html += `<li>${inlineMd(line.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    } else if (inList) { html += '</ul>'; inList = false; }
    if (line.trim() === '') { html += '<br>'; continue; }
    html += `<p style="margin:4px 0;">${inlineMd(line)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}
function inlineMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
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
    <div class="card" style="margin:0;">
      <h3 style="font-size:.9rem;">Zufallszahl</h3>
      <div class="field-row">
        <input type="number" id="randMin" placeholder="Min" value="1">
        <input type="number" id="randMax" placeholder="Max" value="100">
        <button class="btn btn-sm" id="randGen">Würfeln</button>
      </div>
      <div class="result-box" id="randOut"></div>
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
    el.querySelector('#pwOut').textContent = Array.from(arr, n => chars[n % chars.length]).join('');
  });
  el.querySelector('#uuidGen').addEventListener('click', () => {
    el.querySelector('#uuidOut').textContent = crypto.randomUUID();
  });
  el.querySelector('#randGen').addEventListener('click', () => {
    const min = parseInt(el.querySelector('#randMin').value) || 0;
    const max = parseInt(el.querySelector('#randMax').value) || 100;
    if (min > max) { el.querySelector('#randOut').textContent = 'Min muss kleiner als Max sein.'; return; }
    el.querySelector('#randOut').textContent = String(Math.floor(Math.random() * (max - min + 1)) + min);
  });
}

// ------------------------------------------------------------
// Farbpalette-Generator (harmonische Schemata via HSL)
// ------------------------------------------------------------
function renderColorPalette(el) {
  el.innerHTML = `
    <div class="field-row">
      <select id="paletteScheme">
        <option value="analogous">Analog</option>
        <option value="complementary">Komplementär</option>
        <option value="triadic">Triadisch</option>
        <option value="monochrome">Monochrom</option>
      </select>
      <button class="btn btn-primary btn-sm" id="paletteGen">Neue Palette</button>
    </div>
    <div id="paletteOut" style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;"></div>
  `;
  function generate() {
    const scheme = el.querySelector('#paletteScheme').value;
    const baseHue = Math.floor(Math.random() * 360);
    let hues;
    switch (scheme) {
      case 'complementary': hues = [baseHue, (baseHue + 180) % 360]; break;
      case 'triadic': hues = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360]; break;
      case 'monochrome': hues = [baseHue, baseHue, baseHue, baseHue, baseHue]; break;
      default: hues = [baseHue, (baseHue + 25) % 360, (baseHue + 50) % 360, (baseHue - 25 + 360) % 360, (baseHue - 50 + 360) % 360];
    }
    const out = el.querySelector('#paletteOut');
    out.innerHTML = hues.map((h, i) => {
      const l = scheme === 'monochrome' ? 30 + i * 15 : 55;
      const hex = hslToHex(h, 65, l);
      return `
        <div style="text-align:center;">
          <div style="width:64px;height:64px;border-radius:10px;background:${hex};border:1px solid var(--border-strong);cursor:pointer;" data-hex="${hex}" class="swatch-box"></div>
          <div style="font-family:var(--font-mono);font-size:.72rem;margin-top:4px;color:var(--text-muted);">${hex}</div>
        </div>`;
    }).join('');
    out.querySelectorAll('.swatch-box').forEach(sw => {
      sw.addEventListener('click', () => {
        navigator.clipboard.writeText(sw.dataset.hex);
        N.toast(`${sw.dataset.hex} kopiert`, 'ok');
      });
    });
  }
  el.querySelector('#paletteGen').addEventListener('click', generate);
  generate();
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
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
  let swInterval = null, swStart = 0, swElapsed = 0;
  const swDisplay = el.querySelector('#swDisplay');
  function formatTime(ms) {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), d = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
  }
  el.querySelector('#swStart').addEventListener('click', () => {
    if (swInterval) return;
    swStart = Date.now() - swElapsed;
    swInterval = setInterval(() => { swElapsed = Date.now() - swStart; swDisplay.textContent = formatTime(swElapsed); }, 100);
  });
  el.querySelector('#swStop').addEventListener('click', () => { clearInterval(swInterval); swInterval = null; });
  el.querySelector('#swReset').addEventListener('click', () => { clearInterval(swInterval); swInterval = null; swElapsed = 0; swDisplay.textContent = '00:00.0'; });

  let cdInterval = null;
  el.querySelector('#cdStart').addEventListener('click', () => {
    clearInterval(cdInterval);
    let remaining = (parseFloat(el.querySelector('#cdMinutes').value) || 0) * 60;
    const cdDisplay = el.querySelector('#cdDisplay');
    const tick = () => {
      if (remaining <= 0) { clearInterval(cdInterval); cdDisplay.textContent = 'Fertig!'; N.toast('Countdown abgelaufen', 'info'); return; }
      const m = Math.floor(remaining / 60), s = Math.floor(remaining % 60);
      cdDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      remaining--;
    };
    tick();
    cdInterval = setInterval(tick, 1000);
  });

  const zones = [
    { label: 'Berlin', tz: 'Europe/Berlin' }, { label: 'London', tz: 'Europe/London' },
    { label: 'New York', tz: 'America/New_York' }, { label: 'Tokio', tz: 'Asia/Tokyo' },
  ];
  const worldEl = el.querySelector('#worldClocks');
  function renderWorld() {
    worldEl.textContent = zones.map(z => `${z.label}: ${new Date().toLocaleTimeString('de-DE', { timeZone: z.tz, hour: '2-digit', minute: '2-digit' })}`).join('   ·   ');
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
    try { fn(JSON.parse(input.value)); }
    catch (e) { out.textContent = 'Ungültiges JSON: ' + e.message; }
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
