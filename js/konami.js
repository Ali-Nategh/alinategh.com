/* konami.js — up up down down left right left right b a.
   Turns on a small developer-mode overlay and waves Mini Ali over.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";
  const CODE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let pos = 0;
  function engage() {
    document.documentElement.classList.add("dev-mode");
    try { sessionStorage.setItem("an.devmode", "1"); } catch {}
    if (!document.querySelector(".dev-scan")) {
      const scan = document.createElement("div");
      scan.className = "dev-scan";
      scan.setAttribute("aria-hidden", "true");
      const badge = document.createElement("div");
      badge.className = "dev-badge";
      badge.textContent = "developer mode";
      document.body.appendChild(scan);
      document.body.appendChild(badge);
    }
    if (window.Achievements) {
      const first = Achievements.unlock("konami", { sound: "level" });
      if (!first) Achievements.chime("level");
    }
    const ali = window.miniAli;
    if (ali && ali.say) ali.say("root?");
    else if (ali && ali.do) ali.do("coding");
  }

  let devRemembered = false;
  try { devRemembered = sessionStorage.getItem("an.devmode") === "1"; } catch {}
  if (devRemembered) {
    addEventListener("DOMContentLoaded", () => {
      document.documentElement.classList.add("dev-mode");
      if (!document.querySelector(".dev-badge")) {
        const scan = document.createElement("div");
        scan.className = "dev-scan";
        scan.setAttribute("aria-hidden", "true");
        const badge = document.createElement("div");
        badge.className = "dev-badge";
        badge.textContent = "developer mode";
        document.body.appendChild(scan);
        document.body.appendChild(badge);
      }
    });
  }

  addEventListener("keydown", (e) => {
    const t = e.target;
    const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing) { pos = 0; return; }
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    if (key === CODE[pos]) {
      pos += 1;
      if (pos === CODE.length) {
        pos = 0;
        engage();
      }
    } else {
      pos = key === CODE[0] ? 1 : 0;
    }
  });
})();
