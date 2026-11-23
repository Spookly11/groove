'use strict';
// Version: raise the middle number with every change to the app.
const APP_VERSION = '1.24.0';
// Groove for iPhone: a home screen web app. Songs, covers and settings live on the phone (IndexedDB).
// Library format matches desktop Groove's Export Library zip, so libraries move both ways.

// ---------- small helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString() + Math.random().toString(36).slice(2, 7);
const fmtTime = (t) => { if (!isFinite(t) || t < 0) t = 0; t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const fmtHours = (ms) => { const m = Math.floor((ms || 0) / 60000); const h = Math.floor(m / 60); return h ? h + 'h ' + (m % 60) + 'm' : m + 'm'; };
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const fmtBytes = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : (n / 1e6).toFixed(0) + ' MB');
const extOf = (name, fallback) => { const m = /\.([a-z0-9]{2,5})$/i.exec(name || ''); return m ? m[1].toLowerCase() : fallback; };
const AUDIO_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg' };
const IMG_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

// ---------- portrait only ----------
// iOS does not let home screen web apps lock rotation, so when the phone turns sideways the whole app is
// turned back the other way: it stays upright to the phone like a portrait-only app, and taps still line up.
const ROT = { mode: 0, W: 0, H: 0 }; // mode 0 = upright, 90 / -90 = turned back
function lockPortrait() {
  const root = $('root'); if (!root) return;
  const W = window.innerWidth, H = window.innerHeight;
  let ang = 0;
  if (W > H) {
    ang = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 90);
    ang = ((ang % 360) + 360) % 360 === 270 ? -90 : 90;
  }
  ROT.mode = ang; ROT.W = W; ROT.H = H;
  if (!ang) {
    root.style.cssText = '';
    root.style.setProperty('--app-h', H + 'px');
    return;
  }
  // portrait-shaped box: as wide as the screen is tall, as tall as it is wide
  root.style.cssText = 'inset:auto;left:0;top:0;width:' + H + 'px;height:' + W + 'px;transform:' +
    (ang === 90 ? 'translateY(' + H + 'px) rotate(-90deg)' : 'translateX(' + W + 'px) rotate(90deg)');
  root.style.setProperty('--app-h', W + 'px');
  // the notch is on the side that is now the app's top; the home bar no longer sits under the tab bar
  root.style.setProperty('--safe-t', ang === 90 ? 'env(safe-area-inset-left, 0px)' : 'env(safe-area-inset-right, 0px)');
  root.style.setProperty('--safe-b', '12px');
}
// screen point -> point inside the (possibly turned) app
function toLocal(X, Y) {
  if (ROT.mode === 90) return { x: ROT.H - Y, y: X };
  if (ROT.mode === -90) return { x: Y, y: ROT.W - X };
  return { x: X, y: Y };
}
function localRect(el) {
  const r = el.getBoundingClientRect(); const a = toLocal(r.left, r.top), b = toLocal(r.right, r.bottom);
  const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x);
  return { left, right, width: right - left };
}
const localX = (e) => toLocal(e.clientX, e.clientY).x;
lockPortrait();
// iOS reports the new size a little after turning, and can leave the page zoomed or scrolled: settle it a few times
function settleRotation() {
  lockPortrait(); window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
}
function onTurn() { settleRotation(); [80, 250, 500, 900].forEach((t) => setTimeout(settleRotation, t)); }
window.addEventListener('resize', onTurn);
window.addEventListener('orientationchange', onTurn);
if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', onTurn);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onTurn);

const I = {
  note: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  noteBig: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  shuffle: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  shuffleSm: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  loop: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  prev: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#e8eaf0"><path d="M19 5L9 12l10 7z"/><rect x="5" y="5" width="3" height="14" rx="1"/></svg>',
  next: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#e8eaf0"><path d="M5 5l10 7-10 7z"/><rect x="16" y="5" width="3" height="14" rx="1"/></svg>',
  nextSm: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#e8eaf0"><path d="M5 5l10 7-10 7z"/><rect x="16" y="5" width="3" height="14" rx="1"/></svg>',
  playBig: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#09090a"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pauseBig: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#09090a"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  playSm: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#e8eaf0"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pauseSm: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#e8eaf0"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  playBtn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
  addPl: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8eaf0" stroke-width="2" stroke-linecap="round"><path d="M4 6h12M4 12h12M4 18h7M18 15v6M15 18h6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  importI: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  exportI: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 21h14"/></svg>',
  trash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  stats: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  edit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  minus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
  playNext: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h10M4 12h10M4 18h6M15 15l5 3-5 3z"/></svg>',
  sync: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  updown: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/></svg>',
};

// ---------- storage ----------
// meta: one record with the library (song list, playlists, themes, stats, settings)
// audio: the song files   covers: original covers ("c:"+song, "p:"+playlist, "t:"+theme) and small list thumbnails ("ct:"+song)
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('groove', 1);
      r.onupgradeneeded = () => { const d = r.result; for (const n of ['meta', 'audio', 'covers']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  req(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const q = fn(t.objectStore(store));
      t.oncomplete = () => res(q && 'result' in q ? q.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('aborted'));
    });
  },
  get(s, k) { return this.req(s, 'readonly', (o) => o.get(k)); },
  put(s, k, v) { return this.req(s, 'readwrite', (o) => o.put(v, k)); },
  del(s, k) { return this.req(s, 'readwrite', (o) => o.delete(k)); },
  clear(s) { return this.req(s, 'readwrite', (o) => o.clear()); },
  all(s) {
    return new Promise((res, rej) => {
      const out = new Map(); const t = this.db.transaction(s, 'readonly');
      t.objectStore(s).openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { out.set(c.key, c.value); c.continue(); } };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    });
  },
};

const DEFAULT_THEME = { id: 'default-theme', name: 'Default', accent: '#6f1ddb', hasBg: false };
function emptyLibrary() {
  return { songs: [], playlists: [], themes: [], activeThemeId: 'default-theme', totalListenTime: 0, daily: {},
    settings: { confirmDelete: true, sortBy: 'added', sortDir: -1 }, desktopSettings: null, state: null,
    deletedSongs: {}, deletedPlaylists: {}, statsResetAt: 0,
    sync: { url: '', key: '', lastSync: 0, serverNow: 0, base: null } };
}
let L = emptyLibrary();
const urls = new Map(); // covers key -> object URL
function coverUrl(key) { return urls.get(key) || ''; }
function setCover(key, blob) { const old = urls.get(key); if (old) URL.revokeObjectURL(old); if (blob) urls.set(key, URL.createObjectURL(blob)); else urls.delete(key); }
let saveT = 0;
function save(now) {
  clearTimeout(saveT);
  const run = () => DB.put('meta', 'library', L).catch((e) => toast('Could not save: ' + e.message));
  if (now) return run();
  saveT = setTimeout(run, 600);
}
const songById = (id) => L.songs.find((s) => s.id === id);
const plById = (id) => L.playlists.find((p) => p.id === id);
const allThemes = () => [DEFAULT_THEME, ...L.themes];

// ---------- images ----------
async function loadImage(blob) {
  if (window.createImageBitmap) { try { return await createImageBitmap(blob); } catch (e) { /* fall back */ } }
  const u = URL.createObjectURL(blob);
  try { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = u; }); }
  finally { setTimeout(() => URL.revokeObjectURL(u), 1000); }
}
// square crop for covers, or keep shape for backgrounds
async function resizeImage(blob, max, square, type = 'image/jpeg', q = 0.86) {
  const img = await loadImage(blob);
  const w = img.width, h = img.height;
  let sx = 0, sy = 0, sw = w, sh = h, dw, dh;
  if (square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s; dw = dh = Math.min(max, s); }
  else { const k = Math.min(1, max / Math.max(w, h)); dw = Math.round(w * k); dh = Math.round(h * k); }
  const c = document.createElement('canvas'); c.width = dw; c.height = dh;
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  if (img.close) img.close();
  return await new Promise((res) => c.toBlob((b) => res(b), type, q));
}
const thumbOf = (blob) => resizeImage(blob, 160, true, 'image/jpeg', 0.8);

// ---------- reading song tags (ID3v2) for songs added on the phone ----------
async function readTags(file) {
  const out = { title: '', cover: null };
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return out;
    const ver = head[3];
    const size = ((head[6] & 127) << 21) | ((head[7] & 127) << 14) | ((head[8] & 127) << 7) | (head[9] & 127);
    const b = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
    let p = 0;
    if (head[5] & 0x40) p = ver === 4 ? ((b[0] & 127) << 21) | ((b[1] & 127) << 14) | ((b[2] & 127) << 7) | (b[3] & 127) : ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) + 4;
    const text = (f) => { const enc = f[0], body = f.subarray(1); const dec = enc === 0 ? 'latin1' : enc === 1 ? 'utf-16' : enc === 2 ? 'utf-16be' : 'utf-8'; return new TextDecoder(dec).decode(body).replace(/\u0000+$/, '').split('\u0000')[0].trim(); };
    while (p + 10 <= b.length) {
      const id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = ver === 4 ? ((b[p + 4] & 127) << 21) | ((b[p + 5] & 127) << 14) | ((b[p + 6] & 127) << 7) | (b[p + 7] & 127) : (b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7];
      const f = b.subarray(p + 10, p + 10 + fs);
      if (id === 'TIT2') out.title = text(f);
      else if (id === 'APIC' && !out.cover) {
        const enc = f[0]; let i = 1; const me = f.indexOf(0, i);
        const mime = new TextDecoder('latin1').decode(f.subarray(i, me)) || 'image/jpeg'; i = me + 2;
        if (enc === 1 || enc === 2) { while (i + 1 < f.length && !(f[i] === 0 && f[i + 1] === 0)) i += 2; i += 2; } else { while (i < f.length && f[i] !== 0) i++; i++; }
        out.cover = new Blob([f.subarray(i)], { type: mime.includes('/') ? mime : 'image/' + mime.toLowerCase() });
      }
      p += 10 + fs;
    }
  } catch (e) { /* no tags */ }
  return out;
}

