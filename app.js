// ============================================================
// Nexus — Core App
// Handles: navigation, command palette, toasts, modal, clock,
// theme/settings, recent-tools tracking.
// Modules (games.js, tools.js, ...) attach themselves to `Nexus`.
// ============================================================

import { initGames } from './modules/games.js';
import { initTools } from './modules/tools.js';
import { initUrls } from './modules/urls.js';
import { initFiles } from './modules/files.js';
import { initNotes } from './modules/notes.js';
import { initMedia } from './modules/media.js';
import { initSettings } from './modules/settings.js';

// ---- Shared namespace, so modules can call core helpers ----
export const Nexus = {
  toast,
  openModal,
  closeModal,
  navigateTo,
  registerSearchItems,
  trackRecent,
  storage: {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem('nexus:' + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        console.error('Storage read failed', e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('nexus:' + key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Storage write failed', e);
        toast('Speichern fehlgeschlagen (Speicher voll?)', 'error');
        return false;
      }
    },
  },
};

// ============================================================
// Icons (lightweight text-fallback if lucide font failed to load)
// ============================================================
function renderIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.classList.add('lucide', `lucide-${el.dataset.icon}`);
  });
}

// ============================================================
// Navigation
// ============================================================
const views = ['dashboard', 'games', 'tools', 'media', 'urls', 'files', 'notes', 'settings'];

function navigateTo(viewName) {
  if (!views.includes(viewName)) return;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('is-active'));
  document.getElementById('view-' + viewName)?.classList.add('is-active');
  document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('is-active');
  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function initNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.goto));
  });
}

// ---- Mobile sidebar ----
function initMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('mobileToggle');
  const scrim = document.getElementById('sidebarScrim');
  toggle.addEventListener('click', () => sidebar.classList.toggle('is-open'));
  scrim.addEventListener('click', closeMobileSidebar);
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('is-open');
}

// ============================================================
// Toasts
// ============================================================
function toast(message, type = 'info', duration = 3200) {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 180ms ease';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// ============================================================
// Modal
// ============================================================
function openModal(title, bodyNode) {
  document.getElementById('modalTitle').textContent = title;
  const body = document.getElementById('modalBody');
  body.innerHTML = '';
  if (typeof bodyNode === 'string') body.innerHTML = bodyNode;
  else body.appendChild(bodyNode);
  document.getElementById('modalOverlay').classList.add('is-open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('is-open');
}
function initModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ============================================================
// Clock
// ============================================================
function initClock() {
  const el = document.getElementById('clock');
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 15000);
}

// ============================================================
// Recently used tools (dashboard panel)
// ============================================================
function trackRecent(item) {
  // item: { id, label, icon, view }
  const list = Nexus.storage.get('recent', []);
  const filtered = list.filter(i => i.id !== item.id);
  filtered.unshift(item);
  Nexus.storage.set('recent', filtered.slice(0, 6));
  renderRecent();
}

function renderRecent() {
  const list = Nexus.storage.get('recent', []);
  const ul = document.getElementById('recentList');
  if (!list.length) {
    ul.innerHTML = '<li class="empty-state">Noch nichts genutzt — leg los, und es taucht hier auf.</li>';
    return;
  }
  ul.innerHTML = list.map(i => `
    <li data-id="${i.id}" data-view="${i.view}">
      <i class="icon" data-icon="${i.icon || 'sparkles'}"></i> ${i.label}
    </li>
  `).join('');
  ul.querySelectorAll('li[data-view]').forEach(li => {
    li.addEventListener('click', () => {
      navigateTo(li.dataset.view);
      document.dispatchEvent(new CustomEvent('nexus:open-tool', { detail: li.dataset.id }));
    });
  });
  renderIcons();
}

// ============================================================
// Command Palette (Ctrl+K)
// ============================================================
let searchIndex = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: 'layout-grid', action: () => navigateTo('dashboard') },
  { id: 'nav-games', label: 'Games', icon: 'gamepad-2', action: () => navigateTo('games') },
  { id: 'nav-tools', label: 'Tools', icon: 'wrench', action: () => navigateTo('tools') },
  { id: 'nav-media', label: 'Media Tools', icon: 'film', action: () => navigateTo('media') },
  { id: 'nav-urls', label: 'URL Tools', icon: 'link', action: () => navigateTo('urls') },
  { id: 'nav-files', label: 'File Tools', icon: 'file-cog', action: () => navigateTo('files') },
  { id: 'nav-notes', label: 'Notepad', icon: 'notebook-pen', action: () => navigateTo('notes') },
  { id: 'nav-settings', label: 'Einstellungen', icon: 'settings', action: () => navigateTo('settings') },
];

function registerSearchItems(items) {
  searchIndex = searchIndex.concat(items);
}

function initPalette() {
  const overlay = document.getElementById('paletteOverlay');
  const input = document.getElementById('paletteInput');
  const results = document.getElementById('paletteResults');
  let selected = 0;
  let currentMatches = [];

  function open() {
    overlay.classList.add('is-open');
    input.value = '';
    input.focus();
    renderMatches('');
  }
  function close() {
    overlay.classList.remove('is-open');
  }
  function renderMatches(query) {
    const q = query.trim().toLowerCase();
    currentMatches = q
      ? searchIndex.filter(i => i.label.toLowerCase().includes(q))
      : searchIndex.slice(0, 8);
    selected = 0;
    results.innerHTML = currentMatches.map((m, idx) => `
      <li data-idx="${idx}" class="${idx === selected ? 'is-selected' : ''}">
        <i class="icon" data-icon="${m.icon}"></i> ${m.label}
      </li>
    `).join('') || '<li class="empty-state">Keine Treffer.</li>';
    renderIcons();
    results.querySelectorAll('li[data-idx]').forEach(li => {
      li.addEventListener('click', () => {
        const match = currentMatches[Number(li.dataset.idx)];
        close();
        match?.action?.();
      });
    });
  }

  document.getElementById('searchTrigger').addEventListener('click', open);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.classList.contains('is-open') ? close() : open();
    }
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(selected + 1, currentMatches.length - 1);
      updateSelection();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
      updateSelection();
    }
    if (e.key === 'Enter') {
      currentMatches[selected]?.action?.();
      close();
    }
  });

  function updateSelection() {
    results.querySelectorAll('li').forEach((li, idx) => {
      li.classList.toggle('is-selected', idx === selected);
    });
  }

  input.addEventListener('input', () => renderMatches(input.value));
}

// ============================================================
// Boot
// ============================================================
function boot() {
  renderIcons();
  initNav();
  initMobileNav();
  initModal();
  initClock();
  renderRecent();

  // Init feature modules — each attaches its own view logic
  // and can register search items via Nexus.registerSearchItems().
  initTools(Nexus);
  initGames(Nexus);
  initUrls(Nexus);
  initFiles(Nexus);
  initNotes(Nexus);
  initMedia(Nexus);
  initSettings(Nexus);

  initPalette(); // after modules so their items are indexed
  renderIcons();

  document.addEventListener('nexus:icons-changed', renderIcons);
}

document.addEventListener('DOMContentLoaded', boot);
