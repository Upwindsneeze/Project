// ============================================================
// urls.js — URL Tools (rein clientseitig, keine externen Requests)
//
// Encode und Decode haben jetzt EIGENE Eingabe- und Ausgabefelder,
// statt sich ein gemeinsames Feld zu teilen — das war vermutlich
// der Grund, warum es sich "kaputt" angefühlt hat: Decode griff auf
// den Originaltext statt auf das zuletzt encodierte Ergebnis zu.
// ============================================================

let N;

export function initUrls(nexus) {
  N = nexus;
  const area = document.getElementById('urlArea');
  area.innerHTML = `
    <div class="card">
      <h3>Encode</h3>
      <textarea id="encInput" placeholder="Text oder URL eingeben…"></textarea>
      <div class="field-row" style="margin-top:10px;">
        <label style="min-width:auto;"><input type="radio" name="encMode" value="component" checked> Komponente (encodeURIComponent)</label>
        <label style="min-width:auto;"><input type="radio" name="encMode" value="full"> Ganze URL (encodeURI)</label>
      </div>
      <div class="field-row">
        <button class="btn btn-primary btn-sm" id="encBtn">Encode</button>
        <button class="btn btn-sm" id="encCopy">Kopieren</button>
      </div>
      <div class="result-box" id="encOut">Ergebnis erscheint hier.</div>
    </div>

    <div class="card">
      <h3>Decode</h3>
      <textarea id="decInput" placeholder="Codierten Text hier einfügen…"></textarea>
      <div class="field-row" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" id="decBtn">Decode</button>
        <button class="btn btn-sm" id="decCopy">Kopieren</button>
        <button class="btn btn-sm" id="decUseEncOut">Aus Encode-Ergebnis übernehmen</button>
      </div>
      <div class="result-box" id="decOut">Ergebnis erscheint hier.</div>
    </div>

    <div class="card">
      <h3>URL-Parser</h3>
      <input type="text" id="urlParseInput" placeholder="https://beispiel.de/pfad?a=1&b=2#abschnitt">
      <button class="btn btn-sm" style="margin-top:10px;" id="urlParseBtn">Analysieren</button>
      <div class="result-box" id="urlParseOut">Ergebnis erscheint hier.</div>
    </div>
  `;

  // ---- Encode ----
  const encInput = area.querySelector('#encInput');
  const encOut = area.querySelector('#encOut');
  area.querySelector('#encBtn').addEventListener('click', () => {
    const mode = area.querySelector('input[name="encMode"]:checked').value;
    try {
      encOut.textContent = mode === 'full'
        ? encodeURI(encInput.value)
        : encodeURIComponent(encInput.value);
    } catch (e) {
      encOut.textContent = 'Fehler beim Encodieren: ' + e.message;
    }
  });
  area.querySelector('#encCopy').addEventListener('click', () => copy(encOut.textContent));

  // ---- Decode ----
  const decInput = area.querySelector('#decInput');
  const decOut = area.querySelector('#decOut');
  area.querySelector('#decBtn').addEventListener('click', () => {
    try {
      decOut.textContent = decodeURIComponent(decInput.value);
    } catch (e) {
      // Fallback: manche gültigen encodeURI-Strings (mit unkodierten
      // Sonderzeichen wie / oder :) lassen sich trotzdem decodieren.
      try {
        decOut.textContent = decodeURI(decInput.value);
      } catch (e2) {
        decOut.textContent = 'Ungültig codierter Text — enthält ein fehlerhaftes %-Escape.';
      }
    }
  });
  area.querySelector('#decCopy').addEventListener('click', () => copy(decOut.textContent));
  area.querySelector('#decUseEncOut').addEventListener('click', () => {
    decInput.value = encOut.textContent;
    N.toast('Encode-Ergebnis übernommen', 'info');
  });

  // ---- Parser ----
  area.querySelector('#urlParseBtn').addEventListener('click', () => {
    const raw = area.querySelector('#urlParseInput').value.trim();
    const out = area.querySelector('#urlParseOut');
    try {
      const u = new URL(raw);
      const params = [...u.searchParams.entries()];
      out.innerHTML = '';
      out.textContent = [
        `Protokoll: ${u.protocol}`,
        `Host: ${u.hostname}`,
        `Port: ${u.port || '(Standard)'}`,
        `Pfad: ${u.pathname}`,
        `Fragment: ${u.hash || '(keins)'}`,
        `Query-Parameter: ${params.length ? '' : '(keine)'}`,
        ...params.map(([k, v]) => `  • ${k} = ${v}`),
      ].join('\n');
    } catch (e) {
      out.textContent = 'Keine gültige URL. Achte auf https:// am Anfang.';
    }
  });

  function copy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => N.toast('In Zwischenablage kopiert', 'ok'))
      .catch(() => N.toast('Kopieren fehlgeschlagen', 'error'));
  }

  N.registerSearchItems([
    { id: 'url-tools', label: 'URL Tools', icon: 'link', action: () => N.navigateTo('urls') },
  ]);
}
