// ============================================================
//  Tween 82.8 — Weather (Open-Meteo API + Geolocation)
//  Fallback: Tokyo (35.6762, 139.6503)
// ============================================================

// WMO Weather code → icon type + description
const WMO_MAP = {
  0:  { icon: 'clear',   ja: '快晴' },
  1:  { icon: 'clear',   ja: 'おおむね晴れ' },
  2:  { icon: 'cloud',   ja: '曇りがち' },
  3:  { icon: 'cloud',   ja: '曇り' },
  45: { icon: 'fog',     ja: '霧' },
  48: { icon: 'fog',     ja: '霧氷' },
  51: { icon: 'rain',    ja: '小雨' },
  53: { icon: 'rain',    ja: '雨' },
  55: { icon: 'rain',    ja: '強い雨' },
  56: { icon: 'rain',    ja: '凍る霧雨' },
  57: { icon: 'rain',    ja: '凍る雨' },
  61: { icon: 'rain',    ja: '小雨' },
  63: { icon: 'rain',    ja: '雨' },
  65: { icon: 'rain',    ja: '大雨' },
  66: { icon: 'rain',    ja: '凍る雨' },
  67: { icon: 'rain',    ja: '凍る大雨' },
  71: { icon: 'snow',    ja: '小雪' },
  73: { icon: 'snow',    ja: '雪' },
  75: { icon: 'snow',    ja: '大雪' },
  77: { icon: 'snow',    ja: '雪粒' },
  80: { icon: 'rain',    ja: 'にわか雨' },
  81: { icon: 'rain',    ja: 'にわか雨' },
  82: { icon: 'rain',    ja: '激しいにわか雨' },
  85: { icon: 'snow',    ja: 'にわか雪' },
  86: { icon: 'snow',    ja: '激しいにわか雪' },
  95: { icon: 'thunder', ja: '雷雨' },
  96: { icon: 'thunder', ja: '雹を伴う雷雨' },
  99: { icon: 'thunder', ja: '激しい雷雨' },
};

// Poetic weather comments
const WEATHER_POEMS = {
  clear:   ['月明かりが窓を照らすでしょう。眠れない夜にちょうどいい。', '今夜は星がよく見えるでしょう。屋上に行きたくなる空。', '穏やかな夜。遠くの電波塔が光っている。'],
  cloud:   ['夢の中は曇りのち晴れ。傘はいりません。', '雲の切れ間から月がのぞく。明日は晴れるかも。', '静かな夜空。雲がゆっくり流れている。'],
  rain:    ['深夜に雨。窓を少しだけ開けて、雨音をBGMに。', '雨が街を洗っている。明日の朝は空気がきれいだろう。', '雨粒がガラスを伝う。今夜はもう少しだけ起きていよう。'],
  fog:     ['霧が街を包んでいます。現実と夢の境界が曖昧になる夜。', '霧の中、街灯だけがぼんやり光る。幻想的な夜。'],
  snow:    ['粉雪が舞っています。世界が静かになる夜。', '雪が音を吸い込む。イヤホンの中だけが世界。'],
  thunder: ['遠くで雷。ヘッドフォンの中は穏やか。', '雷鳴が夜を引き裂く。でもラジオは止まらない。'],
  wind:    ['北からの風。カーテンが揺れる夜。温かいものを。'],
};

