/* alios.js — AliOS, a desktop on top of the portfolio.
   Loaded only after `startx` or the boot button. A window under 900px wide
   or 640px tall gets the phone shell instead. Windows, the dock, the phone
   shell and the boot sequence live here. App bodies live in alios-apps.js.
   The terminal, studio and piano are the same elements as the rest of the site.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";

  const APPS = [
    { id: "projects", title: "Projects", mark: "Pr", w: 680, h: 500 },
    { id: "experience", title: "Experience", mark: "Ex", w: 820, h: 540 },
    { id: "terminal", title: "Terminal", mark: ">_", w: 760, h: 500 },
    { id: "studio", title: "Studio", mark: "♪", w: 960, h: 660 },
    { id: "piano", title: "Piano", mark: "Kb", w: 860, h: 560 },
    { id: "about", title: "About", mark: "An", w: 560, h: 500 },
    { id: "resume", title: "Résumé", mark: "Cv", w: 720, h: 640 },
    { id: "trophies", title: "Trophies", mark: "★", w: 680, h: 500 },
    { id: "settings", title: "Settings", mark: "St", w: 480, h: 640 },
    { id: "monitor", title: "Monitor", mark: "Sy", w: 440, h: 480 },
  ];
  const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a]));
  const BOOT_LINES = [
    "AliOS 1.0",
    "[  OK  ] mounting /hall",
    "[  OK  ] started piano.service",
    "[  OK  ] started mini-ali.service",
    "[  OK  ] reached target desktop",
  ];
  const DOWN_LINES = [
    "Broadcast message from ali@dev",
    "The system is going down.",
    "[  OK  ] stopped desktop.target",
    "[  OK  ] the hall lights dim",
  ];

  if (window.Achievements) {
    Achievements.register({ id: "alios-boot", name: "Logged in", hint: "Boot AliOS." });
    Achievements.register({ id: "alios-suite", name: "Every window", hint: "Open every AliOS app." });
    Achievements.register({ id: "alios-clef", name: "Behind the clef", hint: "The wallpaper is not empty." });
  }

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const windows = new Map();
  const memory = new Map();
  const seen = new Set();
  const themeFns = new Set();
  let shell, menu, desk, dock, layer, laneEl, bootEl, logEl, enterBtn, liveEl, frontEl, clockEl, phoneEl;
  let phoneSwipe = null;
  let miniOn = false;
  let phoneApp = null;
  let phoneCleanup = null;
  let grainStop = () => {};
  let on = false;
  let bootedAt = 0;
  let zTop = 4;
  let cascade = 0;
  let seq = 0;
  let timers = [];
  let enterAction = null;
  let clockTimer = 0;

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }
  function live(msg) {
    if (!liveEl) return;
    liveEl.textContent = "";
    setTimeout(() => {
      if (liveEl) liveEl.textContent = msg;
    }, 20);
  }
  function chime(kind) {
    dispatchEvent(new CustomEvent("alios:chime", { detail: kind }));
  }
  function askContent() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (data) => {
        if (settled) return;
        settled = true;
        resolve(data);
      };
      const timer = setTimeout(() => {
        fetch("content.json", { cache: "no-cache" })
          .then((r) => r.json())
          .then((content) => finish({
            content,
            theme: document.documentElement.dataset.palette || "navy",
            themes: [],
          }))
          .catch(() => finish(null));
      }, 80);
      dispatchEvent(new CustomEvent("alios:content", {
        detail: {
          reply(data) {
            clearTimeout(timer);
            finish(data);
          },
        },
      }));
    });
  }
  function mark(id) {
    const key = id.startsWith("proj:") ? "projects" : id;
    if (!APP_BY_ID[key] || seen.has(key)) return;
    seen.add(key);
    if (seen.size === APPS.length && window.Achievements) Achievements.unlock("alios-suite");
  }
  function stats() {
    if (miniOn) {
      const spec = phoneApp && specFor(phoneApp);
      return { open: spec ? [spec.title] : [] };
    }
    return {
      open: [...windows.values()].filter((w) => !w.el.hidden).map((w) => w.name),
    };
  }
  function wantsMini() {
    return innerWidth < 900 || innerHeight < 640;
  }
  function readCrt() {
    const theme = document.documentElement.dataset.palette || "navy";
    if (window.Crt) return window.Crt.level(theme);
    return theme === "crt" ? "full" : "off";
  }
  function applyCrt(level) {
    if (!shell || !["off", "soft", "full"].includes(level)) return;
    shell.dataset.crt = level;
    grainStop();
    grainStop = () => {};
    if (level !== "full" || !window.Crt) return;
    const canvas = shell.querySelector(".os-grain");
    grainStop = window.Crt.grain(canvas, () => {
      return !!(shell && !shell.hidden && shell.dataset.crt === "full");
    });
  }
  function paintCrtRadios(level) {
    if (!shell) return;
    shell.querySelectorAll("[data-crt]").forEach((b) => {
      b.setAttribute("aria-checked", b.dataset.crt === level ? "true" : "false");
    });
  }

  function ensure() {
    if (shell) return;
    shell = document.createElement("div");
    shell.className = "os";
    shell.hidden = true;
    shell.setAttribute("role", "region");
    shell.setAttribute("aria-label", "AliOS");
    shell.innerHTML =
      '<header class="os-menu">' +
      '<span class="os-brand">AliOS</span>' +
      '<span class="os-front"></span>' +
      '<span class="os-gap"></span>' +
      '<button type="button" class="os-theme" data-theme-menu aria-haspopup="menu" aria-expanded="false" aria-label="Change colour theme or CRT intensity">theme</button>' +
      '<time class="os-clock"></time>' +
      '<button type="button" class="tty-btn os-logout">log out</button>' +
      "</header>" +
      '<div class="os-desk">' +
      '<div class="os-icons" role="toolbar" aria-label="Desktop"></div>' +
      '<button type="button" class="os-clef" aria-label="Faint mark on the wallpaper">♪</button>' +
      '<div class="os-layer"></div>' +
      "</div>" +
      '<nav class="os-dock" aria-label="Dock"><div class="os-dock-apps"></div><div class="os-lane" aria-hidden="true"></div></nav>' +
      '<div class="os-phone" hidden>' +
      '<header class="os-phone-bar">' +
      '<button type="button" class="os-phone-back" hidden>home</button>' +
      '<span class="os-phone-title">AliOS</span>' +
      '<time class="os-phone-clock"></time>' +
      '<button type="button" class="tty-btn os-phone-out">log out</button>' +
      "</header>" +
      '<div class="os-phone-home"></div>' +
      '<div class="os-phone-app" hidden></div>' +
      '<button type="button" class="os-phone-homebar">home</button>' +
      "</div>" +
      '<canvas class="os-grain" aria-hidden="true"></canvas>' +
      '<div class="os-scan" aria-hidden="true"><div class="os-scan-lines"></div><div class="os-scan-refresh"></div></div>' +
      '<div class="os-vignette" aria-hidden="true"></div>' +
      '<div class="os-boot" hidden>' +
      '<div class="os-boot-log" role="status" aria-live="polite"></div>' +
      '<button type="button" class="os-enter">enter the desktop</button>' +
      "</div>" +
      '<div class="os-live os-sr" aria-live="polite"></div>';
    document.body.appendChild(shell);
    menu = shell.querySelector(".os-menu");
    desk = shell.querySelector(".os-desk");
    dock = shell.querySelector(".os-dock");
    layer = shell.querySelector(".os-layer");
    laneEl = shell.querySelector(".os-lane");
    bootEl = shell.querySelector(".os-boot");
    logEl = shell.querySelector(".os-boot-log");
    enterBtn = shell.querySelector(".os-enter");
    liveEl = shell.querySelector(".os-live");
    frontEl = shell.querySelector(".os-front");
    clockEl = shell.querySelector(".os-clock");
    phoneEl = shell.querySelector(".os-phone");
    buildPhoneHome();
    shell.querySelector(".os-phone-back").addEventListener("click", () => showPhone(null));
    shell.querySelector(".os-phone-homebar").addEventListener("click", () => showPhone(null));
    shell.querySelector(".os-phone-out").addEventListener("click", logout);
    const phoneAppEl = shell.querySelector(".os-phone-app");
    phoneAppEl.addEventListener("pointerdown", (e) => {
      if (e.clientX > 28) { phoneSwipe = null; return; }
      phoneSwipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    phoneAppEl.addEventListener("pointerup", (e) => {
      if (!phoneSwipe || e.pointerId !== phoneSwipe.id) return;
      if (e.clientX - phoneSwipe.x > 72 && Math.abs(e.clientY - phoneSwipe.y) < 90) showPhone(null);
      phoneSwipe = null;
    });
    phoneAppEl.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !phoneApp) return;
      const t = e.target;
      if (t.closest && t.closest("input, textarea, select, #tty")) return;
      if (t.isContentEditable) return;
      e.preventDefault();
      showPhone(null);
    });
    applyCrt(readCrt());
    const icons = shell.querySelector(".os-icons");
    const apps = shell.querySelector(".os-dock-apps");
    APPS.forEach((app) => {
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "os-icon";
      icon.dataset.app = app.id;
      icon.innerHTML = '<span class="os-mark" aria-hidden="true">' + app.mark + "</span>" + app.title;
      icon.addEventListener("click", () => open(app.id));
      icons.appendChild(icon);
      const d = document.createElement("button");
      d.type = "button";
      d.className = "os-dock-btn";
      d.dataset.dock = app.id;
      d.setAttribute("aria-pressed", "false");
      d.setAttribute("aria-label", app.title);
      d.innerHTML = '<span class="os-mark" aria-hidden="true">' + app.mark + "</span>";
      d.addEventListener("click", () => onDock(app.id));
      apps.appendChild(d);
    });
    icons.addEventListener("keydown", (e) => moveTools(e, ".os-icon"));
    apps.addEventListener("keydown", (e) => moveTools(e, ".os-dock-btn"));
    shell.querySelector(".os-logout").addEventListener("click", logout);
    shell.querySelector(".os-clef").addEventListener("click", foundClef);
    enterBtn.addEventListener("click", () => { if (enterAction) enterAction(); });
    shell.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !bootEl.hidden) {
        e.preventDefault();
        logout();
      }
    });
    addEventListener("resize", () => {
      if (!on || (bootEl && !bootEl.hidden)) return;
      const mini = wantsMini();
      if (mini !== miniOn) setMode(mini);
      else if (!mini) {
        windows.forEach((w) => {
          if (w.el.classList.contains("is-max")) fill(w);
          else clamp(w.el);
        });
      }
    });
    addEventListener("theme:used", (e) => {
      themeFns.forEach((fn) => fn(e.detail));
    });
  }

  function moveTools(e, sel) {
    const items = [...e.currentTarget.querySelectorAll(sel)];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    let n = -1;
    if (sel === ".os-icon") {
      const rows = 5;
      if (e.key === "ArrowDown") n = i + 1;
      else if (e.key === "ArrowUp") n = i - 1;
      else if (e.key === "ArrowRight") n = i + rows;
      else if (e.key === "ArrowLeft") n = i - rows;
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(document.activeElement.dataset.app);
        return;
      } else return;
      if (n < 0 || n >= items.length) return;
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % items.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + items.length) % items.length;
    else return;
    e.preventDefault();
    items[n].focus();
  }

  function setInert(busy) {
    menu.inert = busy;
    desk.inert = busy;
    dock.inert = busy;
    if (phoneEl) phoneEl.inert = busy;
  }
  function addLine(text) {
    const p = document.createElement("p");
    if (text.startsWith("[  OK")) {
      const s = document.createElement("span");
      s.className = "ok";
      s.textContent = "[  OK  ]";
      p.append(s, document.createTextNode(text.slice(8)));
    } else p.textContent = text;
    logEl.appendChild(p);
  }
  function runSequence(lines, buttonLabel, done) {
    clearTimers();
    const my = ++seq;
    bootEl.hidden = false;
    setInert(true);
    logEl.textContent = "";
    enterBtn.textContent = buttonLabel;
    const finish = () => {
      if (my !== seq) return;
      seq += 1;
      enterAction = null;
      bootEl.hidden = true;
      setInert(false);
      done();
    };
    enterAction = finish;
    if (reduce()) {
      lines.forEach(addLine);
      later(finish, 320);
    } else {
      addLine(lines[0]);
      lines.slice(1).forEach((line, i) => later(() => { if (my === seq) addLine(line); }, 240 * (i + 1)));
      later(finish, 240 * lines.length + 560);
    }
    enterBtn.focus();
  }
  function startClock() {
    const tick = () => {
      const label = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
      const phoneClock = shell && shell.querySelector(".os-phone-clock");
      clockEl.textContent = label;
      clockEl.setAttribute("aria-label", "Toronto time, " + label);
      if (phoneClock) {
        phoneClock.textContent = label;
        phoneClock.setAttribute("aria-label", "Toronto time, " + label);
      }
    };
    tick();
    clockTimer = setInterval(tick, 1000);
  }
  function stopClock() {
    clearInterval(clockTimer);
  }
  function park() {
    if (window.miniAli && miniAli.lane) miniAli.lane(laneEl);
  }
  function unpark() {
    if (window.miniAli && miniAli.lane) miniAli.lane(null);
  }

  function fit(g) {
    const lw = Math.max(320, layer.clientWidth || innerWidth);
    const lh = Math.max(200, layer.clientHeight || innerHeight - 140);
    const w = Math.min(g.w, Math.max(280, lw - 24));
    const h = Math.min(g.h, Math.max(160, lh - 24));
    const x = Math.max(8, Math.min(g.x, Math.max(8, lw - w - 8)));
    const y = Math.max(8, Math.min(g.y, Math.max(8, lh - 40)));
    return { x, y, w, h };
  }
  function place(el, g) {
    el.style.left = g.x + "px";
    el.style.top = g.y + "px";
    el.style.width = g.w + "px";
    el.style.height = g.h + "px";
  }
  function clamp(el) {
    const lw = layer.clientWidth;
    const lh = layer.clientHeight;
    const w = el.offsetWidth;
    let x = parseFloat(el.style.left) || 0;
    let y = parseFloat(el.style.top) || 0;
    x = Math.max(0, Math.min(x, Math.max(0, lw - Math.min(w, 80))));
    y = Math.max(0, Math.min(y, Math.max(0, lh - 36)));
    el.style.left = x + "px";
    el.style.top = y + "px";
  }
  function fill(w) {
    w.el.style.left = "8px";
    w.el.style.top = "8px";
    w.el.style.width = Math.max(200, layer.clientWidth - 16) + "px";
    w.el.style.height = Math.max(140, layer.clientHeight - 16) + "px";
  }
  function remember(w) {
    memory.set(w.id, {
      x: w.restored.x,
      y: w.restored.y,
      w: w.restored.w,
      h: w.restored.h,
      max: w.el.classList.contains("is-max"),
    });
  }
  function setMax(w, max) {
    const btn = w.el.querySelector('[data-act="max"]');
    if (max) {
      w.el.classList.add("is-max");
      fill(w);
    } else {
      w.el.classList.remove("is-max");
      place(w.el, fit(w.restored));
    }
    if (btn) {
      btn.setAttribute("aria-pressed", max ? "true" : "false");
      btn.setAttribute("aria-label", (max ? "Restore " : "Maximise ") + w.name);
    }
    remember(w);
  }
  function focusWin(w, steal) {
    windows.forEach((other) => other.el.classList.remove("is-focus"));
    w.el.classList.add("is-focus");
    w.el.hidden = false;
    w.el.style.zIndex = String(++zTop);
    if (frontEl) frontEl.textContent = w.name;
    syncDock();
    if (steal) {
      const title = w.el.querySelector(".os-title");
      if (title) title.focus({ preventScroll: true });
    }
  }
  function syncDock() {
    if (!shell) return;
    shell.querySelectorAll("[data-dock]").forEach((btn) => {
      const w = windows.get(btn.dataset.dock);
      const openNow = !!(w && !w.el.hidden);
      btn.setAttribute("aria-pressed", openNow ? "true" : "false");
      btn.classList.toggle("is-on", openNow);
    });
  }
  function minimise(w) {
    w.el.hidden = true;
    syncDock();
    const btn = shell.querySelector('[data-dock="' + w.id + '"]');
    if (btn) btn.focus();
    live(w.name + " minimised.");
  }
  function showWin(w) {
    w.el.hidden = false;
    if (w.el.classList.contains("is-max")) fill(w);
    focusWin(w, true);
  }

  function borrow(node, host) {
    const marker = document.createComment("alios");
    node.parentNode.insertBefore(marker, node);
    host.appendChild(node);
    return () => {
      if (marker.parentNode) marker.parentNode.insertBefore(node, marker);
      marker.remove();
    };
  }
  function buildPhoneHome() {
    const home = shell.querySelector(".os-phone-home");
    home.innerHTML = '<div class="os-phone-grid" role="list"></div>';
    const grid = home.querySelector(".os-phone-grid");
    APPS.forEach((app) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "os-phone-appbtn";
      btn.dataset.app = app.id;
      btn.innerHTML = '<span class="os-mark" aria-hidden="true">' + app.mark + "</span><span>" + app.title + "</span>";
      btn.addEventListener("click", () => showPhone(app.id));
      grid.appendChild(btn);
    });
  }
  function makeApi(setTitle) {
    return {
      open,
      content: askContent,
      setTitle: setTitle || (() => {}),
      onTheme(fn) {
        themeFns.add(fn);
        return () => themeFns.delete(fn);
      },
      stats,
      since() { return bootedAt; },
    };
  }
  function mountInto(id, body, setTitle) {
    try {
      if (id === "terminal") return embedTerminal(body);
      if (id === "studio") return embedStudio(body);
      if (id === "piano") return embedPiano(body);
      if (window.AliOSApps) return window.AliOSApps.mount(id, body, makeApi(setTitle)) || (() => {});
    } catch (err) {
      body.textContent = "This app did not open.";
      console.warn(err);
    }
    return () => {};
  }
  function showPhone(id) {
    if (!phoneEl) return;
    const home = shell.querySelector(".os-phone-home");
    const app = shell.querySelector(".os-phone-app");
    const back = shell.querySelector(".os-phone-back");
    const title = shell.querySelector(".os-phone-title");
    if (phoneCleanup) {
      try { phoneCleanup(); } catch (err) { console.warn(err); }
      phoneCleanup = null;
    }
    phoneApp = id || null;
    if (!id) {
      app.hidden = true;
      app.innerHTML = "";
      home.hidden = false;
      back.hidden = true;
      title.textContent = "AliOS";
      return;
    }
    home.hidden = true;
    app.hidden = false;
    app.innerHTML = "";
    back.hidden = false;
    const spec = specFor(id);
    title.textContent = spec ? spec.title : "AliOS";
    phoneCleanup = mountInto(id, app, (text) => { title.textContent = text; });
    mark(id);
  }
  function setMode(mini) {
    const keep = miniOn ? phoneApp : focusedDesktopApp();
    if (mini) {
      closeAll();
      miniOn = true;
      document.body.classList.add("alios-mini");
      document.body.classList.remove("alios-desk");
      phoneEl.hidden = false;
      unpark();
      showPhone(keep);
    } else {
      const app = phoneApp;
      showPhone(null);
      miniOn = false;
      document.body.classList.remove("alios-mini");
      document.body.classList.add("alios-desk");
      phoneEl.hidden = true;
      park();
      if (app) open(app);
      else if (frontEl) frontEl.textContent = "";
    }
  }
  function focusedDesktopApp() {
    let best = null;
    let z = -1;
    windows.forEach((w) => {
      if (w.dead || w.el.hidden) return;
      const zi = parseInt(w.el.style.zIndex, 10) || 0;
      if (zi >= z) { z = zi; best = w.id; }
    });
    return best;
  }

  function embedTerminal(body) {
    const tty = document.getElementById("tty");
    if (!tty) {
      body.textContent = "The terminal is not on this page.";
      return () => {};
    }
    const putBack = borrow(tty, body);
    tty.dataset.alios = "1";
    tty.setAttribute("aria-modal", "false");
    tty.hidden = false;
    dispatchEvent(new Event("alios:focus-tty"));
    return () => {
      tty.hidden = true;
      delete tty.dataset.alios;
      tty.setAttribute("aria-modal", "true");
      putBack();
    };
  }
  function embedStudio(body) {
    const el = document.getElementById("studio");
    if (!el) {
      body.textContent = "The studio is not on this page.";
      return () => {};
    }
    const putBack = borrow(el, body);
    el.hidden = false;
    dispatchEvent(new Event("alios:studio"));
    return () => {
      putBack();
      if (location.hash !== "#studio") el.hidden = true;
    };
  }
  function embedPiano(body) {
    const el = document.querySelector("#music .piano-box");
    if (!el) {
      body.textContent = "The piano is not on this page.";
      return () => {};
    }
    const putBack = borrow(el, body);
    return putBack;
  }

  function createWindow(spec) {
    const saved = memory.get(spec.id);
    const base = saved
      ? { x: saved.x, y: saved.y, w: saved.w, h: saved.h }
      : { x: 196 + (cascade % 5) * 32, y: 24 + (cascade % 5) * 28, w: spec.w, h: spec.h };
    if (!saved) cascade += 1;
    const geom = fit(base);
    const el = document.createElement("section");
    el.className = "os-win";
    el.dataset.win = spec.id;
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", spec.title);
    const lab = "oslab-" + spec.id.replace(/[^a-z0-9_-]/gi, "");
    el.innerHTML =
      '<div class="os-titlebar">' +
      '<button type="button" class="os-act" data-act="close" aria-label="Close ' + spec.title + '">×</button>' +
      '<button type="button" class="os-act" data-act="min" aria-label="Minimise ' + spec.title + '">–</button>' +
      '<button type="button" class="os-act" data-act="max" aria-label="Maximise ' + spec.title + '" aria-pressed="false">□</button>' +
      '<div class="os-title" tabindex="0" id="' + lab + '">' +
      '<span class="os-title-text"></span>' +
      '<span class="os-sr"> Arrow keys move this window. Shift and the arrow keys resize it.</span>' +
      "</div></div>" +
      '<div class="os-body"></div>';
    el.querySelector(".os-title-text").textContent = spec.title;
    layer.appendChild(el);
    const w = {
      id: spec.id,
      name: spec.title,
      el,
      restored: { x: geom.x, y: geom.y, w: geom.w, h: geom.h },
      cleanup: null,
      dead: false,
    };
    place(el, geom);
    windows.set(spec.id, w);
    if (saved && saved.max) setMax(w, true);
    el.querySelector(".os-titlebar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn || w.dead) return;
      if (btn.dataset.act === "close") closeWindow(w.id);
      else if (btn.dataset.act === "min") minimise(w);
      else setMax(w, !el.classList.contains("is-max"));
    });
    el.querySelector(".os-title").addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      setMax(w, !el.classList.contains("is-max"));
    });
    el.querySelector(".os-title").addEventListener("keydown", (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      nudge(w, e.key, e.shiftKey, e.altKey);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || w.dead) return;
      const t = e.target;
      if (t.closest("input, textarea, select, #tty")) return;
      if (t.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      closeWindow(w.id);
    });
    el.addEventListener("pointerdown", () => { if (!w.dead) focusWin(w, false); });
    el.querySelector(".os-titlebar").addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button") || w.dead) return;
      if (el.classList.contains("is-max")) {
        const box = el.getBoundingClientRect();
        const host = layer.getBoundingClientRect();
        const ratio = (e.clientX - box.left) / Math.max(1, box.width);
        setMax(w, false);
        w.restored.x = e.clientX - host.left - w.restored.w * ratio;
        w.restored.y = Math.max(0, e.clientY - host.top - 18);
        place(el, w.restored);
        clamp(el);
        w.restored.x = parseFloat(el.style.left) || 0;
        w.restored.y = parseFloat(el.style.top) || 0;
      }
      const sx = e.clientX;
      const sy = e.clientY;
      const ox = parseFloat(el.style.left) || 0;
      const oy = parseFloat(el.style.top) || 0;
      const move = (ev) => {
        if (w.dead) { up(); return; }
        w.restored.x = ox + ev.clientX - sx;
        w.restored.y = oy + ev.clientY - sy;
        place(el, w.restored);
        clamp(el);
        w.restored.x = parseFloat(el.style.left) || 0;
        w.restored.y = parseFloat(el.style.top) || 0;
      };
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        if (!w.dead) remember(w);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    });
    const body = el.querySelector(".os-body");
    w.cleanup = mountInto(spec.id, body, (text) => {
      w.name = String(text || spec.title);
      el.querySelector(".os-title-text").textContent = w.name;
      el.setAttribute("aria-label", w.name);
      if (el.classList.contains("is-focus") && frontEl) frontEl.textContent = w.name;
    });
    focusWin(w, spec.id !== "terminal");
    mark(spec.id);
    live(w.name + " open.");
    return w;
  }
  function nudge(w, key, shift, alt) {
    if (w.el.classList.contains("is-max")) setMax(w, false);
    const step = alt ? 48 : 16;
    if (shift) {
      if (key === "ArrowRight") w.restored.w += step;
      if (key === "ArrowLeft") w.restored.w -= step;
      if (key === "ArrowDown") w.restored.h += step;
      if (key === "ArrowUp") w.restored.h -= step;
      w.restored.w = Math.max(280, w.restored.w);
      w.restored.h = Math.max(160, w.restored.h);
    } else {
      if (key === "ArrowRight") w.restored.x += step;
      if (key === "ArrowLeft") w.restored.x -= step;
      if (key === "ArrowDown") w.restored.y += step;
      if (key === "ArrowUp") w.restored.y -= step;
    }
    if (!w.el.classList.contains("is-max")) {
      place(w.el, w.restored);
      clamp(w.el);
      w.restored.x = parseFloat(w.el.style.left) || 0;
      w.restored.y = parseFloat(w.el.style.top) || 0;
    }
    remember(w);
  }
  function closeWindow(id, silent) {
    const w = windows.get(id);
    if (!w || w.dead) return;
    w.dead = true;
    windows.delete(id);
    try { if (w.cleanup) w.cleanup(); } catch (err) { console.warn(err); }
    w.el.remove();
    syncDock();
    if (!miniOn && frontEl) {
      const next = focusedDesktopApp();
      frontEl.textContent = next && windows.get(next) ? windows.get(next).name : "";
    }
    if (silent) return;
    live(w.name + " closed.");
    const btn = shell.querySelector('[data-dock="' + (APP_BY_ID[id] ? id : "projects") + '"]');
    if (btn) btn.focus();
    else shell.querySelector(".os-logout").focus();
  }
  function closeAll() {
    [...windows.keys()].forEach((id) => closeWindow(id, true));
  }
  function specFor(id) {
    if (APP_BY_ID[id]) return APP_BY_ID[id];
    if (id.startsWith("proj:")) return { id, title: "Project", mark: "Pr", w: 920, h: 640 };
    return null;
  }
  function open(id) {
    if (!on || !id) return;
    if (miniOn) { showPhone(id); return; }
    const existing = windows.get(id);
    if (existing) {
      if (existing.el.hidden) showWin(existing);
      else focusWin(existing, id !== "terminal");
      if (id === "terminal") dispatchEvent(new Event("alios:focus-tty"));
      return;
    }
    const spec = specFor(id);
    if (!spec) return;
    createWindow(spec);
  }
  function onDock(id) {
    const w = windows.get(id);
    if (!w) { open(id); return; }
    if (w.el.hidden) { showWin(w); return; }
    if (w.el.classList.contains("is-focus")) minimise(w);
    else focusWin(w, true);
  }
  function foundClef() {
    dispatchEvent(new Event("alios:riff"));
    if (window.miniAli && miniAli.say) miniAli.say("behind the clef");
    if (window.Achievements) Achievements.unlock("alios-clef");
    live("You found the mark on the wallpaper.");
  }

  function arrive() {
    if (!bootedAt) bootedAt = Date.now();
    setMode(wantsMini());
    if (window.Achievements) Achievements.unlock("alios-boot");
    live(wantsMini() ? "AliOS is ready." : "AliOS is ready. Log out leaves the desktop.");
    if (!wantsMini()) {
      const first = shell.querySelector(".os-icon");
      if (first) first.focus();
    }
  }
  function boot() {
    if (on) return;
    ensure();
    on = true;
    shell.hidden = false;
    document.body.classList.add("alios");
    if (window.Crt && window.Crt.hold) window.Crt.hold("full");
    else applyCrt("full");
    dispatchEvent(new Event("alios:state"));
    startClock();
    chime("boot");
    runSequence(BOOT_LINES, wantsMini() ? "enter" : "enter the desktop", () => {
      arrive();
    });
  }
  function reboot() {
    if (!on) return;
    document.body.classList.remove("alios-desk");
    document.body.classList.remove("alios-mini");
    chime("shutdown");
    runSequence(DOWN_LINES, "skip", () => {
      chime("boot");
      runSequence(BOOT_LINES, wantsMini() ? "enter" : "enter the desktop", () => {
        setMode(wantsMini());
        live("AliOS restarted.");
      });
    });
  }
  function shutdown() {
    if (!on) return;
    document.body.classList.remove("alios-desk");
    chime("shutdown");
    runSequence(DOWN_LINES, "leave now", () => logout());
  }
  function logout() {
    if (!on) return;
    seq += 1;
    clearTimers();
    enterAction = null;
    showPhone(null);
    closeAll();
    stopClock();
    unpark();
    if (window.Crt && window.Crt.release) window.Crt.release();
    grainStop();
    on = false;
    miniOn = false;
    bootedAt = 0;
    document.body.classList.remove("alios-desk");
    document.body.classList.remove("alios-mini");
    document.body.classList.remove("alios");
    bootEl.hidden = true;
    setInert(false);
    shell.hidden = true;
    if (frontEl) frontEl.textContent = "";
    dispatchEvent(new Event("alios:state"));
    const back = document.querySelector("[data-startx]");
    if (back) back.focus();
  }

  addEventListener("alios:logout", logout);
  addEventListener("alios:shutdown", shutdown);
  addEventListener("alios:reboot", reboot);
  addEventListener("alios:open", (e) => { if (on) open(e.detail); });
  addEventListener("alios:tty-closed", () => {
    if (miniOn && phoneApp === "terminal") {
      showPhone(null);
      return;
    }
    const w = windows.get("terminal");
    if (w && !w.dead) closeWindow("terminal");
  });
  addEventListener("alios:echo", () => {
    if (!on) return;
    open("piano");
    setTimeout(() => { if (window.EchoGame) EchoGame.start(); }, 40);
  });
  addEventListener("alios:crt", (e) => {
    if (window.Crt) window.Crt.set(e.detail);
    else applyCrt(e.detail);
  });
  addEventListener("crt:change", (e) => {
    const level = e.detail;
    if (!["off", "soft", "full"].includes(level)) return;
    applyCrt(level);
    paintCrtRadios(level);
  });

  window.AliOS = { boot, logout, shutdown, reboot, open, running: () => on };
})();
