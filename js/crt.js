/* crt.js — one CRT intensity for the page and for AliOS.
   Off, Soft, or Full. The value lives in localStorage under "an.crt"
   (a plain string, same shape as the old AliOS key). When nothing is
   stored, the green CRT theme uses Full and every other theme uses Off.
   AliOS used to write "full" on every boot, so that legacy value is not
   treated as a choice. "soft" and "off" from the old key are.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";

  const KEY = "an.crt";
  const LEGACY = "an.alios.crt";
  const LEVELS = ["off", "soft", "full"];
  let pageStop = () => {};

  function stored() {
    try {
      const v = localStorage.getItem(KEY);
      if (LEVELS.includes(v)) return v;
      const legacy = localStorage.getItem(LEGACY);
      if (legacy === "off" || legacy === "soft") {
        try { localStorage.setItem(KEY, legacy); } catch { /* private mode */ }
        return legacy;
      }
    } catch { /* private mode */ }
    return null;
  }

  function level(theme) {
    return stored() || (theme === "crt" ? "full" : "off");
  }

  function set(next) {
    if (!LEVELS.includes(next)) return;
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    dispatchEvent(new CustomEvent("crt:change", { detail: next }));
  }

  /* One small canvas, stretched by CSS. Still when the visitor asked for
     less motion, and paused while the tab is hidden. */
  function grain(canvas, running) {
    if (!canvas) return () => {};
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return () => {};
    let timer = 0;
    let dead = false;
    const paint = () => {
      const w = 96;
      const h = 64;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const img = ctx.createImageData(w, h);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const n = 160 + ((Math.random() * 80) | 0);
        data[i] = n;
        data[i + 1] = n;
        data[i + 2] = n;
        data[i + 3] = 32;
      }
      ctx.putImageData(img, 0, 0);
    };
    const step = () => {
      if (dead) return;
      if (document.hidden || !running()) {
        clearTimeout(timer);
        timer = 0;
        return;
      }
      paint();
      const slow = matchMedia("(max-width: 800px)").matches;
      timer = setTimeout(step, slow ? 260 : 140);
    };
    const onVis = () => {
      if (dead) return;
      clearTimeout(timer);
      timer = 0;
      if (!document.hidden) step();
    };
    document.addEventListener("visibilitychange", onVis);
    step();
    return () => {
      dead = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }

  function ensure() {
    if (!document.body) return null;
    let scan = document.getElementById("crtScan");
    let canvas = document.getElementById("crtGrain");
    if (!scan) {
      scan = document.createElement("div");
      scan.id = "crtScan";
      scan.setAttribute("aria-hidden", "true");
      const vig = document.createElement("div");
      vig.id = "crtVignette";
      vig.setAttribute("aria-hidden", "true");
      canvas = document.createElement("canvas");
      canvas.id = "crtGrain";
      canvas.setAttribute("aria-hidden", "true");
      document.body.append(scan, vig, canvas);
    }
    const old = document.getElementById("crtVeil");
    if (old) old.remove();
    return canvas;
  }

  function sync(theme, opts) {
    const lv = level(theme);
    document.documentElement.dataset.crt = lv;
    const canvas = ensure();
    pageStop();
    pageStop = () => {};
    const hide = opts && typeof opts.hide === "function" && opts.hide();
    if (lv === "full" && canvas && !hide) {
      pageStop = grain(canvas, () => {
        if (document.documentElement.dataset.crt !== "full") return false;
        return !(opts && opts.hide && opts.hide());
      });
    }
    return lv;
  }

  window.Crt = { level, set, sync, grain };
})();
