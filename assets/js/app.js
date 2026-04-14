// ============================================================
//  Tween 82.8 — Main Application
// ============================================================

// ============================================================
//  DOM cache
// ============================================================
const dom = {
  genreGrid:   document.getElementById("genre-grid"),
  npIdle:      document.getElementById("np-idle"),
  npContent:   document.getElementById("np-content"),
  npThumb:     document.getElementById("np-thumb"),
  npTitle:     document.getElementById("np-title"),
  npChannel:   document.getElementById("np-channel"),
  npGenreTag:  document.getElementById("np-genre-tag"),
  progBar:     document.getElementById("prog-bar"),
  progFill:    document.getElementById("prog-fill"),
  progCur:     document.getElementById("prog-cur"),
  progTot:     document.getElementById("prog-tot"),
  digTime:     document.getElementById("dig-time"),
  visualizer:  document.getElementById("visualizer"),
  btnPlay:     document.getElementById("btn-play"),
  volSlider:   document.getElementById("vol-slider"),
  volVal:      document.getElementById("vol-val"),
  statusBar:   document.getElementById("status-bar"),
  shuffleInfo: document.getElementById("shuffle-info"),
  shuffleTxt:  document.getElementById("shuffle-txt"),
};

// ============================================================
//  State
// ============================================================
let playlist      = [];
let playIdx       = 0;
let ytPlayer      = null;
let ytReady       = false;
let isPlaying     = false;
let currentGenre  = null;
let progInterval  = null;
let visInterval   = null;
let errorStreak   = 0;          // consecutive error counter
const MAX_ERRORS  = 8;          // random-jump after this many consecutive errors
let pendingTrack  = null;       // queued when ytReady not yet true

// ============================================================
//  Utilities
// ============================================================
const fmtTime = s => {
  if (!s || isNaN(s)) return "--:--";
  return `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(Math.floor(s % 60)).padStart(2,"0")}`;
};

const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const setStatus = msg => { dom.statusBar.textContent = msg; };

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ============================================================
//  #5: Win95-style click sound (Web Audio API)
// ============================================================
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}
function playBeep(freq = 880, dur = 40, type = "square", vol = 0.06) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.start();
    osc.stop(ctx.currentTime + dur / 1000);
  } catch (e) { /* silently ignore */ }
}

// Attach click sounds to all interactive elements via delegation
document.addEventListener("click", e => {
  if (e.target.closest(".ctrl-btn"))        playBeep(900, 35, "square");
  else if (e.target.closest(".genre-btn"))  playBeep(750, 45, "square");
  else if (e.target.closest(".title-btn"))  playBeep(1000, 25, "square");
  else if (e.target.closest(".start-btn"))  playBeep(600, 60, "square");
  else if (e.target.closest(".start-menu-item")) playBeep(800, 30, "square");
  else if (e.target.closest(".file-icon.clickable")) playBeep(800, 30, "square");
  else if (e.target.closest(".desktop-icon")) playBeep(700, 30, "square");
  else if (e.target.closest(".ql-btn"))     playBeep(900, 25, "square");
  else if (e.target.closest(".taskbar-app")) playBeep(800, 30, "square");
}, { capture: true });

