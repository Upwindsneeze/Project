// ============================================================
// games.js — Game Lookup
//
// ARCHITEKTUR-HINWEIS:
// fetchGameData() ist die einzige Stelle, die ausgetauscht werden
// muss, um eine echte API (z. B. RAWG, IGDB, Steam) anzubinden.
// API-Keys gehören niemals ins Frontend — ein echter Aufruf sollte
// an dein eigenes Backend gehen (siehe backend/app.py).
// Aktuell liefert die Funktion einen erweiterten Demo-Datensatz.
// ============================================================

let N;

// Demo-Datensatz — jedes Spiel hat "aliases" für die Suche
// (Abkürzungen, alternative Schreibweisen).
const DEMO_GAMES = {
  minecraft: {
    name: 'Minecraft', aliases: ['mc'], developer: 'Mojang Studios', publisher: 'Xbox Game Studios',
    release: '2011-11-18', genres: ['Sandbox', 'Survival'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '9.0', desc: 'Ein Sandbox-Spiel, in dem du in einer Blockwelt baust, erkundest und überlebst.', icon: '🧱',
  },
  fortnite: {
    name: 'Fortnite', aliases: ['fn'], developer: 'Epic Games', publisher: 'Epic Games',
    release: '2017-07-25', genres: ['Battle Royale', 'Shooter'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '8.0', desc: 'Battle-Royale-Shooter mit Bauelementen und wechselnden Saison-Events.', icon: '🪂',
  },
  gta: {
    name: 'Grand Theft Auto V', aliases: ['gta5', 'gta v'], developer: 'Rockstar North', publisher: 'Rockstar Games',
    release: '2013-09-17', genres: ['Action', 'Open World'], platforms: ['PC', 'Konsolen'],
    rating: '9.6', desc: 'Open-World-Actionspiel in der fiktiven Stadt Los Santos.', icon: '🚗',
  },
  valorant: {
    name: 'Valorant', aliases: ['val'], developer: 'Riot Games', publisher: 'Riot Games',
    release: '2020-06-02', genres: ['Taktik-Shooter'], platforms: ['PC'],
    rating: '8.3', desc: 'Taktischer 5v5-Charakter-Shooter mit Fähigkeiten und präzisem Gunplay.', icon: '🎯',
  },
  'counter-strike': {
    name: 'Counter-Strike 2', aliases: ['cs2', 'csgo', 'cs'], developer: 'Valve', publisher: 'Valve',
    release: '2023-09-27', genres: ['Taktik-Shooter'], platforms: ['PC'],
    rating: '8.7', desc: 'Der Nachfolger des Taktik-Shooter-Klassikers, komplett auf Source 2.', icon: '🔫',
  },
  roblox: {
    name: 'Roblox', aliases: [], developer: 'Roblox Corporation', publisher: 'Roblox Corporation',
    release: '2006-09-01', genres: ['Plattform', 'Sandbox'], platforms: ['PC', 'Mobile', 'Konsolen'],
    rating: '7.5', desc: 'Plattform für nutzergenerierte Spiele in nahezu jedem Genre.', icon: '🟥',
  },
  terraria: {
    name: 'Terraria', aliases: [], developer: 'Re-Logic', publisher: 'Re-Logic',
    release: '2011-05-16', genres: ['Sandbox', 'Action'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '9.1', desc: '2D-Sandbox-Abenteuer mit Grabung, Kampf und Basisbau.', icon: '⛏️',
  },
  'league-of-legends': {
    name: 'League of Legends', aliases: ['lol', 'league'], developer: 'Riot Games', publisher: 'Riot Games',
    release: '2009-10-27', genres: ['MOBA'], platforms: ['PC'],
    rating: '7.9', desc: '5v5-MOBA mit über 160 Champions und stetig neuen Metas.', icon: '⚔️',
  },
  'apex-legends': {
    name: 'Apex Legends', aliases: ['apex'], developer: 'Respawn Entertainment', publisher: 'Electronic Arts',
    release: '2019-02-04', genres: ['Battle Royale', 'Shooter'], platforms: ['PC', 'Konsolen'],
    rating: '8.1', desc: 'Squad-basierter Battle-Royale-Shooter mit einzigartigen Legenden-Fähigkeiten.', icon: '🛡️',
  },
  'overwatch-2': {
    name: 'Overwatch 2', aliases: ['ow', 'ow2'], developer: 'Blizzard Entertainment', publisher: 'Blizzard Entertainment',
    release: '2022-10-04', genres: ['Hero-Shooter'], platforms: ['PC', 'Konsolen'],
    rating: '7.6', desc: 'Team-basierter Hero-Shooter mit rollenbasiertem 5v5-Gameplay.', icon: '🦾',
  },
  'call-of-duty-warzone': {
    name: 'Call of Duty: Warzone', aliases: ['warzone', 'cod'], developer: 'Infinity Ward', publisher: 'Activision',
    release: '2020-03-10', genres: ['Battle Royale', 'Shooter'], platforms: ['PC', 'Konsolen'],
    rating: '7.8', desc: 'Free-to-play Battle Royale im Call-of-Duty-Universum.', icon: '💣',
  },
  'among-us': {
    name: 'Among Us', aliases: ['au'], developer: 'Innersloth', publisher: 'Innersloth',
    release: '2018-06-15', genres: ['Party', 'Social Deduction'], platforms: ['PC', 'Mobile', 'Konsolen'],
    rating: '7.2', desc: 'Findet die Verräter an Bord, bevor sie die ganze Crew sabotieren.', icon: '🛸',
  },
  'rocket-league': {
    name: 'Rocket League', aliases: ['rl'], developer: 'Psyonix', publisher: 'Epic Games',
    release: '2015-07-07', genres: ['Sport', 'Fahrzeug'], platforms: ['PC', 'Konsolen'],
    rating: '8.6', desc: 'Fußball mit raketenbetriebenen Autos — chaotisch und kompetitiv zugleich.', icon: '🚀',
  },
  'stardew-valley': {
    name: 'Stardew Valley', aliases: ['sdv'], developer: 'ConcernedApe', publisher: 'ConcernedApe',
    release: '2016-02-26', genres: ['Simulation', 'RPG'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '9.3', desc: 'Entspannte Farm-Simulation mit Beziehungen, Höhlen und Jahreszeiten.', icon: '🌾',
  },
  'elden-ring': {
    name: 'Elden Ring', aliases: ['er'], developer: 'FromSoftware', publisher: 'Bandai Namco',
    release: '2022-02-25', genres: ['Action-RPG', 'Souls-like'], platforms: ['PC', 'Konsolen'],
    rating: '9.5', desc: 'Weitläufiges Souls-like-Open-World-RPG in der Zwischenlande.', icon: '🗡️',
  },
  'the-sims-4': {
    name: 'Die Sims 4', aliases: ['sims', 'sims4'], developer: 'Maxis', publisher: 'Electronic Arts',
    release: '2014-09-02', genres: ['Lebenssimulation'], platforms: ['PC', 'Konsolen'],
    rating: '7.4', desc: 'Erschaffe Sims, baue Häuser und steuere ganze Leben.', icon: '🏠',
  },
  'world-of-warcraft': {
    name: 'World of Warcraft', aliases: ['wow'], developer: 'Blizzard Entertainment', publisher: 'Blizzard Entertainment',
    release: '2004-11-23', genres: ['MMORPG'], platforms: ['PC'],
    rating: '8.5', desc: 'Der MMORPG-Klassiker in der Welt von Azeroth, seit über 20 Jahren aktiv.', icon: '🐉',
  },
  'rainbow-six-siege': {
    name: 'Rainbow Six Siege', aliases: ['r6', 'siege'], developer: 'Ubisoft Montreal', publisher: 'Ubisoft',
    release: '2015-12-01', genres: ['Taktik-Shooter'], platforms: ['PC', 'Konsolen'],
    rating: '8.2', desc: 'Zerstörbare Umgebungen und operator-basierte Taktik im 5v5.', icon: '🏗️',
  },
  palworld: {
    name: 'Palworld', aliases: ['pal'], developer: 'Pocketpair', publisher: 'Pocketpair',
    release: '2024-01-19', genres: ['Survival', 'Crafting'], platforms: ['PC', 'Konsolen'],
    rating: '8.0', desc: 'Kreaturen fangen, Basen bauen und überleben in einer offenen Welt.', icon: '🐾',
  },
  'hollow-knight': {
    name: 'Hollow Knight', aliases: ['hk'], developer: 'Team Cherry', publisher: 'Team Cherry',
    release: '2017-02-24', genres: ['Metroidvania'], platforms: ['PC', 'Konsolen'],
    rating: '9.2', desc: 'Atmosphärisches 2D-Metroidvania in der zerfallenen Insektenwelt Hallownest.', icon: '🦋',
  },
};

export function initGames(nexus) {
  N = nexus;
  const suggestions = document.getElementById('gameSuggestions');
  suggestions.innerHTML = Object.keys(DEMO_GAMES).slice(0, 10).map(key =>
    `<button class="chip" data-game="${key}">${DEMO_GAMES[key].name}</button>`
  ).join('');
  suggestions.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => runSearch(chip.dataset.game));
  });

  const input = document.getElementById('gameSearchInput');
  const btn = document.getElementById('gameSearchBtn');

  // Live-Vorschläge während des Tippens (Substring-Match, kein exaktes Wort nötig)
  const liveBox = document.createElement('div');
  liveBox.className = 'chip-row';
  liveBox.id = 'gameLiveMatches';
  input.insertAdjacentElement('afterend', liveBox);

  input.addEventListener('input', () => renderLiveMatches(input.value));
  btn.addEventListener('click', () => runSearch(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(input.value); });

  N.registerSearchItems(Object.entries(DEMO_GAMES).map(([key, g]) => ({
    id: 'game-' + key,
    label: g.name + ' (Game)',
    icon: 'gamepad-2',
    action: () => { N.navigateTo('games'); runSearch(key); },
  })));
}

function renderLiveMatches(query) {
  const box = document.getElementById('gameLiveMatches');
  const q = normalize(query);
  if (!q) { box.innerHTML = ''; return; }
  const matches = findMatches(q).slice(0, 6);
  box.innerHTML = matches.map(key =>
    `<button class="chip" data-game="${key}">${DEMO_GAMES[key].name}</button>`
  ).join('') || '<span class="muted" style="font-size:.8rem;">Keine Treffer bisher…</span>';
  box.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('gameSearchInput').value = DEMO_GAMES[chip.dataset.game].name;
      runSearch(chip.dataset.game);
    });
  });
}