// ---------- zip (reading desktop Groove's Export Library, writing backups it can import) ----------
async function zipEntries(file) {
  const tailLen = Math.min(file.size, 66000 + 22);
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let e = -1;
  for (let i = tailLen - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('This is not a zip file.');
  let count = tail.getUint16(e + 10, true), cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
  if (cdOff === 0xffffffff || count === 0xffff) { // zip64
    const loc = e - 20;
    if (loc >= 0 && tail.getUint32(loc, true) === 0x07064b50) {
      const z64 = Number(tail.getBigUint64(loc + 8, true));
      const r = new DataView(await file.slice(z64, z64 + 56).arrayBuffer());
      count = Number(r.getBigUint64(32, true)); cdSize = Number(r.getBigUint64(40, true)); cdOff = Number(r.getBigUint64(48, true));
    }
  }
  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const dec = new TextDecoder('utf-8');
  const out = new Map(); let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true);
    let csize = cd.getUint32(p + 20, true), size = cd.getUint32(p + 24, true);
    const nlen = cd.getUint16(p + 28, true), xlen = cd.getUint16(p + 30, true), clen = cd.getUint16(p + 32, true);
    let off = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nlen)).replace(/\\/g, '/');
    if (csize === 0xffffffff || size === 0xffffffff || off === 0xffffffff) { // zip64 extra field
      let x = p + 46 + nlen; const xe = x + xlen;
      while (x + 4 <= xe) {
        const tag = cd.getUint16(x, true), len = cd.getUint16(x + 2, true); let q = x + 4;
        if (tag === 1) {
          if (size === 0xffffffff) { size = Number(cd.getBigUint64(q, true)); q += 8; }
          if (csize === 0xffffffff) { csize = Number(cd.getBigUint64(q, true)); q += 8; }
          if (off === 0xffffffff) { off = Number(cd.getBigUint64(q, true)); }
        }
        x += 4 + len;
      }
    }
    if (!name.endsWith('/')) out.set(name.replace(/^\.?\//, ''), { name, method, csize, size, off });
    p += 46 + nlen + xlen + clen;
  }
  return out;
}
async function zipRead(file, e, type) {
  const h = new DataView(await file.slice(e.off, e.off + 30).arrayBuffer());
  const start = e.off + 30 + h.getUint16(26, true) + h.getUint16(28, true);
  const raw = file.slice(start, start + e.csize);
  if (e.method === 0) return new Blob([raw], { type: type || '' });
  if (e.method === 8) {
    if (!window.DecompressionStream) throw new Error('This iOS version cannot unpack zip files. Update iOS and try again.');
    const out = await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
    return type ? new Blob([out], { type }) : out;
  }
  throw new Error('Unsupported zip compression in ' + e.name);
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
async function crcOf(blob) {
  let c = 0xffffffff; const step = 4 * 1024 * 1024;
  for (let o = 0; o < blob.size; o += step) {
    const b = new Uint8Array(await blob.slice(o, o + step).arrayBuffer());
    for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
// stored (uncompressed) zip; files: [{name, blob}]
async function zipWrite(files, onProgress) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const now = new Date(); const dtime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const ddate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (let i = 0; i < files.length; i++) {
    const f = files[i]; const name = enc.encode(f.name); const crc = await crcOf(f.blob); const size = f.blob.size;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dtime, true); lh.setUint16(12, ddate, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, f.blob);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dtime, true); ch.setUint16(14, ddate, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + size;
    if (onProgress) onProgress(i + 1, files.length);
  }
  const cdSize = central.reduce((t, p) => t + (p.byteLength || 0), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

// ---------- playback ----------
// Two players: while one plays, the other already has the next song loaded, so the next song starts
// with no gap even when the phone is locked (tested on iPhone).
const players = [$('a1'), $('a2')];
let audio = players[0];
const P = { queue: [], ctx: { type: 'library', id: null, name: 'Library' }, cur: null, shuffle: false, loop: false, played: [], upcoming: null, history: [] };
const pUrls = new Map();
let ready = { el: null, id: null };
let unlocked = false;
let endedAt = 0;
const other = () => (audio === players[0] ? players[1] : players[0]);
async function srcFor(el, id) {
  const blob = await DB.get('audio', id);
  if (!blob) throw new Error('missing audio');
  const old = pUrls.get(el); if (old) URL.revokeObjectURL(old);
  const u = URL.createObjectURL(blob); pUrls.set(el, u); el.src = u;
}
function unlockSpare() {
  if (unlocked) return;
  const sp = other();
  sp.muted = true; unlocking = sp;
  const p = sp.play();
  if (p) p.then(() => { sp.pause(); sp.muted = false; unlocked = true; unlocking = null; preloadNext(); }).catch(() => { sp.muted = false; unlocking = null; });
  else unlocking = null;
}
let unlocking = null;
function pickUpcoming() {
  if (!P.cur || !P.queue.length) return null;
  if (P.shuffle) {
    let pool = P.queue.filter((id) => !P.played.includes(id) && id !== P.cur);
    if (!pool.length) pool = P.queue.filter((id) => id !== P.cur);
    if (!pool.length) return P.cur;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const i = P.queue.indexOf(P.cur);
  return P.queue[(i + 1) % P.queue.length];
}
async function preloadNext(force) {
  if (force || !P.upcoming || P.upcoming === P.cur || !P.queue.includes(P.upcoming)) P.upcoming = pickUpcoming();
  const id = P.upcoming;
  if (!id || id === P.cur) { ready = { el: null, id: null }; return; }
  const sp = other();
  if (ready.el === sp && ready.id === id) return;
  try { sp.pause(); await srcFor(sp, id); sp.preload = 'auto'; sp.load(); ready = { el: sp, id }; } catch (e) { ready = { el: null, id: null }; }
}
// Head start: load a song into the spare player as soon as a finger touches it in a list,
// so by the time the finger lifts (a tap) it is ready to play.
let prefetch = { id: null, p: null };
let prefetchUndo = 0;
function prefetchSong(id) {
  if (!id || id === P.cur || (ready.id === id && ready.el) || prefetch.id === id) return;
  const sp = other();
  if (!sp.paused) return;
  clearTimeout(prefetchUndo);
  ready = { el: null, id: null };
  const p = (async () => { try { await srcFor(sp, id); sp.preload = 'auto'; sp.load(); if (prefetch.id === id) ready = { el: sp, id }; } catch (e) {} })();
  prefetch = { id, p };
  // not tapped after all (e.g. the list was scrolled): put the real next song back in the spare player
  prefetchUndo = setTimeout(() => { if (prefetch.id === id) { prefetch = { id: null, p: null }; if (P.cur) preloadNext(true); } }, 2500);
}
async function playSong(id, user) {
  const s = songById(id); if (!s) return;
  if (prefetch.id === id && prefetch.p) { await Promise.race([prefetch.p, new Promise((r) => setTimeout(r, 400))]); }
  prefetch = { id: null, p: null }; clearTimeout(prefetchUndo);
  const prevEl = audio;
  const pre = ready.el && ready.id === id;
  if (pre) { audio = ready.el; ready = { el: null, id: null }; try { audio.currentTime = 0; } catch (e) {} prevEl.pause(); }
  else { other().pause(); if (ready.el === audio) ready = { el: null, id: null }; try { await srcFor(audio, id); } catch (e) { toast('This song\'s file is missing.'); return; } }
  if (P.cur && P.cur !== id) { P.history.push(P.cur); if (P.history.length > 200) P.history.shift(); }
  held = null;
  P.cur = id;
  if (P.shuffle) { if (!P.played.includes(id)) P.played.push(id); if (P.played.length >= P.queue.length) P.played = [id]; }
  P.upcoming = pickUpcoming(); // decided now, so pressing Next right away goes to the right song
  audio.loop = P.loop;
  const pr = audio.play();
  if (pr) pr.catch(async () => { if (pre) { audio = prevEl; try { await srcFor(audio, id); audio.play().catch(() => {}); } catch (e) {} } });
  if (user) unlockSpare();
  setMeta(s);
  onTrackChange();
  setTimeout(preloadNext, 1200);
}
function playFrom(queue, ctx, startId, opts = {}) {
  if (!queue.length) return;
  P.queue = queue.slice(); P.ctx = ctx; P.played = []; P.history = [];
  if (opts.shuffle != null) P.shuffle = opts.shuffle;
  let id = startId;
  if (!id) id = P.shuffle ? queue[Math.floor(Math.random() * queue.length)] : queue[0];
  ready = { el: null, id: null };
  playSong(id, true);
}
// iOS fades a song out after pause() and keeps the position moving for a moment, so pausing would
// skip a little ahead. Remember where pause was pressed and put the song back there.
let held = null;
function pauseNow() {
  const el = audio, t = el.currentTime;
  held = { el, t };
  el.pause();
  const fix = () => { if (held && held.el === el && el.paused && Math.abs(el.currentTime - t) > 0.04) { try { el.currentTime = t; } catch (e) {} } };
  setTimeout(fix, 0); setTimeout(fix, 300); setTimeout(fix, 800);
}
function resumeNow() {
  if (held && held.el === audio && Math.abs(audio.currentTime - held.t) > 0.04) { try { audio.currentTime = held.t; } catch (e) {} }
  held = null;
  const p = audio.play(); if (p) p.catch(() => {});
}
// switch the list Next/Previous follow without restarting the song that's playing
function adoptQueue(queue, ctx) {
  P.queue = queue.slice(); P.ctx = ctx;
  if (!P.queue.includes(P.cur)) P.queue.unshift(P.cur);
  P.played = P.cur ? [P.cur] : [];
  P.upcoming = null; ready = { el: null, id: null }; preloadNext(true);
  saveState(); updateNow();
}
function togglePlay() {
  if (!P.cur) { const q = libraryQueue(); if (q.length) playFrom(q, { type: 'library', name: 'Library' }); return; }
  if (audio.paused) { if (!audio.src) { playSong(P.cur, true); return; } resumeNow(); setTimeout(unlockSpare, 600); }
  else pauseNow();
}
function next(user) {
  if (!P.cur) return;
  const s = songById(P.cur);
  if (user && s && audio.duration && audio.currentTime / audio.duration < 0.8) { s.skipCount = (s.skipCount || 0) + 1; save(); }
  const id = P.upcoming && P.upcoming !== P.cur ? P.upcoming : pickUpcoming();
  if (id) playSong(id, user);
}
function prev() {
  if (!P.cur) return;
  if (audio.currentTime > 3) { held = null; audio.currentTime = 0; return; }
  let id;
  if (P.shuffle && P.history.length) { id = P.history.pop(); playSong(id, true); P.history.pop(); return; }
  const i = P.queue.indexOf(P.cur);
  id = P.queue[(i - 1 + P.queue.length) % P.queue.length];
  playSong(id, true);
}
function setShuffle(on) { P.shuffle = on; P.played = P.cur ? [P.cur] : []; ready = { el: null, id: null }; preloadNext(true); saveState(); updateNow(); }
function setLoop(on) { P.loop = on; audio.loop = on; saveState(); updateNow(); }

// lock screen and Control Center
let artKey = '', artUrl = '';
async function setMeta(s) {
  if (!('mediaSession' in navigator)) return;
  const base = { title: s.title, artist: 'Groove', album: P.ctx.name || 'Groove' };
  try { navigator.mediaSession.metadata = new MediaMetadata({ ...base, artwork: artUrl && artKey === s.id ? [{ src: artUrl, sizes: '512x512', type: 'image/jpeg' }] : [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] }); } catch (e) {}
  if (!s.hasCover || artKey === s.id) return;
  try {
    const blob = await DB.get('covers', 'c:' + s.id);
    const small = await resizeImage(blob, 512, true, 'image/jpeg', 0.85);
    artUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(small); });
    artKey = s.id;
    if (P.cur === s.id) navigator.mediaSession.metadata = new MediaMetadata({ ...base, artwork: [{ src: artUrl, sizes: '512x512', type: 'image/jpeg' }] });
  } catch (e) {}
}
if ('mediaSession' in navigator) {
  const on = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch (e) {} };
  on('play', () => { if (P.cur) resumeNow(); });
  on('pause', () => pauseNow());
  on('previoustrack', () => prev());
  on('nexttrack', () => next(true));
  on('seekto', (d) => { if (d.seekTime != null) { held = null; audio.currentTime = d.seekTime; } });
  on('seekbackward', (d) => { held = null; audio.currentTime = Math.max(0, audio.currentTime - ((d && d.seekOffset) || 10)); });
  on('seekforward', (d) => { held = null; audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + ((d && d.seekOffset) || 10)); });
}
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