function weatherIcon(type) {
  const icons = {
    moon:     '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><circle cx="8" cy="8" r="6" fill="#ffdd44"/><circle cx="10" cy="6" r="5" fill="#000080"/></svg>',
    stars:    '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><rect x="3" y="3" width="2" height="2" fill="#ffdd44"/><rect x="4" y="2" width="1" height="1" fill="#ffdd44"/><rect x="4" y="5" width="1" height="1" fill="#ffdd44"/><rect x="2" y="4" width="1" height="1" fill="#ffdd44"/><rect x="5" y="4" width="1" height="1" fill="#ffdd44"/><rect x="10" y="6" width="2" height="2" fill="#ffdd44"/><rect x="11" y="5" width="1" height="1" fill="#ffdd44"/><rect x="11" y="8" width="1" height="1" fill="#ffdd44"/><rect x="9" y="7" width="1" height="1" fill="#ffdd44"/><rect x="12" y="7" width="1" height="1" fill="#ffdd44"/><rect x="7" y="10" width="1" height="1" fill="#ffdd44"/></svg>',
    cloud:    '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><rect x="3" y="6" width="10" height="5" fill="#c0c0c0"/><rect x="5" y="4" width="6" height="2" fill="#c0c0c0"/><rect x="3" y="6" width="10" height="1" fill="#fff" opacity="0.5"/><rect x="3" y="10" width="10" height="1" fill="#808080"/></svg>',
    rain:     '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><rect x="3" y="4" width="10" height="4" fill="#808080"/><rect x="5" y="3" width="6" height="1" fill="#808080"/><rect x="4" y="10" width="1" height="2" fill="#4488cc"/><rect x="7" y="9" width="1" height="2" fill="#4488cc"/><rect x="10" y="10" width="1" height="2" fill="#4488cc"/><rect x="5" y="12" width="1" height="2" fill="#4488cc"/><rect x="9" y="12" width="1" height="2" fill="#4488cc"/></svg>',
    fog:      '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><rect x="1" y="4" width="14" height="1" fill="#c0c0c0" opacity="0.6"/><rect x="2" y="6" width="12" height="1" fill="#c0c0c0" opacity="0.8"/><rect x="1" y="8" width="14" height="1" fill="#c0c0c0"/><rect x="3" y="10" width="10" height="1" fill="#c0c0c0" opacity="0.8"/><rect x="2" y="12" width="12" height="1" fill="#c0c0c0" opacity="0.6"/></svg>',
    clear:    '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><circle cx="8" cy="8" r="5" fill="#ffdd44"/><rect x="7" y="1" width="2" height="2" fill="#ffdd44"/><rect x="7" y="13" width="2" height="2" fill="#ffdd44"/><rect x="1" y="7" width="2" height="2" fill="#ffdd44"/><rect x="13" y="7" width="2" height="2" fill="#ffdd44"/><rect x="3" y="3" width="1" height="1" fill="#ffdd44"/><rect x="12" y="3" width="1" height="1" fill="#ffdd44"/><rect x="3" y="12" width="1" height="1" fill="#ffdd44"/><rect x="12" y="12" width="1" height="1" fill="#ffdd44"/></svg>',
    snow:     '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><rect x="3" y="3" width="10" height="4" fill="#c0c0c0"/><rect x="5" y="2" width="6" height="1" fill="#c0c0c0"/><rect x="4" y="9" width="2" height="2" fill="#fff"/><rect x="8" y="10" width="2" height="2" fill="#fff"/><rect x="6" y="12" width="2" height="2" fill="#fff"/><rect x="10" y="9" width="2" height="2" fill="#fff"/><rect x="3" y="13" width="2" height="2" fill="#fff"/></svg>',
    thunder:  '<svg width="48" height="48" viewBox="0 0 16 16" style="image-rendering:pixelated"><rect x="3" y="3" width="10" height="4" fill="#666"/><rect x="5" y="2" width="6" height="1" fill="#666"/><rect x="8" y="7" width="2" height="2" fill="#ffdd44"/><rect x="7" y="9" width="2" height="2" fill="#ffdd44"/><rect x="6" y="11" width="2" height="2" fill="#ffdd44"/><rect x="7" y="13" width="1" height="1" fill="#ffdd44"/></svg>',
  };
  // At night, use moon/stars for clear weather
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  if (type === 'clear' && isNight) {
    return Math.random() > 0.5 ? icons.moon : icons.stars;
  }
  return icons[type] || icons.clear;
}

