/* notfound.js — the playable 404. A small piano and the lost-notes jingle (a tritone).
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ctx, master;

  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(midi, when, dur) {
    const a = audio();
    const t0 = a.currentTime + (when || 0);
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = a.createOscillator();
    const o2 = a.createOscillator();
    const g = a.createGain();
    const g2 = a.createGain();
    o.type = "triangle";
    o2.type = "sine";
    o.frequency.value = f;
    o2.frequency.value = f * 2;
    g2.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.9));
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(master);
    o.start(t0);
    o2.start(t0);
    o.stop(t0 + (dur || 0.9) + 0.02);
    o2.stop(t0 + (dur || 0.9) + 0.02);
  }

  /* the same keyboard as the home page: C4 to G5, white and black keys, drag to glide */
  const WHITE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
  const BLACK = [[61, 0], [63, 1], [66, 3], [68, 4], [70, 5], [73, 7], [75, 8], [78, 10]]; // [midi, white key it sits after]
  const KEYMAP = { a: 60, s: 62, d: 64, f: 65, g: 67, h: 69, j: 71, k: 72, l: 74, ";": 76, "'": 77, w: 61, e: 63, t: 66, y: 68, u: 70, o: 73, p: 75 };
  const NOTE = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const nameOf = (m) => NOTE[m % 12];
  const row = document.getElementById("lostKeys");
  const read = document.getElementById("lostRead");
  const keyEl = {};
  WHITE.forEach((m) => {
    const d = document.createElement("div");
    d.className = "wk";
    d.dataset.m = m;
    if (m % 12 === 0) d.textContent = "C" + (Math.floor(m / 12) - 1);
    row.appendChild(d);
    keyEl[m] = d;
  });
  BLACK.forEach(([m, after]) => {
    const d = document.createElement("div");
    d.className = "bk";
    d.dataset.m = m;
    d.style.width = `calc(100% / ${WHITE.length} * .62)`;
    d.style.left = `calc(${((after + 1) * 100) / WHITE.length}% - (100% / ${WHITE.length} * .31))`;
    row.appendChild(d);
    keyEl[m] = d;
  });

  function light(m) {
    const el = keyEl[m];
    if (!el) return;
    el.classList.add("on");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("on"), reduce ? 60 : 220);
  }
  /* he finds his way home when you play the lost notes yourself: C5, then F♯5 */
  let prev = null;
  function play(midi) {
    tone(midi, 0, 0.8);
    light(midi);
    if (read) read.textContent = nameOf(midi);
    if (prev === 72 && midi === 78) found();
    prev = midi;
  }

  let down = false, lastM = null;
  const at = (x, y) => {
    const t = document.elementFromPoint(x, y);
    return t && t.dataset && t.dataset.m && row.contains(t) ? +t.dataset.m : null;
  };
  row.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    down = true;
    try { row.setPointerCapture(e.pointerId); } catch {}
    const m = at(e.clientX, e.clientY);
    if (m != null) { play(m); lastM = m; }
  });
  row.addEventListener("pointermove", (e) => {
    if (!down) return;
    const m = at(e.clientX, e.clientY);
    if (m != null && m !== lastM) { play(m); lastM = m; }
  });
  const up = () => { down = false; lastM = null; };
  row.addEventListener("pointerup", up);
  row.addEventListener("pointercancel", up);
  addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const m = KEYMAP[e.key.toLowerCase()];
    if (m != null) play(m);
  });

  /* C5 then F♯5: the same unresolved tritone as the studio's 404 jingle */
  function jingle() {
    audio();
    tone(72, 0, 0.8);
    light(72);
    if (read) read.textContent = "C";
    setTimeout(() => {
      tone(78, 0, 1.1);
      light(78);
      if (read) read.textContent = "C · F♯";
    }, reduce ? 180 : 420);
    prev = null;
    if (window.Achievements) Achievements.unlock("lost-found");
  }
  document.getElementById("lostJingle").addEventListener("click", jingle);

  function found() {
    if (read) read.textContent = "C · F♯ · you found the lost notes";
    if (window.miniAli && window.miniAli.say) window.miniAli.say("that's the way home!");
    if (window.Achievements) Achievements.unlock("lost-found");
  }

  const greet = () => {
    const ali = window.miniAli;
    if (ali && ali.say) ali.say("wrong room?");
    else setTimeout(greet, 200);
  };
  setTimeout(greet, 1600);
})();