/**
 * Substring-Suche über Namen, Key und Aliases — funktioniert schon
 * ab 2-3 Zeichen, nicht erst bei vollständigem Wort.
 */
function findMatches(rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return [];
  return Object.entries(DEMO_GAMES)
    .filter(([key, g]) => {
      const haystack = [key, g.name, ...(g.aliases || [])].map(s => normalize(s));
      return haystack.some(h => h.includes(q));
    })
    .map(([key]) => key);
}

async function runSearch(query) {
  const resultEl = document.getElementById('gameResult');
  resultEl.innerHTML = `<div class="card muted">Suche läuft…</div>`;

  const matches = findMatches(query);
  if (!matches.length) {
    resultEl.innerHTML = `
      <div class="card">
        <p>Kein Treffer für „${escapeHtml(query)}". Versuch's mit weniger Buchstaben oder einer Abkürzung.</p>
        <p class="muted">Aktuell sind ${Object.keys(DEMO_GAMES).length} Demo-Spiele hinterlegt. Sobald eine echte Game-API angebunden ist, funktioniert die Suche für beliebige Titel.</p>
      </div>`;
    return;
  }

  const key = matches[0];
  const data = await fetchGameData(key);
  renderGameDetail(key, data);
  N.trackRecent({ id: 'game-' + key, label: data.name, icon: 'gamepad-2', view: 'games' });
}