function weatherSkyline() {
  return '<svg viewBox="0 0 260 28" style="image-rendering:pixelated" preserveAspectRatio="none">' +
    '<rect x="0" y="18" width="260" height="10" fill="#0a0a1a"/>' +
    '<rect x="8" y="10" width="12" height="18" fill="#0a0a1a"/>' +
    '<rect x="10" y="14" width="2" height="2" fill="#ffcc44" opacity="0.4"/>' +
    '<rect x="24" y="6" width="8" height="22" fill="#0a0a1a"/>' +
    '<rect x="26" y="10" width="2" height="2" fill="#ffcc44" opacity="0.6"/>' +
    '<rect x="26" y="15" width="2" height="2" fill="#ffcc44" opacity="0.3"/>' +
    '<rect x="36" y="14" width="10" height="14" fill="#0a0a1a"/>' +
    '<rect x="38" y="16" width="2" height="2" fill="#ffcc44" opacity="0.5"/>' +
    '<rect x="50" y="8" width="6" height="20" fill="#0a0a1a"/>' +
    '<rect x="52" y="4" width="2" height="4" fill="#0a0a1a"/>' +
    '<rect x="52" y="3" width="2" height="1" fill="#ff3333" opacity="0.8"/>' +
    '<rect x="60" y="12" width="14" height="16" fill="#0a0a1a"/>' +
    '<rect x="62" y="14" width="2" height="2" fill="#ffcc44" opacity="0.4"/>' +
    '<rect x="66" y="16" width="2" height="2" fill="#ffcc44" opacity="0.6"/>' +
    '<rect x="78" y="16" width="8" height="12" fill="#0a0a1a"/>' +
    '<rect x="90" y="10" width="10" height="18" fill="#0a0a1a"/>' +
    '<rect x="92" y="12" width="2" height="2" fill="#ffcc44" opacity="0.5"/>' +
    '<rect x="92" y="17" width="2" height="2" fill="#ffcc44" opacity="0.3"/>' +
    '<rect x="104" y="14" width="12" height="14" fill="#0a0a1a"/>' +
    '<rect x="108" y="16" width="2" height="2" fill="#ffcc44" opacity="0.4"/>' +
    '<rect x="120" y="8" width="8" height="20" fill="#0a0a1a"/>' +
    '<rect x="122" y="10" width="2" height="2" fill="#ffcc44" opacity="0.6"/>' +
    '<rect x="122" y="15" width="2" height="2" fill="#ffcc44" opacity="0.2"/>' +
    '<rect x="132" y="12" width="10" height="16" fill="#0a0a1a"/>' +
    '<rect x="134" y="14" width="2" height="2" fill="#ffcc44" opacity="0.5"/>' +
    '<rect x="146" y="16" width="8" height="12" fill="#0a0a1a"/>' +
    '<rect x="158" y="6" width="6" height="22" fill="#0a0a1a"/>' +
    '<rect x="160" y="2" width="2" height="4" fill="#0a0a1a"/>' +
    '<rect x="160" y="1" width="2" height="1" fill="#ff3333" opacity="0.8"/>' +
    '<rect x="160" y="10" width="2" height="2" fill="#ffcc44" opacity="0.4"/>' +
    '<rect x="168" y="12" width="14" height="16" fill="#0a0a1a"/>' +
    '<rect x="170" y="14" width="2" height="2" fill="#ffcc44" opacity="0.6"/>' +
    '<rect x="174" y="18" width="2" height="2" fill="#ffcc44" opacity="0.3"/>' +
    '<rect x="186" y="10" width="10" height="18" fill="#0a0a1a"/>' +
    '<rect x="188" y="12" width="2" height="2" fill="#ffcc44" opacity="0.5"/>' +
    '<rect x="200" y="14" width="8" height="14" fill="#0a0a1a"/>' +
    '<rect x="212" y="8" width="12" height="20" fill="#0a0a1a"/>' +
    '<rect x="214" y="10" width="2" height="2" fill="#ffcc44" opacity="0.4"/>' +
    '<rect x="218" y="14" width="2" height="2" fill="#ffcc44" opacity="0.6"/>' +
    '<rect x="228" y="16" width="8" height="12" fill="#0a0a1a"/>' +
    '<rect x="240" y="12" width="12" height="16" fill="#0a0a1a"/>' +
    '<rect x="242" y="14" width="2" height="2" fill="#ffcc44" opacity="0.5"/>' +
    '<rect x="246" y="18" width="2" height="2" fill="#ffcc44" opacity="0.3"/>' +
  '</svg>';
}

