/* notfound.js — the playable 404. A small piano and the lost-notes jingle (a tritone).
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NAMES = ["C", "D", "E", "F", "G", "A", "B", "C"];
  const MIDIS = [60, 62, 64, 65, 67, 69, 71, 72];
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

  const row = document.getElementById("lostKeys");
  const read = document.getElementById("lostRead");
  const buttons = [];
  MIDIS.forEach((m, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = NAMES[i];
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      play(m, b);
    });
    row.appendChild(b);
    buttons.push(b);
  });

  function light(btn) {
    btn.classList.add("on");
    setTimeout(() => btn.classList.remove("on"), reduce ? 40 : 180);
  }
  function play(midi, btn) {
    tone(midi, 0, 0.8);
    if (btn) light(btn);
    const name = NAMES[MIDIS.indexOf(midi)] || "";
    if (read) read.textContent = name;
  }

  /* C5 then F#5: the same unresolved tritone as the studio's 404 jingle */
  function jingle() {
    audio();
    play(72, buttons[7]);
    if (read) read.textContent = "C";
    setTimeout(() => {
      tone(78, 0, 1.1);
      if (read) read.textContent = "C · F♯";
    }, reduce ? 180 : 420);
    if (window.Achievements) Achievements.unlock("lost-found");
  }
  document.getElementById("lostJingle").addEventListener("click", jingle);

  const greet = () => {
    const ali = window.miniAli;
    if (ali && ali.say) ali.say("wrong room?");
    else setTimeout(greet, 200);
  };
  setTimeout(greet, 1600);
})();
