// ============================================================
// games.js — Game Lookup
//
// ARCHITEKTUR-HINWEIS:
// fetchGameData() ist die einzige Stelle, die ausgetauscht werden
// muss, um eine echte API (z. B. RAWG, IGDB, Steam) anzubinden.
// WICHTIG: API-Keys gehören niemals ins Frontend. Ein echter Aufruf
// sollte an dein eigenes Backend gehen (siehe backend/app.py),
// das den Key serverseitig anhängt und die Anfrage weiterleitet.
// Aktuell liefert die Funktion Demo-/Platzhalterdaten.
// ============================================================

let N;

// Demo-Datensatz — ersetzt später durch echten API-Response
const DEMO_GAMES = {
  minecraft: {
    name: 'Minecraft', developer: 'Mojang Studios', publisher: 'Xbox Game Studios',
    release: '2011-11-18', genres: ['Sandbox', 'Survival'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '9.0', desc: 'Ein Sandbox-Spiel, in dem du in einer Blockwelt baust, erkundest und überlebst.',
    icon: '🧱',
  },
  fortnite: {
    name: 'Fortnite', developer: 'Epic Games', publisher: 'Epic Games',
    release: '2017-07-25', genres: ['Battle Royale', 'Shooter'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '8.0', desc: 'Battle-Royale-Shooter mit Bauelementen und wechselnden Saison-Events.',
    icon: '🪂',
  },
  gta: {
    name: 'Grand Theft Auto V', developer: 'Rockstar North', publisher: 'Rockstar Games',
    release: '2013-09-17', genres: ['Action', 'Open World'], platforms: ['PC', 'Konsolen'],
    rating: '9.6', desc: 'Open-World-Actionspiel in der fiktiven Stadt Los Santos.',
    icon: '🚗',
  },
  valorant: {
    name: 'Valorant', developer: 'Riot Games', publisher: 'Riot Games',
    release: '2020-06-02', genres: ['Taktik-Shooter'], platforms: ['PC'],
    rating: '8.3', desc: 'Taktischer 5v5-Charakter-Shooter mit Fähigkeiten und präzisem Gunplay.',
    icon: '🎯',
  },
  'counter-strike': {
    name: 'Counter-Strike 2', developer: 'Valve', publisher: 'Valve',
    release: '2023-09-27', genres: ['Taktik-Shooter'], platforms: ['PC'],
    rating: '8.7', desc: 'Der Nachfolger des Taktik-Shooter-Klassikers, komplett auf Source 2.',
    icon: '🔫',
  },
  roblox: {
    name: 'Roblox', developer: 'Roblox Corporation', publisher: 'Roblox Corporation',
    release: '2006-09-01', genres: ['Plattform', 'Sandbox'], platforms: ['PC', 'Mobile', 'Konsolen'],
    rating: '7.5', desc: 'Plattform für nutzergenerierte Spiele in nahezu jedem Genre.',
    icon: '🟥',
  },
  terraria: {
    name: 'Terraria', developer: 'Re-Logic', publisher: 'Re-Logic',
    release: '2011-05-16', genres: ['Sandbox', 'Action'], platforms: ['PC', 'Konsolen', 'Mobile'],
    rating: '9.1', desc: '2D-Sandbox-Abenteuer mit Grabung, Kampf und Basisbau.',
    icon: '⛏️',
  },
};

export function initGames(nexus) {
  N = nexus;
  const suggestions = document.getElementById('gameSuggestions');
  suggestions.innerHTML = Object.keys(DEMO_GAMES).map(key =>
    `<button class="chip" data-game="${key}">${DEMO_GAMES[key].name}</button>`
  ).join('');

  suggestions.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => runSearch(chip.dataset.game));
  });

  document.getElementById('gameSearchBtn').addEventListener('click', () => {
    runSearch(document.getElementById('gameSearchInput').value);
  });
  document.getElementById('gameSearchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') runSearch(e.target.value);
  });

  N.registerSearchItems(Object.entries(DEMO_GAMES).map(([key, g]) => ({
    id: 'game-' + key,
    label: g.name + ' (Game)',
    icon: 'gamepad-2',
    action: () => { N.navigateTo('games'); runSearch(key); },
  })));
}

async function runSearch(query) {
  const resultEl = document.getElementById('gameResult');
  const key = normalize(query);
  resultEl.innerHTML = `<div class="card muted">Suche läuft…</div>`;

  const data = await fetchGameData(key);

  if (!data) {
    resultEl.innerHTML = `
      <div class="card">
        <p>Kein Treffer für „${escapeHtml(query)}". Aktuell sind nur einige Demo-Spiele hinterlegt.</p>
        <p class="muted">Sobald eine echte Game-API angebunden ist, funktioniert die Suche für beliebige Titel.</p>
      </div>`;
    return;
  }

  resultEl.innerHTML = `
    <div class="game-card">
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
        <p class="muted" style="margin-top:12px;">${data.desc}</p>
      </div>
    </div>
  `;
  N.trackRecent({ id: 'game-' + key, label: data.name, icon: 'gamepad-2', view: 'games' });
}

/**
 * Zentrale Abstraktionsschicht für Game-Daten.
 * Aktuell: liest aus DEMO_GAMES.
 * Später: fetch('/api/games/' + key) gegen dein eigenes Backend,
 * das serverseitig eine echte Game-API (RAWG, IGDB, ...) abfragt.
 */
async function fetchGameData(key) {
  // Beispiel für den echten Aufruf (auskommentiert, da kein Backend läuft):
  //
  // try {
  //   const res = await fetch(`/api/games/${encodeURIComponent(key)}`);
  //   if (!res.ok) return null;
  //   return await res.json();
  // } catch (e) {
  //   console.error('Game API nicht erreichbar', e);
  //   return null;
  // }

  await new Promise(r => setTimeout(r, 250)); // simuliert Netzwerk-Latenz
  return DEMO_GAMES[key] || null;
}

function normalize(str) {
  return (str || '').trim().toLowerCase().replace(/\s+/g, '-');
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
