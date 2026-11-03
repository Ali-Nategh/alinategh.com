/* mini.js — mini Ali, a pixel-art character drawn on a canvas
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GW = 61, GH = 46, CX = 30, FY = 42;        // sprite grid; CX/FY = the character's feet
  const root = document.createElement('div'); root.id = 'mini';
  root.innerHTML = '<div class="mini-shadow"></div><canvas width="61" height="46"></canvas><button type="button" class="mini-hit" aria-label="Mini Ali. Click to say hi."></button><div class="mini-bubble" role="status" hidden></div>';
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d');
  const hit = root.querySelector('.mini-hit'), bubble = root.querySelector('.mini-bubble'), shadow = root.querySelector('.mini-shadow');

  /* ---------- colours: long dark curls with golden ends, mustache & goatee, cream zip jacket, white tee, jeans ---------- */
  const HAIR = { 'dark brown': '#3b2618', black: '#1d1716', brown: '#5a3a22', 'light brown': '#86592f', blonde: '#c49a55', auburn: '#73311d', gray: '#8c8a90' };
  const SKIN = { light: '#f3d5bd', 'light-medium': '#e4b896', medium: '#d29d74', olive: '#c39265', tan: '#a8724a', brown: '#86553a', deep: '#5e3a28' };
  const JACKET = { cream: '#ebe6da', navy: '#2a3768', black: '#2b2b33', claret: '#9c3550', forest: '#2f5d46', gray: '#6b7080' };
  const DEF = { on: 'yes', hair: 'dark brown', skin: 'light-medium', shirt: 'cream', glasses: 'no', beard: 'mustache & goatee' };
  let cfg = Object.assign({}, DEF, window.__miniCfg || {});
  const rgb = h => { h = String(h || '').trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return isNaN(n) ? [200, 160, 90] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, k) => hex(rgb(h).map(v => v * (1 - k)));
  const tint = (h, k) => hex(rgb(h).map(v => v + (255 - v) * k));
  const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * k)); };
  let pal = {};
  function buildPalette() {
    const css = getComputedStyle(document.documentElement), tok = (n, d) => (css.getPropertyValue(n) || d).trim() || d;
    const accent = tok('--accent', '#e2b25a'), accent2 = tok('--accent-2', '#d9607f'), cool = tok('--cool', '#93b6ff');
    const hair = HAIR[cfg.hair] || HAIR['dark brown'], skin = SKIN[cfg.skin] || SKIN['light-medium'];
    const jk = JACKET[cfg.shirt] || (cfg.shirt === 'theme colour' ? accent : JACKET.cream);
    pal = {
      hair, hairS: shade(hair, .4), hairHi: mix(hair, '#b8804a', .42), hairHi2: mix(hair, '#d9a868', .62),
      brow: shade(hair, .45), beard: shade(hair, .22), stub: mix(skin, hair, .5),
      skin, skinS: shade(skin, .13), skinD: shade(skin, .25), lip: mix(skin, '#a14b45', .45), mouthD: '#4a2026',
      eyeW: '#f1ece4', eye: '#23150e',
      jk, jkS: shade(jk, .15), jkD: shade(jk, .3), jkHi: tint(jk, .45), zip: mix(jk, '#6c675d', .5),
      tee: '#f8f7f3', teeS: '#dedcd5',
      denim: '#3d5f93', denimS: '#2b456f', denimHi: '#5b7eb3',
      shoe: '#efece5', sole: '#a39d91',
      gl: '#151722', hp: '#2a2d3a', cup: accent2,
      wood: '#7a5534', woodS: '#5a3d24', woodHi: '#97693f', plinth: '#2a2533', vinyl: '#141419', vinylHi: '#6a6a7c', arm: '#cfc9bd',
      lid: '#3b4058', lidHi: '#6d7493', accent, accent2, cool, ok: '#57d184', dust: '#e9e4d8', out: '#0b0e1c'
    };
  }
  buildPalette();
  new MutationObserver(() => { buildPalette(); dirty = true; }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
  addEventListener('mini:config', () => { cfg = Object.assign({}, DEF, window.__miniCfg || {}); buildPalette(); root.hidden = cfg.on === 'no'; dirty = true; });
  root.hidden = cfg.on === 'no';

  /* ---------- pixel buffer ---------- */
  let buf = new Array(GW * GH);
  const P = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < GW && y < GH) buf[y * GW + x] = c; };
  const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, c); };
  const L = (x0, y0, x1, y1, c, t = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor((t - 1) / 2);
    for (let i = 0; i <= n; i++) R(Math.round(x0 + (x1 - x0) * i / n) - o, Math.round(y0 + (y1 - y0) * i / n) - o, t, t, c);
  };

  /* ---------- hair: a curly texture that shifts (curl) and lower strands that swing (sway) ---------- */
  let blinkOn = false, idleLook = 0, curl = 0, sway = 0;
  // a 4x3 tile of little loops, staggered every other row; only the lower curls move
  const CURL_TILE = ['.s..', 's.s.', '.h..'];
  function hairPix(x, y, rel) {
    const yy = y + 30, band = Math.floor(yy / 3), live = rel > 5 ? curl : 0;
    const c = CURL_TILE[yy % 3][(x + 40 + (band % 2) * 2 + live) % 4];
    if (c === 's') return pal.hairS;
    if (c === 'h') return rel > 7 ? pal.hairHi2 : pal.hairHi;
    return rel > 10 && (x + y) % 5 === 0 ? pal.hairHi : pal.hair;
  }
  const edge = (r, k) => r < 3 ? (r + k) % 2 : ((r + curl + k) % 3 === 0) ? 1 : 0;   // bumpy outline = curls
  const strandOff = r => r >= 11 ? sway : 0;
  const HAIR_ROWS = [[-3, 1, 8], [-2, 0, 9], [-1, -1, 10], [0, -2, 11], [1, -2, 11]];
  function hairBack(hx, hy) {
    for (const [r, l, rt] of HAIR_ROWS) for (let x = hx + l - edge(r, 0); x <= hx + rt + edge(r, 1); x++) P(x, hy + r, hairPix(x, hy + r, r));
    for (let r = 2; r <= 13; r++) {
      const o = strandOff(r);
      for (let x = hx - 2 - edge(r, 0) + o; x <= hx + 11 + edge(r, 1) + o; x++) P(x, hy + r, hairPix(x, hy + r, r));
    }
  }
  function hairFront(hx, hy) {
    // hairline with a centre part, temples and cheek-side curls
    R(hx, hy - 1, 10, 1, pal.hair); for (let x = hx; x < hx + 10; x++) P(x, hy - 1, hairPix(x, hy - 1, -1));
    for (const x of [hx, hx + 1, hx + 2, hx + 3, hx + 6, hx + 7, hx + 8, hx + 9]) P(x, hy, hairPix(x, hy, 0));
    for (const x of [hx, hx + 1, hx + 8, hx + 9]) P(x, hy + 1, hairPix(x, hy + 1, 1));
    for (let r = 2; r <= 4; r++) { P(hx, hy + r, hairPix(hx, hy + r, r)); P(hx + 9, hy + r, hairPix(hx + 9, hy + r, r)); }
    // the curl that falls over his forehead
    const s = sway > 0 ? 1 : 0;
    P(hx + 3 + s, hy + 1, pal.hair); P(hx + 2 + s, hy + 2, pal.hairS); P(hx + 3 + s, hy + 4, pal.hairHi);
  }
  function hairStrands(hx, hy) {                                          // curls resting on the shoulders, in front of the jacket
    for (let r = 9; r <= 13; r++) {
      const o = strandOff(r), y = hy + r;
      for (let x = hx - 3 - edge(r, 0) + o; x <= hx - 1 + o; x++) P(x, y, hairPix(x, y, r));
      for (let x = hx + 10 + o; x <= hx + 12 + edge(r, 1) + o; x++) P(x, y, hairPix(x, y, r));
    }
    [[14, [-3, -1, 10, 12]], [15, [-2, 11]]].forEach(([r, xs]) => xs.forEach(dx => P(hx + dx + sway, hy + r, ((dx + curl) & 1) ? pal.hairHi2 : pal.hairHi)));
  }

  /* ---------- face ---------- */
  function face(hx, hy, o) {
    const glasses = cfg.glasses === 'yes', blink = o.blink != null ? o.blink : blinkOn, lk = o.look != null ? o.look : idleLook;
    R(hx + 1, hy, 8, 2, pal.skin); R(hx, hy + 2, 10, 6, pal.skin); R(hx + 1, hy + 8, 8, 1, pal.skin); R(hx + 2, hy + 9, 6, 1, pal.skin); R(hx + 3, hy + 10, 4, 1, pal.skin);
    P(hx + 9, hy + 6, pal.skinS); P(hx + 8, hy + 8, pal.skinS);
    R(hx + 1, hy + 3, 3, 1, pal.brow); R(hx + 6, hy + 3, 3, 1, pal.brow);   // thick brows
    const ey = hy + 5 + (o.eyesDown ? 1 : 0);
    if (blink) { R(hx + 1, ey, 3, 1, pal.brow); R(hx + 6, ey, 3, 1, pal.brow); }
    else {
      const d = lk < 0 ? -1 : lk > 0 ? 1 : 0;
      R(hx + 1, ey, 3, 1, pal.eyeW); R(hx + 6, ey, 3, 1, pal.eyeW); P(hx + 2 + d, ey, pal.eye); P(hx + 7 + d, ey, pal.eye);
    }
    P(hx + 4, hy + 6, pal.skinS); P(hx + 4, hy + 7, pal.skinD); P(hx + 5, hy + 7, pal.skinD);   // nose
    const b = cfg.beard;
    if (b === 'mustache & goatee') {
      P(hx, hy + 7, pal.stub); P(hx + 1, hy + 8, pal.stub); P(hx + 9, hy + 7, pal.stub); P(hx + 8, hy + 8, pal.stub);
      R(hx + 2, hy + 8, 6, 1, pal.beard); P(hx + 2, hy + 9, pal.beard); P(hx + 7, hy + 9, pal.beard);
      R(hx + 3, hy + 10, 4, 1, pal.beard); R(hx + 3, hy + 11, 4, 1, pal.beard);
    } else if (b === 'full beard') {
      R(hx, hy + 6, 1, 3, pal.beard); R(hx + 9, hy + 6, 1, 3, pal.beard); R(hx + 1, hy + 8, 8, 2, pal.beard); R(hx + 2, hy + 10, 6, 2, pal.beard);
    } else if (b === 'stubble') {
      [[0, 7], [1, 8], [9, 7], [8, 8], [3, 8], [6, 8], [3, 10], [4, 10], [5, 10], [6, 10]].forEach(([x, y]) => P(hx + x, hy + y, pal.stub));
    }
    if (o.mouth === 'open') R(hx + 4, hy + 9, 2, 2, pal.mouthD); else { P(hx + 4, hy + 9, pal.lip); P(hx + 5, hy + 9, pal.lip); }
    if (glasses) {
      R(hx, hy + 4, 5, 1, pal.gl); R(hx + 5, hy + 4, 5, 1, pal.gl); R(hx, hy + 6, 5, 1, pal.gl); R(hx + 5, hy + 6, 5, 1, pal.gl);
      [0, 4, 5, 9].forEach(x => P(hx + x, hy + 5, pal.gl));
    }
    if (o.headphones) {
      R(hx - 1, hy - 4, 12, 1, pal.hp); P(hx - 2, hy - 3, pal.hp); P(hx + 11, hy - 3, pal.hp);
      R(hx - 3, hy + 2, 3, 5, pal.cup); R(hx + 10, hy + 2, 3, 5, pal.cup);
    }
  }
  function head(hx, hy, o) { face(hx, hy, o); hairFront(hx, hy); hairStrands(hx, hy); if (o.headphones) { R(hx - 3, hy + 2, 3, 5, pal.cup); R(hx + 10, hy + 2, 3, 5, pal.cup); } }

  /* ---------- body ---------- */
  function jacketTorso(ty, rows = 10) {
    R(CX - 6, ty, 12, rows, pal.jk); R(CX + 4, ty + 1, 2, rows - 1, pal.jkS); R(CX - 6, ty + rows - 1, 12, 1, pal.jkS);
    R(CX - 2, ty, 4, rows - 1, pal.tee); R(CX + 1, ty + 1, 1, rows - 2, pal.teeS); R(CX - 1, ty, 2, 1, pal.skinS);
    for (let y = ty + 2; y < ty + rows - 1; y++) { P(CX - 3, y, (y & 1) ? pal.zip : pal.jkS); P(CX + 2, y, (y & 1) ? pal.zip : pal.jkS); }
    R(CX - 5, ty, 3, 1, pal.jkHi); R(CX - 4, ty + 1, 2, 1, pal.jkHi); P(CX - 3, ty + 2, pal.jkHi);       // collars
    R(CX + 2, ty, 3, 1, pal.jkHi); R(CX + 2, ty + 1, 2, 1, pal.jkHi); P(CX + 2, ty + 2, pal.jkHi);
    P(CX - 5, ty + 1, pal.jkD); P(CX + 4, ty + 1, pal.jkD);
  }
  function armF(dir, kind, ty) {
    const x = dir < 0 ? CX - 9 : CX + 6;
    if (kind === 'down' || kind === 'swing') {
      const s = kind === 'swing' ? 1 : 0;
      R(x, ty + 1, 3, 8 - s, pal.jk); R(dir < 0 ? x : x + 2, ty + 1, 1, 8 - s, pal.jkS); R(x, ty + 8 - s, 3, 1, pal.jkHi);
      R(x + (dir < 0 ? 0 : 1), ty + 9 - s, 2, 2, pal.skin); return;
    }
    const sx = dir > 0 ? CX + 7 : CX - 8, hi = kind === 'up1', hx = sx + dir * (hi ? 3 : 5), hy = ty - (hi ? 9 : 8);
    L(sx, ty + 2, hx + (dir > 0 ? 0 : 1), hy + 3, pal.jk, 3); R(hx, hy, 2, 3, pal.skin);
  }
  function legs(kind) {
    const a = kind === 'walkA' ? 1 : 0, b = kind === 'walkB' ? 1 : 0, top = FY - 8;
    R(CX - 4, top, 4, 7 - a, pal.denim); R(CX, top, 4, 7 - b, pal.denim);
    R(CX - 3, top + 1, 1, 4 - a, pal.denimHi); R(CX + 2, top + 1, 1, 4 - b, pal.denimHi);
    R(CX - 1, top + 2, 1, 5 - a, pal.denimS); R(CX, top + 2, 1, 5 - b, pal.denimS);
    R(CX - 5, FY - 1 - a, 5, 1, pal.shoe); R(CX - 5, FY - a, 5, 1, pal.sole);
    R(CX, FY - 1 - b, 5, 1, pal.shoe); R(CX, FY - b, 5, 1, pal.sole);
  }
  function stand(o) {
    const up = o.bob || 0, hx = CX - 5 + (o.lean || 0), hy = FY - 29 + up, ty = FY - 17 + up;
    hairBack(hx, hy); legs(o.legs);
    R(CX - 2, ty - 1, 4, 1, pal.skinS);
    jacketTorso(ty); armF(-1, o.armL || 'down', ty); armF(1, o.armR || 'down', ty);
    head(hx, hy, o);
  }
  function sit(o) {
    const up = o.bob || 0, hx = CX - 5, hy = FY - 24 + up, ty = FY - 12 + up;
    hairBack(hx, hy);
    R(CX - 10, FY - 4, 6, 3, pal.denim); R(CX + 4, FY - 4, 6, 3, pal.denim);
    R(CX - 8, FY - 2, 16, 3, pal.denim); R(CX - 1, FY - 2, 2, 3, pal.denimS); R(CX - 9, FY - 3, 4, 1, pal.denimHi); R(CX + 5, FY - 3, 4, 1, pal.denimHi);
    R(CX - 12, FY - 1, 3, 1, pal.shoe); R(CX - 12, FY, 3, 1, pal.sole);
    const t = o.tap ? 1 : 0; R(CX + 9, FY - 1 - t, 3, 1, pal.shoe); R(CX + 9, FY - t, 3, 1, pal.sole);
    R(CX - 2, ty - 1, 4, 1, pal.skinS);
    jacketTorso(ty, 9);
    if (o.typing != null) {
      const a = o.typing < 0 ? 0 : o.typing, b2 = o.typing < 0 ? 0 : 1 - a;
      L(CX - 8, ty + 1, CX - 9, FY - 8, pal.jk, 3); R(CX - 10, FY - 6 - a, 2, 2, pal.skin);
      L(CX + 7, ty + 1, CX + 8, FY - 8, pal.jk, 3); R(CX + 8, FY - 6 - b2, 2, 2, pal.skin);
    } else {
      R(CX - 9, ty + 1, 3, 5, pal.jk); R(CX - 9, ty + 1, 1, 5, pal.jkS); R(CX - 10, ty + 6, 2, 2, pal.skin);
      R(CX + 6, ty + 1, 3, 5, pal.jk); R(CX + 8, ty + 1, 1, 5, pal.jkS); R(CX + 8, ty + 6, 2, 2, pal.skin);
    }
    head(hx, hy, o);
  }
  function deck(f) {                                  // vinyl player on a crate, beside him
    const x = CX + 13, y = FY - 7;
    R(x, y, 12, 8, pal.wood); R(x, y, 12, 1, pal.woodHi); R(x + 1, y + 3, 10, 1, pal.woodS); R(x + 1, y + 6, 10, 1, pal.woodS);
    R(x, y - 2, 12, 2, pal.plinth);
    R(x + 2, y - 4, 7, 1, pal.vinyl); R(x + 1, y - 3, 9, 1, pal.vinyl);
    P(x + 5, y - 4, pal.accent2); P(x + 5, y - 3, pal.accent2);
    const sp = [[x + 2, y - 4], [x + 8, y - 4], [x + 9, y - 3], [x + 1, y - 3]][f % 4]; P(sp[0], sp[1], pal.vinylHi);
    L(x + 11, y - 6, x + 8, y - 4, pal.arm); P(x + 11, y - 5, pal.arm);
  }
  function laptop(f) {
    R(CX - 6, FY - 10, 12, 6, pal.lid); R(CX - 6, FY - 10, 12, 1, pal.lidHi);
    R(CX - 1, FY - 8, 2, 2, f % 7 === 0 ? pal.cool : pal.accent);
    R(CX - 7, FY - 4, 14, 1, pal.lidHi);
  }

  /* ---------- pushups, side view ---------- */
  function sideHead(hx, hy) {
    for (let r = -2; r <= 11; r++) {
      const o = r >= 8 ? sway : 0, l = r < 0 ? hx + 1 : hx, rt = r < 2 ? hx + 9 : hx + 4;
      for (let x = l - edge(r, 0) + o; x <= rt + o; x++) P(x, hy + r, hairPix(x, hy + r, r));
    }
    R(hx + 4, hy + 2, 5, 8, pal.skin); P(hx + 9, hy + 5, pal.skin); P(hx + 9, hy + 6, pal.skinS); R(hx + 5, hy + 10, 3, 1, pal.skin);
    R(hx + 6, hy + 3, 3, 1, pal.brow);
    P(hx + 7, hy + 4, blinkOn ? pal.brow : pal.eyeW); P(hx + 8, hy + 4, blinkOn ? pal.brow : pal.eye);
    const b = cfg.beard;
    if (b === 'mustache & goatee') { R(hx + 7, hy + 7, 2, 1, pal.beard); R(hx + 6, hy + 9, 3, 2, pal.beard); R(hx + 4, hy + 8, 2, 2, pal.stub); }
    else if (b === 'full beard') R(hx + 4, hy + 7, 5, 4, pal.beard);
    else if (b === 'stubble') { P(hx + 5, hy + 9, pal.stub); P(hx + 7, hy + 9, pal.stub); }
    P(hx + 8, hy + 8, pal.lip);
    if (cfg.glasses === 'yes') { R(hx + 6, hy + 4, 1, 1, pal.gl); P(hx + 9, hy + 4, pal.gl); R(hx + 5, hy + 4, 1, 1, pal.gl); }
    P(hx + 6, hy + 2, pal.hair); P(hx + 7 + (sway > 0 ? 1 : 0), hy + 1, pal.hairHi);
  }
  function plank(f) {
    const sx = CX + 6, sy = [FY - 7, FY - 6, FY - 4][f], hpx = CX - 3, hpy = [FY - 5, FY - 4, FY - 3][f], fx0 = CX - 14;
    L(hpx, hpy, fx0 + 3, FY - 2, pal.denim, 3); L(hpx, hpy - 1, fx0 + 4, FY - 3, pal.denimHi, 1);
    R(fx0, FY - 1, 4, 1, pal.shoe); R(fx0, FY, 4, 1, pal.sole);
    L(sx, sy, hpx, hpy, pal.jk, 4); L(sx - 1, sy - 1, hpx + 1, hpy - 1, pal.jkHi, 1);
    if (f === 0) { R(sx, sy + 1, 3, 3, pal.jk); R(sx, sy + 4, 2, FY - sy - 3, pal.skin); }
    else if (f === 1) { R(sx, sy + 1, 3, 2, pal.jk); L(sx - 1, sy + 3, sx, FY, pal.skin, 2); }
    else { L(sx, sy + 1, sx - 3, FY - 1, pal.jk, 3); R(sx - 2, FY, 5, 1, pal.skin); }
    sideHead(sx + 1, sy - 10);
  }

  /* ---------- small effects drawn without an outline (never mirrored, so text stays readable) ---------- */
  const PAT = { code: ['.#...#.#.', '#...#...#', '.#.#...#.'], check: ['....#', '...#.', '#.#..', '.#...'], note: ['..##', '..#.', '..#.', '###.', '##..'], drop: ['#', '#'], poof: ['#.#', '.#.', '#.#'] };
  let fx = [];
  const addFx = (pat, x, y, color, life, vy = 1, vx = 0) => fx.push({ pat: PAT[pat], x, y, color, life, vy, vx });
  const stepFx = () => { fx.forEach(p => { p.y -= p.vy; p.x += p.vx; p.life--; }); fx = fx.filter(p => p.life > 0); };

  let tick = 0;   // global sprite clock, for spinning records and typing
  const POSE = {
    none() {},
    idle0: () => stand({}), idle1: () => stand({ bob: 1 }), smile: () => stand({ mouth: 'open' }),
    walkA: () => stand({ legs: 'walkA', armL: 'swing', look: 1, lean: 1 }),
    walkB: () => stand({ legs: 'walkB', armR: 'swing', look: 1, lean: 1 }),
    sit: () => sit({}),
    music0: () => { sit({ headphones: true, look: 1 }); deck(tick); },
    music1: () => { sit({ headphones: true, look: 1, bob: 1, tap: 1 }); deck(tick); },
    music2: () => { sit({ headphones: true, look: 0, mouth: 'open' }); deck(tick); },
    music3: () => { sit({ headphones: true, look: 0, bob: 1, tap: 1, blink: true }); deck(tick); },
    code0: () => { sit({ typing: 0, eyesDown: true, look: 0 }); laptop(tick); },
    code1: () => { sit({ typing: 1, eyesDown: true, look: 0 }); laptop(tick); },
    codeDone: () => { sit({ typing: -1, mouth: 'open', look: 0 }); laptop(1); },
    push0: () => plank(0), push1: () => plank(1), push2: () => plank(2),
    peek0: () => stand({ lean: 2, look: 1 }), peekBack: () => stand({ lean: 2, look: -1 }), peekBlink: () => stand({ lean: 2, look: 1, blink: true }),
    wave1: () => stand({ armR: 'up1', mouth: 'open', look: 0 }), wave2: () => stand({ armR: 'up2', mouth: 'open', look: 0 })
  };
  let face_ = 1;
  function paint(name) {
    buf = new Array(GW * GH);
    (POSE[name] || POSE.idle0)();
    const out = buf.slice();
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x; if (buf[i]) continue;
      if ((x > 0 && buf[i - 1]) || (x < GW - 1 && buf[i + 1]) || (y > 0 && buf[i - GW]) || (y < GH - 1 && buf[i + GW])) out[i] = pal.out;
    }
    g.clearRect(0, 0, GW, GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const c = out[y * GW + x]; if (c) { g.fillStyle = c; g.fillRect(face_ > 0 ? x : GW - 1 - x, y, 1, 1); } }
    fx.forEach(p => {
      const w = p.pat[0].length, sx = face_ > 0 ? Math.round(p.x) : GW - Math.round(p.x) - w, sy = Math.round(p.y);
      g.fillStyle = p.color;
      p.pat.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(sx + i, sy + j, 1, 1); });
    });
  }

  /* ---------- where he stands ---------- */
  let vw = innerWidth, vh = innerHeight, S = 3, narrow = false;
  function measure() {
    vw = innerWidth; vh = innerHeight; narrow = vw < 900; S = narrow ? 2 : 3;
    cv.style.width = GW * S + 'px'; cv.style.height = GH * S + 'px';
  }
  measure();
  const gutter = () => Math.max(0, (vw - Math.min(1120, vw - 32)) / 2);
  const peekX = sd => sd === 'L' ? -2 * S : vw + 2 * S;
  const edgeX = sd => sd === 'L' ? -19 * S : vw + 19 * S;
  const waveX = sd => sd === 'L' ? 12 * S : vw - 12 * S;
  const visitX = sd => sd === 'L' ? 16 * S : vw - 16 * S;      // small screens: fully visible, close to the edge
  const homeX = sd => { if (narrow) return peekX(sd); const m = Math.max(13 * S, Math.min(gutter() / 2, 150)); return sd === 'L' ? m : vw - m; };
  const AT = { home: homeX, peek: peekX, edge: edgeX, wave: waveX, visit: visitX };
  const footY = () => vh - (narrow ? 6 : 30);
  const other = sd => sd === 'L' ? 'R' : 'L';

  let side = Math.random() < .5 ? 'L' : 'R', pos = { x: edgeX(side) };

  /* ---------- the scheduler: activities are lists of phases ----------
     skip: true  -> dropped when you click him (he finishes what is needed, quickly, then waves)
     loopFinish  -> a looping phase that first completes its current cycle */
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const poof = (x, y) => { for (let i = 0; i < 2; i++) addFx('poof', x + rint(-2, 2), y + rint(-1, 1), pal.dust, 3, .5, (Math.random() - .5)); };
  const WALK = ['walkA', 'idle0', 'walkB', 'idle0'];
  function idleSeq() {
    if (narrow) return [{ frames: ['peek0', 'peek0', 'peekBack', 'peek0', 'peekBlink', 'peek0'], fd: 650, reps: rint(2, 4), skip: true, face: 'in', at: 'peek', hit: 'stand' }];
    return [{ frames: ['idle0', 'idle0', 'idle1', 'idle1'], fd: 420, reps: rint(4, 8), skip: true, float: true, face: 'in', at: 'home' }];
  }
  const ACTIVITIES = {
    swap: () => [{ frames: WALK, fd: 120, move: () => homeX(other(side)), face: 'move', onEnd: () => { side = other(side); } }],
    peek: (teleport) => {
      const ph = [
        { frames: WALK, fd: 120, move: () => edgeX(side), face: 'out', skip: true },
        { frames: ['none'], fd: 800, reps: 1, skip: true, hidden: true, at: 'edge' }
      ];
      if (teleport) ph.push({ frames: ['none'], fd: 10, reps: 1, skip: true, hidden: true, at: 'edge', onStart: () => { side = other(side); pos.x = edgeX(side); } });
      ph.push(
        { frames: ['peek0'], fd: 600, move: () => peekX(side), dur: 700, face: 'in', skip: true },
        { frames: ['peek0', 'peekBack', 'peek0', 'peekBlink', 'peek0'], fd: 460, reps: 1, face: 'in', skip: true, at: 'peek' },
        { frames: WALK, fd: 120, move: () => homeX(side), face: 'in' }
      );
      return ph;
    },
    music: () => [
      { frames: ['sit'], fd: 380, reps: 1, skip: true, ground: true, face: 'in', hit: 'sit', onEnd: () => poof(CX + 18, FY - 8) },
      { frames: ['music0', 'music1', 'music2', 'music3'], fd: 300, reps: rint(8, 12), skip: true, loopFinish: true, ground: true, face: 'in', hit: 'sit', shadowW: 40,
        fxTick: () => { if (Math.random() < .22) addFx('note', CX + 17, FY - 15, [pal.accent, pal.accent2, pal.cool][rint(0, 2)], 10, 1, Math.random() < .5 ? .25 : -.1); } },
      { frames: ['sit', 'idle0'], fd: 300, reps: 1, ground: true, face: 'in', hit: 'sit', onStart: () => poof(CX + 18, FY - 8) }
    ],
    pushups: () => [
      { frames: ['sit'], fd: 320, reps: 1, skip: true, ground: true, face: 'in', hit: 'sit' },
      { frames: ['push0', 'push0', 'push1', 'push2', 'push2', 'push1'], fd: 150, reps: rint(5, 8), skip: true, loopFinish: true, ground: true, face: 'in', hit: 'push', shadowW: 30,
        onRep: r => { if (r >= 2 && Math.random() < .55) addFx('drop', CX + 12, FY - 16, pal.cool, 5, -1, .3); } },
      { frames: ['sit', 'idle1', 'idle0'], fd: 280, reps: 1, ground: true, face: 'in', hit: 'sit' }
    ],
    coding: () => [
      { frames: ['sit'], fd: 320, reps: 1, skip: true, ground: true, face: 'in', hit: 'sit', onEnd: () => poof(CX, FY - 11) },
      { frames: ['code0', 'code1'], fd: 170, reps: rint(22, 36), skip: true, loopFinish: true, ground: true, face: 'in', hit: 'sit', shadowW: 24,
        fxTick: () => { if (Math.random() < .07) addFx('code', CX + 9, FY - 30, pal.cool, 11, .6); } },
      { frames: ['codeDone'], fd: 1000, reps: 1, skip: true, ground: true, face: 'in', hit: 'sit', onStart: () => addFx('check', CX + 10, FY - 30, pal.ok, 10, .4) },
      { frames: ['sit', 'idle0'], fd: 300, reps: 1, ground: true, face: 'in', hit: 'sit', onStart: () => poof(CX, FY - 11) }
    ],
    // small screens: step in from the edge, do a shorter activity, then go back to peeking
    visit: () => {
      const act = ['music', 'pushups', 'coding'][rint(0, 2)];
      const inner = ACTIVITIES[act]().map(ph => ph.loopFinish ? Object.assign({}, ph, { reps: Math.max(3, Math.round(ph.reps * .6)) }) : ph);
      return [
        { frames: WALK, fd: 120, move: () => visitX(side), face: 'in', skip: true },
        { frames: ['idle0', 'idle0', 'idle1', 'idle1'], fd: 420, reps: 2, skip: true, float: true, face: 'in', at: 'visit' },
        ...inner,
        { frames: ['idle0', 'idle1'], fd: 420, reps: 2, skip: true, float: true, face: 'in', at: 'visit' },
        { frames: WALK, fd: 120, move: () => peekX(side), face: 'out', skip: true }
      ];
    },
    narrowSwap: () => [
      { frames: ['peek0'], fd: 500, move: () => edgeX(side), dur: 500, face: 'in', skip: true },
      { frames: ['none'], fd: 700, reps: 1, skip: true, hidden: true, at: 'edge', onEnd: () => { side = other(side); pos.x = edgeX(side); } },
      { frames: ['peek0'], fd: 500, move: () => peekX(side), dur: 600, face: 'in' }
    ]
  };
  function waveSeq() {
    const s = [];
    if (narrow) s.push({ frames: WALK, fd: 110, move: () => waveX(side), dur: 420, face: 'in' });
    s.push({ frames: ['wave1', 'wave2'], fd: 170, reps: 4, face: 'in', wave: true, at: narrow ? 'wave' : 'here', onStart: () => { speed = 1; showBubble(); } });
    s.push({ frames: ['smile'], fd: 650, reps: 1, face: 'in', wave: true, at: narrow ? 'wave' : 'here', onEnd: hideBubble });
    if (narrow) s.push({ frames: WALK, fd: 130, move: () => peekX(side), dur: 650, face: 'in' });
    return s;
  }
  let queue = [], cur = null, speed = 1, lastAct = 'enter', lastPick = '';
  function plan() {
    if (reduce) { queue = [{ frames: ['idle0'], fd: 5000, reps: 1, face: 'in', at: narrow ? 'peek' : 'home' }]; return; }
    if (lastAct !== 'idle') { lastAct = 'idle'; queue = idleSeq(); return; }
    const opts = narrow ? ['visit', 'visit', 'narrowSwap'] : ['music', 'pushups', 'coding', 'peek', 'peekSwap', 'swap', 'swap'];
    let pick = opts[0];
    for (let i = 0; i < 6; i++) { pick = opts[Math.floor(Math.random() * opts.length)]; if (pick !== lastPick) break; }
    lastPick = pick; lastAct = pick;
    queue = pick === 'peekSwap' ? ACTIVITIES.peek(true) : pick === 'peek' ? ACTIVITIES.peek(false) : ACTIVITIES[pick]();
  }
  function startPhase(p) {
    cur = { p, t: 0, rep: -1 };
    if (p.onStart) p.onStart();
    if (p.at && p.at !== 'here') pos.x = AT[p.at](side);
    cur.from = pos.x;
    if (p.move) { cur.to = p.move(); cur.dur = p.dur || Math.max(260, Math.abs(cur.to - cur.from) / 150 * 1000); }
    cur.total = p.move ? cur.dur : (p.fd || 200) * p.frames.length * (p.reps || 1);
    face_ = p.face === 'move' ? (cur.to >= cur.from ? 1 : -1) : p.face === 'out' ? (side === 'L' ? -1 : 1) : (side === 'L' ? 1 : -1);
    dirty = true;
  }
  function next() {
    if (cur && cur.p.onEnd) cur.p.onEnd();
    if (!queue.length) plan();
    startPhase(queue.shift());
  }

  /* ---------- click: finish quickly, then wave ---------- */
  const LINES = ['hi!', 'hey there!', 'hello!', 'oh, hi!', 'hire me? :)'];
  let li = 0;
  function showBubble() { bubble.textContent = LINES[li++ % LINES.length]; bubble.hidden = false; placeBubble(); }
  function hideBubble() { bubble.hidden = true; }
  function placeBubble() {
    if (bubble.hidden) return;
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    let left = face_ > 0 ? (CX + 9) * S : (CX - 9) * S - w;
    const ax = Math.round(pos.x) - CX * S;
    left = Math.max(8 - ax, Math.min(vw - 8 - ax - w, left));
    bubble.style.left = left + 'px'; bubble.style.top = ((FY - 33) * S - h) + 'px';
  }
  function wave() {
    if (!cur) return;
    if (cur.p.wave) { showBubble(); cur.t = 0; return; }
    const seq = waveSeq();
    speed = reduce ? 1 : 3.2;
    if (cur.p.loopFinish) { const cyc = cur.p.fd * cur.p.frames.length; cur.total = Math.min(cur.total, (Math.floor(cur.t / cyc) + 1) * cyc); }
    else if (cur.p.skip) cur.total = cur.t;
    queue = queue.filter(p => !p.skip).concat(seq);
    lastAct = 'wave';
  }
  hit.addEventListener('click', wave);

  /* ---------- the loop ---------- */
  let dirty = true, poseName = '', last = performance.now(), fxClock = 0, tickClock = 0, curlClock = 0, yOff = 0, lag = 0, lastScroll = scrollY;
  let nextBlink = 0, blinkEnd = 0, nextLook = 0, hitKey = '', running = false;
  function hairSway(p, pn, now) {
    if (reduce) return 0;
    if (p.move) return Math.floor(cur.t / 240) % 2 ? -1 : 0;                 // strands trail behind his steps
    if (/^push/.test(pn)) return pn === 'push2' ? 1 : 0;                      // swing forward at the bottom of a rep
    if (/^music[13]/.test(pn)) return 1;
    if (/^music/.test(pn)) return 0;
    if (pn === 'wave1' || pn === 'wave2') return pn === 'wave1' ? 1 : -1;
    return Math.round(Math.sin(now / 1300));                                  // a slow drift when he is still
  }
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    if (document.hidden || root.hidden) { running = false; return; }
    cur.t += dt * speed;
    if (cur.t >= cur.total) next();
    const p = cur.p, fd = p.fd || 200, n = p.frames.length;
    const rep = Math.floor(cur.t / (fd * n));
    if (p.onRep && rep !== cur.rep) { cur.rep = rep; p.onRep(rep); }
    const pn = p.frames[Math.floor(cur.t / fd) % n];
    if (pn !== poseName) { poseName = pn; dirty = true; }
    if (p.move) { const k = Math.min(1, cur.t / cur.dur); pos.x = cur.from + (cur.to - cur.from) * k; }
    // clocks: effects, blinking, glances, curls
    fxClock += dt; if (fxClock > 120) { fxClock = 0; stepFx(); if (p.fxTick && !reduce) p.fxTick(); if (fx.length) dirty = true; }
    tickClock += dt * speed; if (tickClock > 150) { tickClock = 0; tick++; if (/^(music|code)/.test(pn)) dirty = true; }
    const busy = !!p.move || /^(push|music|wave)/.test(pn);
    curlClock += dt * speed; if (!reduce && curlClock > (busy ? 200 : 650)) { curlClock = 0; curl = (curl + 1) % 4; dirty = true; }
    const sw = hairSway(p, pn, now); if (sw !== sway) { sway = sw; dirty = true; }
    if (now > nextBlink) { blinkOn = true; blinkEnd = now + 130; nextBlink = now + 2400 + Math.random() * 3600; dirty = true; }
    if (blinkOn && now > blinkEnd) { blinkOn = false; dirty = true; }
    if (now > nextLook) { idleLook = [0, 0, 0, 1, -1][rint(0, 4)]; nextLook = now + 1600 + Math.random() * 3000; dirty = true; }
    if (dirty) { paint(poseName); dirty = false; }
    // position: hover float, and a little inertia when you scroll
    const floatTo = p.float && !reduce ? -5 - 3 * Math.sin(now / 420) : 0;
    yOff += (floatTo - yOff) * .1;
    const dy = scrollY - lastScroll; lastScroll = scrollY;
    if (!reduce) { lag += -dy * (p.ground ? .06 : .2); lag *= .9; lag = Math.max(-36, Math.min(36, lag)); }
    const ax = Math.round(pos.x), ay = Math.round(footY() + yOff + lag);
    root.style.transform = `translate(${ax - CX * S}px, ${ay - FY * S}px)`;
    const air = Math.max(0, -yOff), sw2 = (p.hidden ? 0 : (p.shadowW || 18)) * S * (1 - Math.min(.3, air / 30));
    const scx = (p.hit === 'push' ? CX + face_ * -2 : p.shadowW === 40 ? CX + face_ * 8 : CX) * S;
    shadow.style.cssText = `left:${scx - sw2 / 2}px;top:${(FY + 1) * S - yOff - S}px;width:${sw2}px;height:${3 * S}px;opacity:${p.hidden ? 0 : .85 - Math.min(.45, air / 14)}`;
    const B = { stand: [CX - 10, FY - 33, 21, 35], sit: [CX - 12, FY - 28, 25, 30], push: [CX - 15, FY - 18, 31, 20] }[p.hit || 'stand'];
    const key = `${p.hidden}|${p.hit}|${face_}|${S}`;
    if (key !== hitKey) {
      hitKey = key; const bx = face_ > 0 ? B[0] : GW - B[0] - B[2];
      hit.style.cssText = p.hidden ? 'display:none' : `left:${bx * S}px;top:${B[1] * S}px;width:${B[2] * S}px;height:${B[3] * S}px`;
    }
    placeBubble();
    requestAnimationFrame(frame);
  }
  function run() { if (!cur || running || document.hidden || root.hidden) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', run);
  addEventListener('mini:config', run);
  addEventListener('resize', () => { const was = narrow; measure(); if (cur && !cur.p.move) pos.x = AT[cur.p.at && cur.p.at !== 'here' ? cur.p.at : (narrow ? 'peek' : 'home')](side); if (was !== narrow) { queue = []; lastAct = 'enter'; next(); } hitKey = ''; dirty = true; });

  // console easter egg: miniAli.do('pushups' | 'music' | 'coding' | 'peek' | 'swap'), miniAli.wave()
  window.miniAli = { do(name) { const f = name === 'peekSwap' ? () => ACTIVITIES.peek(true) : ACTIVITIES[name]; if (!f || !cur) return Object.keys(ACTIVITIES); queue = f(); lastAct = name; cur.total = cur.t; return name; }, wave };
  // walk in from the edge a moment after the page loads
  queue = reduce ? [] : [{ frames: WALK, fd: 120, move: () => homeX(side), face: 'in' }];
  setTimeout(() => { if (reduce) pos.x = homeX(side); next(); run(); }, 1400);
})();
