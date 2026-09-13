// ============================================================
// notes.js — Notepad (LocalStorage) + optionale Erinnerungen
//
// WICHTIG: Erinnerungen funktionieren nur, solange der Tab offen
// ist (kein Service Worker im Hintergrund) — das ist eine bewusste
// Grenze reiner Frontend-Timer, kein Bug. Bei Bedarf für eine echte
// "auch bei geschlossenem Tab"-Erinnerung bräuchte es Push-Notifications
// über einen Server, was ein größeres Zusatzfeature wäre.
// ============================================================

let N;
let activeId = null;
let reminderInterval = null;

export function initNotes(nexus) {
  N = nexus;
  const area = document.getElementById('notesArea');
  area.innerHTML = `
    <div class="notes-layout">
      <div>
        <div class="field-row">
          <button class="btn btn-primary btn-sm" id="noteNew" style="width:100%;justify-content:center;">
            <i class="icon" data-icon="plus"></i> Neue Notiz
          </button>
        </div>
        <input type="text" id="noteSearch" placeholder="Notizen durchsuchen…" style="margin-bottom:10px;">
        <div class="notes-list" id="notesList"></div>
      </div>
      <div class="card" style="margin:0;">
        <input type="text" id="noteTitle" placeholder="Titel" style="margin-bottom:10px;font-weight:600;">
        <textarea id="noteBody" placeholder="Inhalt…" style="min-height:240px;"></textarea>
        <div class="field-row" style="margin-top:10px;">
          <label style="min-width:auto;">Erinnerung</label>
          <input type="datetime-local" id="noteReminder">
          <button class="btn btn-sm" id="noteClearReminder" title="Erinnerung entfernen">
            <i class="icon" data-icon="x"></i>
          </button>
        </div>
        <div class="field-row" style="margin-top:6px;">
          <button class="btn btn-primary btn-sm" id="noteSave">Speichern</button>
          <button class="btn btn-sm btn-danger" id="noteDelete">Löschen</button>
        </div>
      </div>
    </div>
  `;

  area.querySelector('#noteNew').addEventListener('click', createNote);
  area.querySelector('#noteSave').addEventListener('click', saveActiveNote);
  area.querySelector('#noteDelete').addEventListener('click', deleteActiveNote);
  area.querySelector('#noteClearReminder').addEventListener('click', () => {
    area.querySelector('#noteReminder').value = '';
  });
  area.querySelector('#noteSearch').addEventListener('input', e => renderList(e.target.value));

  renderList();
  startReminderWatcher();
  document.dispatchEvent(new CustomEvent('nexus:icons-changed'));

  N.registerSearchItems([
    { id: 'notes', label: 'Notepad', icon: 'notebook-pen', action: () => N.navigateTo('notes') },
  ]);
}

function getNotes() { return N.storage.get('notes', []); }
function setNotes(notes) { N.storage.set('notes', notes); }

function renderList(filter = '') {
  const notes = getNotes().sort((a, b) => b.updated - a.updated);
  const list = document.getElementById('notesList');
  const q = filter.trim().toLowerCase();
  const visible = q ? notes.filter(n => (n.title + n.body).toLowerCase().includes(q)) : notes;

  if (!visible.length) {
    list.innerHTML = '<div class="empty-state" style="padding:12px;">Keine Notizen. Leg mit „Neue Notiz" los.</div>';
    return;
  }
  list.innerHTML = visible.map(n => `
    <div class="note-item ${n.id === activeId ? 'is-active' : ''}" data-id="${n.id}">
      <div class="note-title">
        ${n.reminderAt ? '<i class="icon" data-icon="bell" style="font-size:11px;margin-right:4px;"></i>' : ''}
        ${escapeHtml(n.title || 'Ohne Titel')}
      </div>
      <div class="note-preview">${escapeHtml(n.body.slice(0, 60))}</div>
    </div>
  `).join('');
  list.querySelectorAll('.note-item').forEach(el => el.addEventListener('click', () => openNote(el.dataset.id)));
  document.dispatchEvent(new CustomEvent('nexus:icons-changed'));
}

function createNote() {
  const notes = getNotes();
  const note = { id: crypto.randomUUID(), title: '', body: '', reminderAt: null, reminderFired: false, updated: Date.now() };
  notes.push(note);
  setNotes(notes);
  activeId = note.id;
  renderList();
  loadIntoEditor(note);
  document.getElementById('noteTitle').focus();
}

function openNote(id) {
  const note = getNotes().find(n => n.id === id);
  if (!note) return;
  activeId = id;
  loadIntoEditor(note);
  renderList(document.getElementById('noteSearch').value);
}

function loadIntoEditor(note) {
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteBody').value = note.body;
  document.getElementById('noteReminder').value = note.reminderAt ? toLocalInputValue(note.reminderAt) : '';
}

function saveActiveNote() {
  if (!activeId) { N.toast('Erst „Neue Notiz" wählen.', 'error'); return; }
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === activeId);
  if (idx === -1) return;

  const reminderRaw = document.getElementById('noteReminder').value;
  const newReminderAt = reminderRaw ? new Date(reminderRaw).getTime() : null;

  notes[idx].title = document.getElementById('noteTitle').value;
  notes[idx].body = document.getElementById('noteBody').value;
  // Wenn sich die Erinnerungszeit geändert hat, "fired"-Status zurücksetzen
  if (newReminderAt !== notes[idx].reminderAt) notes[idx].reminderFired = false;
  notes[idx].reminderAt = newReminderAt;
  notes[idx].updated = Date.now();
  setNotes(notes);
  renderList(document.getElementById('noteSearch').value);

  if (newReminderAt && Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  N.toast('Notiz gespeichert', 'ok');
}

function deleteActiveNote() {
  if (!activeId) return;
  setNotes(getNotes().filter(n => n.id !== activeId));
  activeId = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteBody').value = '';
  document.getElementById('noteReminder').value = '';
  renderList();
  N.toast('Notiz gelöscht', 'info');
}

// ------------------------------------------------------------
// Erinnerungs-Watcher — prüft alle 20s auf fällige Erinnerungen
// ------------------------------------------------------------
function startReminderWatcher() {
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkReminders, 20000);
  checkReminders(); // sofort einmal prüfen
}

function checkReminders() {
  const notes = getNotes();
  const now = Date.now();
  let changed = false;

  notes.forEach(note => {
    if (note.reminderAt && !note.reminderFired && note.reminderAt <= now) {
      fireReminder(note);
      note.reminderFired = true;
      changed = true;
    }
  });

  if (changed) setNotes(notes);
}

function fireReminder(note) {
  const title = note.title || 'Notiz-Erinnerung';
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body: note.body.slice(0, 100) || 'Zeit für deine Notiz.' });
  } else {
    N.toast(`Erinnerung: ${title}`, 'info', 6000);
  }
}

function toLocalInputValue(timestamp) {
  const d = new Date(timestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