// ============================================================
//  Genre data (inlined — works in both browser and Electron)
// ============================================================
// pl = YouTube playlist ID (no API key needed). q = search query (fallback / genres.json sync).
const GENRES_DATA = [
  { label: "Lofi Hip-Hop", q: "lofi hip hop bgm study music 1 hour mix",            color: "#55ccff", pl: "UUSJ4gkVC6NrvII8umztf0Ow" },
  { label: "Jazz",         q: "jazz cafe instrumental bgm relaxing 1 hour mix",      color: "#ffeeaa", pl: "UUJhjE7wbdYAae1G25m0tHAA" },
  { label: "Classical",    q: "classical music piano relaxing orchestra 1 hour mix",  color: "#b8a4ff", pl: "UUwobzUc3z-0PrFpoRxNszXQ" },
  { label: "Ambient",      q: "ambient music relaxing background 1 hour mix",         color: "#66ffdd", pl: "PLbpi6ZahtOH4KqVCYcyU7a7nP0JSwA9X-" },
  { label: "Chillout",     q: "chillout downtempo relaxing chill music 1 hour mix",   color: "#88ffdd", pl: "UU5nc_ZtjKW1htCVZVRxlQAQ" },
  { label: "City Pop",     q: "city pop japanese 80s bgm 1 hour mix",                 color: "#ffcc55", pl: "UUqM3bk6SGTxTiXRp-9RldIA" },
  { label: "Film Score",   q: "film score cinematic orchestral music 1 hour mix",     color: "#ffddaa", pl: "UU3swwxiALG5c0Tvom83tPGg" },
  { label: "Synthwave",    q: "synthwave retrowave electronic music 1 hour mix",      color: "#ff6688", pl: "UUD-4g5w1h8xQpLaNS_ghU4g" },
  { label: "Post-Rock",    q: "post rock instrumental music 1 hour mix",              color: "#99ffaa", pl: "UU-wdveKCDbbjK0_rzR2XhVA" },
  { label: "Nature",       q: "nature sounds rain forest birds relaxing 1 hour",      color: "#aaffcc", pl: "UUjzHeG1KWoonmf9d5KBvSiw" },
  { label: "Bossa Nova",   q: "bossa nova jazz cafe instrumental 1 hour mix",         color: "#ffb347", pl: "UUJhjE7wbdYAae1G25m0tHAA", extra: true },
  { label: "R&B / Soul",   q: "rnb soul smooth instrumental bgm 1 hour mix",          color: "#da70d6", pl: "UUXIyz409s7bNWVcM-vjfdVA", extra: true },
  { label: "Electronic",   q: "electronic music instrumental bgm 1 hour mix",         color: "#00cfff", pl: "UU_aEa8K-EOJ3D6gOs7HcyNg", extra: true },
  { label: "Indie Pop",    q: "indie pop bgm background music 1 hour mix",            color: "#ff9999", pl: "UUSa8IUd1uEjlREMa21I3ZPQ", extra: true },
  { label: "Folk",         q: "folk acoustic guitar instrumental music 1 hour mix",   color: "#c8a96e", pl: "UUY_yvv00PZlF0b1rx3_EdPg", extra: true },
  { label: "Piano Solo",   q: "solo piano peaceful instrumental music 1 hour mix",    color: "#d4d4ff", pl: "UUPZUQqtVDmcjm4NY5FkzqLA", extra: true },
  { label: "New Age",      q: "new age meditation healing music 1 hour mix",          color: "#aaffee", pl: "UUM0YvsRfYfsniGAhjvYFOSA", extra: true },
  { label: "Drum & Bass",  q: "drum and bass liquid dnb instrumental 1 hour mix",     color: "#ff4444", pl: "UUr8oc-LOaApCXWLjL7vdsgw", extra: true },
  { label: "House",        q: "house music deep house electronic bgm 1 hour mix",     color: "#ffaa00", pl: "UU3ifTl5zKiCAhHIBQYcaTeg", extra: true },
  { label: "K-Pop BGM",    q: "kpop instrumental bgm background 1 hour mix",          color: "#ff77bb", pl: "UUHkRZDNWMUdhHbX7UliqD_Q", extra: true },
  { label: "Anime OST",    q: "anime soundtrack instrumental ost bgm 1 hour mix",     color: "#77aaff", pl: "UUiiOdS3XjGX6loKS__iVKzg", extra: true },
  { label: "Game Music",   q: "video game music instrumental ost bgm 1 hour mix",     color: "#88ff44", pl: "UUDVKYPXwdYUQfgA05CkyFSg", extra: true },
  { label: "Meditation",   q: "meditation zen relaxation music peaceful 1 hour",      color: "#ccffcc", pl: "UUM0YvsRfYfsniGAhjvYFOSA", extra: true },
  { label: "Gospel",       q: "gospel choir inspirational music 1 hour mix",          color: "#ffdd55", pl: "UUxfT2itFYF9lhBfjOxGZykw", extra: true },
  { label: "Trap Beats",   q: "trap beats instrumental hip hop bgm 1 hour mix",       color: "#aa55ff", pl: "UUa10nxShhzNrCE1o2ZOPztg", extra: true },
  { label: "Reggae",       q: "reggae instrumental relaxing bgm 1 hour mix",          color: "#33cc66", pl: "UUFOj-lN_skdv9nt7Ovgrraw", extra: true },
  { label: "Blues",        q: "blues guitar instrumental relaxing music 1 hour mix",  color: "#5599ff", pl: "UUBw2N1GV5_WeqZlBfcy0TMg", extra: true },
  { label: "Funk",         q: "funk instrumental groove music bgm 1 hour mix",        color: "#ff8833", pl: "UUrxKnnnS0y8STYfRSf_v1Lw", extra: true },
  { label: "Disco",        q: "disco 70s 80s instrumental dance bgm 1 hour mix",      color: "#ffcc00", pl: "UUpDJl2EmP7Oh90Vylx0dZtA", extra: true },
  { label: "Celtic",       q: "celtic folk instrumental music bgm 1 hour mix",        color: "#44cc88", pl: "UUj9dq3cAIf9ppByiVJGAv2Q", extra: true },
  { label: "Flamenco",     q: "flamenco guitar instrumental spanish music 1 hour mix",color: "#ff5533", pl: "UUgx4DmllfcVuxBUwmS5amsA", extra: true },
  { label: "Latin Jazz",   q: "latin jazz salsa instrumental bgm 1 hour mix",         color: "#ff9944", pl: "UULpiArDcvFHxuqNlqXLR04A", extra: true },
  { label: "Afrobeat",     q: "afrobeat instrumental world music bgm 1 hour mix",     color: "#eeaa22", pl: "UU_N52iPMwZIQBXkcCh3t9Rw", extra: true },
  { label: "Swing",        q: "swing big band jazz instrumental music 1 hour mix",    color: "#ffcc88", pl: "UULue5AhDOIpePYzlc3rOVVQ", extra: true },
  { label: "Smooth Jazz",  q: "smooth jazz saxophone instrumental bgm 1 hour mix",    color: "#99ccff", pl: "UUJhjE7wbdYAae1G25m0tHAA", extra: true },
  { label: "Bebop",        q: "bebop jazz instrumental music 1 hour mix",             color: "#ffaa77", pl: "UULue5AhDOIpePYzlc3rOVVQ", extra: true },
  { label: "Ska",          q: "ska instrumental upbeat bgm music 1 hour mix",         color: "#88ffaa", pl: "UUji2l5wcs6GoYJY1GgG_slQ", extra: true },
  { label: "Shoegaze",     q: "shoegaze dream pop instrumental music 1 hour mix",     color: "#cc99ff", pl: "UU5nc_ZtjKW1htCVZVRxlQAQ", extra: true },
  { label: "Dark Ambient", q: "dark ambient atmospheric instrumental music 1 hour mix",color: "#556677", pl: "UUVHOgH4XEyYx-ZEaya1XqCQ", extra: true },
  { label: "Chiptune",     q: "chiptune 8bit video game music bgm 1 hour mix",        color: "#00ff88", pl: "UUE1BEIqOeXjmIFu5G9wU_xg", extra: true },
  { label: "Vaporwave",    q: "vaporwave aesthetic music bgm 1 hour mix",             color: "#ff77ee", pl: "UUB2VG-7K-uVRBPOCWyHFgrA", extra: true },
  { label: "Minimal",      q: "minimal techno electronic instrumental 1 hour mix",    color: "#aaaaaa", pl: "UUDf6reK_hHcz0d7KWBhmPhA", extra: true },
  { label: "Trance",       q: "trance electronic instrumental music bgm 1 hour mix",  color: "#44aaff", pl: "UUalCDSmZAYD73tqVZ4l8yJg", extra: true },
  { label: "Orchestral Pop",q:"orchestral pop instrumental cinematic bgm 1 hour mix", color: "#ffaacc", pl: "UU3swwxiALG5c0Tvom83tPGg", extra: true },
];

buildGenreButtons(GENRES_DATA);

function buildGenreButtons(genres = GENRES_DATA) {
  const listbox = document.getElementById("genre-listbox");

  genres.forEach((g, i) => {
    // ── Button grid ──
    const btn = document.createElement("button");
    btn.className = g.extra ? "genre-btn genre-btn-extra" : "genre-btn";
    btn.textContent = g.label;
    btn.style.borderLeftColor = g.color;
    btn.dataset.genreIdx = i;
    btn.onclick = () => selectGenre(g, i);
    dom.genreGrid.appendChild(btn);

    // ── Listbox row ──
    const row = document.createElement("div");
    row.className = "genre-list-row";
    row.dataset.genreIdx = i;
    row.innerHTML =
      `<span class="genre-list-swatch" style="background:${g.color}"></span>` +
      `<span class="genre-list-name">${g.label}</span>` +
      `<span class="genre-list-type">${g.extra ? "EXT" : "STD"}</span>`;
    row.onclick = () => selectGenre(g, i);
    listbox.appendChild(row);
  });
}

// ============================================================
//  YouTube search — Cloudflare Worker proxy + localStorage cache
//  API keys are stored securely in the Worker (not exposed here)
// ============================================================
const WORKER_URL = "https://tween-api.katasumithee.workers.dev";
const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 hours (browser-side cache)

