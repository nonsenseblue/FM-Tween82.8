// ============================================================
//  Tween 82.8 — Pomodoro Timer (custom settings)
// ============================================================

// ── Defaults ──
const POM_DEFAULTS = { workMin: 25, breakMin: 5, longMin: 15, workGenreIdx: 0, breakGenreIdx: 1 };

// ── Load saved settings or use defaults ──
function pomLoadSettings() {
  try {
    const raw = localStorage.getItem('tween_pom_settings');
    if (raw) return { ...POM_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...POM_DEFAULTS };
}

function pomSaveSettings(s) {
  try { localStorage.setItem('tween_pom_settings', JSON.stringify(s)); } catch { /* ignore */ }
}

let pomSettings = pomLoadSettings();

// ── State ──
let pomPhase  = 'idle';
let pomRemain = pomSettings.workMin * 60;
let pomTotal  = pomRemain;
let pomTmr    = null;
let pomSets   = 0;

// ── DOM cache ──
const pomDom = {
  phase    : document.getElementById('pom-phase'),
  timer    : document.getElementById('pom-timer'),
  fill     : document.getElementById('pom-prog-fill'),
  start    : document.getElementById('pom-btn-start'),
  sets     : document.getElementById('pom-sets'),
  info     : document.getElementById('pom-info'),
  settings : document.getElementById('pom-settings'),
  workMin  : document.getElementById('pom-work-min'),
  breakMin : document.getElementById('pom-break-min'),
  longMin  : document.getElementById('pom-long-min'),
  workGenre : document.getElementById('pom-work-genre'),
  breakGenre: document.getElementById('pom-break-genre'),
};

// ── Custom genre picker ──
function pomBuildGenrePanel(pickerEl) {
  const panel = pickerEl.querySelector('.pom-genre-panel');
  panel.innerHTML = '';
  GENRES_DATA.forEach((g, i) => {
    const item = document.createElement('div');
    item.className = 'pom-genre-item';
    item.dataset.idx = i;
    item.style.setProperty('--genre-color', g.color);

    const label = document.createElement('span');
    label.textContent = g.label;

    item.appendChild(label);
    item.addEventListener('click', () => {
      pomSelectGenreItem(pickerEl, i);
    });
    panel.appendChild(item);
  });
}

function pomSelectGenreItem(pickerEl, idx) {
  const g = GENRES_DATA[idx];
  if (!g) return;
  pickerEl.dataset.value = idx;
  const labelEl = pickerEl.querySelector('.pom-genre-label');
  labelEl.textContent = g.label;
  // Update selected highlight
  pickerEl.querySelectorAll('.pom-genre-item').forEach((item, i) => {
    item.classList.toggle('selected', i === idx);
  });
  // Close panel
  pickerEl.classList.remove('open');
  // Trigger setting change
  pomOnSettingChange();
}

function pomTogglePicker(pickerEl) {
  const isOpen = pickerEl.classList.contains('open');
  // Close all pickers first
  document.querySelectorAll('.pom-genre-picker.open').forEach(p => p.classList.remove('open'));
  if (!isOpen) {
    pickerEl.classList.add('open');
    // Position the panel below the trigger
    const trigger = pickerEl.querySelector('.pom-genre-trigger');
    const panel = pickerEl.querySelector('.pom-genre-panel');
    const rect = trigger.getBoundingClientRect();
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.bottom + 'px';
    panel.style.width = rect.width + 'px';
    // Scroll to selected item
    const idx = parseInt(pickerEl.dataset.value) || 0;
    const selectedItem = panel.children[idx];
    if (selectedItem) selectedItem.scrollIntoView({ block: 'center' });
  }
}

// ── Build genre options ──
function pomBuildGenreOptions() {
  [pomDom.workGenre, pomDom.breakGenre].forEach(picker => {
    pomBuildGenrePanel(picker);
    const trigger = picker.querySelector('.pom-genre-trigger');
    trigger.addEventListener('click', () => pomTogglePicker(picker));
  });
  pomSelectGenreItem(pomDom.workGenre, pomSettings.workGenreIdx);
  pomSelectGenreItem(pomDom.breakGenre, pomSettings.breakGenreIdx);
}

// Close pickers when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.pom-genre-picker')) {
    document.querySelectorAll('.pom-genre-picker.open').forEach(p => p.classList.remove('open'));
  }
});

// ── Read current settings from UI inputs ──
function pomReadUI() {
  const workMin  = Math.max(1, Math.min(120, parseInt(pomDom.workMin.value)  || 25));
  const breakMin = Math.max(1, Math.min(60,  parseInt(pomDom.breakMin.value) || 5));
  const longMin  = Math.max(1, Math.min(60,  parseInt(pomDom.longMin.value)  || 15));
  const workGenreIdx  = parseInt(pomDom.workGenre.dataset.value)  || 0;
  const breakGenreIdx = parseInt(pomDom.breakGenre.dataset.value) || 0;
  pomSettings = { workMin, breakMin, longMin, workGenreIdx, breakGenreIdx };
  pomSaveSettings(pomSettings);
}

// ── Apply settings to UI inputs ──
function pomApplyToUI() {
  pomDom.workMin.value   = pomSettings.workMin;
  pomDom.breakMin.value  = pomSettings.breakMin;
  pomDom.longMin.value   = pomSettings.longMin;
  pomSelectGenreItem(pomDom.workGenre, pomSettings.workGenreIdx);
  pomSelectGenreItem(pomDom.breakGenre, pomSettings.breakGenreIdx);
  pomUpdateInfoBar();
}

