// ============================================================
//  Tween 82.8 — Inbox (admin限定メールボックス / Outlook Express風)
//  Backend: Cloudflare Pages Functions + D1
//  Fallback: localStorage (local dev without D1)
// ============================================================

const INBOX_API = '/api/inbox';
let inboxMessages = [];
let inboxUseApi = true;
let inboxAdmin = false;
let inboxToken = '';
let inboxPollingId = null;

// ── Admin detection ──
(function detectAdmin() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('admin');
  if (token) {
    inboxAdmin = true;
    inboxToken = token;
    // Strip token from URL to avoid leaking via history/Referer
    params.delete('admin');
    const clean = params.toString();
    const newUrl = window.location.pathname + (clean ? '?' + clean : '') + window.location.hash;
    history.replaceState(null, '', newUrl);
  }
})();

// ── DOM refs ──
const inboxDom = {
  list:       document.getElementById('inbox-list'),
  status:     document.getElementById('inbox-status'),
  unreadBadge: document.getElementById('inbox-unread-badge'),
  // compose
  composeName:    document.getElementById('inbox-compose-name'),
  composeSubject: document.getElementById('inbox-compose-subject'),
  composeEmail:   document.getElementById('inbox-compose-email'),
  composeBody:    document.getElementById('inbox-compose-body'),
  composeStatus:  document.getElementById('inbox-compose-status'),
  // read pane
  readFrom:    document.getElementById('inbox-read-from'),
  readDate:    document.getElementById('inbox-read-date'),
  readSubject: document.getElementById('inbox-read-subject'),
  readEmail:   document.getElementById('inbox-read-email'),
  readEmailRow: document.getElementById('inbox-read-email-row'),
  readBody:    document.getElementById('inbox-read-body'),
};

// ── Fetch messages ──
async function inboxFetch() {
  try {
    const res = await fetch(INBOX_API);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    inboxMessages = Array.isArray(data) ? data : [];
    inboxUseApi = true;
  } catch {
    inboxUseApi = false;
    try {
      const raw = localStorage.getItem('tween_inbox');
      inboxMessages = raw ? JSON.parse(raw) : [];
    } catch {
      inboxMessages = [];
    }
  }
  inboxRender();
  inboxUpdateBadge();
}

// ── Render message list ──
function inboxFormatDate(ts) {
  if (!ts) return '';
  return ts.replace(/-/g, '/').replace(/:\d{2}$/, '');
}

function inboxRender() {
  inboxDom.list.innerHTML = '';
  inboxMessages.forEach(msg => {
    const row = document.createElement('tr');
    row.className = 'inbox-row' + (msg.unread ? ' inbox-unread' : '');
    row.dataset.id = msg.id;

    row.innerHTML =
      '<td class="inbox-col-from">' + escHtml(msg.name || '名無しリスナー') + '</td>' +
      '<td class="inbox-col-subject">' + escHtml(msg.subject) + '</td>' +
      '<td class="inbox-col-date">' + escHtml(inboxFormatDate(msg.ts)) + '</td>';

    // Admin can click to read body
    if (inboxAdmin) {
      row.style.cursor = 'pointer';
      row.addEventListener('dblclick', () => inboxReadMessage(msg.id));
    }

    inboxDom.list.appendChild(row);
  });
  const unread = inboxMessages.filter(m => m.unread).length;
  inboxDom.status.textContent = t('inbox.status', inboxMessages.length, unread);
}

// ── Read single message (admin only) ──
async function inboxReadMessage(id) {
  if (!inboxAdmin) return;

  try {
    const res = await fetch(INBOX_API + '?id=' + id, {
      headers: { 'Authorization': 'Bearer ' + inboxToken },
    });
    if (!res.ok) throw new Error(res.status);
    const msg = await res.json();

    // Show read pane
    inboxDom.readFrom.textContent = msg.name || '名無しリスナー';
    inboxDom.readDate.textContent = inboxFormatDate(msg.ts);
    inboxDom.readSubject.textContent = msg.subject;
    if (inboxDom.readEmail) {
      inboxDom.readEmail.textContent = msg.email || '';
      inboxDom.readEmailRow.style.display = msg.email ? '' : 'none';
    }
    inboxDom.readBody.textContent = msg.body;
    document.getElementById('inbox-read-pane').style.display = 'block';
    document.getElementById('inbox-list-pane').style.display = 'none';

    // Mark as read (fire-and-forget — don't block UI)
    if (msg.unread) {
      fetch(INBOX_API, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + inboxToken,
        },
        body: JSON.stringify({ id }),
      }).catch(() => {});
      // Update local state immediately
      const local = inboxMessages.find(m => m.id === id);
      if (local) local.unread = 0;
      inboxRender();
      inboxUpdateBadge();
    }
  } catch {
    // localStorage fallback — no body available
  }
}