// listening time, play counts, sleep timer
let lastTick = 0, statSave = 0, lastPos = 0;
const sleep = { left: 0, pick: 30 }; // left = ms of playing time until the timer pauses (counts down only while music plays)
let sleepDue = false;
function tickListen() {
  const now = Date.now();
  if (!audio.paused && lastTick) {
    const d = Math.min(now - lastTick, 2000);
    L.totalListenTime = (L.totalListenTime || 0) + d;
    const k = dayKey(); L.daily[k] = (L.daily[k] || 0) + d;
    if (sleep.left > 0) { sleep.left -= d; if (sleep.left <= 0) { sleep.left = 0; sleepDue = true; } }
    if (now - statSave > 15000) { statSave = now; saveState(true); }
  }
  lastTick = audio.paused ? 0 : now;
  if (sleepDue) { sleepDue = false; pauseNow(); toast('Sleep timer: paused'); drawSettingsIfOpen(); }
}
setInterval(tickListen, 1000);
for (const el of players) {
  const act = (fn) => (e) => { if (e.target === audio) fn(e); };
  el.addEventListener('timeupdate', act(() => {
    updateTime();
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && isFinite(audio.duration) && Date.now() - lastPos > 1000) {
      lastPos = Date.now();
      try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: 1 }); } catch (e) {}
    }
    tickListen();
  }));
  // Only the active player may ever make sound. iOS can start the spare (preloaded) player by itself,
  // e.g. when resuming after Bluetooth headphones disconnect, which played two songs at once.
  const guard = (e) => { const x = e.target; if (x !== audio && x !== unlocking) { x.pause(); try { x.currentTime = 0; } catch (err) {} } };
  el.addEventListener('play', guard);
  el.addEventListener('playing', guard);
  el.addEventListener('play', act(() => { lastTick = Date.now(); updateNow(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; }));
  el.addEventListener('pause', act(() => { tickListen(); updateNow(); saveState(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; }));
  el.addEventListener('loadedmetadata', act(() => { updateTime(); if (pendingSeek != null) { try { audio.currentTime = pendingSeek; } catch (e) {} pendingSeek = null; } }));
  el.addEventListener('ended', act(() => {
    const s = songById(P.cur);
    if (s) { s.playCount = (s.playCount || 0) + 1; save(); }
    endedAt = Date.now();
    next(false);
  }));
}
let pendingSeek = null;
function saveState(now) {
  L.state = { songId: P.cur, pos: audio.currentTime || 0, queue: P.queue, ctx: P.ctx, shuffle: P.shuffle, loop: P.loop };
  save(now);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveState(true); return; }
  const sp = other(); if (!sp.paused && sp !== unlocking) { sp.pause(); try { sp.currentTime = 0; } catch (e) {} }
  updateNow();
});
window.addEventListener('pagehide', () => saveState(true));

// ---------- UI state ----------
const V = { tab: 'library', plId: null, stats: false, q: '' };
function show(tab) {
  V.tab = tab;
  for (const t of ['now', 'library', 'playlists', 'settings']) $('p-' + t).hidden = t !== tab;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  moveHighlight();
  if (tab === 'now') drawNow();
  if (tab === 'library') drawLibrary();
  if (tab === 'playlists') drawPlaylists();
  if (tab === 'settings') drawSettings();
  updateMini();
}
const TABS = ['now', 'library', 'playlists', 'settings'];
function selectTab(tab) {
  if (tab === V.tab) { // tapping the open tab goes back to its top
    if (V.tab === 'playlists' && V.plId) { V.plId = null; drawPlaylists(); }
    else if (V.tab === 'settings' && V.stats) { V.stats = false; drawSettings(); }
    $('p-' + V.tab).scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  show(tab);
}
let hlPlaced = false;
function moveHighlight() {
  const hl = $('nav-hl'); const i = Math.max(0, TABS.indexOf(V.tab));
  if (!hlPlaced) { hl.style.transition = 'none'; hl.style.transform = 'translateX(' + (i * 100) + '%)'; void hl.offsetWidth; hl.style.transition = ''; hlPlaced = true; return; }
  hl.style.transform = 'translateX(' + (i * 100) + '%)';
}
// press and slide across the tab bar: a glass lens follows your finger; let go to open that tab
(() => {
  const nav = $('nav'), lens = $('nav-lens'), btns = Array.from(nav.querySelectorAll('button'));
  let down = false, startX = 0, moved = false;
  const idxAt = (x) => { const r = localRect(nav); const w = (r.width - 10) / 4; return Math.min(3, Math.max(0, Math.floor((x - r.left - 5) / w))); };
  const place = (x) => {
    const r = localRect(nav); const w = (r.width - 10) / 4 + 18;
    lens.style.width = w + 'px';
    const left = Math.min(r.width - w + 9, Math.max(-9, x - r.left - w / 2));
    lens.style.left = left + 'px';
    const hot = idxAt(x); btns.forEach((b, i) => b.classList.toggle('hot', i === hot));
  };
  nav.addEventListener('pointerdown', (e) => {
    down = true; moved = false; startX = localX(e);
    try { nav.setPointerCapture(e.pointerId); } catch (err) {}
    const r = localRect(nav); const w = (r.width - 10) / 4;
    place(r.left + 5 + w * (idxAt(localX(e)) + 0.5));
    nav.classList.add('drag');
  });
  nav.addEventListener('pointermove', (e) => { if (!down) return; if (Math.abs(localX(e) - startX) > 4) moved = true; if (moved) place(localX(e)); });
  const end = (e, cancel) => {
    if (!down) return; down = false;
    nav.classList.remove('drag'); btns.forEach((b) => b.classList.remove('hot'));
    if (!cancel) selectTab(TABS[idxAt(localX(e))]);
  };
  nav.addEventListener('pointerup', (e) => end(e, false));
  nav.addEventListener('pointercancel', (e) => end(e, true));
  // keyboard / VoiceOver activation
  btns.forEach((b) => b.addEventListener('click', (e) => { if (e.detail === 0) selectTab(b.dataset.tab); }));
})();

function covHtml(key, cls = 'cov') {
  const u = coverUrl(key);
  return '<div class="' + cls + (u ? ' has' : '') + '"' + (u ? ' style="background-image:url(\'' + u + '\')"' : '') + '>' + I.note + '</div>';
}
function songRow(s, i, numbered) {
  return '<div class="song' + (s.id === P.cur ? ' on' : '') + '" data-id="' + esc(s.id) + '" role="button">' +
    (numbered ? '<div class="num">' + (i + 1) + '</div>' : '') +
    covHtml('ct:' + s.id) +
    '<div class="meta"><div class="t">' + esc(s.title) + '</div><div class="s">' + plural(s.playCount || 0, 'play') + '</div></div>' +
    '<button class="more" data-more="' + esc(s.id) + '" aria-label="More for ' + esc(s.title) + '">' + I.dots + '</button></div>';
}
function markPlaying() {
  document.querySelectorAll('.song').forEach((r) => r.classList.toggle('on', r.dataset.id === P.cur));
}

// Library
function sortedIds(ids) {
  const { sortBy, sortDir } = L.settings;
  const list = ids.map(songById).filter(Boolean);
  const cmp = sortBy === 'name' ? (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
    : sortBy === 'plays' ? (a, b) => (a.playCount || 0) - (b.playCount || 0) || a.title.localeCompare(b.title)
      : (a, b) => (a.addedAt || 0) - (b.addedAt || 0);
  list.sort((a, b) => cmp(a, b) * sortDir);
  return list.map((s) => s.id);
}
// Next and Previous in the Library always go by date added, oldest to newest (the same order as
// "Song x of x"), whichever way the list is sorted on screen. Search still limits which songs play.
function libraryQueue() {
  const q = V.q.trim().toLowerCase();
  return L.songs.filter((s) => !q || s.title.toLowerCase().includes(q)).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0)).map((s) => s.id);
}
function libraryOrder() {
  const q = V.q.trim().toLowerCase();
  return sortedIds(L.songs.filter((s) => !q || s.title.toLowerCase().includes(q)).map((s) => s.id));
}
// The search box. iOS keeps an "Undo Typing" history for a text box even after you leave it, which shows
// up when you shake the phone. Swapping in a fresh box when you finish searching clears that history.
function makeSearchBox(value) {
  const slot = $('lib-q-slot'); if (!slot) return;
  const q = document.createElement('input');
  q.id = 'lib-q'; q.type = 'search'; q.value = value;
  q.setAttribute('enterkeyhint', 'search'); q.setAttribute('autocomplete', 'off'); q.setAttribute('autocorrect', 'off');
  q.setAttribute('autocapitalize', 'off'); q.spellcheck = false; q.setAttribute('aria-label', 'Search songs');
  q.placeholder = 'Search ' + plural(L.songs.length, 'song');
  q.addEventListener('input', () => { V.q = q.value; $('lib-clear').hidden = !q.value; drawLibList(); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finishSearch(); } });
  q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== $('lib-q')) makeSearchBox(V.q); }, 50));
  slot.replaceChildren(q);
  $('lib-clear').hidden = !value;
}
function finishSearch(clear) {
  const q = $('lib-q');
  if (clear && q) q.value = '';
  if (q) q.blur();
  makeSearchBox(V.q);
}
function drawLibrary() {
  const p = $('p-library');
  if (!p.dataset.built) {
    p.dataset.built = '1';
    p.innerHTML = '<div class="head"><h1>Library</h1><button class="icon-btn cloudy" data-act="add" aria-label="Add songs">' + I.plus + '</button></div>' +
      '<form class="search cloudy" id="lib-form" role="search" action="#">' + I.search + '<span id="lib-q-slot" style="flex:1;min-width:0;display:flex"></span>' +
      '<button type="button" class="clear-q" id="lib-clear" aria-label="Clear search" hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".35"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#09090a" stroke-width="2.2" stroke-linecap="round"/></svg></button></form>' +
      '<div class="chips" id="lib-chips"></div><div class="songs" id="lib-list"></div>';
    $('lib-form').addEventListener('submit', (e) => { e.preventDefault(); finishSearch(); });
    $('lib-form').addEventListener('click', (e) => { if (e.target === e.currentTarget || (e.target.closest('svg') && !e.target.closest('#lib-clear'))) $('lib-q').focus(); });
    $('lib-clear').addEventListener('click', () => { V.q = ''; finishSearch(true); drawLibList(); });
    makeSearchBox('');
  }
  if ($('lib-q')) $('lib-q').placeholder = 'Search ' + plural(L.songs.length, 'song');
  const { sortBy, sortDir } = L.settings;
  const chip = (by, label) => '<button class="chip cloudy' + (sortBy === by ? ' on' : '') + '" data-sort="' + by + '">' + label + (sortBy === by ? (sortDir < 0 ? I.down : I.up) : '') + '</button>';
  $('lib-chips').innerHTML = chip('added', 'Date added') + chip('name', 'Name') + chip('plays', 'Plays') +
    '<button class="chip cloudy right" data-act="shuffle-all">' + I.shuffleSm + 'Shuffle</button>';
  drawLibList();
}
function drawLibList() {
  const ids = libraryOrder();
  const el = $('lib-list');
  if (!L.songs.length) {
    el.innerHTML = '<div class="empty"><div class="big">No songs yet</div>Import your library from desktop Groove in Settings, or add songs with the + button.<br><br><button class="btn accent" data-act="go-import">Import from Groove on PC</button></div>';
    return;
  }
  if (!ids.length) { el.innerHTML = '<div class="empty">No songs match "' + esc(V.q) + '"</div>'; return; }
  el.innerHTML = ids.map((id, i) => songRow(songById(id), i, false)).join('');
}
for (const pg of ['p-library', 'p-playlists']) {
  $(pg).addEventListener('pointerdown', (e) => { if (e.target.closest('.more')) return; const r = e.target.closest('.song'); if (r) prefetchSong(r.dataset.id); }, { passive: true });
}
$('p-library').addEventListener('click', (e) => {
  const t = e.target.closest('[data-sort],[data-act],[data-more],.song'); if (!t) return;
  if (t.dataset.sort) {
    const by = t.dataset.sort;
    if (L.settings.sortBy === by) L.settings.sortDir *= -1; else { L.settings.sortBy = by; L.settings.sortDir = by === 'name' ? 1 : -1; }
    save(); drawLibrary();
    return;
  }
  if (t.dataset.more) { songMenu(t.dataset.more, null); return; }
  const a = t.dataset.act;
  if (a === 'add') { pickAudio(); return; }
  if (a === 'go-import') { show('settings'); startImport(); return; }
  if (a === 'shuffle-all') { const q = libraryQueue(); if (q.length) playFrom(q, { type: 'library', name: 'Library' }, null, { shuffle: true }); return; }
  if (t.classList.contains('song')) { if (t.dataset.id === P.cur) { adoptQueue(libraryQueue(), { type: 'library', name: 'Library' }); togglePlay(); return; } playFrom(libraryQueue(), { type: 'library', name: 'Library' }, t.dataset.id); }
});

