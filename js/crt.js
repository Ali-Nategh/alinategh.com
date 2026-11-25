/* crt.js — one CRT intensity for the page and for AliOS.
   Off, Soft, or Full. The value lives in localStorage under "an.crt"
   (a plain string, same shape as the old AliOS key). When nothing is
   stored, the green CRT theme uses Full and every other theme uses Off.
   AliOS used to write "full" on every boot, so that legacy value is not
   treated as a choice. "soft" and "off" from the old key are.
   While AliOS is open it can hold Full without writing it. An explicit
   choice clears that hold and is what both screens keep.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";

  const KEY = "an.crt";
  const LEGACY = "an.alios.crt";
  const LEVELS = ["off", "soft", "full"];
  let pageStop = () => {};
  let held = null;

  const root = document.documentElement;
  const pause = () => root.classList.toggle("crt-paused", document.hidden);
  document.addEventListener("visibilitychange", pause);
  pause();

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
    if (held) return held;
    return stored() || (theme === "crt" ? "full" : "off");
  }

  function set(next) {
    if (!LEVELS.includes(next)) return;
    held = null;
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    dispatchEvent(new CustomEvent("crt:change", { detail: next }));
  }

  /* AliOS calls hold("full") on boot and release() on exit.
     Neither writes localStorage. set() is the visitor's choice. */
  function hold(next) {
    if (!LEVELS.includes(next)) return;
    held = next;
    dispatchEvent(new CustomEvent("crt:change", { detail: next }));
  }

  function release() {
    held = null;
    const theme = document.documentElement.dataset.palette || "";
    dispatchEvent(new CustomEvent("crt:change", { detail: level(theme) }));
  }

  /* Full CRT is the scanlines and the refresh band. No grain canvas. */
  function grain() {
    return () => {};
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
    if (scan && !scan.querySelector(".crt-lines")) {
      scan.textContent = "";
      const lines = document.createElement("div");
      lines.className = "crt-lines";
      const band = document.createElement("div");
      band.className = "crt-refresh";
      scan.append(lines, band);
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

  window.Crt = { level, set, sync, grain, hold, release };
})();
