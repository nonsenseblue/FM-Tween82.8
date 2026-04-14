#!/usr/bin/env node
// Tween 82.8 — Asset Generator (zero dependencies)
// Usage: node generate-icons.js
// Output: icon-192.png  icon-512.png  ogp.png
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────
const CRC_TBL = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TBL[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const cv  = Buffer.alloc(4); cv.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, cv]);
}

// ── PNG from raw RGBA buffer ──────────────────────────────────
function bufToPNG(W, H, buf) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6; // 8-bit RGBA
  const raw = Buffer.alloc(H * (1 + W * 4));
  let pos = 0;
  for (let y = 0; y < H; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < W; x++) {
      const i = (y*W+x)*4;
      raw[pos++]=buf[i]; raw[pos++]=buf[i+1]; raw[pos++]=buf[i+2]; raw[pos++]=buf[i+3];
    }
  }
  const cmp = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, pngChunk('IHDR',ihdr), pngChunk('IDAT',cmp), pngChunk('IEND',Buffer.alloc(0))]);
}

// ── PNG from pixel callback ───────────────────────────────────
function makePNG(W, H, getPixel) {
  const buf = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = getPixel(x, y);
    const i = (y*W+x)*4;
    buf[i]=px[0]; buf[i+1]=px[1]; buf[i+2]=px[2]; buf[i+3]=(px[3]!==undefined?px[3]:255);
  }
  return bufToPNG(W, H, buf);
}

// ── Colors ───────────────────────────────────────────────────
const silver=[192,192,192], white=[255,255,255], black=[0,0,0],
      gray=[128,128,128],   dgray=[64,64,64],    navy=[0,0,128],
      green=[0,255,0],      bgNav=[10,14,42];

// ── Buffer drawing helpers ────────────────────────────────────
function mkBuf(W, H, r=10, g=14, b=42) {
  const buf = new Uint8Array(W * H * 4);
  for (let i = 0; i < W*H; i++) { buf[i*4]=r; buf[i*4+1]=g; buf[i*4+2]=b; buf[i*4+3]=255; }
  return buf;
}

// Alpha-blend a color onto buf at (x, y)
function blend(buf, W, H, x, y, r, g, b, a) {
  if (x<0||x>=W||y<0||y>=H||a<=0) return;
  const i = (y*W+x)*4;
  const alpha = a/255;
  buf[i]   = Math.min(255, Math.round(buf[i]   * (1-alpha) + r * alpha));
  buf[i+1] = Math.min(255, Math.round(buf[i+1] * (1-alpha) + g * alpha));
  buf[i+2] = Math.min(255, Math.round(buf[i+2] * (1-alpha) + b * alpha));
  buf[i+3] = 255;
}

function fillRect(buf, W, H, x, y, w, h, r, g, b, a=255) {
  for (let dy=0;dy<h;dy++) for (let dx=0;dx<w;dx++) blend(buf,W,H,x+dx,y+dy,r,g,b,a);
}

// ── Win95 Icon Pixel Art (32×32 base) ────────────────────────
function d8(rx,ry) {
  if(rx<0||rx>2||ry<0||ry>4) return false;
  if(ry===0||ry===2||ry===4) return true;
  return rx===0||rx===2;
}
function d2(rx,ry) {
  if(rx<0||rx>2||ry<0||ry>4) return false;
  if(ry===0||ry===4) return true;
  if(ry===1) return rx===2;
  if(ry===2) return true;
  if(ry===3) return rx===0;
  return false;
}
function iconPx(px, py) {
  if(py>=28) { if(py===28) return gray; return px===0?white:silver; }
  if(py===0||px===0) return white;
  if(py===31||px===31) return black;
  if(py===30||px===30) return gray;
  if(px>=3&&px<=28&&py>=3&&py<=26) {
    if(py===3||px===3) return dgray;
    if(py===26||px===28) return white;
    if(px>=4&&px<=27&&py>=4&&py<=25) {
      if(px===10&&py>=6&&py<=11) return green;
      if(py===6&&(px===11||px===12)) return green;
      if(py===7&&px===12) return green;
      if(py===11&&px>=8&&px<=10) return green;
      if(py===12&&(px===8||px===9)) return green;
      if(d8(px-6,py-17))  return green;
      if(d2(px-10,py-17)) return green;
      if(px===14&&py===21) return green;
      if(d8(px-16,py-17)) return green;
      return black;
    }
    return gray;
  }
  return silver;
}