function inboxBackToList() {
  document.getElementById('inbox-read-pane').style.display = 'none';
  document.getElementById('inbox-list-pane').style.display = 'block';
}

// ── Compose / Send ──
function openInboxCompose() {
  openExtraWindow('win-inbox-compose');
  inboxDom.composeStatus.textContent = '';
}

function closeInboxCompose() {
  document.getElementById('win-inbox-compose').style.removeProperty('display');
}

async function inboxSend() {
  const subject = inboxDom.composeSubject.value.trim();
  const body = inboxDom.composeBody.value.trim();
  if (!subject) { inboxDom.composeStatus.textContent = t('inbox.req.subject'); return; }
  if (!body) { inboxDom.composeStatus.textContent = t('inbox.req.body'); return; }

  const name = inboxDom.composeName.value.trim() || '名無しリスナー';
  const email = inboxDom.composeEmail ? inboxDom.composeEmail.value.trim() : '';

  if (inboxUseApi) {
    try {
      const res = await fetch(INBOX_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, body, email }),
      });
      if (!res.ok) throw new Error(res.status);
      inboxDom.composeStatus.textContent = t('inbox.sent');
      inboxDom.composeSubject.value = '';
      inboxDom.composeBody.value = '';
      if (inboxDom.composeEmail) inboxDom.composeEmail.value = '';
      await inboxFetch();
      return;
    } catch { /* fall through to localStorage */ }
  }

  // localStorage fallback
  const now = new Date();
  const ts = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0') + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0') + ':' +
    String(now.getSeconds()).padStart(2,'0');
  const entry = { id: Date.now(), name, subject, body, unread: 1, ts };
  try {
    const raw = localStorage.getItem('tween_inbox');
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    localStorage.setItem('tween_inbox', JSON.stringify(arr));
  } catch { /* ignore */ }
  inboxMessages.unshift(entry);
  inboxRender();
  inboxUpdateBadge();
  inboxDom.composeStatus.textContent = t('inbox.sent');
  inboxDom.composeSubject.value = '';
  inboxDom.composeBody.value = '';
}

// Ctrl+Enter to send in compose
if (inboxDom.composeBody) {
  inboxDom.composeBody.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      inboxSend();
    }
  });
}

// ── Badge & taskbar notification ──
function inboxUpdateBadge() {
  const unread = inboxMessages.filter(m => m.unread).length;
  if (inboxDom.unreadBadge) {
    inboxDom.unreadBadge.textContent = unread > 0 ? unread : '';
    inboxDom.unreadBadge.style.display = unread > 0 ? 'inline-block' : 'none';
  }
  // Taskbar tray icon blink (admin only)
  const trayIcon = document.getElementById('tray-inbox');
  if (trayIcon) {
    if (inboxAdmin && unread > 0) {
      trayIcon.classList.add('tray-inbox-blink');
    } else {
      trayIcon.classList.remove('tray-inbox-blink');
    }
  }
}

// ── "You've got mail!" dialog (admin only, on page load) ──
function inboxCheckMail() {
  if (!inboxAdmin) return;
  const unread = inboxMessages.filter(m => m.unread).length;
  if (unread > 0) {
    document.getElementById('inbox-mail-dialog').style.display = 'flex';
    document.getElementById('inbox-mail-count-wrap').textContent = t('inbox.mail.count', unread);
  }
}

function closeMailDialog() {
  document.getElementById('inbox-mail-dialog').style.display = 'none';
}

function mailDialogOpenInbox() {
  closeMailDialog();
  openInbox();
}

// ── Window helpers ──
function openInbox() {
  openExtraWindow('win-inbox');
  inboxBackToList();
  inboxFetch();
  inboxStartPolling();
}

function closeInbox() {
  document.getElementById('win-inbox').style.removeProperty('display');
  inboxStopPolling();
}

// ── Polling (every 30s when inbox is open) ──
function inboxStartPolling() {
  if (inboxPollingId) return;
  inboxPollingId = setInterval(inboxFetch, 30000);
}

function inboxStopPolling() {
  if (inboxPollingId) {
    clearInterval(inboxPollingId);
    inboxPollingId = null;
  }
}

// ── Init ──
// Admin: fetch immediately for "You've got mail!" check
// Non-admin: defer fetch until inbox is opened
if (inboxAdmin) {
  inboxFetch().then(() => { inboxCheckMail(); });
}
