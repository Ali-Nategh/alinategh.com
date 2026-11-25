/* mergify-card.js — opens the pipeline on the BarAI card.
   The animation itself stays in js/mergify.js until someone plays it.
   `run mergify` in the terminal fires `mergify:play`.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";

  const PLAY_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5 3.2v9.6l8-4.8z"/></svg>';
  const HIDE_SVG =
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect fill="currentColor" x="3.5" y="3.5" width="9" height="9" rx="1"/></svg>';

  let inst = null;
  let loadP = null;
  let seq = 0;

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadDemo() {
    if (window.MergifyDemo) return Promise.resolve();
    if (loadP) return loadP;
    loadP = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "js/mergify.js";
      s.async = true;
      s.onload = () => (window.MergifyDemo ? resolve() : reject(new Error("start")));
      s.onerror = () => reject(new Error("load"));
      document.head.appendChild(s);
    }).catch((err) => {
      loadP = null;
      throw err;
    });
    return loadP;
  }

  function readFlow() {
    const cards = document.querySelectorAll("#projects article");
    for (const card of cards) {
      const title = card.querySelector("h3");
      if (!title || !/mergify/i.test(title.textContent || "")) continue;
      const flow = card.querySelector(".flow");
      if (!flow) return null;
      const steps = (flow.textContent || "")
        .split("→")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      return steps.length >= 5 ? steps : null;
    }
    return null;
  }

  function setButton(card, open) {
    const btn = card.querySelector("[data-mergify-play]");
    if (!btn) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    const label = btn.querySelector(".mf-play-label");
    const sub = btn.querySelector(".mf-play-sub");
    const icon = btn.querySelector(".mf-play-ico");
    if (label) label.textContent = open ? "Hide the pipeline" : "Play the pipeline";
    if (sub) sub.textContent = open ? "Close the demo." : "Five orders. Two share an address. About 15 seconds.";
    if (icon) icon.innerHTML = open ? HIDE_SVG : PLAY_SVG;
  }

  function close(card) {
    seq += 1;
    card.dataset.busy = "";
    card.classList.remove("is-open");
    if (inst) {
      inst.destroy();
      inst = null;
    }
    const stage = card.querySelector("[data-mergify-stage]");
    if (stage) {
      stage.hidden = true;
      stage.innerHTML = "";
    }
    setButton(card, false);
    const btn = card.querySelector("[data-mergify-play]");
    if (btn) btn.focus();
  }

  function fail(card) {
    card.dataset.busy = "";
    card.classList.add("is-open");
    setButton(card, true);
    const stage = card.querySelector("[data-mergify-stage]");
    if (!stage) return;
    stage.hidden = false;
    stage.innerHTML =
      '<p class="mf-loading" role="alert">The pipeline did not load. Refresh the page and try again.</p>';
  }

  async function open(card, my) {
    const stage = card.querySelector("[data-mergify-stage]");
    const btn = card.querySelector("[data-mergify-play]");
    if (!stage || !btn) return;
    card.dataset.busy = "1";
    btn.setAttribute("aria-busy", "true");
    const label = btn.querySelector(".mf-play-label");
    if (label) label.textContent = "Opening…";
    try {
      await loadDemo();
    } catch (err) {
      if (my !== seq || !card.isConnected) return;
      btn.removeAttribute("aria-busy");
      fail(card);
      return;
    }
    if (my !== seq || !card.isConnected) return;
    btn.removeAttribute("aria-busy");
    card.dataset.busy = "";
    if (inst) {
      inst.destroy();
      inst = null;
    }
    card.classList.add("is-open");
    setButton(card, true);
    stage.hidden = false;
    inst = window.MergifyDemo.mount(stage, {
      autoplay: true,
      flow: readFlow(),
    });
    const region = stage.querySelector(".mf");
    if (region) region.focus({ preventScroll: true });
  }

  function toggle(card) {
    if (!card || card.dataset.busy === "1") return;
    if (document.body.classList.contains("editing")) return;
    if (card.classList.contains("is-open")) {
      close(card);
      return;
    }
    const my = ++seq;
    open(card, my);
  }

  function cardFrom(node) {
    return node && node.closest ? node.closest("[data-mergify-card]") : null;
  }

  document.addEventListener("click", (e) => {
    const preview = e.target.closest && e.target.closest("[data-mergify-preview]");
    if (preview) {
      const card = cardFrom(preview);
      const btn = card && card.querySelector("[data-mergify-play]");
      if (btn && card.dataset.busy !== "1" && !card.classList.contains("is-open")) btn.click();
      return;
    }
    const btn = e.target.closest && e.target.closest("[data-mergify-play]");
    if (!btn) return;
    toggle(cardFrom(btn));
  });

  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const card = document.querySelector("[data-mergify-card].is-open");
    if (!card || !card.contains(document.activeElement)) return;
    e.preventDefault();
    close(card);
  });

  document.addEventListener("mergify:play", () => {
    const card = document.querySelector("[data-mergify-card]");
    if (!card || document.body.classList.contains("editing")) return;
    const studio = document.getElementById("studio");
    const go = () => {
      card.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
      if (card.classList.contains("is-open") && inst) inst.replay();
      else toggle(card);
    };
    if (studio && !studio.hidden) {
      location.hash = "experience";
      setTimeout(go, 80);
    } else go();
  });

  document.addEventListener("site:render", () => {
    if (inst && inst.root && !inst.root.isConnected) {
      inst.destroy();
      inst = null;
    }
  });
})();