// ------------------------------------------------------------
// Detail-Ansicht mit Tabs (Overview / Guides / Community)
// ------------------------------------------------------------
function renderGameDetail(key, data) {
  const resultEl = document.getElementById('gameResult');
  resultEl.innerHTML = `
    <div class="game-card" style="flex-direction:column;">
      <div style="display:flex;gap:18px;">
        <div class="game-cover">${data.icon}</div>
        <div>
          <h2>${data.name}</h2>
          <div class="game-meta">
            <span><strong>Entwickler:</strong> ${data.developer}</span>
            <span><strong>Publisher:</strong> ${data.publisher}</span>
            <span><strong>Release:</strong> ${data.release}</span>
            <span><strong>Bewertung:</strong> ${data.rating}/10</span>
          </div>
          <div class="chip-row">
            ${data.genres.map(g => `<span class="chip">${g}</span>`).join('')}
            ${data.platforms.map(p => `<span class="chip">${p}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="game-tabs" style="display:flex;gap:6px;margin-top:18px;border-bottom:1px solid var(--border);">
        <button class="game-tab is-active" data-tab="overview">Übersicht</button>
        <button class="game-tab" data-tab="guides">Guides</button>
        <button class="game-tab" data-tab="community">Community</button>
      </div>
      <div class="game-tab-panel" id="gameTabPanel" style="padding-top:16px;"></div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .game-tab { background:transparent;border:none;color:var(--text-muted);padding:9px 14px;font-size:.85rem;cursor:pointer;border-bottom:2px solid transparent; }
    .game-tab.is-active { color:var(--text);border-color:var(--accent-b); }
  `;
  if (!document.getElementById('gameTabStyle')) { style.id = 'gameTabStyle'; document.head.appendChild(style); }

  const tabs = resultEl.querySelectorAll('.game-tab');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    renderTabPanel(tab.dataset.tab, data);
  }));
  renderTabPanel('overview', data);
}

function renderTabPanel(tab, data) {
  const panel = document.getElementById('gameTabPanel');
  if (tab === 'overview') {
    panel.innerHTML = `<p class="muted">${data.desc}</p>`;
  } else if (tab === 'guides') {
    const q = encodeURIComponent(data.name + ' guide beginner tips');
    panel.innerHTML = `
      <p class="muted">Noch keine eigenen Guides hinterlegt — hier sind ein paar Startpunkte:</p>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:.87rem;color:var(--text-muted);line-height:1.8;">
        <li><a href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">YouTube-Suche: "${data.name} guide"</a></li>
        <li><a href="https://www.reddit.com/search/?q=${encodeURIComponent(data.name)}" target="_blank" rel="noopener">Reddit-Suche zu ${data.name}</a></li>
      </ul>`;
  } else if (tab === 'community') {
    panel.innerHTML = `
      <p class="muted">Community-Integration (z. B. euer eigener Discord-Server-Link oder eine Mitspieler-Liste) ist noch nicht angebunden.</p>
      <span class="badge">Coming Soon</span>`;
  }
}

/**
 * Zentrale Abstraktionsschicht für Game-Daten.
 * Aktuell: liest aus DEMO_GAMES.
 * Später: fetch('/api/games/' + key) gegen dein eigenes Backend.
 */
async function fetchGameData(key) {
  await new Promise(r => setTimeout(r, 150)); // simuliert Netzwerk-Latenz
  return DEMO_GAMES[key];
}

function normalize(str) {
  return (str || '').trim().toLowerCase();
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
