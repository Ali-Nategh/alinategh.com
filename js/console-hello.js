/* console-hello.js — a note for anyone who opens devtools.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const art = [
    "  ┌──────────────────────────────┐",
    "  │  ♪   Ali Nategh              │",
    "  │      software engineer       │",
    "  │      toronto                 │",
    "  └──────────────────────────────┘",
  ].join("\n");

  function email() {
    const el = document.querySelector('[data-edit="site.email"]');
    const fromDom = el && el.textContent.trim();
    return fromDom || "AliNategh.Pro@gmail.com";
  }

  function hello() {
    const css = "color:#e2b25a;font-family:ui-monospace,monospace;font-size:12px;line-height:1.45";
    console.log("%c" + art, css);
    console.log(
      "%cCurious? Good.\n\n  hire()                 this is the short version\n  miniAli.wave()         he says hi\n  miniAli.do('music')    or 'pushups' or 'coding'\n  ~/tty                  the backtick key, then `trophies`",
      "color:#a1a9c4;font-family:ui-monospace,monospace;font-size:12px;line-height:1.55",
    );
  }

  window.hire = function hire() {
    const addr = email();
    if (window.Achievements) Achievements.unlock("hire-console");
    console.log(
      "%cI'll take that as a yes. " + addr,
      "color:#e2b25a;font-family:ui-monospace,monospace;font-size:13px",
    );
    return addr;
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hello);
  else hello();
})();