function getCachedSearch(label) {
  try {
    const raw = localStorage.getItem(`tween_s_${label}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`tween_s_${label}`); return null; }
    return data;
  } catch { return null; }
}

function setCachedSearch(label, items) {
  try {
    localStorage.setItem(`tween_s_${label}`, JSON.stringify({ data: items, ts: Date.now() }));
  } catch { /* storage full — skip cache */ }
}

async function searchYouTube(genre) {
  const url = `${WORKER_URL}/search?genre=${encodeURIComponent(genre.label)}&q=${encodeURIComponent(genre.q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Worker ${res.status}`);
  return await res.json();
}

// ============================================================
//  Genre selection
// ============================================================
async function selectGenre(genre, genreIdx) {
  document.querySelectorAll("[data-genre-idx]").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(`[data-genre-idx="${genreIdx}"]`).forEach(el => el.classList.add("active"));
  currentGenre = genre;
  document.documentElement.style.setProperty("--vis-color", genre.color);

  if (!ytReady) { setStatus(t("status.loading")); return; }

  setStatus(t("status.searching", genre.label));

  let items = getCachedSearch(genre.label);
  if (!items) {
    try {
      items = await searchYouTube(genre);
      if (items.length) setCachedSearch(genre.label, items);
    } catch (err) {
      setStatus(t("status.searchFailed", err.message));
      return;
    }
  }

  if (!items.length) { setStatus(t("status.noVideos")); return; }

  playlist = shuffle([...items]);
  playIdx   = 0;
  playTrack(playlist[playIdx]);
}

// ============================================================
//  Playback
// ============================================================
const PLAY_SVG  = '<svg width="10" height="12" viewBox="0 0 5 6" style="image-rendering:pixelated;display:block" aria-hidden="true"><polygon points="0,0 5,3 0,6" fill="currentColor"/></svg>';
const PAUSE_SVG = '<svg width="10" height="12" viewBox="0 0 8 12" style="image-rendering:pixelated;display:block" aria-hidden="true"><rect x="0" y="0" width="3" height="12" fill="currentColor"/><rect x="5" y="0" width="3" height="12" fill="currentColor"/></svg>';

function playTrack(item) {
  const vid     = item.id.videoId;
  const title   = item.snippet.title;
  const channel = item.snippet.channelTitle;
  const thumb   = item.snippet.thumbnails?.medium?.url
                || item.snippet.thumbnails?.default?.url || "";

  dom.npIdle.style.display    = "none";
  dom.npContent.style.display = "block";
  dom.npThumb.src             = thumb;
  dom.npTitle.textContent     = title;
  dom.npChannel.textContent   = channel;
  dom.npGenreTag.textContent  = (currentGenre?.label || "").toUpperCase();

  // Update title bar
  const shortTitle = title.length > 36 ? title.substring(0, 36) + "…" : title;
  document.getElementById("title-text-fmwave").textContent = shortTitle + " — Tween 82.8";

  // Update status track panel
  const trackPanel = document.getElementById("status-track");
  if (trackPanel) trackPanel.textContent = `Track ${playIdx + 1} / ${playlist.length}`;

  updateShuffleInfo();

  if (ytReady) {
    errorStreak = 0;
    ytPlayer.loadVideoById(vid);
    ytPlayer.setVolume(parseFloat(dom.volSlider.value));
    isPlaying = true;
    dom.btnPlay.innerHTML = PAUSE_SVG;
    startProgress();
    startVisualizer();
    updateOnAir();
    setStatus(t("status.ready"));
  } else {
    // YouTube API not ready yet — queue and play once ready
    pendingTrack = item;
  }

  // Media Session API (lock screen controls & background playback)
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: channel,
      album: "Tween 82.8 — " + (currentGenre?.label || "FM Radio"),
      artwork: thumb ? [
        { src: thumb, sizes: "320x180", type: "image/jpeg" }
      ] : []
    });
    navigator.mediaSession.playbackState = "playing";
  }
}

function playNext() {
  if (!playlist.length) return;
  playIdx = (playIdx + 1) % playlist.length;
  if (playIdx === 0) shuffle(playlist);
  playTrack(playlist[playIdx]);
}

function playPrev() {
  if (!playlist.length) return;
  playIdx = (playIdx - 1 + playlist.length) % playlist.length;
  playTrack(playlist[playIdx]);
}

function togglePlay() {
  if (!ytReady || !ytPlayer) return;
  // No genre selected → auto-select first genre
  if (!currentGenre) {
    dom.btnPlay.innerHTML = PAUSE_SVG;
    selectGenre(GENRES_DATA[0], 0);
    return;
  }
  if (!playlist.length) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
    isPlaying = false;
    dom.btnPlay.innerHTML = PLAY_SVG;
    stopProgress();
    stopVisualizer();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  } else {
    ytPlayer.playVideo();
    isPlaying = true;
    dom.btnPlay.innerHTML = PAUSE_SVG;
    startProgress();
    startVisualizer();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  }
  updateOnAir();
}

function setVol(v) {
  dom.volVal.textContent = v;
  if (ytReady && ytPlayer) ytPlayer.setVolume(parseFloat(v));
}

// ============================================================
//  Progress bar
// ============================================================
function updateProgress() {
  if (!ytReady || !ytPlayer) return;
  const dur = ytPlayer.getDuration();
  const cur = ytPlayer.getCurrentTime();
  if (!dur || isNaN(dur) || isNaN(cur)) return;
  dom.progFill.style.width = (cur / dur * 100) + "%";
  dom.progCur.textContent  = fmtTime(cur);
  dom.progTot.textContent  = fmtTime(dur);
  if (dom.digTime) dom.digTime.textContent = fmtTime(cur);
}

const startProgress = () => {
  if (progInterval) clearInterval(progInterval);
  progInterval = setInterval(updateProgress, 500);
};
const stopProgress = () => { if (progInterval) { clearInterval(progInterval); progInterval = null; } };

// ============================================================
//  Visualizer
// ============================================================
const visBars = () => dom.visualizer ? [...dom.visualizer.querySelectorAll(".vis-bar")] : [];

const startVisualizer = () => {
  if (visInterval) clearInterval(visInterval);
  const bars = visBars();
  visInterval = setInterval(() => {
    // Batch all DOM writes in one pass to minimize reflows
    const heights = bars.map(() => (4 + Math.random() * 40) + "px");
    bars.forEach((b, i) => { b.style.height = heights[i]; });
  }, 250);
};

const stopVisualizer = () => {
  if (visInterval) clearInterval(visInterval);
  visBars().forEach(b => { b.style.height = "2px"; });
};

dom.progBar.addEventListener("click", e => {
  if (!ytReady || !ytPlayer) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const dur = ytPlayer.getDuration();
  if (!dur || isNaN(dur)) return;
  ytPlayer.seekTo(dur * Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), true);
});

// ============================================================
//  Status & shuffle info
// ============================================================
function updateShuffleInfo() {
  if (!playlist.length) return;
  dom.shuffleInfo.style.display = "flex";
  dom.shuffleTxt.textContent = `SHUFFLE · ${playIdx + 1} / ${playlist.length}`;
}

// ============================================================
//  YouTube IFrame API
// ============================================================
const ytScript = document.createElement("script");
ytScript.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytScript);

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player("yt-player", {
    height: "200", width: "200",
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
    events: {
      onReady() {
        ytReady = true;
        ytPlayer.setVolume(80);
        if (pendingTrack) {
          playTrack(pendingTrack);
          pendingTrack = null;
        }
      },
      onStateChange(e) {
        if (e.data === YT.PlayerState.ENDED && isPlaying) {
          errorStreak = 0;
          playNext();
        }
      },
      onError(e) {
        console.warn("YT error:", e.data);
        if (!isPlaying) return;          // paused → don't auto-advance
        errorStreak++;
        if (errorStreak >= MAX_ERRORS) {
          // Too many consecutive errors — jump to random position instead of stopping
          errorStreak = 0;
          setStatus(t("status.randomJump"));
          const randomIdx = Math.floor(Math.random() * playlist.length);
          playIdx = randomIdx;
          setTimeout(() => { if (isPlaying) playTrack(playlist[playIdx]); }, 1500);
          return;
        }
        // Re-check isPlaying at fire time — user may have paused in the 1.2s window
        setTimeout(() => { if (isPlaying) playNext(); }, 1200);
      },
    }
  });
}

// ============================================================
//  Media Session API (lock screen / background playback)
// ============================================================
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play",          () => { if (!isPlaying) togglePlay(); });
  navigator.mediaSession.setActionHandler("pause",         () => { if (isPlaying)  togglePlay(); });
  navigator.mediaSession.setActionHandler("nexttrack",     () => playNext());
  navigator.mediaSession.setActionHandler("previoustrack", () => playPrev());
}

// ============================================================
//  Window controls (minimize / maximize / close / reopen)
// ============================================================
const winEl      = document.getElementById("win-fmwave");
const taskbarApp = document.getElementById("taskbar-app");
let isMaximized  = false;
let savedStyle   = {};

function openWindow() {
  winEl.style.display = "";
  taskbarApp.classList.add("active");
}

function toggleMinimize() {
  if (winEl.style.display === "none") {
    openWindow();
  } else {
    winEl.style.display = "none";
    taskbarApp.classList.remove("active");
  }
}

document.getElementById("btn-close").addEventListener("click", () => {
  winEl.style.display = "none";
  taskbarApp.classList.remove("active");
});

document.getElementById("btn-minimize").addEventListener("click", () => {
  winEl.style.display = "none";
  taskbarApp.classList.remove("active");
});

document.getElementById("btn-maximize").addEventListener("click", () => {
  if (!isMaximized) {
    savedStyle = {
      left: winEl.style.left, top: winEl.style.top,
      width: winEl.style.width, maxWidth: winEl.style.maxWidth,
      height: winEl.style.height, transform: winEl.style.transform,
    };
    winEl.style.transform = "none";
    winEl.style.left      = "0";
    winEl.style.top       = "0";
    winEl.style.width     = "100vw";
    winEl.style.maxWidth  = "100vw";
    winEl.style.height    = "calc(100vh - 28px)";
    winEl.style.overflowY = "auto";
    isMaximized = true;
    document.getElementById("btn-maximize").innerHTML = '<svg width="9" height="9" viewBox="0 0 9 9" style="image-rendering:pixelated;display:block" aria-hidden="true"><rect x="2" y="0" width="6" height="6" fill="#c0c0c0" stroke="currentColor" stroke-width="1"/><rect x="2" y="0" width="6" height="2" fill="currentColor"/><rect x="0" y="2" width="6" height="6" fill="#c0c0c0" stroke="currentColor" stroke-width="1"/><rect x="0" y="2" width="6" height="2" fill="currentColor"/></svg>';
    document.body.classList.add("win-expanded");
  } else {
    winEl.style.left      = savedStyle.left      || "";
    winEl.style.top       = savedStyle.top       || "";
    winEl.style.width     = savedStyle.width     || "";
    winEl.style.maxWidth  = savedStyle.maxWidth  || "";
    winEl.style.height    = savedStyle.height    || "";
    winEl.style.transform = savedStyle.transform || "translate(-50%, -50%)";
    winEl.style.overflowY = "";
    isMaximized = false;
    document.getElementById("btn-maximize").innerHTML = '<svg width="9" height="9" viewBox="0 0 9 9" style="image-rendering:pixelated;display:block" aria-hidden="true"><rect x="1" y="1" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1" y="1" width="7" height="2" fill="currentColor"/></svg>';
    document.body.classList.remove("win-expanded");
  }
});

// ============================================================
//  Draggable window
// ============================================================
(function() {
  const bar = document.getElementById("title-bar-fmwave");
  let dragging = false, ox = 0, oy = 0;

  function initFixed() {
    const r = winEl.getBoundingClientRect();
    winEl.style.left      = r.left + "px";
    winEl.style.top       = r.top  + "px";
    winEl.style.transform = "none";
  }

  // #2: Double-click title bar to toggle maximize
  bar.addEventListener("dblclick", e => {
    if (e.target.classList.contains("title-btn")) return;
    document.getElementById("btn-maximize").click();
  });

  bar.addEventListener("mousedown", e => {
    if (e.target.classList.contains("title-btn")) return;
    if (isMaximized) return;
    if (!winEl.style.transform || winEl.style.transform !== "none") initFixed();
    dragging = true;
    ox = e.clientX - winEl.getBoundingClientRect().left;
    oy = e.clientY - winEl.getBoundingClientRect().top;
    e.preventDefault();
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    winEl.style.left = (e.clientX - ox) + "px";
    winEl.style.top  = (e.clientY - oy) + "px";
  });

  document.addEventListener("mouseup", () => { dragging = false; });
})();

// ============================================================
//  Active / Inactive window title bars
// ============================================================
const managedWindows = [
  { id: "win-fmwave",      barId: "title-bar-fmwave" },
  { id: "win-mycomputer",  barId: "title-bar-mycomputer" },
  { id: "win-mydocuments", barId: "title-bar-mydocuments" },
  { id: "win-recyclebin",  barId: "title-bar-recyclebin" },
  { id: "win-pomodoro",    barId: "title-bar-pomodoro" },
  { id: "win-todo",        barId: "title-bar-todo" },
  { id: "win-guestbook",     barId: "title-bar-guestbook" },
  { id: "win-cpanel",         barId: "title-bar-cpanel" },
  { id: "win-inbox",          barId: "title-bar-inbox" },
  { id: "win-inbox-compose",  barId: "title-bar-inbox-compose" },
  { id: "win-weather",        barId: "title-bar-weather" },
  { id: "win-ie",             barId: "title-bar-ie" },
];

function activateWindow(winId) {
  managedWindows.forEach(({ barId }) => {
    const bar = document.getElementById(barId);
    if (bar) bar.classList.add("inactive");
  });
  const target = managedWindows.find(w => w.id === winId);
  if (target) {
    const bar = document.getElementById(target.barId);
    if (bar) bar.classList.remove("inactive");
  }
}

managedWindows.forEach(({ id }) => {
  const win = document.getElementById(id);
  if (win) win.addEventListener("mousedown", () => activateWindow(id));
});

activateWindow("win-fmwave");

// ============================================================
//  Start menu
// ============================================================
function toggleStartMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById("start-menu");
  const isOpen = menu.style.display === "flex";
  closeMenus();
  if (!isOpen) menu.style.display = "flex";
}

// ============================================================
//  Menu bar dropdowns
// ============================================================
function toggleMenu(menuId) {
  const menu = document.getElementById(menuId);
  const isOpen = menu.style.display === "block";
  closeMenus();
  if (!isOpen) menu.style.display = "block";
}

function closeMenus() {
  ["menu-file", "menu-playback", "menu-help"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document.getElementById("start-menu").style.display = "none";
  document.getElementById("context-menu").style.display = "none";
}

document.addEventListener("click", closeMenus);

// ============================================================
//  Context menu (right-click on desktop)
// ============================================================
document.addEventListener("contextmenu", e => {
  e.preventDefault();
  closeMenus();
  const menu = document.getElementById("context-menu");
  menu.style.display = "block";
  menu.style.left = Math.min(e.clientX, window.innerWidth - 170) + "px";
  menu.style.top  = Math.min(e.clientY, window.innerHeight - 100) + "px";
});

// ============================================================
//  Extra windows
// ============================================================
function openExtraWindow(id) {
  const w = document.getElementById(id);
  w.style.left      = "50%";
  w.style.top       = "50%";
  w.style.transform = "translate(-50%, -50%)";
  w.style.setProperty("display", "block", "important");
  // % → px に変換してドラッグと干渉しないようにする
  requestAnimationFrame(() => {
    const r = w.getBoundingClientRect();
    w.style.left      = r.left + "px";
    w.style.top       = r.top  + "px";
    w.style.transform = "none";
  });
  activateWindow(id);
}

function openMyComputer() {
  // Reset to drive view
  document.getElementById("mycomputer-drives").style.display = "";
  document.getElementById("mycomputer-c-drive").style.display = "none";
  document.querySelector("#win-mycomputer .title-text").textContent = t("icon.mycomputer");
  document.getElementById("mycomputer-status").textContent = "4 object(s)";
  openExtraWindow("win-mycomputer");
}
function openDriveC() {
  document.getElementById("mycomputer-drives").style.display = "none";
  document.getElementById("mycomputer-c-drive").style.display = "";
  document.querySelector("#win-mycomputer .title-text").textContent = "(C:)";
  document.getElementById("mycomputer-status").textContent = "3 object(s)";
}
function openMyDocuments() { openExtraWindow("win-mydocuments"); }
function openRecycleBin()  { openExtraWindow("win-recyclebin");  }

/* ── Internet Explorer — FM 82.8 Terminal Stream ── */
var ieStreamLines = [
  { text: 'C:\\TWEEN> tune --freq 82.8', dim: true },
  { text: 'Receiving... Signal OK.', dim: true },
  { text: '────────────────────────────────', dim: true },
  { text: '' },
  { text: '1995年。Windows 95が世界を変えた年。' },
  { text: '新世紀エヴァンゲリオン、テレビ東京、毎週水曜18:30。' },
  { text: '「逃げちゃダメだ」を何度も繰り返した少年がいた。' },
  { text: '' },
  { text: '1998年。カウボーイビバップ、WOWOW、深夜。' },
  { text: 'Tank!のカウントが始まると、夜が変わった。' },
  { text: '「またいつか会えるかもな...」スパイクはそう言って笑った。' },
  { text: '' },
  { text: '1995年。耳をすませば。' },
  { text: '丘の上から見えた街の灯り。カントリーロードが流れていた。' },
  { text: '' },
  { text: '1995年。Love Letter。神戸から小樽へ届いた手紙。' },
  { text: '「お元気ですか。私は元気です。」その一行で泣いた。' },
  { text: '' },
  { text: '2001年。リリイ・シュシュのすべて。' },
  { text: 'イヤホンの中だけが逃げ場だった教室。' },
  { text: '' },
  { text: '1999年。マトリックス。' },
  { text: '「これは最後のチャンスだ。赤い薬を飲むか、青い薬か。」' },
  { text: '' },
  { text: '1997年。もののけ姫。' },
  { text: '「生きろ。」糸井重里のコピーが、映画館の壁に貼ってあった。' },
  { text: '' },
  { text: '2001年。千と千尋の神隠し。' },
  { text: '名前を奪われた少女が、名前を取り戻す話。' },
  { text: '' },
  { text: 'オールナイトニッポン。深夜1時。' },
  { text: '布団の中でイヤホンを片耳だけ。親にバレないように。' },
  { text: '' },
  { text: 'JET STREAM。FM東京。深夜0時。' },
  { text: '「遠い地平線が消えて、深々とした夜の闇に心を休めるとき...」' },
  { text: '城達也の声だけが、夜を包んでいた。' },
  { text: '' },
  { text: 'テレホーダイ。23時になるのを待った。' },
  { text: 'ダイヤルアップの接続音。ピーガガガ。世界と繋がる合図。' },
  { text: '' },
  { text: '個人サイト。掲示板。キリ番。' },
  { text: '「10000hitありがとうございます！」誰かのカウンターが回った。' },
  { text: '' },
  { text: '1996年。ロングバケーション。月9。' },
  { text: 'キムタクがピアノを弾いていた。「LA LA LA LOVE SONG」が流れていた。' },
  { text: '' },
  { text: '1997年。踊る大捜査線。' },
  { text: '「事件は会議室で起きてるんじゃない！」をみんなが真似した。' },
  { text: '' },
  { text: '1993年。ポカリスエットのCM。' },
  { text: '夏の匂いがした。何でもない放課後が、永遠に見えた。' },
  { text: '' },
  { text: 'JR東海、クリスマス・エクスプレス。' },
  { text: '「帰ってくるあなたが最高のプレゼント。」山下達郎が流れた12月。' },
  { text: '' },
  { text: '1998年。宇多田ヒカル「Automatic」。15歳が全部変えた。' },
  { text: '1996年。Fishmans「LONG SEASON」。35分が一瞬で溶けた。' },
  { text: '' },
  { text: '────────────────────────────────' },
  { text: 'あの頃の夜には、名前がなかった。' },
  { text: 'ただ静かで、少し寂しくて、でもどこか自由だった。' },
  { text: '' },
  { text: 'FM 82.8 MHz — between reality and dreams', dim: true },
  { text: '' },
  { text: 'C:\\TWEEN> _', dim: true },
];
var ieStreamTimer = null;
var ieStreamIdx = 0;
function openIE() {
  openExtraWindow("win-ie");
  startIEStream();
}
function closeIE() {
  document.getElementById("win-ie").style.removeProperty("display");
  stopIEStream();
}
function startIEStream() {
  var term = document.getElementById("ie-terminal");
  if (!term) return;
  term.innerHTML = "";
  ieStreamIdx = 0;
  stopIEStream();
  function nextLine() {
    if (ieStreamIdx >= ieStreamLines.length) return; // stop at end
    var line = ieStreamLines[ieStreamIdx];
    var el = document.createElement("div");
    if (line.text === "") {
      el.innerHTML = "&nbsp;";
    } else {
      el.textContent = line.text;
      if (line.dim) el.style.opacity = "0.5";
    }
    term.appendChild(el);
    term.scrollTop = term.scrollHeight;
    ieStreamIdx++;
    if (ieStreamIdx < ieStreamLines.length) {
      ieStreamTimer = setTimeout(nextLine, line.text === "" ? 400 : 120 + line.text.length * 30);
    }
  }
  ieStreamTimer = setTimeout(nextLine, 500);
}
function stopIEStream() {
  if (ieStreamTimer) { clearTimeout(ieStreamTimer); ieStreamTimer = null; }
}

function showAbout() {
  document.getElementById("about-dialog").style.display = "flex";
}

// README.txt content
const readmeContent =
  "Tween 82.8\n" +
  "═════════════════════════════\n\n" +
  "ジャンル別BGMをワンクリックで流せる\n" +
  "Webアプリ。コンセプトは\n" +
  "『現実と夢の狭間に流れるFMラジオ』。\n\n" +
  "Tween = between（狭間）\n" +
  "82.8 = 太陽系が銀河を公転する速度\n" +
  "時速82.8万km/hをFM周波数に見立てた。\n" +
  "82.8MHzは実在しない。存在しない電台。\n\n" +
  "═════════════════════════════\n\n" +
  "STACK    : HTML / CSS / JavaScript\n" +
  "HOSTING  : Cloudflare Pages\n" +
  "DATABASE : Cloudflare D1 (SQLite)\n" +
  "PLAYER   : YouTube IFrame API\n" +
  "WEATHER  : Open-Meteo API\n" +
  "PWA      : Service Worker + Manifest\n" +
  "i18n     : JP / EN\n" +
  "GENRES   : 44 channels\n" +
  "PRICE    : Free / No Ads\n";

// signal_log.txt content
const signalLogContent =
  "[受信ログ — 深夜の記録]\n\n" +
  "82.8  ── 受信中。いつもの音楽。\n" +
  "104.2 ── ノイズの中に映像。街が見えた。\n" +
  "        \"I thought what I'd do was,\n" +
  "         I'd pretend I was one of\n" +
  "         those deaf-mutes.\"\n" +
  "67.5  ── 文字列。意味不明。だが美しい。\n" +
  "45.0  ── 応答あり。何かが触れた。\n\n" +
  "[参考周波数]\n" +
  "91.1  ── Luv(sic) / Nujabes\n" +
  "88.0  ── Tank! / Seatbelts\n" +
  "76.3  ── shiki no uta / MINMI\n" +
  "99.9  ── run / DJ Shadow\n";

function openFile(title, content) {
  document.getElementById("notepad-title").textContent = title + " — " + t("notepad.app");
  document.getElementById("notepad-content").textContent = content;
  const lines = content.split("\n").length;
  document.getElementById("notepad-status").textContent = t("notepad.lines", lines);
  document.getElementById("notepad-dialog").style.display = "flex";
}

function arrangeIcons() { /* decorative */ }

// ============================================================
//  Control Panel
// ============================================================
function openControlPanel() { openExtraWindow("win-cpanel"); }

let cpSelectedColor = null;

let cpOriginalColor = null;

function openCpDisplay() {
  // Init swatches with background colors
  document.querySelectorAll(".cp-color-swatch").forEach(s => {
    s.style.backgroundColor = s.dataset.color;
  });
  // Save original color for cancel
  cpOriginalColor = document.body.style.backgroundColor || "#008080";
  // Mark current desktop color as active
  document.querySelectorAll(".cp-color-swatch").forEach(s => {
    s.classList.toggle("cp-color-active", s.dataset.color === cpOriginalColor);
  });
  cpSelectedColor = cpOriginalColor;
  document.getElementById("cp-display-dialog").style.display = "flex";
}

function cancelCpDisplay() {
  document.body.style.backgroundColor = cpOriginalColor;
  document.getElementById("cp-display-dialog").style.display = "none";
}

function setCpColor(el) {
  document.querySelectorAll(".cp-color-swatch").forEach(s => s.classList.remove("cp-color-active"));
  el.classList.add("cp-color-active");
  cpSelectedColor = el.dataset.color;
  document.body.style.backgroundColor = cpSelectedColor;
}

function applyCpColor() {
  if (cpSelectedColor) {
    document.body.style.backgroundColor = cpSelectedColor;
    localStorage.setItem("tween_desktop_color", cpSelectedColor);
  }
  document.getElementById("cp-display-dialog").style.display = "none";
}

function openCpRegional() {
  document.getElementById("cp-lang-" + currentLang).checked = true;
  document.getElementById("cp-regional-dialog").style.display = "flex";
}

function applyCpLang() {
  const sel = document.querySelector('input[name="cp-lang"]:checked');
  if (sel) switchLang(sel.value);
  document.getElementById("cp-regional-dialog").style.display = "none";
}

// Restore saved desktop color
(function() {
  const saved = localStorage.getItem("tween_desktop_color");
  if (saved) document.body.style.backgroundColor = saved;
})();

// ============================================================
//  Volume helpers (for menu)
// ============================================================
function volUp() {
  const s = document.getElementById("vol-slider");
  s.value = Math.min(100, parseFloat(s.value) + 10);
  setVol(s.value);
}

function volDown() {
  const s = document.getElementById("vol-slider");
  s.value = Math.max(0, parseFloat(s.value) - 10);
  setVol(s.value);
}

// ============================================================
//  Draggable extra windows (single global mousemove listener)
// ============================================================
let _dragTarget = null, _dragOx = 0, _dragOy = 0;

document.addEventListener("mousemove", e => {
  if (!_dragTarget) return;
  _dragTarget.style.left = (e.clientX - _dragOx) + "px";
  _dragTarget.style.top  = (e.clientY - _dragOy) + "px";
});
document.addEventListener("mouseup", () => { _dragTarget = null; });

function makeDraggable(winEl, barEl) {
  if (!winEl || !barEl) return;
  barEl.style.cursor = "move";

  barEl.addEventListener("mousedown", e => {
    if (e.target.classList.contains("title-btn")) return;
    const r = winEl.getBoundingClientRect();
    if (!winEl.style.left) { winEl.style.left = r.left + "px"; winEl.style.top = r.top + "px"; }
    _dragOx = e.clientX - parseFloat(winEl.style.left);
    _dragOy = e.clientY - parseFloat(winEl.style.top);
    _dragTarget = winEl;
    e.preventDefault();
  });
}

makeDraggable(document.getElementById("win-mycomputer"),  document.getElementById("title-bar-mycomputer"));
makeDraggable(document.getElementById("win-mydocuments"), document.getElementById("title-bar-mydocuments"));
makeDraggable(document.getElementById("win-recyclebin"),  document.getElementById("title-bar-recyclebin"));
makeDraggable(document.getElementById("win-pomodoro"),    document.getElementById("title-bar-pomodoro"));
makeDraggable(document.getElementById("win-todo"),       document.getElementById("title-bar-todo"));
makeDraggable(document.getElementById("win-guestbook"),  document.getElementById("title-bar-guestbook"));
makeDraggable(document.getElementById("win-cpanel"),        document.getElementById("title-bar-cpanel"));
makeDraggable(document.getElementById("win-inbox"),         document.getElementById("title-bar-inbox"));
makeDraggable(document.getElementById("win-inbox-compose"), document.getElementById("title-bar-inbox-compose"));
makeDraggable(document.getElementById("win-weather"),    document.getElementById("title-bar-weather"));
makeDraggable(document.getElementById("win-ie"),         document.getElementById("title-bar-ie"));

// ============================================================
//  Resizable window (FM WAVE main window)
// ============================================================
(function() {
  const MIN_W = 300, MIN_H = 220;

  winEl.querySelectorAll(".resize-handle").forEach(handle => {
    handle.addEventListener("mousedown", e => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();

      const dir    = handle.dataset.dir;
      const startX = e.clientX;
      const startY = e.clientY;
      const rect   = winEl.getBoundingClientRect();
      const startW = rect.width;
      const startH = rect.height;
      const startL = rect.left;
      const startT = rect.top;

      // Lock position so transform doesn't interfere
      winEl.style.transform = "none";
      winEl.style.left      = startL + "px";
      winEl.style.top       = startT + "px";
      winEl.style.overflowY = "auto";

      function onMove(e) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let w = startW, h = startH, l = startL, t = startT;

        if (dir.includes("e")) w = Math.max(MIN_W, startW + dx);
        if (dir.includes("s")) h = Math.max(MIN_H, startH + dy);
        if (dir.includes("w")) { w = Math.max(MIN_W, startW - dx); l = startL + startW - w; }
        if (dir.includes("n")) { h = Math.max(MIN_H, startH - dy); t = startT + startH - h; }

        winEl.style.width    = w + "px";
        winEl.style.maxWidth = w + "px";
        winEl.style.height   = h + "px";
        winEl.style.left     = l + "px";
        winEl.style.top      = t + "px";
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup",   onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup",   onUp);
    });
  });
})();

// ============================================================
//  Draggable desktop icons (mouse + touch)
// ============================================================
requestAnimationFrame(() => {
  const THRESHOLD = 6;
  const icons = [...document.querySelectorAll(".desktop-icon")];

  // Place icons in two columns (left column has more)
  const COL1_X = 10;
  const COL2_X = 80;
  const START_Y = 14;
  const ICON_STEP = 80; // uniform vertical step (70px icon + 10px gap)
  const COL1_COUNT = 6; // left column: first 6 icons
  icons.forEach((ic, i) => {
    ic.style.position = "fixed";
    if (i < COL1_COUNT) {
      ic.style.left = COL1_X + "px";
      ic.style.top  = (START_Y + i * ICON_STEP) + "px";
    } else {
      ic.style.left = COL2_X + "px";
      ic.style.top  = (START_Y + (i - COL1_COUNT) * ICON_STEP) + "px";
    }
    ic.style.margin   = "0";
    ic.style.zIndex   = "10";
  });

  icons.forEach(icon => {
    const openName = icon.dataset.open; // e.g. "openMyComputer"
    let dragging = false, moved = false;
    let startX, startY, origLeft, origTop;

    function startDrag(x, y) {
      dragging = true; moved = false;
      startX = x; startY = y;
      origLeft = parseFloat(icon.style.left) || 0;
      origTop  = parseFloat(icon.style.top)  || 0;
      icon.style.zIndex = "999";
    }

    function doDrag(x, y) {
      if (!dragging) return;
      const dx = x - startX, dy = y - startY;
      if (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD) moved = true;
      if (moved) {
        icon.style.left = (origLeft + dx) + "px";
        icon.style.top  = (origTop  + dy) + "px";
      }
    }

    function endDrag(wasTap) {
      if (!dragging) return;
      dragging = false;
      icon.style.zIndex = "10";
      if (wasTap && openName && window[openName]) window[openName]();
    }

    // Mouse (PC)
    icon.addEventListener("mousedown", e => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", e => { if (dragging) doDrag(e.clientX, e.clientY); });
    document.addEventListener("mouseup",   () => { endDrag(false); });

    // Touch (SP)
    icon.addEventListener("touchstart", e => {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }, { passive: true });

    icon.addEventListener("touchmove", e => {
      if (!dragging) return;
      const t = e.touches[0];
      doDrag(t.clientX, t.clientY);
      if (moved) e.preventDefault();
    }, { passive: false });

    icon.addEventListener("touchend", e => {
      if (!dragging) return;
      e.preventDefault();
      endDrag(!moved); // tap (not moved) → open window
    });
  });
});

// Apply language after full DOM is available
document.addEventListener("DOMContentLoaded", () => applyLang(currentLang));

// ============================================================
//  Shutdown / Restart
// ============================================================
let _sdTimers = [];
let _sdActive = false;

function showShutdownDialog() {
  if (_sdActive) return;
  const overlay = document.getElementById('shutdown-overlay');
  overlay.style.display = 'flex';
  // Reset radio to "shutdown"
  const radio = document.querySelector('input[name="sd-opt"][value="shutdown"]');
  if (radio) radio.checked = true;
}

function cancelShutdown() {
  document.getElementById('shutdown-overlay').style.display = 'none';
}

function _sdReset() {
  _sdTimers.forEach(id => clearTimeout(id));
  _sdTimers = [];
  _sdActive = false;
  const screen = document.getElementById('shutdown-screen');
  const msg = document.getElementById('shutdown-msg');
  screen.style.display = 'none';
  screen.className = 'shutdown-screen';
  msg.textContent = '';
}

function _sdPowerOn() {
  _sdReset();
  // Try reload, but if it fails (PWA/SW), at least desktop is back
  try { location.reload(); } catch {}
}

function doShutdown() {
  const opt = document.querySelector('input[name="sd-opt"]:checked').value;
  document.getElementById('shutdown-overlay').style.display = 'none';

  // Clean up previous state
  _sdReset();
  _sdActive = true;

  const screen = document.getElementById('shutdown-screen');
  const msg = document.getElementById('shutdown-msg');

  screen.style.display = 'flex';
  msg.textContent = t('sd.shutting');

  // Stop music
  if (ytReady && ytPlayer && ytPlayer.stopVideo) {
    try { ytPlayer.stopVideo(); } catch {}
    isPlaying = false;
    stopProgress();
    stopVisualizer();
    updateOnAir();
  }

  if (opt === 'restart') {
    _sdTimers.push(setTimeout(() => {
      msg.textContent = t('sd.restarting');
    }, 1500));
    _sdTimers.push(setTimeout(() => {
      _sdActive = false;
      location.reload();
    }, 3500));
  } else if (opt === 'standby') {
    screen.classList.add('standby');
    msg.textContent = '';
  } else {
    // Shutdown: black → "safe to turn off"
    _sdTimers.push(setTimeout(() => {
      screen.classList.add('safe');
      msg.textContent = t('sd.safe');
    }, 2000));
  }
}

// Click on shutdown screen: power on (shutdown/standby) or ignore (restart)
(function() {
  const sdScreen = document.getElementById('shutdown-screen');
  if (sdScreen) {
    sdScreen.addEventListener('click', () => {
      if (!_sdActive) return;
      if (sdScreen.classList.contains('safe') || sdScreen.classList.contains('standby')) {
        _sdPowerOn();
      }
    });
  }
})();

// ============================================================
//  ON AIR lamp
// ============================================================
function updateOnAir() {
  const lamp = document.getElementById('onair-lamp');
  if (lamp) lamp.classList.toggle('active', isPlaying);
}

// ============================================================
//  Minminchi (desktop cat)
// ============================================================
(function() {
  const neko       = document.getElementById('neko');
  if (!neko) return;
  const bubble     = document.getElementById('neko-bubble');
  const nekoCtx    = document.getElementById('neko-ctx');
  const nekoEyes   = document.getElementById('neko-eyes');
  const nekoSquint = document.getElementById('neko-eyes-squint');
  const nekoBowl   = document.getElementById('neko-bowl');
  const nekoDrop   = document.getElementById('neko-food-drop');
  const bowlFood   = nekoBowl ? nekoBowl.querySelector('.bowl-food') : null;
  const onairLamp  = document.getElementById('onair-lamp');

  let nekoTimer = null, bubbleTimer = null, walkAnim = null;
  let isWalking = false, isBusy = false;
  let actionTimers = [];
  const SPEED = 1.2;
  const MSGS = ['にゃ〜','ゴロゴロ...','zzZ...','にゃん！','もふもふ','...','みゃー','すぴー'];

  function ensureLeftPos() {
    if (!neko.style.left || neko.style.right !== 'auto') {
      const x = neko.getBoundingClientRect().left;
      neko.style.right = 'auto';
      neko.style.left = x + 'px';
    }
  }
  function ensureBottomPos() {
    if (!neko.style.bottom) neko.style.bottom = '28px';
  }

  function nekoSay(msg) {
    bubble.textContent = msg;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2500);
  }

  function clearTimers() {
    actionTimers.forEach(id => clearTimeout(id));
    actionTimers = [];
  }

  function clearState() {
    clearTimers();
    isBusy = false;
    neko.classList.remove('walking','sitting','purring','jumping','petting','eating','stretching','scratching','grooving');
    if (nekoEyes) nekoEyes.style.display = '';
    if (nekoSquint) nekoSquint.style.display = 'none';
    if (nekoBowl) nekoBowl.classList.remove('show');
    if (nekoDrop) nekoDrop.classList.remove('show');
    if (bowlFood) bowlFood.style.display = 'none';
  }

  /* ── Walking ── */
  function getMaxX() {
    const onairLeft = onairLamp ? onairLamp.getBoundingClientRect().left - 10 : window.innerWidth - 100;
    return Math.min(window.innerWidth - 70, onairLeft - 60);
  }

  function nekoWalk() {
    if (isWalking) return;
    ensureLeftPos();
    const maxX = getMaxX();
    let curX = parseFloat(neko.style.left) || 0;
    // If cat is beyond maxX (e.g. initial right:200px position), clamp first
    if (curX > maxX) { curX = maxX; neko.style.left = curX + 'px'; }
    const MIN_X = 40; // leave space for speech bubble on left edge
    const targetX = MIN_X + Math.floor(Math.random() * Math.max(0, maxX - MIN_X));
    const dir = targetX > curX ? 1 : -1;
    neko.classList.toggle('flip', dir > 0);
    clearState();
    neko.classList.add('walking');
    isWalking = true;
    function step() {
      curX += dir * SPEED;
      if ((dir > 0 && curX >= targetX) || (dir < 0 && curX <= targetX)) {
        curX = targetX;
        neko.style.left = curX + 'px';
        neko.classList.remove('walking');
        isWalking = false;
        // Edge scratch: if near left/right edge, scratch
        if (curX <= 5 || curX >= getMaxX() - 5) {
          neko.classList.toggle('flip', curX > getMaxX() / 2);
          nekoScratch();
          return;
        }
        // 20% chance to stretch after walking
        if (Math.random() < 0.2) {
          nekoStretch();
          return;
        }
        neko.classList.add('sitting');
        return;
      }
      neko.style.left = curX + 'px';
      walkAnim = requestAnimationFrame(step);
    }
    walkAnim = requestAnimationFrame(step);
  }

  function nekoStop() {
    if (walkAnim) cancelAnimationFrame(walkAnim);
    isWalking = false;
    neko.classList.remove('walking');
  }

  function nekoPause() {
    clearTimeout(nekoTimer);
    nekoTimer = null;
  }

  function nekoSchedule() {
    nekoPause();
    const delay = 8000 + Math.random() * 15000;
    nekoTimer = setTimeout(() => {
      const r = Math.random();
      if (isPlaying && r < 0.15) {
        nekoGroove();
      } else if (r < 0.3) {
        nekoSay(MSGS[Math.floor(Math.random() * MSGS.length)]);
      } else {
        nekoWalk();
      }
      nekoSchedule();
    }, delay);
  }

  /* ── Pet — body dips U-shape, eyes squint ── */
  function nekoPet() {
    if (isBusy) return;
    nekoStop();
    nekoPause();
    clearState();
    neko.classList.add('petting');
    if (nekoEyes) nekoEyes.style.display = 'none';
    if (nekoSquint) nekoSquint.style.display = '';
    const msgs = ['ゴロゴロ...', 'にゃ〜ん', 'ふにゃ...', 'にゃ！'];
    nekoSay(msgs[Math.floor(Math.random() * msgs.length)]);
    actionTimers.push(setTimeout(() => {
      clearState();
      neko.classList.add('sitting');
      nekoSchedule();
    }, 2500));
  }

  /* ── Feed — bowl appears, food drops, cat eats ── */
  function nekoFeed() {
    nekoStop();
    nekoPause();
    clearState();
    isBusy = true;
    // Phase 1: bowl appears
    if (nekoBowl) nekoBowl.classList.add('show');
    nekoSay('！');
    // Phase 2: food drops into bowl
    actionTimers.push(setTimeout(() => {
      if (nekoDrop) nekoDrop.classList.add('show');
    }, 600));
    // Phase 3: food lands in bowl, cat starts eating
    actionTimers.push(setTimeout(() => {
      if (nekoDrop) nekoDrop.classList.remove('show');
      if (bowlFood) bowlFood.style.display = '';
      neko.classList.add('eating');
      const msgs = ['もぐもぐ...', 'カリカリ！', 'ちゅ〜る！', 'おいしい！', 'もっと！'];
      nekoSay(msgs[Math.floor(Math.random() * msgs.length)]);
    }, 1200));
    // Phase 4: done eating
    actionTimers.push(setTimeout(() => {
      clearState();
      neko.classList.add('sitting');
      nekoSay('ごちそうさま！');
      nekoSchedule();
    }, 5000));
  }

  /* ── Jump ── */
  function nekoJump() {
    nekoStop();
    nekoPause();
    clearState();
    neko.classList.add('jumping');
    nekoSay('にゃっ！');
    ensureBottomPos();
    const baseBottom = parseFloat(neko.style.bottom) || 28;
    let t = 0;
    const jumpHeight = 40;
    const duration = 24;
    function frame() {
      t++;
      const progress = t / duration;
      const y = Math.sin(progress * Math.PI) * jumpHeight;
      neko.style.bottom = (baseBottom + y) + 'px';
      if (t < duration) {
        requestAnimationFrame(frame);
      } else {
        neko.style.bottom = baseBottom + 'px';
        neko.classList.remove('jumping');
        neko.classList.add('sitting');
        nekoSchedule();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ── Stretch (伸び) — after walking ── */
  function nekoStretch() {
    if (isBusy) return;
    nekoStop();
    nekoPause();
    clearState();
    neko.classList.add('stretching');
    nekoSay('ふぁ〜');
    actionTimers.push(setTimeout(() => {
      clearState();
      neko.classList.add('sitting');
      nekoSchedule();
    }, 2000));
  }

  /* ── Scratch at screen edge (爪とぎ) ── */
  function nekoScratch() {
    if (isBusy) return;
    nekoStop();
    nekoPause();
    clearState();
    neko.classList.add('scratching');
    const msgs = ['ガリガリ...', 'バリバリ！', '爪とぎ♪'];
    nekoSay(msgs[Math.floor(Math.random() * msgs.length)]);
    actionTimers.push(setTimeout(() => {
      clearState();
      neko.classList.add('sitting');
      nekoSchedule();
    }, 2500));
  }

  /* ── Groove to music (音楽反応) ── */
  function nekoGroove() {
    if (isBusy || !isPlaying) return;
    clearState();
    neko.classList.add('grooving');
    const msgs = ['♪', '♪♪', 'ノリノリ〜'];
    nekoSay(msgs[Math.floor(Math.random() * msgs.length)]);
    actionTimers.push(setTimeout(() => {
      clearState();
      neko.classList.add('sitting');
    }, 3000));
  }

  /* ── Drag ── */
  let dragStartX, dragStartY, dragOriginX, dragOriginY, isDragging = false;
  const DRAG_THRESHOLD = 4;

  function onDragStart(e) {
    if (e.button === 2) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    ensureLeftPos();
    ensureBottomPos();
    dragStartX = pt.clientX;
    dragStartY = pt.clientY;
    dragOriginX = parseFloat(neko.style.left) || 0;
    dragOriginY = parseFloat(neko.style.bottom) || 28;
    isDragging = false;
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragStartX;
    const dy = pt.clientY - dragStartY;
    if (!isDragging && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    if (!isDragging) {
      isDragging = true;
      nekoStop();
      nekoPause();
      clearState();
      neko.classList.add('dragging');
    }
    if (Math.abs(dx) > 2) {
      neko.classList.toggle('flip', dx > 0);
    }
    const newLeft = Math.max(40, Math.min(window.innerWidth - 60, dragOriginX + dx));
    const newBottom = Math.max(28, dragOriginY - dy);
    neko.style.left = newLeft + 'px';
    neko.style.bottom = newBottom + 'px';
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    if (isDragging) {
      neko.classList.remove('dragging');
      neko.classList.add('sitting');
      isDragging = false;
      nekoSchedule();
    } else {
      nekoPet();
    }
  }

  neko.addEventListener('mousedown', onDragStart);
  neko.addEventListener('touchstart', onDragStart, { passive: false });

  /* ── Right-click context menu ── */
  neko.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    nekoCtx.style.left = e.clientX + 'px';
    nekoCtx.style.top = 'auto';
    nekoCtx.style.bottom = (window.innerHeight - e.clientY) + 'px';
    nekoCtx.classList.add('show');
    return false;
  });

  document.addEventListener('click', () => nekoCtx.classList.remove('show'));
  document.addEventListener('contextmenu', () => nekoCtx.classList.remove('show'));

  nekoCtx.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    nekoCtx.classList.remove('show');
    switch (action) {
      case 'pet': nekoPet(); break;
      case 'feed': nekoFeed(); break;
      case 'jump': nekoJump(); break;
    }
  });

  neko.classList.add('sitting');
  nekoSchedule();
})();

// ============================================================
//  Keyboard shortcuts (all functions defined above)
// ============================================================
document.addEventListener("keydown", e => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('shutdown-overlay');
    if (overlay && overlay.style.display === 'flex') {
      cancelShutdown();
    } else if (_sdActive) {
      _sdPowerOn();
    }
    return;
  }
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space")      { e.preventDefault(); togglePlay(); }
  if (e.code === "ArrowRight") { e.preventDefault(); playNext(); }
  if (e.code === "ArrowLeft")  { e.preventDefault(); playPrev(); }
});

