/* echo.js — Simon on five white keys, C4 through G4.
   Launch from the "echo" button or the terminal (`play echo`, `echo-game`).
   The same board works on the page and inside AliOS.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Four notes inside C–G, so the first round is still the "name" length. */
  const OPENING = [64, 67, 64, 60];
  const KEYS = [
    { midi: 60, name: "C", key: "A" },
    { midi: 62, name: "D", key: "S" },
    { midi: 64, name: "E", key: "D" },
    { midi: 65, name: "F", key: "F" },
    { midi: 67, name: "G", key: "G" },
  ];
  const BY_KEY = {
    a: 60, s: 62, d: 64, f: 65, g: 67,
    "1": 60, "2": 62, "3": 64, "4": 65, "5": 67,
    c: 60, e: 64,
  };
  const BEST_KEY = "an.echo.best";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let seq = [];
  let pos = 0;
  let score = 0;
  let phase = "idle";
  let token = 0;
  let bar = null;
  const bound = new WeakSet();

  const best = () => {
    try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; }
  };
  const saveBest = (n) => {
    try { if (n > best()) localStorage.setItem(BEST_KEY, String(n)); } catch {}
  };

  function pianoBox() {
    return document.querySelector(".piano-box");
  }

  function ensureBar() {
    const box = pianoBox();
    if (!box) return null;
    let el = document.getElementById("echoGame");
    if (!el || !box.contains(el)) {
      if (el) el.remove();
      el = document.createElement("div");
      el.id = "echoGame";
      el.className = "echo-game";
      el.hidden = true;
      el.innerHTML =
        '<div class="echo-top"><span>echo · C–G</span><span>score <b id="echoScore">0</b></span><span>best <b id="echoBest">0</b></span><button type="button" class="echo-stop" id="echoStop">stop</button></div>' +
        '<p class="echo-status" id="echoStatus" aria-live="polite"></p>' +
        '<div class="echo-keys" role="group" aria-label="Echo keys C through G">' +
        KEYS.map((k) =>
          '<button type="button" class="echo-key" data-midi="' + k.midi + '"><b>' + k.name + '</b><small>' + k.key + '</small></button>'
        ).join("") +
        "</div>";
      const actions = box.querySelector(".piano-actions");
      box.insertBefore(el, actions ? actions.nextSibling : null);
      el.querySelector("#echoStop").addEventListener("click", stop);
      el.querySelectorAll(".echo-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (phase !== "repeat") return;
          press(+btn.dataset.midi, "user");
        });
      });
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
  function setPiano(playing) {
    const piano = document.getElementById("homePiano");
    if (piano) piano.hidden = playing;
  }
  function light(midi, bad) {
    if (!bar) return;
    const btn = bar.querySelector('.echo-key[data-midi="' + midi + '"]');
    if (!btn) return;
    btn.classList.toggle("is-bad", !!bad);
    btn.classList.add("is-lit");
    setTimeout(() => btn.classList.remove("is-lit", "is-bad"), reduce() ? 80 : 180);
  }

  function bindLaunch() {
    const btn = document.getElementById("echoLaunch");
    if (!btn || bound.has(btn)) return;
    bound.add(btn);
    btn.addEventListener("click", () => {
      if (document.body.classList.contains("editing")) return;
      if (document.body.classList.contains("alios")) {
        dispatchEvent(new CustomEvent("alios:echo"));
        return;
      }
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
    if (seq.length < OPENING.length) return OPENING[seq.length];
    const bag = KEYS.map((k) => k.midi);
    let n = bag[Math.floor(Math.random() * bag.length)];
    const prev = seq[seq.length - 1];
    if (n === prev) n = bag[(bag.indexOf(n) + 2) % bag.length];
    return n;
  }

  function press(midi, source) {
    if (!KEYS.some((k) => k.midi === midi)) return;
    if (window.SitePiano) window.SitePiano.play(midi, 0.55, source || "user");
    else light(midi, false);
  }

  async function playback(my) {
    phase = "listen";
    status(seq.length === 1 ? "Listen…" : "Listen. " + seq.length + " notes.");
    const gap = reduce() ? 280 : 520;
    for (let i = 0; i < seq.length; i++) {
      if (token !== my) return;
      press(seq[i], "echo");
      light(seq[i], false);
      await wait(gap);
    }
    if (token !== my) return;
    phase = "repeat";
    pos = 0;
    status("Your turn. " + seq.length + (seq.length === 1 ? " note." : " notes."));
  }

  function round() {
    seq.push(nextNote());
    playback(token);
  }

  function start(tries) {
    tries = tries || 0;
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
    setPiano(true);
    paint();
    if (!document.body.classList.contains("alios")) {
      bar.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "center" });
    }
    const first = bar.querySelector(".echo-key");
    if (first) first.focus();
    round();
  }

  function stop() {
    token += 1;
    phase = "idle";
    setPiano(false);
    status(score ? "Stopped. Score " + score + ". Best " + Math.max(best(), score) + "." : "Stopped.");
    paint();
  }

  function playing() {
    return phase === "listen" || phase === "repeat" || phase === "gap";
  }

  addEventListener("piano:note", (e) => {
    if (phase !== "repeat") return;
    const d = e.detail || {};
    if (d.source === "echo") return;
    const m = d.midi;
    light(m, m !== seq[pos]);
    if (m !== seq[pos]) {
      phase = "over";
      token += 1;
      saveBest(score);
      paint();
      status("Missed. Score " + score + ". Best " + Math.max(best(), score) + ".");
      return;
    }
    pos += 1;
    if (pos < seq.length) return;
    score = seq.length;
    saveBest(score);
    paint();
    milestones();
    phase = "gap";
    status("Yes. Score " + score + ".");
    const my = token;
    setTimeout(() => { if (token === my) round(); }, reduce() ? 420 : 700);
  });

  addEventListener("keydown", (e) => {
    if (!playing() && phase !== "over") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.closest && t.closest("input, textarea, select") || t.isContentEditable)) return;
    const midi = BY_KEY[String(e.key || "").toLowerCase()];
    if (!midi) return;
    e.preventDefault();
    e.stopPropagation();
    if (phase !== "repeat") return;
    press(midi, "user");
  }, true);

  addEventListener("site:render", () => {
    bindLaunch();
    if (bar && playing()) {
      const fresh = ensureBar();
      if (fresh) { fresh.hidden = false; setPiano(true); paint(); }
    } else {
      ensureBar();
    }
  });

  window.EchoGame = {
    start,
    stop,
    playing,
    keys: KEYS.map((k) => k.midi),
  };
  if (document.getElementById("echoLaunch")) bindLaunch();
})();