function weatherStars(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const x = Math.floor((i * 37 + 13) % 100);
    const y = Math.floor((i * 23 + 7) % 60);
    const delay = ((i * 1.3) % 4).toFixed(1);
    const size = (i % 3 === 0) ? 2 : 1;
    html += '<div class="weather-star" style="left:' + x + '%;top:' + y + '%;width:' + size + 'px;height:' + size + 'px;animation-delay:' + delay + 's"></div>';
  }
  return html;
}

function getPoem(iconType) {
  const poems = WEATHER_POEMS[iconType] || WEATHER_POEMS.clear;
  return poems[Math.floor(Math.random() * poems.length)];
}

// ── Render with real data ──
function weatherRenderData(data) {
  const display = document.getElementById('weather-display');
  if (!display) return;

  const now = new Date();
  const days = ['\u65e5','\u6708','\u706b','\u6c34','\u6728','\u91d1','\u571f'];
  const dateStr = now.getFullYear() + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + String(now.getDate()).padStart(2,'0') + ' (' + days[now.getDay()] + ')';
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  const wmo = WMO_MAP[data.code] || WMO_MAP[0];
  const poem = getPoem(wmo.icon);

  display.innerHTML =
    '<div class="weather-scene">' +
      weatherStars(12) +
      '<div class="weather-header">- Tonight\'s Forecast -</div>' +
      '<div class="weather-date">' + dateStr + '</div>' +
      '<div class="weather-main">' +
        '<div class="weather-icon">' + weatherIcon(wmo.icon) + '</div>' +
        '<div class="weather-temp">' + Math.round(data.temp) + '<span class="weather-unit">\u00b0C</span></div>' +
      '</div>' +
      '<div class="weather-condition">' + wmo.ja + '</div>' +
      '<div class="weather-text">' + poem + '</div>' +
      '<div class="weather-detail">' +
        (data.humidity != null ? '\u6e7f\u5ea6 ' + data.humidity + '% \u00b7 ' : '') +
        (data.wind != null ? '\u98a8\u901f ' + (data.wind / 3.6).toFixed(1) + 'm/s' : '') +
        (data.location ? ' \u00b7 ' + data.location : '') +
      '</div>' +
    '</div>' +
    '<div class="weather-skyline">' + weatherSkyline() + '</div>' +
    '<div class="weather-station">Tween 82.8 MHz \u00b7 ' + timeStr + '</div>';
}

// ── Win95-style location permission dialog ──
function showLocationDialog() {
  return new Promise((resolve) => {
    // Check if dialog already exists
    if (document.getElementById('win-location-dialog')) {
      resolve(false);
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'win-location-dialog';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center';

    overlay.innerHTML =
      '<div class="win-window" style="width:320px;max-width:90vw">' +
        '<div class="title-bar" style="cursor:default">' +
          '<span class="title-icon"><svg width="12" height="12" viewBox="0 0 16 16" style="image-rendering:pixelated;vertical-align:middle"><circle cx="8" cy="8" r="7" fill="#ffdd44"/><rect x="7" y="4" width="2" height="5" fill="#000"/><rect x="7" y="10" width="2" height="2" fill="#000"/></svg></span>' +
          '<span class="title-text">\u4f4d\u7f6e\u60c5\u5831\u306e\u78ba\u8a8d</span>' +
        '</div>' +
        '<div class="win-body" style="padding:16px;font-size:12px">' +
          '<div style="display:flex;gap:12px;align-items:flex-start">' +
            '<svg width="32" height="32" viewBox="0 0 32 32" style="image-rendering:pixelated;flex-shrink:0"><circle cx="16" cy="16" r="14" fill="#ffdd44"/><rect x="14" y="6" width="4" height="12" fill="#000"/><rect x="14" y="20" width="4" height="4" fill="#000"/></svg>' +
            '<div>' +
              '<p style="margin:0 0 8px">\u5929\u6c17\u4e88\u5831\u3092\u53d6\u5f97\u3059\u308b\u305f\u3081\u3001<br>\u73fe\u5728\u5730\u3092\u78ba\u8a8d\u3057\u307e\u3059\u3002</p>' +
              '<p style="margin:0;color:#808080;font-size:11px">\u4f4d\u7f6e\u60c5\u5831\u306f\u5929\u6c17\u53d6\u5f97\u306e\u307f\u306b\u4f7f\u7528\u3057\u3001<br>\u4fdd\u5b58\u30fb\u9001\u4fe1\u306f\u3057\u307e\u305b\u3093\u3002</p>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
            '<button class="ctrl-btn" id="loc-ok" style="min-width:80px">OK</button>' +
            '<button class="ctrl-btn" id="loc-cancel" style="min-width:80px">\u30ad\u30e3\u30f3\u30bb\u30eb</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    document.getElementById('loc-ok').onclick = () => {
      overlay.remove();
      resolve(true);
    };
    document.getElementById('loc-cancel').onclick = () => {
      overlay.remove();
      resolve(false);
    };
  });
}

