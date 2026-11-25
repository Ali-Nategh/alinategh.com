/* eggs.js — unlocks for behaviour that was already on the site.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const A = () => window.Achievements;
  const THEMES = ["navy", "burgundy", "terminal", "light", "glass", "crt"];
  const KEY = "an.ach.themes";
  const read = () => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
    catch { return new Set(); }
  };
  const write = (set) => {
    try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
  };
  const seen = read();

  addEventListener("theme:used", (e) => {
    const id = e.detail;
    if (!THEMES.includes(id) || seen.has(id)) return;
    seen.add(id);
    write(seen);
    if (THEMES.every((t) => seen.has(t))) A() && A().unlock("all-themes");
  });

  /* A E G H — A4, E5, G4, B4 (H is B in German notation) */
  const NAME = [69, 76, 67, 71];
  let heard = [];
  addEventListener("piano:note", (e) => {
    const d = e.detail || {};
    if (d.source && d.source !== "user") return;
    const m = d.midi;
    if (typeof m !== "number") return;
    heard.push(m);
    if (heard.length > NAME.length) heard = heard.slice(-NAME.length);
    if (NAME.every((n, i) => heard[i] === n)) {
      heard = [];
      A() && A().unlock("name-in-notes");
    }
  });

  addEventListener("mini:saw", () => {
    if (document.hidden) return;
    A() && A().unlock("watched");
  });
})();