// Playlists
function drawPlaylists() {
  const p = $('p-playlists');
  if (V.plId && !plById(V.plId)) V.plId = null;
  if (!V.plId) {
    p.innerHTML = '<div class="head"><h1>Playlists</h1><button class="icon-btn cloudy" data-act="new-pl" aria-label="New playlist">' + I.plus + '</button></div>' +
      '<div class="pl-grid">' + L.playlists.map((pl) => '<button class="pl-card press" data-pl="' + esc(pl.id) + '">' +
        covHtml('p:' + pl.id, 'pl-cover') + '<div class="pl-name">' + esc(pl.name) + '</div><div class="pl-count">' + plural(pl.songIds.length, 'song') + '</div></button>').join('') +
      '</div>' + (L.playlists.length ? '' : '<div class="empty"><div class="big">No playlists yet</div>Tap + to make one.</div>');
    return;
  }
  const pl = plById(V.plId);
  const songs = pl.songIds.map(songById).filter(Boolean);
  p.innerHTML = '<div class="head"><div class="head-l"><button class="icon-btn cloudy" data-act="pl-back" aria-label="Back to playlists">' + I.back + '</button></div>' +
    '<button class="icon-btn cloudy" data-act="pl-menu" aria-label="Playlist options">' + I.dots + '</button></div>' +
    '<div class="pl-hero">' + covHtml('p:' + pl.id, 'pl-cover') + '<h2>' + esc(pl.name) + '</h2><div class="pl-count">' + plural(songs.length, 'song') + '</div></div>' +
    (songs.length ? '<div class="pl-actions"><button class="btn accent" data-act="pl-play">' + I.playBtn + 'Play</button><button class="btn cloudy" data-act="pl-shuffle">' + I.shuffleSm + 'Shuffle</button></div>' : '') +
    '<div class="songs">' + (songs.length ? songs.map((s, i) => songRow(s, i, true)).join('') : '<div class="empty">This playlist is empty. Add songs from the ••• menu next to any song.</div>') + '</div>';
}
$('p-playlists').addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-pl],[data-more],.song'); if (!t) return;
  if (t.dataset.pl) { V.plId = t.dataset.pl; drawPlaylists(); $('p-playlists').scrollTop = 0; return; }
  const pl = plById(V.plId);
  if (t.dataset.more) { songMenu(t.dataset.more, pl); return; }
  const a = t.dataset.act;
  if (a === 'new-pl') { playlistDialog(null); return; }
  if (a === 'pl-back') { V.plId = null; drawPlaylists(); return; }
  if (a === 'pl-menu') { playlistMenu(pl); return; }
  const q = pl ? pl.songIds.filter(songById) : [];
  if (a === 'pl-play') { playFrom(q, { type: 'playlist', id: pl.id, name: pl.name }, null, { shuffle: false }); return; }
  if (a === 'pl-shuffle') { playFrom(q, { type: 'playlist', id: pl.id, name: pl.name }, null, { shuffle: true }); return; }
  if (t.classList.contains('song')) { if (t.dataset.id === P.cur) { adoptQueue(q, { type: 'playlist', id: pl.id, name: pl.name }); togglePlay(); return; } playFrom(q, { type: 'playlist', id: pl.id, name: pl.name }, t.dataset.id); }
});

// Now Playing
function drawNow() {
  const p = $('p-now');
  p.classList.add('no-mini');
  const s = songById(P.cur);
  if (!s) {
    p.innerHTML = '<div class="np-empty">' + I.noteBig + '<div style="color:var(--text);font-size:18px;font-weight:600;margin-top:10px">Nothing playing</div><div>Pick a song in your Library.</div></div>';
    return;
  }
  const u = coverUrl('c:' + s.id);
  p.innerHTML = '<div class="np-top"><div style="width:44px"></div><div class="np-from"><div class="k">Playing from</div><div class="v">' + esc(P.ctx.name || 'Library') + '</div></div>' +
    '<button class="icon-btn lg cloudy" data-act="np-more" aria-label="More options">' + I.dots + '</button></div>' +
    '<div class="np-cover' + (u ? ' has' : '') + '"' + (u ? ' style="background-image:url(\'' + u + '\')"' : '') + '>' + I.noteBig + '</div>' +
    '<div class="np-info"><div style="min-width:0"><div class="np-title">' + esc(s.title) + '</div><div class="np-sub" id="np-pos"></div></div>' +
    '<button class="icon-btn lg cloudy" data-act="np-addpl" aria-label="Add to playlist">' + I.addPl + '</button></div>' +
    '<div class="seek" id="seek"><div class="track"><div class="fill" id="seek-fill"></div></div><div class="knob" id="seek-knob"></div></div>' +
    '<div class="times"><span id="t-cur">0:00</span><span id="t-dur">0:00</span></div>' +
    '<div class="ctrls"><button class="toggle cloudy" id="b-shuffle" data-act="shuffle" aria-label="Shuffle">' + I.shuffle + '</button>' +
    '<button class="ctrl press" data-act="prev" aria-label="Previous">' + I.prev + '</button>' +
    '<button class="play" id="b-play" data-act="play" aria-label="Play"></button>' +
    '<button class="ctrl press" data-act="next" aria-label="Next">' + I.next + '</button>' +
    '<button class="toggle cloudy" id="b-loop" data-act="loop" aria-label="Loop song">' + I.loop + '</button></div>';
  bindSeek();
  updateNow();
}
$('p-now').addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'play') togglePlay();
  else if (a === 'next') next(true);
  else if (a === 'prev') prev();
  else if (a === 'shuffle') setShuffle(!P.shuffle);
  else if (a === 'loop') setLoop(!P.loop);
  else if (a === 'np-addpl') addToPlaylistSheet(P.cur);
  else if (a === 'np-more') songMenu(P.cur, null, true);
});
let seeking = false;
function bindSeek() {
  const el = $('seek'); if (!el) return;
  const pct = (x) => { const r = localRect(el); return Math.min(1, Math.max(0, (x - r.left) / r.width)); };
  const paint = (f) => { $('seek-fill').style.width = (f * 100) + '%'; $('seek-knob').style.left = (f * 100) + '%'; $('t-cur').textContent = fmtTime(f * (audio.duration || 0)); };
  el.addEventListener('pointerdown', (e) => { if (!isFinite(audio.duration)) return; seeking = true; el.classList.add('drag'); el.setPointerCapture(e.pointerId); paint(pct(localX(e))); });
  el.addEventListener('pointermove', (e) => { if (seeking) paint(pct(localX(e))); });
  const end = (e) => { if (!seeking) return; seeking = false; el.classList.remove('drag'); const f = pct(localX(e)); if (isFinite(audio.duration)) { held = null; audio.currentTime = f * audio.duration; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', () => { seeking = false; el.classList.remove('drag'); });
}
function updateTime() {
  const d = audio.duration, c = audio.currentTime;
  const f = isFinite(d) && d > 0 ? c / d : 0;
  if (!seeking && $('seek-fill')) { $('seek-fill').style.width = (f * 100) + '%'; $('seek-knob').style.left = (f * 100) + '%'; $('t-cur').textContent = fmtTime(c); $('t-dur').textContent = fmtTime(d); }
  $('mini-fill').style.width = (f * 100) + '%';
}
function updateNow() {
  const playing = !audio.paused;
  if ($('b-play')) {
    $('b-play').innerHTML = playing ? I.pauseBig : I.playBig; $('b-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $('b-shuffle').classList.toggle('on', P.shuffle); $('b-shuffle').setAttribute('aria-pressed', P.shuffle);
    $('b-loop').classList.toggle('on', P.loop); $('b-loop').setAttribute('aria-pressed', P.loop);
    const byDate = L.songs.slice().sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    const i = byDate.findIndex((x) => x.id === P.cur);
    $('np-pos').textContent = i >= 0 ? 'Song ' + (i + 1) + ' of ' + byDate.length : '';
    updateTime();
  }
  $('mini-play').innerHTML = playing ? I.pauseSm : I.playSm; $('mini-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function onTrackChange() {
  if (V.tab === 'now') drawNow();
  markPlaying();
  updateMini();
  saveState();
}
function updateMini() {
  const s = songById(P.cur);
  const showIt = !!s && V.tab !== 'now';
  $('mini').classList.toggle('hide', !showIt);
  document.querySelectorAll('.page').forEach((p) => { if (p.id !== 'p-now') p.classList.toggle('no-mini', !s); });
  if (!s) return;
  $('mini-title').textContent = s.title;
  const u = coverUrl('ct:' + s.id);
  $('mini-cov').className = 'cov' + (u ? ' has' : ''); $('mini-cov').style.backgroundImage = u ? "url('" + u + "')" : ''; $('mini-cov').innerHTML = I.note;
  updateNow();
}
$('mini').addEventListener('click', (e) => {
  if (e.target.closest('#mini-play')) { togglePlay(); return; }
  if (e.target.closest('#mini-next')) { next(true); return; }
  show('now');
});
$('mini-next').innerHTML = I.nextSm;

// Settings
function drawSettingsIfOpen() { if (V.tab === 'settings') drawSettings(); }
function sleepLabel() {
  if (sleep.left > 0) return Math.max(1, Math.ceil(sleep.left / 60000)) + ' min left';
  return 'Off';
}
function drawSettings() {
  const p = $('p-settings');
  if (V.stats) { drawStats(); return; }
  const totalBytes = L.songs.reduce((t, s) => t + (s.size || 0), 0);
  p.innerHTML = '<div class="head"><h1>Settings</h1></div>' +
    '<div class="section-label" style="margin-top:6px">Theme</div><div class="themes">' +
    allThemes().map((t) => { const u = t.hasBg ? coverUrl('t:' + t.id) : ''; return '<button class="theme press' + (t.id === L.activeThemeId ? ' on' : '') + '" data-theme="' + esc(t.id) + '">' +
      '<span class="sw" style="' + (u ? "background-image:url('" + u + "');" : 'background-color:color-mix(in srgb,' + t.accent + ' 18%, rgba(16,22,24,0.6));') + '"><span class="dot" style="background:' + esc(t.accent) + '"></span></span><span>' + esc(t.name) + '</span></button>'; }).join('') +
    '<button class="theme press" data-act="new-theme"><span class="sw new">' + I.plus + '</span><span>New</span></button></div>' +
    '<div class="section-label">Library</div><div class="card cloudy">' +
      '<button class="row" data-act="import"><span class="ic">' + I.importI + '</span><span class="lbl">Import from Groove on PC<small>Pick the zip from Export Library</small></span><span class="chev">' + I.chev + '</span></button>' +
      '<button class="row" data-act="export"><span class="ic">' + I.exportI + '</span><span class="lbl">Export a backup<small>Same zip format desktop Groove imports</small></span><span class="chev">' + I.chev + '</span></button>' +
      '<button class="row" data-act="confirm-del" role="switch" aria-checked="' + !!L.settings.confirmDelete + '"><span class="ic">' + I.trash + '</span><span class="lbl">Confirm before delete</span><span class="switch' + (L.settings.confirmDelete ? ' on' : '') + '"></span></button>' +
    '</div><div class="note">' + plural(L.songs.length, 'song') + ' · ' + fmtBytes(totalBytes) + ' on this iPhone</div>' +
    '<div class="section-label">Sync with PC</div><div class="card cloudy">' +
      (L.sync.url && L.sync.key
        ? '<button class="row" data-act="sync-now"><span class="ic">' + I.sync + '</span><span class="lbl">Sync now<small id="sync-status">' + esc(syncStatusText()) + '</small></span></button>' +
          '<button class="row" data-act="sync-setup"><span class="ic">' + I.edit + '</span><span class="lbl">Change PC address or key</span><span class="chev">' + I.chev + '</span></button>'
        : '<button class="row" data-act="sync-setup"><span class="ic">' + I.sync + '</span><span class="lbl">Set up syncing<small>Keep plays, listening time, songs and playlists the same as desktop Groove</small></span><span class="chev">' + I.chev + '</span></button>') +
    '</div>' +
    '<div class="section-label">Listening</div><div class="card cloudy">' +
      '<button class="row" data-act="stats"><span class="ic">' + I.stats + '</span><span class="lbl">Statistics</span><span class="val">' + fmtHours(L.totalListenTime) + '</span><span class="chev">' + I.chev + '</span></button>' +
      '<button class="row" data-act="sleep"><span class="ic">' + I.moon + '</span><span class="lbl">Sleep timer</span><span class="val">' + sleepLabel() + '</span><span class="chev">' + I.chev + '</span></button>' +
    '</div>' +
    '<div class="version">Groove ' + APP_VERSION + '<br>Updated ' + esc(new Date(L.versionSince || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })) + '</div>';
}
function drawStats() {
  const p = $('p-settings');
  let week = 0; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); week += L.daily[dayKey(d)] || 0; }
  const top = L.songs.filter((s) => (s.playCount || 0) > 0).sort((a, b) => b.playCount - a.playCount || a.title.localeCompare(b.title)).slice(0, 10);
  p.innerHTML = '<div class="head"><div class="head-l"><button class="icon-btn cloudy" data-act="stats-back" aria-label="Back to settings">' + I.back + '</button><h1 style="font-size:28px">Statistics</h1></div></div>' +
    '<div class="stat-grid"><div class="stat cloudy"><div class="k">All time listened</div><div class="v">' + fmtHours(L.totalListenTime) + '</div></div>' +
    '<div class="stat cloudy"><div class="k">Listened past week</div><div class="v">' + fmtHours(week) + '</div></div></div>' +
    '<div class="section-label">Top songs</div><div class="card cloudy" style="padding:4px 0">' +
    (top.length ? top.map((s, i) => '<div class="top"><div class="rk' + (i < 3 ? ' r' + (i + 1) : '') + '">' + (i + 1) + '</div>' + covHtml('ct:' + s.id) +
      '<div class="meta"><div class="t">' + esc(s.title) + '</div></div><div class="s" style="margin:0">' + plural(s.playCount, 'play') + '</div></div>').join('')
      : '<div class="empty" style="padding:24px">Play some songs all the way through to see your top songs.</div>') +
    '</div><button class="danger-btn" data-act="reset-stats">Reset listening stats</button>';
}
$('p-settings').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act],[data-theme]'); if (!t) return;
  if (t.dataset.theme) {
    if (t.dataset.theme === L.activeThemeId && t.dataset.theme !== DEFAULT_THEME.id) { themeMenu(t.dataset.theme); return; }
    L.activeThemeId = t.dataset.theme; applyTheme(); save(); drawSettings(); return;
  }
  const a = t.dataset.act;
  if (a === 'new-theme') themeDialog(null);
  else if (a === 'import') startImport();
  else if (a === 'export') exportBackup();
  else if (a === 'confirm-del') { L.settings.confirmDelete = !L.settings.confirmDelete; save(); drawSettings(); }
  else if (a === 'stats') { V.stats = true; drawSettings(); $('p-settings').scrollTop = 0; }
  else if (a === 'stats-back') { V.stats = false; drawSettings(); }
  else if (a === 'sleep') sleepSheet();
  else if (a === 'sync-now') syncNow(true);
  else if (a === 'sync-setup') syncSetupDialog();
  else if (a === 'reset-stats') {
    if (!(await confirmDlg('Reset listening stats?', 'This clears your listening time, past week and every song\'s play count. It cannot be undone.', 'Reset', true))) return;
    L.totalListenTime = 0; L.daily = {}; L.songs.forEach((s) => { s.playCount = 0; s.skipCount = 0; });
    L.statsResetAt = Date.now(); if (L.sync.base) L.sync.base = { songs: {}, listen: 0, daily: {} }; // your PC resets too on the next sync
    save(true); drawSettings(); toast('Listening stats reset');
  }
});

