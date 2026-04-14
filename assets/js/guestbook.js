// ============================================================
//  Tween 82.8 — Guestbook (深夜ラジオのハガキコーナー)
//  Backend: Cloudflare Pages Functions + D1
//  Fallback: localStorage (local dev without D1)
// ============================================================

const GB_API = '/api/guestbook';
let gbMessages = [];
let gbUseApi = true; // try API first, fall back to localStorage

// Fallback presets (shown only in localStorage mode)
const GB_PRESETS = [
  { name: '夜更かしのA',       msg: '毎晩聴いてます。この時間だけは自分に戻れる気がします。',         ts: '2025-12-01 02:14:00' },
  { name: 'ミッドナイトブルー', msg: 'Jazzチャンネル最高。コーヒー片手に深夜残業が捗ります。',       ts: '2025-12-15 01:33:00' },
  { name: '名無しリスナー',     msg: '眠れない夜にたどり着きました。なんだか安心する。',             ts: '2026-01-03 03:45:00' },
  { name: '電波少年',           msg: 'Synthwaveかけながらドライブしてる。夜の高速最高。',             ts: '2026-01-20 23:58:00' },
  { name: 'まどろみの窓辺',     msg: '夢と現実の間、82.8MHz。おやすみなさい。',                      ts: '2026-02-14 04:02:00' },
  { name: '深夜のパン屋',       msg: '仕込み中にいつも流してます。Lofiが生地にいい影響ある気がする。', ts: '2026-03-01 03:20:00' },
];

const gbDom = {
  messages: document.getElementById('gb-messages'),
  name:     document.getElementById('gb-name'),
  msg:      document.getElementById('gb-msg'),
  status:   document.getElementById('gb-status'),
};

// ── API / localStorage ──
async function gbFetch() {
  try {
    const res = await fetch(GB_API);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    gbMessages = Array.isArray(data) ? data : [];
    gbUseApi = true;
  } catch {
    // API unavailable → localStorage fallback
    gbUseApi = false;
    try {
      const raw = localStorage.getItem('tween_guestbook');
      const user = raw ? JSON.parse(raw) : [];
      gbMessages = [...GB_PRESETS, ...user].sort((a, b) => {
        const ta = new Date(a.ts).getTime();
        const tb = new Date(b.ts).getTime();
        return tb - ta;
      });
    } catch {
      gbMessages = [...GB_PRESETS];
    }
  }
  gbRender();
}

async function gbPost(name, msg) {
  if (gbUseApi) {
    try {
      const res = await fetch(GB_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, msg }),
      });
      if (!res.ok) throw new Error(res.status);
      // Refresh from server
      await gbFetch();
      return;
    } catch {
      // API failed → fall back to localStorage for this message
    }
  }
  // localStorage fallback
  const now = new Date();
  const ts = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0') + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0') + ':' +
    String(now.getSeconds()).padStart(2,'0');
  const entry = { name, msg, ts };
  try {
    const raw = localStorage.getItem('tween_guestbook');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    localStorage.setItem('tween_guestbook', JSON.stringify(arr));
  } catch { /* ignore */ }
  gbMessages.unshift(entry);
  gbRender();
}

// ── Render ──
function gbFormatDate(ts) {
  if (!ts) return '';
  // "2026-03-01 03:20:00" → "2026/03/01 03:20"
  return ts.replace(/-/g, '/').replace(/:\d{2}$/, '');
}

function gbRender() {
  gbDom.messages.innerHTML = '';
  gbMessages.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'gb-entry';
    div.innerHTML =
      '<div class="gb-entry-header">' +
        '<span class="gb-entry-name">' + escHtml(entry.name || '名無しリスナー') + '</span>' +
        '<span class="gb-entry-date">' + escHtml(gbFormatDate(entry.ts)) + '</span>' +
      '</div>' +
      '<div class="gb-entry-msg">' + escHtml(entry.msg) + '</div>';
    gbDom.messages.appendChild(div);
  });
  gbDom.status.textContent = t('gb.status', gbMessages.length);
}

// ── Send ──
function gbSend() {
  const msg = gbDom.msg.value.trim();
  if (!msg) return;
  const name = gbDom.name.value.trim() || '名無しリスナー';
  gbDom.msg.value = '';
  gbPost(name, msg);
}

// ── Window helpers ──
function openGuestbook() {
  openExtraWindow('win-guestbook');
  gbFetch(); // refresh on open
}

function closeGuestbook() {
  document.getElementById('win-guestbook').style.removeProperty('display');
}

function toggleGuestbook() {
  const w = document.getElementById('win-guestbook');
  if (window.getComputedStyle(w).display === 'none') {
    openGuestbook();
  } else {
    closeGuestbook();
  }
}

// ── Ctrl+Enter to send ──
gbDom.msg.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    gbSend();
  }
});

// ── Init ──
// Fetch on first open, not on page load
