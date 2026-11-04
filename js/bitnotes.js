/* bitnotes.js — background notes that assemble out of 0s and 1s
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'bitNotes'; canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  const g = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, small = false;
  function size() {
    W = innerWidth; H = innerHeight; small = W < 640;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', size); size();

  /* colour follows the theme: re-read the accent whenever the palette changes */
  let rgb = [226, 178, 90], hot = [255, 236, 190];
  function readAccent() {
    const css = getComputedStyle(document.documentElement);
    const hex = (css.getPropertyValue('--accent') || '#e2b25a').trim().replace('#', '');
    const h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const n = parseInt(h, 16); if (isNaN(n)) return;
    rgb = [n >> 16 & 255, n >> 8 & 255, n & 255];
    hot = rgb.map(v => Math.round(v + (255 - v) * .6));
  }
  readAccent();
  new MutationObserver(readAccent).observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'style'] });

  /* turn a note glyph into a grid of cells, each cell a single 0 or 1 */
  const GLYPHS = ['♪', '♫', '♩', '♬', '𝄞'];
  const FONT = '"Noto Music", "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", serif';
  const CELL = 6;
  const cache = new Map();
  function cellsFor(ch, px) {
    const key = ch + px; if (cache.has(key)) return cache.get(key);
    // draw in a roomy box (the treble clef is much taller than its font size), then keep only the inked area
    const s = Math.ceil(px * 3), o = document.createElement('canvas'); o.width = o.height = s;
    const x = o.getContext('2d'); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `${px}px ${FONT}`; x.fillText(ch, s / 2, s / 2);
    x.strokeStyle = '#fff'; x.lineWidth = Math.max(2, px * .035); x.lineJoin = 'round'; x.strokeText(ch, s / 2, s / 2);   // thicker stems read better as digits
    const d = x.getImageData(0, 0, s, s).data, raw = [];
    let x0 = s, y0 = s, x1 = 0, y1 = 0;
    for (let y = 0; y < s; y += CELL) for (let xx = 0; xx < s; xx += CELL) {
      const cx = Math.min(s - 1, xx + (CELL >> 1)), cy = Math.min(s - 1, y + (CELL >> 1));
      if (d[(cy * s + cx) * 4 + 3] > 120) { raw.push([xx, y]); x0 = Math.min(x0, xx); y0 = Math.min(y0, y); x1 = Math.max(x1, xx); y1 = Math.max(y1, y); }
    }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;      // centre on the symbol itself, not on the box
    const out = { cells: raw.map(([xx, y]) => [xx - mx, y - my]), w: x1 - x0 + CELL, h: y1 - y0 + CELL };
    cache.set(key, out); return out;
  }

  const notes = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  /* while music plays (home piano, play my name, the studio, the terminal) the page fills up with smaller notes */
  let hotUntil = 0, lastBurst = 0;
  addEventListener('music:note', () => {
    const now = performance.now(); hotUntil = now + 2600;
    if (now - lastBurst > 380 && !document.hidden) { lastBurst = now; spawn(now, true); }
  });
  function spawn(now, mini) {
    const hot = now < hotUntil;
    const max = hot ? (small ? 6 : 10) : (small ? 3 : 5); if (notes.length >= max) return;
    const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    const size = mini ? (small ? rand(40, 58) : rand(52, 84)) : (small ? rand(70, 100) : rand(110, 170));
    const px = size * (ch === '𝄞' ? .62 : 1);   // the clef is tall, so draw it at a smaller font size
    const shape = cellsFor(ch, Math.round(px)), base = shape.cells; if (base.length < (mini ? 6 : 12)) return;   // font missing that symbol
    let x, y, tries = 0;
    const padX = shape.w / 2 + 8, padY = shape.h / 2 + 8, reach = Math.max(shape.w, shape.h);
    if (W < padX * 2 || H < padY * 2) return;
    do { x = rand(padX, W - padX); y = rand(padY, H - padY); tries++; }
    while (tries < 14 && notes.some(n => Math.hypot(n.x - x, n.y - y) < (reach + n.reach) * (mini ? .55 : .7)));
    const build = mini ? rand(500, 900) : rand(1400, 2200), hold = mini ? rand(700, 1300) : rand(1800, 3200), fade = mini ? rand(600, 1000) : rand(1200, 1900);
    const t0 = now;
    notes.push({
      x, y, t0, reach, end: t0 + build + hold + fade,
      peak: rand(.3, .44),
      cells: base.map(([dx, dy]) => ({
        dx, dy,
        on: t0 + build * Math.pow(Math.random(), .8),           // when it appears
        off: t0 + build + hold + fade * Math.random(),          // when it goes
        bit: Math.random() < .5 ? '0' : '1',
        flip: rand(80, 900)                                     // how often it re-rolls
      }))
    });
  }

  let last = 0, nextSpawn = 0;
  function frame(now) {
    if (document.hidden) { requestAnimationFrame(frame); return; }
    if (now - last < 33) { requestAnimationFrame(frame); return; }  // ~30 fps is plenty for a background
    last = now;
    if (now >= nextSpawn) { spawn(now); nextSpawn = now + (now < hotUntil ? rand(500, 1100) : rand(900, 2600)); }
    g.clearRect(0, 0, W, H);
    g.font = `500 ${CELL + 1}px "IBM Plex Mono", ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (now > n.end) { notes.splice(i, 1); continue; }
      for (const c of n.cells) {
        if (now < c.on || now > c.off) continue;
        if (Math.random() < 33 / c.flip) c.bit = c.bit === '0' ? '1' : '0';
        const age = now - c.on, left = c.off - now;
        // new cells flash bright like a terminal cursor, then settle; leaving cells flicker out
        let a = n.peak, col = rgb;
        if (age < 160) { a = Math.min(.85, n.peak * 2.6); col = hot; }
        else if (left < 260) a = n.peak * (left / 260) * (Math.random() < .3 ? .3 : 1);
        g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
        g.fillText(c.bit, n.x + c.dx, n.y + c.dy);
      }
    }
    requestAnimationFrame(frame);
  }
  const start = () => requestAnimationFrame(t => { nextSpawn = t + 400; frame(t); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