function applyTheme() {
  const t = allThemes().find((x) => x.id === L.activeThemeId) || DEFAULT_THEME;
  if (!allThemes().some((x) => x.id === L.activeThemeId)) L.activeThemeId = DEFAULT_THEME.id;
  document.documentElement.style.setProperty('--accent', t.accent || DEFAULT_THEME.accent);
  // dark text on light accent colours (like green), white on dark ones
  const hex = (t.accent || DEFAULT_THEME.accent).replace('#', ''); const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  document.documentElement.style.setProperty('--on-accent', lum > 0.55 ? '#0b1410' : '#ffffff');
  const u = t.hasBg ? coverUrl('t:' + t.id) : '';
  $('bg').style.backgroundImage = u ? "url('" + u + "')" : '';
  document.body.classList.toggle('no-bg', !u);
}

// ---------- sheets, dialogs, toast ----------
let sheetOpts = [];
function openSheet(title, opts) {
  sheetOpts = opts;
  $('sheet').innerHTML = (title ? '<div class="sh-title">' + esc(title) + '</div>' : '') +
    opts.map((o, i) => '<button class="opt' + (o.danger ? ' danger' : '') + '" data-i="' + i + '">' + (o.html || ((o.icon || '') + '<span>' + esc(o.label) + '</span>')) + (o.check ? '<span class="chk">' + I.check + '</span>' : '') + '</button>').join('') +
    '<button class="cancel" data-i="-1">' + (opts.doneLabel || 'Cancel') + '</button>';
  $('scrim').classList.add('show'); $('sheet').classList.add('show');
}
function closeSheet() { $('sheet').classList.remove('show'); if (!$('dlg').classList.contains('show')) $('scrim').classList.remove('show'); }
$('sheet').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const i = +b.dataset.i;
  if (i < 0) { closeSheet(); if (sheetOpts.onDone) sheetOpts.onDone(); return; }
  const o = sheetOpts[i];
  if (o.keepOpen) { o.onClick(b); return; }
  closeSheet(); setTimeout(() => o.onClick(), 180);
});
let dlgClose = null;
function openDlg(html, onClose) {
  $('dlg').innerHTML = html; dlgClose = onClose || null;
  $('scrim').classList.add('show'); $('dlg').classList.add('show');
}
function closeDlg() { $('dlg').classList.remove('show'); $('scrim').classList.remove('show'); const f = dlgClose; dlgClose = null; if (f) f(); }
$('scrim').addEventListener('click', () => { if ($('sheet').classList.contains('show')) { closeSheet(); if (sheetOpts.onDone) sheetOpts.onDone(); } else if ($('dlg').classList.contains('show') && !$('dlg').dataset.locked) closeDlg(); });
function confirmDlg(title, msg, ok = 'OK', danger = false) {
  return new Promise((res) => {
    openDlg('<h2>' + esc(title) + '</h2><p>' + esc(msg) + '</p><div class="acts"><button class="btn sec" data-a="no">Cancel</button><button class="btn ' + (danger ? 'danger' : 'accent') + '" data-a="yes">' + esc(ok) + '</button></div>', () => res(false));
    $('dlg').onclick = (e) => { const b = e.target.closest('[data-a]'); if (!b) return; dlgClose = null; closeDlg(); res(b.dataset.a === 'yes'); };
  });
}
function progressDlg(title) {
  $('dlg').dataset.locked = '1';
  openDlg('<h2>' + esc(title) + '</h2><p id="pg-msg">Starting...</p><div class="prog"><div id="pg-fill"></div></div>');
  $('dlg').onclick = null;
  return {
    set(msg, f) { $('pg-msg').textContent = msg; $('pg-fill').style.width = Math.round(f * 100) + '%'; },
    done() { delete $('dlg').dataset.locked; closeDlg(); },
  };
}
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }
function pickFile(input) {
  return new Promise((res) => {
    const el = $(input); el.value = '';
    el.onchange = () => res(el.multiple ? Array.from(el.files) : el.files[0] || null);
    el.click();
  });
}

// ---------- songs ----------
function songMenu(id, pl, fromNow) {
  const s = songById(id); if (!s) return;
  const opts = [];
  if (!fromNow && P.cur && P.cur !== id) opts.push({ icon: I.playNext, label: 'Play next', onClick: () => { P.upcoming = id; ready = { el: null, id: null }; (async () => { const sp = other(); try { await srcFor(sp, id); sp.load(); ready = { el: sp, id }; } catch (e) {} })(); toast('"' + s.title + '" plays next'); } });
  opts.push({ icon: I.addPl, label: 'Add to playlist', onClick: () => addToPlaylistSheet(id) });
  opts.push({ icon: I.edit, label: 'Edit song', onClick: () => songDialog(id) });
  if (pl) opts.push({ icon: I.minus, label: 'Remove from ' + pl.name, onClick: () => { pl.songIds = pl.songIds.filter((x) => x !== id); pl.updatedAt = Date.now(); save(); drawPlaylists(); } });
  opts.push({ icon: I.trash, label: 'Delete song', danger: true, onClick: () => deleteSong(id) });
  openSheet(s.title, opts);
}
function addToPlaylistSheet(id) {
  const s = songById(id); if (!s) return;
  const build = () => {
    const opts = L.playlists.map((pl) => ({ html: covHtml('p:' + pl.id) + '<span>' + esc(pl.name) + '</span>', check: pl.songIds.includes(id), keepOpen: true,
      onClick: () => { if (pl.songIds.includes(id)) pl.songIds = pl.songIds.filter((x) => x !== id); else pl.songIds.push(id); pl.updatedAt = Date.now(); save(); build(); } }));
    opts.push({ icon: I.plus, label: 'New playlist', onClick: () => playlistDialog(null, id) });
    opts.doneLabel = 'Done'; opts.onDone = () => { if (V.tab === 'playlists') drawPlaylists(); };
    openSheet('Add "' + s.title + '" to', opts);
  };
  build();
}
async function deleteSong(id) {
  const s = songById(id); if (!s) return;
  if (L.settings.confirmDelete && !(await confirmDlg('Delete "' + s.title + '"?', 'It will be removed from this iPhone and from every playlist.', 'Delete', true))) return;
  if (P.cur === id) { audio.pause(); audio.removeAttribute('src'); P.cur = null; }
  P.queue = P.queue.filter((x) => x !== id);
  L.songs = L.songs.filter((x) => x.id !== id);
  L.deletedSongs[id] = Date.now(); // deleted on your PC too at the next sync
  L.playlists.forEach((pl) => { pl.songIds = pl.songIds.filter((x) => x !== id); });
  await DB.del('audio', id); await DB.del('covers', 'c:' + id); await DB.del('covers', 'ct:' + id);
  setCover('c:' + id, null); setCover('ct:' + id, null);
  save(true); refreshAll(); toast('Song deleted');
}
function songDialog(id) {
  const s = songById(id); if (!s) return;
  let newCover = null;
  openDlg('<h2>Edit song</h2><div class="field"><label for="d-title">Title</label><input type="text" id="d-title" value="' + esc(s.title) + '"></div>' +
    '<div class="field"><label>Cover</label><div class="pick"><div id="d-cov">' + covHtml('ct:' + s.id) + '</div><button class="btn" data-a="cover">' + I.image + 'Choose image</button></div></div>' +
    '<div class="acts"><button class="btn sec" data-a="no">Cancel</button><button class="btn accent" data-a="save">Save</button></div>');
  $('dlg').onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'cover') { const f = await pickFile('f-image'); if (!f) return; newCover = f; $('d-cov').innerHTML = '<div class="cov has" style="background-image:url(\'' + URL.createObjectURL(f) + '\')"></div>'; return; }
    if (b.dataset.a === 'no') { closeDlg(); return; }
    const title = $('d-title').value.trim() || s.title;
    if (title !== s.title) { s.title = title; s.updatedAt = Date.now(); }
    if (newCover) {
      try {
        const full = await resizeImage(newCover, 1000, true); const th = await thumbOf(full);
        await DB.put('covers', 'c:' + id, full); await DB.put('covers', 'ct:' + id, th); setCover('c:' + id, full); setCover('ct:' + id, th); s.hasCover = true; s.coverRev = Date.now();
        if (artKey === id) artKey = '';
      } catch (err) { toast('That image could not be used'); }
    }
    save(); closeDlg(); refreshAll(); if (P.cur === id) setMeta(s);
  };
}
async function pickAudio() {
  const files = await pickFile('f-audio'); if (!files || !files.length) return;
  const pg = files.length > 2 ? progressDlg('Adding songs') : null;
  const added = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (pg) pg.set('Adding ' + (i + 1) + ' of ' + files.length + '...', i / files.length);
    try {
      const tags = await readTags(f); const id = uid(); const ext = extOf(f.name, 'mp3');
      const blob = new Blob([f], { type: f.type || AUDIO_TYPES[ext] || 'audio/mpeg' });
      await DB.put('audio', id, blob);
      const song = { id, title: tags.title || f.name.replace(/\.[^.]+$/, ''), file: id + '.' + ext, playCount: 0, skipCount: 0, addedAt: Date.now() + i, size: f.size, hasCover: false, updatedAt: Date.now(), coverRev: 0 };
      if (tags.cover) { try { const full = await resizeImage(tags.cover, 1000, true); const th = await thumbOf(full); await DB.put('covers', 'c:' + id, full); await DB.put('covers', 'ct:' + id, th); setCover('c:' + id, full); setCover('ct:' + id, th); song.hasCover = true; song.coverRev = Date.now(); } catch (e) {} }
      L.songs.push(song); added.push(id);
    } catch (e) { toast('Could not add ' + f.name); }
  }
  if (pg) pg.done();
  await save(true); refreshAll();
  if (!added.length) return;
  requestPersist();
  if (!L.playlists.length) { toast('Added ' + plural(added.length, 'song')); return; }
  // like desktop Groove's Add Song: choose playlists for the new songs
  const chosen = new Set();
  const build = () => {
    const opts = L.playlists.map((pl) => ({ html: covHtml('p:' + pl.id) + '<span>' + esc(pl.name) + '</span>', check: chosen.has(pl.id), keepOpen: true,
      onClick: () => { chosen.has(pl.id) ? chosen.delete(pl.id) : chosen.add(pl.id); build(); } }));
    opts.doneLabel = 'Done';
    opts.onDone = () => { L.playlists.forEach((pl) => { if (chosen.has(pl.id)) { added.forEach((id) => { if (!pl.songIds.includes(id)) pl.songIds.push(id); }); pl.updatedAt = Date.now(); } }); save(); refreshAll(); toast('Added ' + plural(added.length, 'song')); };
    openSheet('Add ' + plural(added.length, 'new song') + ' to playlists', opts);
  };
  build();
}