// ── Get location ──
function getLocation() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}

// ── Reverse geocode (Open-Meteo geocoding) ──
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=ja`);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return addr.city || addr.town || addr.village || addr.county || null;
  } catch { return null; }
}

// ── Fetch weather from Open-Meteo ──
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather API error');
  const data = await res.json();
  const cur = data.current;
  return {
    temp: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    code: cur.weather_code,
    wind: cur.wind_speed_10m,
  };
}

// ── Main weather flow ──
let weatherLocationAsked = false;
let weatherLastFetch = 0;
let weatherLat = 35.6762, weatherLon = 139.6503, weatherLocName = 'Tokyo';
const WEATHER_TTL = 30 * 60 * 1000; // 30 minutes

async function weatherInit() {
  const display = document.getElementById('weather-display');
  if (!display) return;

  let lat = weatherLat, lon = weatherLon, location = weatherLocName;

  // Ask for location (only once per session)
  if (!weatherLocationAsked && 'geolocation' in navigator) {
    weatherLocationAsked = true;
    const ok = await showLocationDialog();
    if (ok) {
      display.innerHTML = '<div class="weather-scene" style="padding:40px 0"><div class="weather-header">LOADING...</div><div class="weather-text" style="color:#8888bb">\u4f4d\u7f6e\u60c5\u5831\u3092\u53d6\u5f97\u4e2d...</div></div>';
      const pos = await getLocation();
      if (pos) {
        lat = pos.lat;
        lon = pos.lon;
        location = await reverseGeocode(lat, lon) || '';
        weatherLat = lat;
        weatherLon = lon;
        weatherLocName = location;
      }
    }
  }

  try {
    const data = await fetchWeather(lat, lon);
    data.location = location;
    weatherRenderData(data);
    weatherLastFetch = Date.now();
  } catch {
    weatherRenderData({ temp: 18, humidity: 65, code: 0, wind: 2, location: location });
  }
}

async function weatherRefresh() {
  try {
    const data = await fetchWeather(weatherLat, weatherLon);
    data.location = weatherLocName;
    weatherRenderData(data);
    weatherLastFetch = Date.now();
  } catch { /* keep current display */ }
}

// ── Window helpers ──
function openWeather() {
  openExtraWindow('win-weather');
  if (!weatherLocationAsked) {
    weatherInit();
  } else if (Date.now() - weatherLastFetch > WEATHER_TTL) {
    weatherRefresh();
  }
}

function closeWeather() {
  document.getElementById('win-weather').style.removeProperty('display');
}

function toggleWeather() {
  const w = document.getElementById('win-weather');
  if (window.getComputedStyle(w).display === 'none') {
    openWeather();
  } else {
    closeWeather();
  }
}

// ── Init (render default on load, real data on open) ──
weatherRenderData({ temp: '--', humidity: null, code: 0, wind: null, location: '' });
