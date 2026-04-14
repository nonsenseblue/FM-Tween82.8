// ============================================================
//  Tween 82.8 — To Do List
// ============================================================

// ── Storage ──
function todoLoad() {
  try {
    const raw = localStorage.getItem('tween_todo');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function todoSave(items) {
  try { localStorage.setItem('tween_todo', JSON.stringify(items)); } catch { /* ignore */ }
}

let todoItems = todoLoad();

// ── DOM cache ──
const todoDom = {
  input:  document.getElementById('todo-input'),
  list:   document.getElementById('todo-list'),
  date:   document.getElementById('todo-date'),
  status: document.getElementById('todo-status'),
  addBtn: document.getElementById('todo-add-btn'),
};

// ── Render ──
function todoRender() {
  todoDom.list.innerHTML = '';
  todoItems.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'todo-item' + (item.done ? ' done' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = item.done;
    cb.onchange = () => todoToggle(i);

    const txt = document.createElement('span');
    txt.className = 'todo-item-text';
    txt.textContent = item.text;

    const del = document.createElement('button');
    del.className = 'todo-item-del';
    del.textContent = '\u00d7';
    del.onclick = () => todoDelete(i);

    div.appendChild(cb);
    div.appendChild(txt);
    div.appendChild(del);
    todoDom.list.appendChild(div);
  });
  todoUpdateStatus();
}

// ── CRUD ──
function todoAdd() {
  const text = todoDom.input.value.trim();
  if (!text) return;
  todoItems.push({ text, done: false, ts: Date.now() });
  todoSave(todoItems);
  todoDom.input.value = '';
  todoRender();
}

function todoToggle(i) {
  todoItems[i].done = !todoItems[i].done;
  todoSave(todoItems);
  todoRender();
}

function todoDelete(i) {
  todoItems.splice(i, 1);
  todoSave(todoItems);
  todoRender();
}

// ── Status bar ──
function todoUpdateStatus() {
  const total = todoItems.length;
  const done  = todoItems.filter(x => x.done).length;
  todoDom.status.textContent = t('todo.status', total, done);
}

// ── Date display ──
function todoUpdateDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const days = currentLang === 'ja'
    ? ['\u65e5', '\u6708', '\u706b', '\u6c34', '\u6728', '\u91d1', '\u571f']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  todoDom.date.textContent = `${y}/${m}/${d} (${days[now.getDay()]})`;
}

// ── Window helpers ──
function openTodo() {
  openExtraWindow('win-todo');
}

function toggleTodo() {
  const w = document.getElementById('win-todo');
  if (window.getComputedStyle(w).display === 'none') {
    openTodo();
  } else {
    w.style.removeProperty('display');
  }
}

// ── Enter key to add ──
todoDom.input.addEventListener('keydown', e => {
  if (e.key === 'Enter') todoAdd();
});

// ── Init ──
todoDom.input.placeholder = t('todo.placeholder');
todoUpdateDate();
todoRender();