// ---------- playlists ----------
function playlistMenu(pl) {
  openSheet(pl.name, [
    { icon: I.edit, label: 'Rename or change cover', onClick: () => playlistDialog(pl) },
    { icon: I.updown, label: 'Reorder songs', onClick: () => reorderSheet(pl) },
    { icon: I.trash, label: 'Delete playlist', danger: true, onClick: async () => {
      if (L.settings.confirmDelete && !(await confirmDlg('Delete "' + pl.name + '"?', 'The playlist is removed. Its songs stay in your Library.', 'Delete', true))) return;
      L.playlists = L.playlists.filter((x) => x.id !== pl.id); L.deletedPlaylists[pl.id] = Date.now(); await DB.del('covers', 'p:' + pl.id); setCover('p:' + pl.id, null);
      V.plId = null; save(); drawPlaylists(); toast('Playlist deleted');
    } },
  ]);
}
function reorderSheet(pl) {
  let sel = null;
  const build = () => {
    const opts = pl.songIds.map((id, i) => { const s = songById(id); return s ? { html: '<span class="num" style="width:22px">' + (i + 1) + '</span>' + covHtml('ct:' + id) + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (sel === i ? ';color:var(--accent);font-weight:600' : '') + '">' + esc(s.title) + '</span>', keepOpen: true,
      onClick: () => { if (sel == null) sel = i; else { const [m] = pl.songIds.splice(sel, 1); pl.songIds.splice(i, 0, m); sel = null; pl.updatedAt = Date.now(); save(); } build(); } } : null; }).filter(Boolean);
    opts.doneLabel = 'Done'; opts.onDone = () => drawPlaylists();
    openSheet(sel == null ? 'Tap a song, then tap where it should go' : 'Now tap where it should go', opts);
  };
  build();
}
function playlistDialog(pl, addSongId) {
  let newCover = null;
  openDlg('<h2>' + (pl ? 'Edit playlist' : 'New playlist') + '</h2><div class="field"><label for="d-name">Name</label><input type="text" id="d-name" value="' + esc(pl ? pl.name : '') + '" placeholder="Playlist name"></div>' +
    '<div class="field"><label>Cover</label><div class="pick"><div id="d-cov">' + covHtml(pl ? 'p:' + pl.id : '') + '</div><button class="btn" data-a="cover">' + I.image + 'Choose image</button></div></div>' +
    '<div class="acts"><button class="btn sec" data-a="no">Cancel</button><button class="btn accent" data-a="save">' + (pl ? 'Save' : 'Create') + '</button></div>');
  if (!pl) setTimeout(() => $('d-name') && $('d-name').focus(), 250);
  $('dlg').onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'cover') { const f = await pickFile('f-image'); if (!f) return; newCover = f; $('d-cov').innerHTML = '<div class="cov has" style="background-image:url(\'' + URL.createObjectURL(f) + '\')"></div>'; return; }
    if (b.dataset.a === 'no') { closeDlg(); return; }
    const name = $('d-name').value.trim(); if (!name) { $('d-name').focus(); return; }
    let p = pl;
    if (!p) { p = { id: 'pl_' + uid(), name, songIds: addSongId ? [addSongId] : [], hasCover: false }; L.playlists.push(p); }
    p.name = name; p.updatedAt = Date.now();
    if (newCover) { try { const full = await resizeImage(newCover, 1000, true); await DB.put('covers', 'p:' + p.id, full); setCover('p:' + p.id, full); p.hasCover = true; p.coverRev = Date.now(); } catch (err) { toast('That image could not be used'); } }
    save(); closeDlg(); if (V.tab === 'playlists') drawPlaylists(); if (!pl) toast(addSongId ? 'Added to ' + name : 'Playlist created');
  };
}

// ---------- themes ----------
function themeMenu(id) {
  const t = L.themes.find((x) => x.id === id); if (!t) return;
  openSheet(t.name, [
    { icon: I.edit, label: 'Edit theme', onClick: () => themeDialog(t) },
    { icon: I.trash, label: 'Delete theme', danger: true, onClick: async () => {
      if (L.settings.confirmDelete && !(await confirmDlg('Delete "' + t.name + '"?', 'Groove switches back to the Default theme.', 'Delete', true))) return;
      L.themes = L.themes.filter((x) => x.id !== id); await DB.del('covers', 't:' + id); setCover('t:' + id, null);
      L.activeThemeId = DEFAULT_THEME.id; applyTheme(); save(); drawSettings();
    } },
  ]);
}
function themeDialog(t) {
  let newBg = null;
  const u = t && t.hasBg ? coverUrl('t:' + t.id) : '';
  openDlg('<h2>' + (t ? 'Edit theme' : 'New theme') + '</h2><div class="field"><label for="d-name">Name</label><input type="text" id="d-name" value="' + esc(t ? t.name : '') + '" placeholder="Theme name"></div>' +
    '<div class="field"><label for="d-accent">Accent color</label><input type="color" id="d-accent" value="' + esc(t ? t.accent : '#6f1ddb') + '"></div>' +
    '<div class="field"><label>Background image</label><div class="pick"><div id="d-cov"><div class="cov' + (u ? ' has' : '') + '"' + (u ? " style=\"background-image:url('" + u + "')\"" : '') + '>' + I.image + '</div></div><button class="btn" data-a="bg">' + I.image + 'Choose image</button></div></div>' +
    '<div class="acts"><button class="btn sec" data-a="no">Cancel</button><button class="btn accent" data-a="save">' + (t ? 'Save' : 'Create') + '</button></div>');
  $('dlg').onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'bg') { const f = await pickFile('f-image'); if (!f) return; newBg = f; $('d-cov').innerHTML = '<div class="cov has" style="background-image:url(\'' + URL.createObjectURL(f) + '\')"></div>'; return; }
    if (b.dataset.a === 'no') { closeDlg(); return; }
    const name = $('d-name').value.trim(); if (!name) { $('d-name').focus(); return; }
    let th = t;
    if (!th) { th = { id: 'theme_' + uid(), name, accent: '#6f1ddb', hasBg: false }; L.themes.push(th); }
    th.name = name; th.accent = $('d-accent').value;
    if (newBg) { try { const img = await resizeImage(newBg, 1600, false); await DB.put('covers', 't:' + th.id, img); setCover('t:' + th.id, img); th.hasBg = true; } catch (err) { toast('That image could not be used'); } }
    L.activeThemeId = th.id; applyTheme(); save(); closeDlg(); drawSettings();
  };
}

// ---------- sleep timer ----------
// Sleep timer: pick minutes with the arrows (5 at a time, at least 5), then Start timer.
function sleepSheet() {
  let min = Math.max(5, sleep.pick || 30);
  const MAX = 300;
  const fmtMin = (m) => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min');
  const running = () => sleep.left > 0;
  const draw = () => {
    const left = running() ? Math.max(1, Math.ceil(sleep.left / 60000)) : 0;
    openDlg('<h2>Sleep timer</h2><p>' + (left ? 'Music pauses after ' + fmtMin(left) + ' more of listening.' : 'Counts down only while music is playing, then pauses it.') + '</p>' +
      '<div class="sleep-pick"><button class="sp-arrow" data-a="down" aria-label="5 minutes less"' + (min <= 5 ? ' disabled' : '') + '>' + I.back + '</button>' +
      '<div class="sp-box cloudy" aria-live="polite"><span class="sp-num">' + min + '</span><span class="sp-unit">minutes</span></div>' +
      '<button class="sp-arrow flip" data-a="up" aria-label="5 minutes more"' + (min >= MAX ? ' disabled' : '') + '>' + I.back + '</button></div>' +
      '<div class="acts">' + (left ? '<button class="btn sec" data-a="stop">Stop timer</button>' : '<button class="btn sec" data-a="no">Cancel</button>') +
      '<button class="btn accent" data-a="start">' + (left ? 'Restart timer' : 'Start timer') + '</button></div>');
  };
  draw();
  $('dlg').onclick = (e) => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'down') { min = Math.max(5, min - 5); draw(); return; }
    if (a === 'up') { min = Math.min(MAX, min + 5); draw(); return; }
    if (a === 'no') { closeDlg(); return; }
    if (a === 'stop') { sleep.left = 0; closeDlg(); drawSettings(); toast('Sleep timer stopped'); return; }
    if (a === 'start') { sleep.pick = min; sleep.left = min * 60000; closeDlg(); drawSettings(); toast('Pausing after ' + fmtMin(min) + ' of listening'); }
  };
}
setInterval(() => { if (sleep.left > 0 && V.tab === 'settings' && !V.stats) { const el = document.querySelector('[data-act="sleep"] .val'); if (el) el.textContent = sleepLabel(); } }, 15000);