// ── Update info bar text ──
function pomUpdateInfoBar() {
  const wg = GENRES_DATA[pomSettings.workGenreIdx]?.label  || '?';
  const bg = GENRES_DATA[pomSettings.breakGenreIdx]?.label || '?';
  pomDom.info.textContent = `${wg} \u2192 ${bg} \u00b7 ${pomSettings.workMin}/${pomSettings.breakMin} min`;
}

// ── Toggle settings disabled state ──
function pomToggleSettings(enabled) {
  if (enabled) {
    pomDom.settings.classList.remove('disabled');
  } else {
    pomDom.settings.classList.add('disabled');
  }
}

// ── Save on any input change ──
function pomOnSettingChange() {
  pomReadUI();
  if (pomPhase === 'idle') {
    pomRemain = pomSettings.workMin * 60;
    pomTotal  = pomRemain;
    pomUpdateUI();
  }
}

// ── Phase colors & i18n keys ──
const POM_PHASE_COLORS = {
  idle:  ['#1a6614', '#33dd55'],
  work:  ['#88ff44', '#ccff44'],
  break: ['#44ffcc', '#44ffcc'],
  long:  ['#44ffcc', '#44ffcc'],
};
const POM_PHASE_I18N = { idle: 'pom.ready', work: 'pom.work', break: 'pom.break', long: 'pom.long' };

function pomUpdateUI() {
  pomDom.timer.textContent = fmtTime(pomRemain);
  pomDom.fill.style.width  = Math.round((1 - pomRemain / pomTotal) * 100) + '%';
  const [phaseColor, timerColor] = POM_PHASE_COLORS[pomPhase] || POM_PHASE_COLORS.idle;
  pomDom.phase.textContent = t(POM_PHASE_I18N[pomPhase] || 'pom.ready');
  pomDom.phase.style.color = phaseColor;
  pomDom.timer.style.color = timerColor;
  pomDom.sets.querySelectorAll('.pom-dot').forEach((d, i) => {
    d.style.background = i < pomSets ? '#000080' : '#c0c0c0';
  });
  // Hide start button once running
  pomDom.start.style.display = pomPhase === 'idle' ? '' : 'none';
}

function pomAlarm() {
  playBeep(880, 150, 'square', 0.18);
  setTimeout(() => playBeep(1100, 150, 'square', 0.18), 220);
  setTimeout(() => playBeep(880,  250, 'square', 0.15), 460);
}

function pomTransition() {
  clearInterval(pomTmr);
  pomAlarm();
  const workGenre  = GENRES_DATA[pomSettings.workGenreIdx]  || GENRES_DATA[0];
  const breakGenre = GENRES_DATA[pomSettings.breakGenreIdx] || GENRES_DATA[1];

  if (pomPhase === 'work') {
    pomSets++;
    const isLong = pomSets >= 4;
    pomPhase  = isLong ? 'long' : 'break';
    pomRemain = isLong ? pomSettings.longMin * 60 : pomSettings.breakMin * 60;
    pomTotal  = pomRemain;
    selectGenre(breakGenre, pomSettings.breakGenreIdx);
    if (Notification.permission === 'granted')
      new Notification(t('pom.notif.title'), {
        body: isLong ? t('pom.notif.longbreak', pomSettings.longMin) : t('pom.notif.break', pomSettings.breakMin),
        icon: '/icon-192.png'
      });
  } else {
    if (pomPhase === 'long') pomSets = 0;
    pomPhase  = 'work';
    pomRemain = pomSettings.workMin * 60;
    pomTotal  = pomRemain;
    selectGenre(workGenre, pomSettings.workGenreIdx);
    if (Notification.permission === 'granted')
      new Notification(t('pom.notif.title'), { body: t('pom.notif.work', pomSettings.workMin), icon: '/icon-192.png' });
  }
  pomUpdateUI();
  pomTmr = setInterval(pomTick, 1000);
}

function pomTick() {
  pomRemain = Math.max(0, pomRemain - 1);
  pomUpdateUI();
  if (pomRemain === 0) pomTransition();
}

function pomStart() {
  if (pomPhase !== 'idle') return;
  pomReadUI();
  const workGenre = GENRES_DATA[pomSettings.workGenreIdx] || GENRES_DATA[0];
  pomPhase  = 'work';
  pomRemain = pomSettings.workMin * 60;
  pomTotal  = pomRemain;
  pomSets   = 0;
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  selectGenre(workGenre, pomSettings.workGenreIdx);
  pomTmr = setInterval(pomTick, 1000);
  pomToggleSettings(false);
  pomUpdateUI();
}

function openPomodoro() {
  openExtraWindow('win-pomodoro');
}

function togglePomodoro() {
  const w = document.getElementById('win-pomodoro');
  if (window.getComputedStyle(w).display === 'none') {
    openPomodoro();
  } else {
    w.style.removeProperty('display');
  }
}

// ── Init ──
pomBuildGenreOptions();
pomApplyToUI();
pomUpdateUI();

// Button listener
pomDom.start.addEventListener('click', pomStart);

// Save on any change
pomDom.workMin.addEventListener('change', pomOnSettingChange);
pomDom.breakMin.addEventListener('change', pomOnSettingChange);
pomDom.longMin.addEventListener('change', pomOnSettingChange);
