// ============================================================
// urls.js — URL Tools (rein clientseitig, keine externen Requests)
// ============================================================

let N;

export function initUrls(nexus) {
  N = nexus;
  const area = document.getElementById('urlArea');
  area.innerHTML = `
    <div class="card">
      <h3>Encode / Decode</h3>
      <textarea id="urlInput" placeholder="URL oder Text eingeben…"></textarea>
      <div class="field-row" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" id="urlEncodeBtn">Encode</button>
        <button class="btn btn-sm" id="urlDecodeBtn">Decode</button>
      </div>
      <div class="result-box" id="urlEncodeOut">Ergebnis erscheint hier.</div>
    </div>

    <div class="card">
      <h3>URL-Parser</h3>
      <input type="text" id="urlParseInput" placeholder="https://beispiel.de/pfad?a=1&b=2#abschnitt">
      <button class="btn btn-sm" style="margin-top:10px;" id="urlParseBtn">Analysieren</button>
      <div class="result-box" id="urlParseOut">Ergebnis erscheint hier.</div>
    </div>
  `;

  area.querySelector('#urlEncodeBtn').addEventListener('click', () => {
    const input = area.querySelector('#urlInput').value;
    area.querySelector('#urlEncodeOut').textContent = encodeURIComponent(input);
  });
  area.querySelector('#urlDecodeBtn').addEventListener('click', () => {
    const input = area.querySelector('#urlInput').value;
    try {
      area.querySelector('#urlEncodeOut').textContent = decodeURIComponent(input);
    } catch (e) {
      area.querySelector('#urlEncodeOut').textContent = 'Ungültig codierter Text.';
    }
  });

  area.querySelector('#urlParseBtn').addEventListener('click', () => {
    const raw = area.querySelector('#urlParseInput').value.trim();
    const out = area.querySelector('#urlParseOut');
    try {
      const u = new URL(raw);
      const params = [...u.searchParams.entries()];
      out.innerHTML = [
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

  N.registerSearchItems([
    { id: 'url-tools', label: 'URL Tools', icon: 'link', action: () => N.navigateTo('urls') },
  ]);
}