// ---------- sync with desktop Groove ----------
// Desktop Groove runs a small private sync server (shared to your devices by Tailscale). Each sync sends
// what changed here since the last sync (plays, listening time, deletions, edits, new songs) and takes what
// changed there. Counts and listening time add together; for names, covers and order the newest change wins.
const SY = { busy: false, status: '', err: '', progress: '' };
const syncOn = () => !!(L.sync && L.sync.url && L.sync.key);
function agoText(ms) {
  if (!ms) return 'never';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  return new Date(ms).toLocaleDateString();
}
function syncStatusText() {
  if (SY.busy) return SY.progress || 'Syncing...';
  if (SY.err) return SY.err;
  return 'Last synced ' + agoText(L.sync.lastSync);
}
function showSyncStatus() { const el = $('sync-status'); if (el) el.textContent = syncStatusText(); }
function normalizeUrl(u) {
  u = (u || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
async function sreq(path, opts = {}, timeout = 20000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(L.sync.url + path, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + L.sync.key }, opts.headers || {}), signal: ctl.signal, cache: 'no-store' }));
    if (r.status === 401) { const e = new Error('Wrong sync key. Check it in desktop Groove\'s Settings.'); e.key = true; throw e; }
    return r;
  } finally { clearTimeout(t); }
}
async function storeCover(kind, id, blob) {
  if (kind === 'song') {
    const full = await resizeImage(blob, 1000, true); const th = await thumbOf(full);
    await DB.put('covers', 'c:' + id, full); await DB.put('covers', 'ct:' + id, th); setCover('c:' + id, full); setCover('ct:' + id, th);
    if (artKey === id) artKey = '';
  } else { const full = await resizeImage(blob, 1000, true); await DB.put('covers', 'p:' + id, full); setCover('p:' + id, full); }
}
async function dropCover(kind, id) {
  if (kind === 'song') { await DB.del('covers', 'c:' + id); await DB.del('covers', 'ct:' + id); setCover('c:' + id, null); setCover('ct:' + id, null); }
  else { await DB.del('covers', 'p:' + id); setCover('p:' + id, null); }
}
async function removeLocalSong(id) {
  if (!songById(id)) return;
  if (P.cur === id) { audio.pause(); audio.removeAttribute('src'); P.cur = null; }
  P.queue = P.queue.filter((x) => x !== id);
  L.songs = L.songs.filter((x) => x.id !== id);
  L.playlists.forEach((pl) => { pl.songIds = pl.songIds.filter((x) => x !== id); });
  await DB.del('audio', id); await dropCover('song', id);
}
async function syncNow(manual) {
  if (!syncOn() || SY.busy) return;
  SY.busy = true; SY.err = ''; SY.progress = 'Syncing...'; showSyncStatus();
  try {
    const base = L.sync.base;
    const sent = { songs: {}, listen: L.totalListenTime || 0, daily: Object.assign({}, L.daily) };
    const dailyDelta = {};
    if (base) for (const [d, ms] of Object.entries(L.daily)) { const x = ms - ((base.daily || {})[d] || 0); if (x > 0) dailyDelta[d] = x; }
    const body = {
      lastSync: L.sync.serverNow || 0, statsResetAt: L.statsResetAt || 0,
      deletedSongs: L.deletedSongs, deletedPlaylists: L.deletedPlaylists,
      songs: L.songs.map((s) => {
        sent.songs[s.id] = [s.playCount || 0, s.skipCount || 0];
        const b = base && base.songs[s.id];
        return { id: s.id, title: s.title, file: s.file, addedAt: s.addedAt == null ? null : s.addedAt, updatedAt: s.updatedAt || 0, coverRev: s.coverRev || 0, hasCover: !!s.hasCover,
          dPlay: b ? Math.max(0, (s.playCount || 0) - b[0]) : 0, dSkip: b ? Math.max(0, (s.skipCount || 0) - b[1]) : 0 };
      }),
      playlists: L.playlists.map((p) => ({ id: p.id, name: p.name, songIds: p.songIds, updatedAt: p.updatedAt || 0, coverRev: p.coverRev || 0, hasCover: !!p.hasCover })),
      listenDelta: base ? Math.max(0, (L.totalListenTime || 0) - (base.listen || 0)) : 0,
      dailyDelta,
    };
    const r = await sreq('/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('Your PC answered with an error (' + r.status + ').');
    const res = await r.json(); const st = res.state;

    // deletions made on the PC
    for (const [id, ts] of Object.entries(st.deletedSongs || {})) { if (!L.deletedSongs[id]) L.deletedSongs[id] = ts; await removeLocalSong(id); }
    for (const [id, ts] of Object.entries(st.deletedPlaylists || {})) {
      if (!L.deletedPlaylists[id]) L.deletedPlaylists[id] = ts;
      if (plById(id)) { L.playlists = L.playlists.filter((p) => p.id !== id); await dropCover('playlist', id); if (V.plId === id) V.plId = null; }
    }
    if ((st.statsResetAt || 0) > (L.statsResetAt || 0)) L.statsResetAt = st.statsResetAt;
    // songs: counts come back with this phone's plays already added; plays made during the sync are kept on top
    const getAudio = [], getCovers = [];
    for (const s of st.songs) {
      const loc = songById(s.id);
      if (!loc) { if (!L.deletedSongs[s.id]) getAudio.push(s); continue; }
      const was = sent.songs[s.id] || [loc.playCount || 0, loc.skipCount || 0];
      loc.playCount = s.playCount + Math.max(0, (loc.playCount || 0) - was[0]);
      loc.skipCount = s.skipCount + Math.max(0, (loc.skipCount || 0) - was[1]);
      if ((s.updatedAt || 0) > (loc.updatedAt || 0)) { loc.title = s.title; if (s.addedAt != null) loc.addedAt = s.addedAt; loc.updatedAt = s.updatedAt; }
      if ((s.coverRev || 0) > (loc.coverRev || 0)) {
        if (s.hasCover) getCovers.push(['song', s.id, s.coverRev]);
        else { await dropCover('song', s.id); loc.hasCover = false; loc.coverRev = s.coverRev; }
      }
    }
    L.totalListenTime = (st.totalListenTime || 0) + Math.max(0, (L.totalListenTime || 0) - sent.listen);
    const daily = Object.assign({}, st.daily || {});
    for (const [d, ms] of Object.entries(L.daily)) { const x = ms - (sent.daily[d] || 0); if (x > 0) daily[d] = (daily[d] || 0) + x; }
    L.daily = daily;
    // playlists
    for (const p of st.playlists) {
      let loc = plById(p.id);
      if (!loc) {
        if (L.deletedPlaylists[p.id]) continue;
        loc = { id: p.id, name: p.name, songIds: [], updatedAt: 0, coverRev: 0, hasCover: false }; L.playlists.push(loc);
      }
      if ((p.updatedAt || 0) > (loc.updatedAt || 0)) { loc.name = p.name; loc.songIds = p.songIds.slice(); loc.updatedAt = p.updatedAt; }
      if ((p.coverRev || 0) > (loc.coverRev || 0)) {
        if (p.hasCover) getCovers.push(['playlist', p.id, p.coverRev]);
        else { await dropCover('playlist', p.id); loc.hasCover = false; loc.coverRev = p.coverRev; }
      }
    }
    // everything is now counted on both sides: start the next round from here
    L.sync.base = { songs: Object.fromEntries(st.songs.map((s) => [s.id, [s.playCount, s.skipCount]])), listen: st.totalListenTime || 0, daily: Object.assign({}, st.daily || {}) };
    L.sync.serverNow = res.now || Date.now();
    await save(true); refreshAll();

    // send the PC songs and covers only this phone has
    let n = 0; const up = res.needAudio || [];
    for (const id of up) {
      const s = songById(id); if (!s) continue;
      SY.progress = 'Sending songs to your PC (' + (++n) + ' of ' + up.length + ')'; showSyncStatus();
      const blob = await DB.get('audio', id); if (!blob) continue;
      const meta = { title: s.title, file: s.file, addedAt: s.addedAt, updatedAt: s.updatedAt || 0, playCount: s.playCount || 0, skipCount: s.skipCount || 0,
        playlistIds: L.playlists.filter((p) => p.songIds.includes(id)).map((p) => p.id) };
      const pr = await sreq('/audio/' + encodeURIComponent(id), { method: 'PUT', headers: { 'X-Meta': encodeURIComponent(JSON.stringify(meta)), 'Content-Type': 'application/octet-stream' }, body: blob }, 120000);
      if (!pr.ok) continue;
      L.sync.base.songs[id] = [s.playCount || 0, s.skipCount || 0];
      if (s.hasCover) { const c = await DB.get('covers', 'c:' + id); if (c) await sreq('/cover/song/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': c.type || 'image/jpeg', 'X-Meta': String(s.coverRev || Date.now()) }, body: c }, 60000); }
    }
    for (const id of res.needSongCover || []) { const s = songById(id); const c = s && await DB.get('covers', 'c:' + id); if (c) await sreq('/cover/song/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': c.type || 'image/jpeg', 'X-Meta': String(s.coverRev || Date.now()) }, body: c }, 60000); }
    for (const id of res.needPlaylistCover || []) { const p = plById(id); const c = p && await DB.get('covers', 'p:' + id); if (c) await sreq('/cover/playlist/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': c.type || 'image/jpeg', 'X-Meta': String(p.coverRev || Date.now()) }, body: c }, 60000); }

    // bring over songs only the PC has
    n = 0;
    for (const s of getAudio) {
      SY.progress = 'Getting new songs (' + (++n) + ' of ' + getAudio.length + ')'; showSyncStatus();
      const ar = await sreq('/audio/' + encodeURIComponent(s.id), {}, 180000); if (!ar.ok) continue;
      const blob = await ar.blob();
      await DB.put('audio', s.id, new Blob([blob], { type: ar.headers.get('Content-Type') || AUDIO_TYPES[extOf(s.file, 'mp3')] || 'audio/mpeg' }));
      L.songs.push({ id: s.id, title: s.title, file: s.file, addedAt: s.addedAt == null ? Date.now() : s.addedAt, updatedAt: s.updatedAt || 0, coverRev: 0, hasCover: false,
        playCount: s.playCount || 0, skipCount: s.skipCount || 0, size: blob.size });
      if (s.hasCover) getCovers.push(['song', s.id, s.coverRev]);
      if (n % 5 === 0) { await save(true); refreshAll(); }
    }
    for (const [kind, id, rev] of getCovers) {
      const item = kind === 'song' ? songById(id) : plById(id); if (!item) continue;
      try {
        const cr = await sreq('/cover/' + kind + '/' + encodeURIComponent(id), {}, 60000); if (!cr.ok) continue;
        await storeCover(kind, id, await cr.blob()); item.hasCover = true; item.coverRev = rev;
      } catch (e) { /* try again next sync */ }
    }
    L.sync.lastSync = Date.now();
    await save(true); refreshAll();
    if (getAudio.length && !manual) toast('Synced ' + plural(getAudio.length, 'new song') + ' from your PC');
    if (manual) toast('Synced with your PC');
    if (up.length || getAudio.length) requestPersist();
  } catch (e) {
    SY.err = e && e.key ? e.message : 'Couldn\'t reach your PC. Is Groove open on it and Tailscale on here?';
    if (manual) toast(SY.err);
  } finally {
    SY.busy = false; SY.progress = ''; showSyncStatus();
    if (V.tab === 'settings' && !V.stats) drawSettings();
  }
}
function syncSetupDialog() {
  openDlg('<h2>Sync with PC</h2><p>Turn on Phone sync in desktop Groove\'s Settings, then enter your PC\'s Tailscale address and the sync key shown there.</p>' +
    '<div class="field"><label for="d-url">PC address</label><input type="text" id="d-url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="yourpc.tailnet-name.ts.net" value="' + esc((L.sync.url || '').replace(/^https:\/\//, '')) + '"></div>' +
    '<div class="field"><label for="d-key">Sync key</label><input type="text" id="d-key" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="ABCD-1234" value="' + esc(L.sync.key || '') + '"></div>' +
    '<p id="d-msg" style="margin-top:12px;min-height:18px"></p>' +
    '<div class="acts">' + (syncOn() ? '<button class="btn sec" data-a="off">Turn off</button>' : '<button class="btn sec" data-a="no">Cancel</button>') + '<button class="btn accent" data-a="go">Connect</button></div>');
  $('dlg').onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'no') { closeDlg(); return; }
    if (b.dataset.a === 'off') { L.sync.url = ''; L.sync.key = ''; save(); closeDlg(); drawSettings(); toast('Syncing turned off'); return; }
    const url = normalizeUrl($('d-url').value), key = $('d-key').value.trim().toUpperCase();
    if (!url || !key) { $('d-msg').textContent = 'Enter both the address and the key.'; return; }
    $('d-msg').textContent = 'Connecting...';
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 10000);
      const r = await fetch(url + '/ping', { headers: { Authorization: 'Bearer ' + key }, signal: ctl.signal, cache: 'no-store' });
      const j = await r.json();
      if (!j || j.app !== 'Groove') throw new Error('x');
      if (!j.authed) { $('d-msg').textContent = 'Your PC answered, but the key doesn\'t match. Check it in desktop Groove.'; return; }
    } catch (err) { $('d-msg').textContent = 'Couldn\'t reach Groove at that address. Check that Tailscale is on, Groove is open on your PC and Phone sync is turned on.'; return; }
    const changedPc = L.sync.url && L.sync.url !== url;
    L.sync.url = url; L.sync.key = key;
    if (changedPc) { L.sync.base = null; L.sync.serverNow = 0; }
    await save(true); closeDlg(); drawSettings(); syncNow(true);
  };
}
// sync when the app opens, when you come back to it, and every few minutes while it's open
setTimeout(() => syncNow(false), 2500);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (L.sync.lastSync || 0) > 60000) syncNow(false); });
setInterval(() => { if (!document.hidden) syncNow(false); }, 5 * 60000);
setInterval(() => { if (V.tab === 'settings' && !V.stats) showSyncStatus(); }, 30000);

