/* echo.js — Simon, on the home piano. The melody starts A–E–G–H.
   Launch from the "echo" button or the terminal (`play echo`, `echo-game`).
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NAME = [69, 76, 67, 71];
  const BAG = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
  const BEST_KEY = "an.echo.best";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let seq = [];
  let pos = 0;
  let score = 0;
  let phase = "idle";
  let token = 0;
  let bar = null;

  const best = () => {
    try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; }
  };
  const saveBest = (n) => {
    try { if (n > best()) localStorage.setItem(BEST_KEY, String(n)); } catch {}
  };

  function ensureBar() {
    const box = document.querySelector("#music .piano-box");
    if (!box) return null;
    let el = document.getElementById("echoGame");
    if (!el) {
      el = document.createElement("div");
      el.id = "echoGame";
      el.className = "echo-game";
      el.hidden = true;
      el.innerHTML =
        '<div class="echo-top"><span>echo</span><span>score <b id="echoScore">0</b></span><span>best <b id="echoBest">0</b></span><button type="button" class="echo-stop" id="echoStop">stop</button></div>' +
        '<p class="echo-status" id="echoStatus" aria-live="polite"></p>';
      const actions = box.querySelector(".piano-actions");
      box.insertBefore(el, actions ? actions.nextSibling : null);
      el.querySelector("#echoStop").addEventListener("click", stop);
    }
    bar = el;
    return el;
  }

  function paint() {
    const s = document.getElementById("echoScore");
    const b = document.getElementById("echoBest");
    if (s) s.textContent = String(score);
    if (b) b.textContent = String(Math.max(best(), score));
  }
  function status(text) {
    const el = document.getElementById("echoStatus");
    if (el) el.textContent = text;
  }

  function bindLaunch() {
    const btn = document.getElementById("echoLaunch");
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      if (document.body.classList.contains("editing")) return;
      start();
    });
  }

  function milestones() {
    const A = window.Achievements;
    if (!A) return;
    if (score >= 4) A.unlock("echo-name");
    if (score >= 8) A.unlock("echo-eight");
    if (score >= 12) A.unlock("echo-twelve");
  }

  function nextNote() {
    if (seq.length < NAME.length) return NAME[seq.length];
    let n = BAG[Math.floor(Math.random() * BAG.length)];
    const prev = seq[seq.length - 1];
    if (n === prev) n = BAG[(BAG.indexOf(n) + 5) % BAG.length];
    return n;
  }

  async function playback(my) {
    phase = "listen";
    status(seq.length === 1 ? "Listen…" : `Listen. ${seq.length} notes.`);
    const gap = reduce ? 260 : 480;
    for (let i = 0; i < seq.length; i++) {
      if (token !== my) return;
      const piano = window.SitePiano;
      if (piano) piano.play(seq[i], 0.55, "echo");
      await wait(gap);
    }
    if (token !== my) return;
    phase = "repeat";
    pos = 0;
    status(`Your turn. ${seq.length} ${seq.length === 1 ? "note" : "notes"}.`);
  }

  function round() {
    seq.push(nextNote());
    const my = token;
    playback(my);
  }

  function start(tries) {
    tries = tries || 0;
    if (!window.SitePiano) return;
    if (!ensureBar()) {
      if (tries < 12) setTimeout(() => start(tries + 1), 200);
      return;
    }
    token += 1;
    seq = [];
    pos = 0;
    score = 0;
    phase = "listen";
    bar.hidden = false;
    paint();
    bar.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    round();
  }

  function stop() {
    token += 1;
    phase = "idle";
    status(score ? `Stopped. Score ${score}. Best ${Math.max(best(), score)}.` : "Stopped.");
    paint();
  }

  addEventListener("piano:note", (e) => {
    if (phase !== "repeat") return;
    const d = e.detail || {};
    if (d.source === "echo") return;
    const m = d.midi;
    if (m !== seq[pos]) {
      phase = "over";
      token += 1;
      saveBest(score);
      paint();
      status(`Missed. Score ${score}. Best ${Math.max(best(), score)}.`);
      return;
    }
    pos += 1;
    if (pos < seq.length) return;
    score = seq.length;
    saveBest(score);
    paint();
    milestones();
    phase = "gap";
    status(`Yes. Score ${score}.`);
    const my = token;
    setTimeout(() => { if (token === my) round(); }, reduce ? 420 : 700);
  });

  addEventListener("site:render", () => {
    bindLaunch();
    if (bar && phase !== "idle" && phase !== "over") {
      const fresh = ensureBar();
      if (fresh) { fresh.hidden = false; paint(); }
    } else {
      ensureBar();
    }
  });

  window.EchoGame = { start, stop };
  if (document.getElementById("echoLaunch")) bindLaunch();
})();
