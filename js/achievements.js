/* achievements.js — a tiny event bus, localStorage, a toast and a found-count.
   Future eggs call Achievements.register({id, name, hint}) and Achievements.unlock(id).
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const KEY = "an.achievements";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bus = new EventTarget();
  const defs = new Map();

  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "{}");
      return v && typeof v.unlocked === "object" && v.unlocked ? v : { unlocked: {} };
    } catch {
      return { unlocked: {} };
    }
  };
  const save = (v) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
  };
  let state = load();

  function register(def) {
    if (!def || !def.id || defs.has(def.id)) return;
    defs.set(def.id, {
      id: def.id,
      name: String(def.name || def.id),
      hint: String(def.hint || "Keep looking."),
    });
    paintCount();
  }

  function list() {
    return [...defs.values()].map((d) => ({
      id: d.id,
      name: d.name,
      hint: d.hint,
      unlocked: !!state.unlocked[d.id],
      at: state.unlocked[d.id] || 0,
    }));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  /* terminal output: locked rows are a hint, not the title */
  function report() {
    const items = list();
    const n = items.filter((i) => i.unlocked).length;
    const lines = items.map((i) =>
      i.unlocked
        ? `  <span class="c">✓</span>  ${esc(i.name)}`
        : `  <span class="d">·</span>  <span class="d">${esc(i.hint)}</span>`,
    );
    return `<span class="c">trophies</span>  ${n} of ${items.length}\n` + (lines.join("\n") || "  <span class=\"d\">nothing hidden here yet</span>");
  }

  const toastQ = [];
  let toastOn = false;
  let toastEl;
  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement("div");
    toastEl.className = "ach-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.hidden = true;
    toastEl.innerHTML = '<span class="kicker">unlocked</span><span class="ach-name"></span>';
    document.body.appendChild(toastEl);
    return toastEl;
  }
  function pumpToast() {
    if (toastOn || !toastQ.length) return;
    const msg = toastQ.shift();
    const el = ensureToast();
    el.querySelector(".ach-name").textContent = msg;
    el.hidden = false;
    toastOn = true;
    setTimeout(() => {
      el.hidden = true;
      toastOn = false;
      pumpToast();
    }, 2600);
  }

  function chime(kind) {
    let ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return; }
    const now = ctx.currentTime;
    const notes = kind === "level" ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880, 1174.66];
    const peak = reduce ? 0.035 : 0.07;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t0 = now + i * 0.08;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.28);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1600);
  }

  let countBtn;
  function paintCount() {
    const n = Object.keys(state.unlocked).filter((id) => defs.has(id)).length;
    if (!n) {
      if (countBtn) countBtn.hidden = true;
      return;
    }
    if (!countBtn) {
      countBtn = document.createElement("button");
      countBtn.type = "button";
      countBtn.className = "ach-count";
      countBtn.addEventListener("click", () => dispatchEvent(new Event("ach:open")));
      document.body.appendChild(countBtn);
    }
    const total = defs.size;
    countBtn.hidden = false;
    countBtn.innerHTML = `<b>${n}</b> / ${total}`;
    countBtn.setAttribute("aria-label", `${n} / ${total} trophies found. Open the terminal list.`);
    countBtn.title = "Open ~/tty and type trophies";
  }

  function unlock(id, opts) {
    if (!id || state.unlocked[id]) return false;
    const def = defs.get(id);
    state.unlocked[id] = Date.now();
    save(state);
    const name = def ? def.name : id;
    toastQ.push(name);
    pumpToast();
    chime((opts && opts.sound) || "unlock");
    paintCount();
    bus.dispatchEvent(new CustomEvent("unlock", { detail: { id, name } }));
    return true;
  }

  function has(id) { return !!state.unlocked[id]; }

  /* the set that ships with the site. New eggs can register more at runtime. */
  [
    ["sudo-hire", "Root access", "Ask the terminal very nicely to hire him."],
    ["all-themes", "Full palette", "Every colour the hall can wear."],
    ["name-in-notes", "Name in notes", "Four notes on the piano spell a name."],
    ["watched", "Front-row seat", "Stay for the show in the margin."],
    ["konami", "Developer mode", "A classic cheat code still works."],
    ["hire-console", "You rang?", "The console will take your call."],
    ["lost-found", "Found him", "Someone is lost. Play him home."],
    ["echo-name", "Echo: the name", "Repeat his name back to the piano."],
    ["echo-eight", "Echo: eight", "Stay with the echo a little longer."],
    ["echo-twelve", "Echo: encore", "Twelve notes, and you are still with it."],
  ].forEach(([id, name, hint]) => register({ id, name, hint }));

  window.Achievements = {
    register,
    unlock,
    has,
    list,
    report,
    chime,
    on(type, fn) { bus.addEventListener(type, fn); },
  };

  if (document.body) paintCount();
  else addEventListener("DOMContentLoaded", paintCount);
})();