// ---------- import / export ----------
async function requestPersist() { try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {} }
async function startImport() {
  if (L.songs.length && !(await confirmDlg('Replace your library?', 'Importing replaces every song, playlist, cover, theme and stat on this iPhone with the ones in the zip.', 'Choose zip', true))) return;
  const file = await pickFile('f-zip'); if (!file) return;
  const pg = progressDlg('Importing your library');
  const wakeKeeper = keepAwake();
  try {
    pg.set('Reading the zip...', 0);
    const entries = await zipEntries(file);
    const libE = entries.get('library.json');
    if (!libE) throw new Error('This zip has no library.json. Use Export Library in desktop Groove\'s Settings.');
    const lib = JSON.parse(await (await zipRead(file, libE)).text());
    if (!Array.isArray(lib.songs)) throw new Error('library.json is not a Groove library.');
    audio.pause(); other().pause(); P.cur = null; P.queue = []; ready = { el: null, id: null };
    for (const k of urls.keys()) setCover(k, null);
    await DB.clear('audio'); await DB.clear('covers');
    const fresh = emptyLibrary();
    fresh.totalListenTime = lib.totalListenTime || 0;
    fresh.desktopSettings = lib.settings || null;
    if (lib.settings && typeof lib.settings.confirmDelete === 'boolean') fresh.settings.confirmDelete = lib.settings.confirmDelete;
    let n = 0, missing = 0;
    for (const s of lib.songs) {
      n++;
      pg.set('Song ' + n + ' of ' + lib.songs.length + ': ' + (s.title || ''), (n - 1) / (lib.songs.length + 1));
      const e = entries.get('music/' + s.file);
      if (!e) { missing++; continue; }
      const ext = extOf(s.file, 'mp3');
      const blob = await zipRead(file, e, AUDIO_TYPES[ext] || 'audio/mpeg');
      await DB.put('audio', s.id, blob);
      const song = { id: s.id, title: s.title || s.file, file: s.file, playCount: s.playCount || 0, skipCount: s.skipCount || 0, addedAt: s.addedAt || Date.now(), size: blob.size, hasCover: false, updatedAt: s.updatedAt || 0, coverRev: s.coverRev || 0 };
      const ce = s.cover && entries.get('covers/' + s.cover);
      if (ce) {
        try {
          const raw = await zipRead(file, ce, IMG_TYPES[extOf(s.cover, 'png')]);
          const full = await resizeImage(raw, 1000, true); const th = await thumbOf(full);
          await DB.put('covers', 'c:' + s.id, full); await DB.put('covers', 'ct:' + s.id, th); setCover('c:' + s.id, full); setCover('ct:' + s.id, th);
          song.hasCover = true;
        } catch (err) { /* keep the song without a cover */ }
      }
      fresh.songs.push(song);
    }
    pg.set('Playlists and themes...', lib.songs.length / (lib.songs.length + 1));
    const have = new Set(fresh.songs.map((s) => s.id));
    for (const p of lib.playlists || []) {
      const pl = { id: p.id, name: p.name, songIds: (p.songIds || []).filter((id) => have.has(id)), hasCover: false, updatedAt: p.updatedAt || 0, coverRev: p.coverRev || 0 };
      const ce = p.cover && entries.get('covers/' + p.cover);
      if (ce) { try { const full = await resizeImage(await zipRead(file, ce, IMG_TYPES[extOf(p.cover, 'png')]), 1000, true); await DB.put('covers', 'p:' + pl.id, full); setCover('p:' + pl.id, full); pl.hasCover = true; } catch (err) {} }
      fresh.playlists.push(pl);
    }
    for (const t of lib.themes || []) {
      const th = { id: t.id, name: t.name, accent: t.accent || '#6f1ddb', hasBg: false };
      const be = t.bgImage && entries.get('covers/' + t.bgImage);
      if (be) { try { const img = await resizeImage(await zipRead(file, be, IMG_TYPES[extOf(t.bgImage, 'png')]), 1600, false); await DB.put('covers', 't:' + th.id, img); setCover('t:' + th.id, img); th.hasBg = true; } catch (err) {} }
      fresh.themes.push(th);
    }
    fresh.activeThemeId = lib.activeThemeId || DEFAULT_THEME.id;
    fresh.appVersion = L.appVersion; fresh.versionSince = L.versionSince;
    fresh.daily = lib.daily || {}; fresh.deletedSongs = lib.deletedSongs || {}; fresh.deletedPlaylists = lib.deletedPlaylists || {}; fresh.statsResetAt = lib.statsResetAt || 0;
    // keep the sync setup, and start counting from what was just imported (it matches your PC)
    fresh.sync = Object.assign({}, L.sync, { serverNow: Date.now(), base: { songs: Object.fromEntries(fresh.songs.map((s) => [s.id, [s.playCount, s.skipCount]])), listen: fresh.totalListenTime, daily: Object.assign({}, fresh.daily) } });
    L = fresh;
    await save(true);
    await requestPersist();
    pg.done();
    applyTheme(); refreshAll();
    toast('Imported ' + plural(fresh.songs.length, 'song') + (missing ? ' (' + missing + ' missing from the zip)' : ''));
  } catch (err) {
    pg.done();
    await confirmDlg('Import failed', (err && err.message) || String(err), 'OK');
  } finally { wakeKeeper(); }
}
async function exportBackup() {
  if (!L.songs.length) { toast('Your library is empty'); return; }
  const pg = progressDlg('Making a backup');
  const wakeKeeper = keepAwake();
  try {
    const files = []; const lib = { songs: [], playlists: [], totalListenTime: L.totalListenTime || 0, version: 1, themes: [], activeThemeId: L.activeThemeId,
      daily: L.daily, deletedSongs: L.deletedSongs, deletedPlaylists: L.deletedPlaylists, statsResetAt: L.statsResetAt || 0,
      settings: Object.assign({ minimizeToTray: false, launchOnStartup: false }, L.desktopSettings || {}, { confirmDelete: !!L.settings.confirmDelete }) };
    for (const s of L.songs) {
      const blob = await DB.get('audio', s.id); if (!blob) continue;
      const file = s.file || s.id + '.mp3';
      files.push({ name: 'music/' + file, blob });
      let cover = null;
      if (s.hasCover) { const c = await DB.get('covers', 'c:' + s.id); if (c) { cover = s.id + '_cover.jpg'; files.push({ name: 'covers/' + cover, blob: c }); } }
      lib.songs.push({ id: s.id, title: s.title, file, cover, playCount: s.playCount || 0, skipCount: s.skipCount || 0, addedAt: s.addedAt, updatedAt: s.updatedAt || 0, coverRev: s.coverRev || 0 });
    }
    for (const p of L.playlists) {
      let cover = null;
      if (p.hasCover) { const c = await DB.get('covers', 'p:' + p.id); if (c) { cover = 'pl_' + p.id + '_cover.jpg'; files.push({ name: 'covers/' + cover, blob: c }); } }
      lib.playlists.push({ id: p.id, name: p.name, songIds: p.songIds.slice(), cover, updatedAt: p.updatedAt || 0, coverRev: p.coverRev || 0 });
    }
    for (const t of L.themes) {
      let bgImage = null;
      if (t.hasBg) { const c = await DB.get('covers', 't:' + t.id); if (c) { bgImage = 'theme_' + t.id + '_bg.jpg'; files.push({ name: 'covers/' + bgImage, blob: c }); } }
      lib.themes.push({ id: t.id, name: t.name, accent: t.accent, bgImage });
    }
    files.push({ name: 'library.json', blob: new Blob([JSON.stringify(lib, null, 2)], { type: 'application/json' }) });
    const zip = await zipWrite(files, (i, n) => pg.set('Packing ' + i + ' of ' + n + ' files...', i / n));
    pg.done();
    const name = 'groove-library-backup.zip';
    const f = new File([zip], name, { type: 'application/zip' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: 'Groove backup' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(zip); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  } catch (err) { pg.done(); await confirmDlg('Backup failed', (err && err.message) || String(err), 'OK'); }
  finally { wakeKeeper(); }
}
// keep the screen on during long imports (iOS stops page work when the screen locks)
function keepAwake() {
  let lock = null;
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {}); } catch (e) {}
  return () => { try { if (lock) lock.release(); } catch (e) {} };
}

function refreshAll() {
  if (V.tab === 'library') drawLibrary(); else $('p-library').dataset.built && drawLibrary();
  if (V.tab === 'playlists') drawPlaylists();
  if (V.tab === 'settings') drawSettings();
  if (V.tab === 'now') drawNow();
  updateMini();
}

// ---------- start ----------
(async () => {
  try { await DB.open(); } catch (e) { document.body.insertAdjacentHTML('beforeend', '<div class="empty" style="position:fixed;inset:0;z-index:50;padding-top:40vh">Groove could not open its storage on this device.</div>'); return; }
  const saved = await DB.get('meta', 'library');
  if (saved) L = Object.assign(emptyLibrary(), saved, { settings: Object.assign(emptyLibrary().settings, saved.settings || {}) });
  if (L.appVersion !== APP_VERSION) { L.appVersion = APP_VERSION; L.versionSince = Date.now(); save(true); }
  const covers = await DB.all('covers');
  for (const [k, b] of covers) if (k.startsWith('ct:') || k.startsWith('p:') || k.startsWith('t:') || k.startsWith('c:')) setCover(k, b);
  applyTheme();
  // each launch starts fresh: nothing in Now Playing until you pick a song
  L.state = null;
  show('library');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
