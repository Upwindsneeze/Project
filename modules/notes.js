// ============================================================
// notes.js — Notepad (LocalStorage-basiert)
// ============================================================

let N;
let activeId = null;

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
        <textarea id="noteBody" placeholder="Inhalt…" style="min-height:300px;"></textarea>
        <div class="field-row" style="margin-top:10px;">
          <button class="btn btn-primary btn-sm" id="noteSave">Speichern</button>
          <button class="btn btn-sm btn-danger" id="noteDelete">Löschen</button>
        </div>
      </div>
    </div>
  `;

  area.querySelector('#noteNew').addEventListener('click', createNote);
  area.querySelector('#noteSave').addEventListener('click', saveActiveNote);
  area.querySelector('#noteDelete').addEventListener('click', deleteActiveNote);
  area.querySelector('#noteSearch').addEventListener('input', e => renderList(e.target.value));

  renderList();
  document.dispatchEvent(new CustomEvent('nexus:icons-changed'));

  N.registerSearchItems([
    { id: 'notes', label: 'Notepad', icon: 'notebook-pen', action: () => N.navigateTo('notes') },
  ]);
}

function getNotes() {
  return N.storage.get('notes', []);
}
function setNotes(notes) {
  N.storage.set('notes', notes);
}

function renderList(filter = '') {
  const notes = getNotes().sort((a, b) => b.updated - a.updated);
  const list = document.getElementById('notesList');
  const q = filter.trim().toLowerCase();
  const visible = q
    ? notes.filter(n => (n.title + n.body).toLowerCase().includes(q))
    : notes;

  if (!visible.length) {
    list.innerHTML = '<div class="empty-state" style="padding:12px;">Keine Notizen. Leg mit „Neue Notiz" los.</div>';
    return;
  }

  list.innerHTML = visible.map(n => `
    <div class="note-item ${n.id === activeId ? 'is-active' : ''}" data-id="${n.id}">
      <div class="note-title">${escapeHtml(n.title || 'Ohne Titel')}</div>
      <div class="note-preview">${escapeHtml(n.body.slice(0, 60))}</div>
    </div>
  `).join('');

  list.querySelectorAll('.note-item').forEach(el => {
    el.addEventListener('click', () => openNote(el.dataset.id));
  });
}

function createNote() {
  const notes = getNotes();
  const note = { id: crypto.randomUUID(), title: '', body: '', updated: Date.now() };
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
}

function saveActiveNote() {
  if (!activeId) { N.toast('Erst „Neue Notiz" wählen.', 'error'); return; }
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === activeId);
  if (idx === -1) return;
  notes[idx].title = document.getElementById('noteTitle').value;
  notes[idx].body = document.getElementById('noteBody').value;
  notes[idx].updated = Date.now();
  setNotes(notes);
  renderList(document.getElementById('noteSearch').value);
  N.toast('Notiz gespeichert', 'ok');
}

function deleteActiveNote() {
  if (!activeId) return;
  const notes = getNotes().filter(n => n.id !== activeId);
  setNotes(notes);
  activeId = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteBody').value = '';
  renderList();
  N.toast('Notiz gelöscht', 'info');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