function makeIcon(size) {
  const s = size/32;
  return makePNG(size, size, (x, y) => iconPx(Math.floor(x/s), Math.floor(y/s)));
}

// ── Pixel Font 5×7 ────────────────────────────────────────────
const FONT = {
  'T':['11111','00100','00100','00100','00100','00100','00100'],
  'W':['10001','10001','10001','10101','10101','11011','10001'],
  'E':['11111','10000','10000','11110','10000','10000','11111'],
  'N':['10001','11001','10101','10011','10001','10001','10001'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '2':['01110','10001','00001','00110','01000','10000','11111'],
  '.':['00000','00000','00000','00000','00000','01100','01100'],
  'F':['11111','10000','10000','11110','10000','10000','10000'],
  'M':['10001','11011','10101','10001','10001','10001','10001'],
  'H':['10001','10001','10001','11111','10001','10001','10001'],
  'Z':['11111','00001','00010','00100','01000','10000','11111'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};

function makeTextBmp(text, scale) {
  const cw = 6*scale;
  const bW = text.length*cw, bH = 7*scale;
  const bmp = new Uint8Array(bW*bH);
  for (let ci=0; ci<text.length; ci++) {
    const rows = FONT[text[ci]] || FONT[' '];
    for (let ry=0;ry<7;ry++) for (let rx=0;rx<5;rx++) if(rows[ry][rx]==='1')
      for (let dy=0;dy<scale;dy++) for (let dx=0;dx<scale;dx++) {
        const bx=ci*cw+rx*scale+dx, by=ry*scale+dy;
        if(bx<bW&&by<bH) bmp[by*bW+bx]=1;
      }
  }
  return { bmp, W:bW, H:bH };
}

// Draw text with optional glow onto buffer
function drawText(buf, bW, bH, tb, ox, oy, r, g, b, glow=0) {
  if (glow > 0) {
    // Pre-compute set of text pixels for glow
    const pixels = [];
    for (let ty=0; ty<tb.H; ty++)
      for (let tx=0; tx<tb.W; tx++)
        if (tb.bmp[ty*tb.W+tx]) pixels.push([tx,ty]);
    // Glow pass (Gaussian-like decay)
    for (const [tx,ty] of pixels) {
      for (let dy=-glow; dy<=glow; dy++) for (let dx=-glow; dx<=glow; dx++) {
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist>glow) continue;
        const a = Math.floor(180 * Math.pow(1 - dist/glow, 1.8));
        blend(buf,bW,bH, ox+tx+dx, oy+ty+dy, r,g,b, a);
      }
    }
  }
  // Solid pass
  for (let ty=0; ty<tb.H; ty++)
    for (let tx=0; tx<tb.W; tx++)
      if (tb.bmp[ty*tb.W+tx])
        blend(buf,bW,bH, ox+tx, oy+ty, r,g,b, 255);
}

// ── OGP (1200×630) — redesigned ─────────────────────────────
function makeOGP() {
  const W=1200, H=630;
  const buf = mkBuf(W, H, ...bgNav);

  // ── 1. Radial ambient glow (dark green behind "82.8") ──────
  const glowCX=600, glowCY=290, glowRX=480, glowRY=220;
  for (let y=glowCY-glowRY; y<=glowCY+glowRY; y++) {
    for (let x=glowCX-glowRX; x<=glowCX+glowRX; x++) {
      const nx=(x-glowCX)/glowRX, ny=(y-glowCY)/glowRY;
      const d = Math.sqrt(nx*nx+ny*ny);
      if (d<=1) {
        const a = Math.floor(55 * Math.pow(1-d, 2.5));
        blend(buf,W,H,x,y, 0,80,40, a);
      }
    }
  }

  // ── 2. Stars ───────────────────────────────────────────────
  const STARS = [
    [72,38,3],[195,22,2],[348,78,2],[502,18,3],[680,44,2],[892,28,3],[1082,62,2],
    [1155,140,2],[44,290,2],[285,260,3],[558,310,2],[798,270,2],[1040,300,2],[1168,242,3],
    [130,480,2],[420,500,2],[720,460,3],[950,510,2],[1120,490,2],
    [240,170,2],[810,160,2],[1010,400,2],[60,410,2],[600,540,2],
  ];
  for (const [sx,sy,sz] of STARS) {
    const brightness = 120 + Math.floor(Math.random()*100);
    for (let dy=0;dy<sz;dy++) for (let dx=0;dx<sz;dx++)
      blend(buf,W,H,sx+dx,sy+dy, brightness,brightness,brightness+30, 160+sz*20);
  }

  // ── 3. Win95 Title Bar (top) ───────────────────────────────
  // Silver frame
  fillRect(buf,W,H, 0,0, W,42, ...silver);
  // Win95 bevel (outer)
  fillRect(buf,W,H, 0,0, W,2, 255,255,255, 220);
  fillRect(buf,W,H, 0,0, 2,42, 255,255,255, 220);
  fillRect(buf,W,H, 0,40, W,2, 80,80,80, 220);
  fillRect(buf,W,H, W-2,0, 2,42, 80,80,80, 220);
  // Navy title fill
  fillRect(buf,W,H, 3,3, W-130,36, ...navy);
  // Title text "TWEEN  82.8" at scale=4 inside the bar
  const tbTitle = makeTextBmp('TWEEN  82.8', 4); // 11×24=264 wide, 28 tall
  drawText(buf,W,H, tbTitle, 12, 10, 255,255,255, 0);
  // Title bar grip dots
  for (let gx=tbTitle.W+20; gx<W-134; gx+=4) {
    blend(buf,W,H, gx,17, 80,80,180, 90);
    blend(buf,W,H, gx+2,19, 20,20,100, 90);
  }
  // Title buttons: _, □, ✕  (Win95 style box buttons)
  [[W-110,3],[W-76,3],[W-42,3]].forEach(([bx,by]) => {
    fillRect(buf,W,H, bx,by, 32,36, ...silver);
    fillRect(buf,W,H, bx,by, 32,2, 255,255,255); // top bevel
    fillRect(buf,W,H, bx,by, 2,36, 255,255,255); // left bevel
    fillRect(buf,W,H, bx,by+34, 32,2, 80,80,80);  // bottom shadow
    fillRect(buf,W,H, bx+30,by, 2,36, 80,80,80);  // right shadow
  });

  // ── 4. "TWEEN" — Hero (Level 1): large, white, centered ─────
  // scale=18 → 5×6×18=540px wide, 7×18=126px tall
  const tbTween = makeTextBmp('TWEEN', 18);
  const tweenOX = Math.floor((W-tbTween.W)/2);
  drawText(buf,W,H, tbTween, tweenOX, 72, 255,255,255, 0);

  // ── 5. "82.8" — Sub (Level 2): smaller, green glow ─────────
  // scale=16 → 4×6×16=384px wide, 7×16=112px tall
  const tbNum = makeTextBmp('82.8', 16);
  const numOX = Math.floor((W-tbNum.W)/2);
  drawText(buf,W,H, tbNum, numOX, 234, 0,255,80, 8);

  // ── 6. "FM  MHZ" — Context (Level 3): small, muted ─────────
  const tbFM = makeTextBmp('FM  MHZ', 4);
  const fmOX = Math.floor((W-tbFM.W)/2);
  drawText(buf,W,H, tbFM, fmOX, 376, 80,128,96, 0);

  // ── 7. Win95 Taskbar (bottom) ──────────────────────────────
  const tbY = 596;
  fillRect(buf,W,H, 0,tbY, W,34, ...silver);
  // Top bevel
  fillRect(buf,W,H, 0,tbY, W,2, 80,80,80);
  fillRect(buf,W,H, 0,tbY+2, W,2, 255,255,255);
  // Start button
  fillRect(buf,W,H, 4,tbY+4, 70,26, ...silver);
  fillRect(buf,W,H, 4,tbY+4, 70,2, 255,255,255);
  fillRect(buf,W,H, 4,tbY+4, 2,26, 255,255,255);
  fillRect(buf,W,H, 4,tbY+28, 70,2, 80,80,80);
  fillRect(buf,W,H, 72,tbY+4, 2,26, 80,80,80);
  const tbStart = makeTextBmp('TWEEN', 2);
  drawText(buf,W,H, tbStart, 10, tbY+10, 0,0,0, 0);
  // Taskbar app button (active)
  fillRect(buf,W,H, 82,tbY+4, 160,26, ...silver);
  fillRect(buf,W,H, 82,tbY+4, 2,26, 255,255,255);
  fillRect(buf,W,H, 82,tbY+4, 160,2, 255,255,255);
  fillRect(buf,W,H, 82,tbY+28, 160,2, 80,80,80);
  fillRect(buf,W,H, 240,tbY+4, 2,26, 80,80,80);
  const tbApp = makeTextBmp('FM', 2);
  drawText(buf,W,H, tbApp, 88, tbY+11, 0,0,0, 0);
  // Clock in tray
  fillRect(buf,W,H, W-80,tbY+4, 76,26, ...silver);
  fillRect(buf,W,H, W-80,tbY+4, 2,26, 80,80,80);  // inset left
  fillRect(buf,W,H, W-80,tbY+4, 76,2, 80,80,80);  // inset top
  const tbClock = makeTextBmp('22.58', 2);
  drawText(buf,W,H, tbClock, W-74, tbY+11, 0,0,0, 0);

  // ── 8. Full-width frequency spectrum (monochrome green) ─────
  const barCnt = 96;
  const specX = 0, specY = 458, specH = 138;  // ends at y=596 (taskbar start)
  const barW = Math.floor(W / barCnt);
  const gap = 1;

  for (let i=0; i<barCnt; i++) {
    const rawH = Math.floor(
      20 + Math.sin(i*0.45)*45 + Math.cos(i*0.25)*55 +
      Math.sin(i*0.8+1.2)*35 + Math.cos(i*1.1+0.7)*28 +
      Math.sin(i*0.15)*30
    );
    const clampH = Math.max(8, Math.min(specH-8, rawH + 90));
    const bx = specX + i*barW + gap;
    const bot = specY + specH;
    // Tall bars: bright green → short bars: dark teal
    const bright = 0.4 + 0.6 * (clampH / (specH-8));

    for (let dy=0; dy<clampH; dy++) {
      const py = bot - 1 - dy;
      const t = dy / clampH;   // 0 = bottom, 1 = top
      const topFade = Math.min(1, dy/10);
      // Bottom: darker teal, top: bright green
      const r = 0;
      const g = Math.floor((80 + 175*t) * bright);
      const b = Math.floor((60 + 20*(1-t)) * bright);
      const a = Math.floor(230 * topFade);
      for (let dx=0; dx<barW-gap; dx++)
        blend(buf,W,H, bx+dx, py, r, g, b, a);
    }
    // Reflection (very faint)
    for (let dy=0; dy<Math.floor(clampH*0.2); dy++) {
      const py = bot + dy;
      const a = Math.floor(25 * (1 - dy/(clampH*0.2)));
      for (let dx=0; dx<barW-gap; dx++)
        blend(buf,W,H, bx+dx, py, 0, 180, 80, a);
    }
  }

  // ── 9. CRT scanlines (subtle, every 3 rows) ────────────────
  for (let y=0; y<H; y+=3) {
    for (let x=0; x<W; x++) {
      const i=(y*W+x)*4;
      buf[i]   = Math.floor(buf[i]   * 0.88);
      buf[i+1] = Math.floor(buf[i+1] * 0.88);
      buf[i+2] = Math.floor(buf[i+2] * 0.88);
    }
  }

  // ── 10. Vignette (dark edges) ──────────────────────────────
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    const nx = (x/W)*2-1, ny = (y/H)*2-1;
    const d = Math.sqrt(nx*nx*0.6 + ny*ny);
    if (d > 0.65) {
      const a = Math.floor(180 * Math.min(1, (d-0.65)/0.6));
      blend(buf,W,H, x,y, 5,7,20, a);
    }
  }

  return bufToPNG(W, H, buf);
}

// ── Run ───────────────────────────────────────────────────────
const dir = path.resolve(path.dirname(process.argv[1]), '..');

process.stdout.write('Generating icon-192.png ... ');
fs.writeFileSync(path.join(dir,'icon-192.png'), makeIcon(192));
console.log('✓');

process.stdout.write('Generating icon-512.png ... ');
fs.writeFileSync(path.join(dir,'icon-512.png'), makeIcon(512));
console.log('✓');

process.stdout.write('Generating ogp.png (1200×630) ... ');
fs.writeFileSync(path.join(dir,'ogp.png'), makeOGP());
console.log('✓');

console.log('\nAll assets saved to: ' + dir);
