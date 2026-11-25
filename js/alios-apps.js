/* alios-apps.js — the windows AliOS opens.
   Projects, roles, about, the résumé, trophies, settings and the monitor
   are drawn from the same content.json as the rest of the site.
   The Mergify window mounts MergifyDemo. Terminal, studio and piano are
   the real page elements, moved in by alios.js.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
  function rich(s) {
    return esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }
  function safeUrl(u) {
    try {
      const x = new URL(u, location.origin);
      if (x.protocol === "http:" || x.protocol === "https:" || x.protocol === "mailto:") return x.href;
    } catch { /* not a url */ }
    return "";
  }
  function empty(body, text) {
    body.innerHTML = '<p class="os-empty">' + esc(text) + "</p>";
  }

  let lastNote = 0;
  let heardNote = false;
  addEventListener("piano:note", () => {
    heardNote = true;
    lastNote = performance.now();
  });
  const MOODS = [
    "counting rests",
    "humming a deploy",
    "walking the dock",
    "rehearsing in C#",
    "tuning the hall",
    "waiting on a cadence",
  ];
  function mood() {
    if (heardNote && performance.now() - lastNote < 4000) return "in the music";
    return MOODS[Math.floor(Date.now() / 5000) % MOODS.length];
  }

  let mergifyP = null;
  function loadMergify() {
    if (window.MergifyDemo) return Promise.resolve();
    if (mergifyP) return mergifyP;
    mergifyP = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "js/mergify.js";
      s.async = true;
      s.onload = () => (window.MergifyDemo ? resolve() : reject(new Error("start")));
      s.onerror = () => reject(new Error("load"));
      document.head.appendChild(s);
    }).catch((err) => {
      mergifyP = null;
      throw err;
    });
    return mergifyP;
  }

  function statusHTML(s) {
    const known = ["live", "shipped", "building", "designing"];
    const k = known.includes(s) ? s : "other";
    return '<span class="os-status os-status-' + k + '">' + esc(s || "") + "</span>";
  }
  function tagsHTML(tags) {
    if (!tags || !tags.length) return "";
    return '<ul class="os-tags">' + tags.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>";
  }
  function flowHTML(steps) {
    if (!steps || !steps.length) return "";
    return '<ol class="os-flow">' + steps.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>";
  }
  function ledgerHTML(rows) {
    if (!rows || !rows.length) return "";
    return '<table class="os-ledger"><caption>Ledger</caption><thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>' +
      rows.map((r) => "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1] || "") + "</td><td>" + esc(r[2] || "") + "</td></tr>").join("") +
      "</tbody></table>";
  }
  function linkHTML(p) {
    const href = safeUrl(p.url);
    if (!href) return "";
    return '<p class="os-out"><a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(p.linkLabel || href) + "</a></p>";
  }

  function mountProjects(body, ctx) {
    let dead = false;
    empty(body, "Opening…");
    ctx.content().then((snap) => {
      if (dead) return;
      const items = snap && snap.content && snap.content.projects && snap.content.projects.items;
      if (!items || !items.length) { empty(body, "No projects on this page."); return; }
      const intro = (snap.content.projects.intro || "").replace(/\*/g, "");
      body.innerHTML =
        (intro ? '<p class="os-lead">' + esc(intro) + "</p>" : "") +
        '<div class="os-grid">' +
        items.map((p) =>
          '<button type="button" class="os-tile" data-proj="' + esc(p.id) + '"><b>' + esc(p.title) +
          "</b><small>" + esc(p.sub || "") + "</small>" + statusHTML(p.status) + "</button>",
        ).join("") +
        "</div>";
      body.querySelectorAll("[data-proj]").forEach((btn) => {
        btn.addEventListener("click", () => ctx.open("proj:" + btn.dataset.proj));
      });
    });
    return () => { dead = true; };
  }

  function mountProject(pid, body, ctx) {
    let dead = false;
    let demo = null;
    empty(body, "Opening…");
    ctx.content().then((snap) => {
      if (dead) return;
      const items = snap && snap.content && snap.content.projects && snap.content.projects.items || [];
      const p = items.find((x) => x.id === pid);
      if (!p) { empty(body, "That project is not on the page."); return; }
      ctx.setTitle(p.title || "Project");
      const mergify = /mergify/i.test(p.title || "");
      body.innerHTML =
        '<article class="os-project"><p class="os-kicker">' + esc(p.sub || "") + " " + statusHTML(p.status) + "</p>" +
        "<p>" + rich(p.desc || "") + "</p>" +
        tagsHTML(p.tags) +
        (mergify ? "" : flowHTML(p.flow)) +
        ledgerHTML(p.ledger) +
        linkHTML(p) +
        (mergify ? '<div class="os-stage" data-stage></div>' : "") +
        "</article>";
      if (!mergify) return;
      const stage = body.querySelector("[data-stage]");
      loadMergify().then(() => {
        if (dead || !stage || !stage.isConnected || !window.MergifyDemo) return;
        demo = window.MergifyDemo.mount(stage, {
          autoplay: true,
          flow: p.flow && p.flow.length ? p.flow : undefined,
        });
      }).catch(() => {
        if (stage && stage.isConnected) stage.innerHTML = '<p class="os-empty">The pipeline did not load. Refresh and open the window again.</p>';
      });
    });
    return () => {
      dead = true;
      if (demo) demo.destroy();
    };
  }

  function roleRows(C) {
    const rows = [];
    ((C.experience && C.experience.items) || []).forEach((x) => {
      rows.push({
        group: "Work",
        id: x.id,
        title: x.role,
        org: x.org,
        when: x.when,
        desc: x.desc,
        bullets: x.bullets || [],
        courses: [],
      });
    });
    ((C.education && C.education.items) || []).forEach((x) => {
      rows.push({
        group: "School",
        id: x.id,
        title: x.role,
        org: x.org,
        when: x.when,
        desc: x.desc,
        bullets: x.bullets || [],
        courses: x.courses || [],
      });
    });
    return rows;
  }
  function paintRole(panel, row) {
    panel.innerHTML =
      "<h2>" + esc(row.title || "") + "</h2>" +
      '<p class="os-kicker">' + esc(row.org || "") + (row.when ? " · " + esc(row.when) : "") + "</p>" +
      (row.desc ? "<p>" + esc(row.desc) + "</p>" : "") +
      (row.bullets.length ? "<ul>" + row.bullets.map((b) => "<li>" + esc(b) + "</li>").join("") + "</ul>" : "") +
      (row.courses.length
        ? '<table class="os-ledger"><caption>Coursework</caption><tbody>' +
          row.courses.map((c) => "<tr><td>" + esc(c[0]) + "</td><td>" + esc(c[1] || "") + "</td></tr>").join("") +
          "</tbody></table>"
        : "");
  }
  function mountExperience(body, ctx) {
    let dead = false;
    empty(body, "Opening…");
    ctx.content().then((snap) => {
      if (dead) return;
      const C = snap && snap.content;
      if (!C) { empty(body, "The page content did not load."); return; }
      const rows = roleRows(C);
      if (!rows.length) { empty(body, "No roles on this page."); return; }
      body.innerHTML = '<div class="os-finder"><div class="os-finder-side" role="tablist" aria-label="Roles" aria-orientation="vertical"></div><div class="os-finder-main" role="tabpanel" tabindex="0"></div></div>';
      const list = body.querySelector(".os-finder-side");
      const panel = body.querySelector(".os-finder-main");
      let lastGroup = "";
      const tabs = rows.map((row, i) => {
        if (row.group !== lastGroup) {
          lastGroup = row.group;
          const h = document.createElement("p");
          h.className = "os-finder-h";
          h.textContent = row.group;
          list.appendChild(h);
        }
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.id = "os-role-" + i;
        b.setAttribute("aria-selected", i === 0 ? "true" : "false");
        b.tabIndex = i === 0 ? 0 : -1;
        b.innerHTML = "<b>" + esc(row.title || "") + "</b><small>" + esc(row.org || "") + "</small>";
        b.addEventListener("click", () => select(i));
        list.appendChild(b);
        return b;
      });
      function select(i) {
        tabs.forEach((t, k) => {
          const on = k === i;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
        });
        paintRole(panel, rows[i]);
        panel.setAttribute("aria-labelledby", tabs[i].id);
      }
      list.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        let n = i;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % tabs.length;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        else return;
        e.preventDefault();
        select(n);
        tabs[n].focus();
      });
      select(0);
    });
    return () => { dead = true; };
  }

  function mountAbout(body, ctx) {
    let dead = false;
    empty(body, "Opening…");
    ctx.content().then((snap) => {
      if (dead) return;
      const C = snap && snap.content;
      if (!C || !C.site) { empty(body, "The page content did not load."); return; }
      const s = C.site;
      const contact = C.contact || {};
      const links = (contact.links || []).map((l) => {
        const href = safeUrl(l.url);
        return href ? '<a class="os-chip" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(l.label || href) + "</a>" : "";
      }).join("");
      const pings = (contact.pings || []).map((p) => "<li>" + esc(p) + "</li>").join("");
      body.innerHTML =
        '<article class="os-about"><p class="os-kicker">' + esc(s.tagline || "") + "</p>" +
        "<h2>" + esc((s.first || "") + " " + (s.last || "")) + "</h2>" +
        "<p>" + rich((C.hero && C.hero.bio) || "") + "</p>" +
        '<p class="os-kicker">' + esc(s.location || "") + (s.school ? " · " + esc(s.school) : "") + "</p>" +
        (contact.body ? "<p>" + esc(contact.body) + "</p>" : "") +
        '<p class="os-mail"><code>' + esc(s.email || "") + '</code> <button type="button" data-copy>copy</button></p>' +
        (links ? '<p class="os-links">' + links + "</p>" : "") +
        (pings ? "<ul>" + pings + "</ul>" : "") +
        "</article>";
      const btn = body.querySelector("[data-copy]");
      if (btn) btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(s.email || "");
          btn.textContent = "copied";
        } catch {
          btn.textContent = "select the address";
        }
      });
    });
    return () => { dead = true; };
  }

  function mountResume(body, ctx) {
    let dead = false;
    empty(body, "Opening…");
    ctx.content().then((snap) => {
      if (dead) return;
      const C = snap && snap.content;
      if (!C || !C.site) { empty(body, "The page content did not load."); return; }
      const s = C.site;
      const work = ((C.experience && C.experience.items) || []).map((x) =>
        "<section><h3>" + esc(x.role || "") + "</h3><p class=\"os-kicker\">" + esc(x.org || "") +
        (x.when ? " · " + esc(x.when) : "") + "</p>" +
        (x.desc ? "<p>" + esc(x.desc) + "</p>" : "") +
        ((x.bullets || []).length ? "<ul>" + x.bullets.map((b) => "<li>" + esc(b) + "</li>").join("") + "</ul>" : "") +
        "</section>",
      ).join("");
      const school = ((C.education && C.education.items) || []).map((x) =>
        "<section><h3>" + esc(x.role || "") + "</h3><p class=\"os-kicker\">" + esc(x.org || "") +
        (x.when ? " · " + esc(x.when) : "") + "</p>" +
        ((x.courses || []).length
          ? "<ul>" + x.courses.map((c) => "<li>" + esc(c[0]) + " <b>" + esc(c[1] || "") + "</b></li>").join("") + "</ul>"
          : "") +
        "</section>",
      ).join("");
      const skills = ((C.stack && C.stack.groups) || []).map((g) =>
        "<p><b>" + esc(g.name || "") + "</b> " + esc((g.items || []).map((r) => r[0]).join(", ")) + "</p>",
      ).join("");
      const projects = ((C.projects && C.projects.items) || []).map((p) =>
        "<li><b>" + esc(p.title || "") + "</b> " + esc((p.desc || "").replace(/\*/g, "")) + "</li>",
      ).join("");
      const certs = ((C.certs && C.certs.items) || []).map((c) =>
        "<li><b>" + esc(c.title || "") + "</b> " + esc(c.issuer || "") + (c.note ? " — " + esc(c.note) : "") + "</li>",
      ).join("");
      body.innerHTML =
        '<article class="os-paper">' +
        "<h2>" + esc((s.first || "") + " " + (s.last || "")) + "</h2>" +
        '<p class="os-kicker">' + esc(s.tagline || "") + " · " + esc(s.location || "") + " · " + esc(s.email || "") + "</p>" +
        (work ? "<h3>Experience</h3>" + work : "") +
        (school ? "<h3>Education</h3>" + school : "") +
        (skills ? "<h3>Skills</h3>" + skills : "") +
        (projects ? "<h3>Selected work</h3><ul>" + projects + "</ul>" : "") +
        (certs ? "<h3>Certifications</h3><ul>" + certs + "</ul>" : "") +
        "</article>";
    });
    return () => { dead = true; };
  }

  const trophyViews = new Set();
  let trophyHooked = false;
  function paintTrophies(body) {
    const items = window.Achievements ? Achievements.list() : [];
    const n = items.filter((i) => i.unlocked).length;
    body.innerHTML =
      '<div class="os-trophies"><p class="os-kicker">' + n + " of " + items.length + "</p>" +
      '<div class="os-grid">' +
      (items.length ? items.map((i) => {
        const when = i.unlocked
          ? new Date(i.at).toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
          : "";
        return '<article class="' + (i.unlocked ? "os-trophy" : "os-trophy is-locked") + '">' +
          "<b>" + esc(i.unlocked ? i.name : i.hint) + "</b>" +
          "<small>" + (i.unlocked ? "found " + esc(when) : "still hidden") + "</small></article>";
      }).join("") : '<p class="os-empty">No trophies are registered.</p>') +
      "</div></div>";
  }
  function mountTrophies(body) {
    if (!trophyHooked && window.Achievements) {
      trophyHooked = true;
      Achievements.on("unlock", () => trophyViews.forEach((fn) => fn()));
    }
    const draw = () => { if (body.isConnected) paintTrophies(body); };
    trophyViews.add(draw);
    draw();
    return () => trophyViews.delete(draw);
  }

  function mountSettings(body, ctx) {
    let dead = false;
    const off = ctx.onTheme((id) => {
      body.querySelectorAll("[data-theme]").forEach((btn) => {
        btn.setAttribute("aria-checked", btn.dataset.theme === id ? "true" : "false");
      });
    });
    empty(body, "Opening…");
    ctx.content().then((snap) => {
      if (dead) return;
      const themes = (snap && snap.themes) || [];
      const cur = document.documentElement.dataset.palette || (snap && snap.theme) || "";
      const motion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      body.innerHTML =
        '<div class="os-settings"><h2>Settings</h2>' +
        '<p class="os-lead">The wallpaper follows the theme. A choice here is remembered in this browser, same as the bar on the page.</p>' +
        '<div class="os-radios" role="radiogroup" aria-label="Colour theme">' +
        themes.map((t) =>
          '<button type="button" role="radio" data-theme="' + esc(t.id) + '" aria-checked="' + (t.id === cur) + '">' +
          '<span class="os-swatch" data-swatch="' + esc(t.id) + '" aria-hidden="true"></span>' + esc(t.label) + "</button>",
        ).join("") +
        "</div>" +
        '<p class="os-note">' + (motion
          ? "Reduced motion is on, so AliOS keeps still."
          : "Motion follows the system setting.") + "</p>" +
        '<p class="os-note">With a window title focused, the arrow keys move it. Shift and the arrow keys resize it. Escape closes it.</p>' +
        "</div>";
      const group = body.querySelector(".os-radios");
      group.querySelectorAll("[data-theme]").forEach((btn) => {
        btn.addEventListener("click", () => {
          dispatchEvent(new CustomEvent("alios:theme", { detail: btn.dataset.theme }));
        });
      });
      group.addEventListener("keydown", (e) => {
        const btns = [...group.querySelectorAll("[data-theme]")];
        const i = btns.indexOf(document.activeElement);
        if (i < 0) return;
        let n = i;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % btns.length;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + btns.length) % btns.length;
        else return;
        e.preventDefault();
        btns[n].focus();
        btns[n].click();
      });
    });
    return () => { dead = true; off(); };
  }

  function mountMonitor(body, ctx) {
    let dead = false;
    body.innerHTML =
      '<div class="os-monitor"><p class="os-kicker">not a real kernel</p><h2>System Monitor</h2>' +
      '<p class="os-mood" data-mood></p>' +
      '<p class="os-meter-label"><span>hall noise</span><span data-noise-n></span></p>' +
      '<div class="os-meter" aria-hidden="true"><span data-noise></span></div>' +
      '<p class="os-meter-label"><span>uptime</span><span data-up></span></p>' +
      '<h3>On the desk</h3><ul data-procs></ul></div>';
    const moodEl = body.querySelector("[data-mood]");
    const noiseEl = body.querySelector("[data-noise]");
    const noiseN = body.querySelector("[data-noise-n]");
    const upEl = body.querySelector("[data-up]");
    const procs = body.querySelector("[data-procs]");
    const tick = () => {
      if (dead || !body.isConnected) return;
      const m = mood();
      moodEl.textContent = "Mini Ali is " + m + ".";
      const n = Math.max(6, Math.min(96, 14 + Math.round(10 * Math.sin(Date.now() / 800)) + (performance.now() - lastNote < 2500 ? 30 : 0)));
      noiseEl.style.width = n + "%";
      noiseN.textContent = n + "%";
      const since = ctx.since();
      if (!since) upEl.textContent = "just booted";
      else {
        const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
        const mm = String(Math.floor(s / 60)).padStart(2, "0");
        const ss = String(s % 60).padStart(2, "0");
        upEl.textContent = mm + ":" + ss;
      }
      const names = ctx.stats().open;
      procs.innerHTML = names.length
        ? names.map((name) => "<li>" + esc(name) + "</li>").join("")
        : "<li>the desktop, and him</li>";
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => { dead = true; clearInterval(timer); };
  }

  window.AliOSApps = {
    mount(id, body, ctx) {
      if (id.startsWith("proj:")) return mountProject(id.slice(5), body, ctx);
      const fn = {
        projects: mountProjects,
        experience: mountExperience,
        about: mountAbout,
        resume: mountResume,
        trophies: mountTrophies,
        settings: mountSettings,
        monitor: mountMonitor,
      }[id];
      if (!fn) {
        empty(body, "This app is not installed.");
        return () => {};
      }
      return fn(body, ctx) || (() => {});
    },
  };
})();
