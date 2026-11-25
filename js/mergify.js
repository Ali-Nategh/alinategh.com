/* mergify.js — a short animated order-merge. Load css/mergify.css first.
   The file does not start itself and does not touch the page until mount().

   const demo = MergifyDemo.mount(element, {
     autoplay: false,     // play the canonical five orders immediately
     flow: [],            // optional stage names, same order as the project card
     story: null,         // optional { ship, orders: [{no,name,street,city,item,amount}] }
     reducedMotion: null, // true/false to override the OS setting
     onComplete: () => {} // the savings beat has been on screen
   });
   demo.play(); demo.replay(); demo.randomize(); demo.destroy();

   Five orders, exactly two from the same customer and address. Replay repeats
   the orders on screen. Random orders changes names, items and amounts only.
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
  "use strict";

  const STAGES = ["webhook", "queue", "worker", "merged", "saved"];
  const STAGE_LABEL = ["Webhooks", "Queue", "Worker", "Merged", "Saved"];
  const DEFAULT_FLOW = [
    "Shopify webhook",
    "Express API",
    "BullMQ queue",
    "Workers",
    "MongoDB",
  ];
  const FIRST = ["Maya", "Jonah", "Priya", "Leo", "Ava", "Noah", "Sofia", "Omar", "Hana", "Eli", "Nora", "Kai", "Ruth", "Samir", "Ivy", "Theo"];
  const LAST = ["Chen", "Hale", "Shah", "Marin", "Okoye", "Berg", "Singh", "Park", "Diaz", "Rossi", "Nguyen", "Adler", "Costa", "Ibrahim", "Walsh", "Sato"];
  const STREETS = ["Oak St", "King St W", "Queen St E", "Dundas St", "Bloor St", "College St", "Spadina Ave", "Bathurst St", "Yonge St", "Ossington Ave"];
  const CITIES = ["Toronto", "Ottawa", "Hamilton", "Mississauga", "Kingston"];
  const ITEMS = [
    ["Ceramic mug", 24],
    ["Linen shirt", 48],
    ["Pouring bowl", 36],
    ["Candle set", 22],
    ["Cloth notebook", 18],
    ["Wool scarf", 42],
    ["Stoneware vase", 54],
    ["Framed print", 38],
    ["Tea tin", 16],
    ["Record", 28],
    ["Soap trio", 20],
    ["Brass lamp", 64],
  ];
  const SHIPS = [6.5, 7.95, 8.95, 9.5, 11];
  const CANON = [
    { no: 1042, name: "Maya Chen", street: "128 Oak St", city: "Toronto", item: "Ceramic mug", amount: 24 },
    { no: 1043, name: "Jonah Hale", street: "40 King St W", city: "Toronto", item: "Linen shirt", amount: 48 },
    { no: 1044, name: "Maya Chen", street: "128 Oak St", city: "Toronto", item: "Pouring bowl", amount: 36 },
    { no: 1045, name: "Priya Shah", street: "900 Queen St E", city: "Toronto", item: "Candle set", amount: 22 },
    { no: 1046, name: "Leo Marin", street: "15 Dundas St", city: "Toronto", item: "Cloth notebook", amount: 18 },
  ];

  const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
  const money = (n) => cad.format(Math.round(Number(n) * 100) / 100);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function freshSeed() {
    if (window.crypto && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0];
    }
    return (Math.random() * 0x100000000) >>> 0;
  }

  function doorKey(o) {
    return o.name + "\n" + o.street + "\n" + o.city;
  }

  /* The lower index stays on screen. Exactly one shared door, five orders. */
  function pairIndexes(orders) {
    const groups = new Map();
    orders.forEach((o, i) => {
      const k = doorKey(o);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    });
    let found = null;
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      if (found || list.length !== 2) throw new Error("mergify story needs exactly two orders at one address");
      found = list.slice();
    }
    if (!found) throw new Error("mergify story needs two orders from one customer");
    return found;
  }

  function normalize(raw) {
    const orders = (raw.orders || []).map((o) => ({
      no: Number(o.no) || 0,
      name: String(o.name || ""),
      street: String(o.street || ""),
      city: String(o.city || ""),
      item: String(o.item || ""),
      amount: Number(o.amount) || 0,
    }));
    const story = { ship: Number(raw.ship) || 0, orders };
    if (orders.length !== 5) throw new Error("mergify story needs five orders");
    if (!(story.ship > 0)) throw new Error("mergify story needs a shipping cost");
    story.pair = pairIndexes(orders);
    return story;
  }

  function canonical() {
    return { ship: 8.95, orders: CANON.map((o) => ({ ...o })) };
  }

  function vary(amount, rng) {
    const delta = Math.round((rng() * 8 - 3) * 100) / 100;
    return Math.round(Math.max(9, amount + delta) * 100) / 100;
  }

  function randomStory(rng) {
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    };
    const people = [];
    const names = new Set();
    const doors = new Set();
    let guard = 0;
    while (people.length < 4 && guard++ < 120) {
      const name = pick(FIRST) + " " + pick(LAST);
      const street = 12 + Math.floor(rng() * 960) + " " + pick(STREETS);
      const city = pick(CITIES);
      const door = street + ", " + city;
      if (names.has(name) || doors.has(door)) continue;
      names.add(name);
      doors.add(door);
      people.push({ name, street, city });
    }
    if (people.length < 4) throw new Error("mergify: ran out of customers");
    const items = shuffle(ITEMS).slice(0, 5);
    const slots = shuffle([0, 1, 2, 3, 4]);
    const base = 2000 + Math.floor(rng() * 7000);
    const orders = new Array(5);
    slots.slice(0, 2).forEach((at, k) => {
      orders[at] = {
        no: base + at,
        name: people[0].name,
        street: people[0].street,
        city: people[0].city,
        item: items[k][0],
        amount: vary(items[k][1], rng),
      };
    });
    slots.slice(2).forEach((at, k) => {
      const person = people[k + 1];
      orders[at] = {
        no: base + at,
        name: person.name,
        street: person.street,
        city: person.city,
        item: items[k + 2][0],
        amount: vary(items[k + 2][1], rng),
      };
    });
    return { ship: pick(SHIPS), orders };
  }

  function flowOf(opts) {
    const list = opts && Array.isArray(opts.flow) ? opts.flow.map((s) => String(s).trim()).filter(Boolean) : [];
    return list.length >= 5 ? list.slice(0, 5) : DEFAULT_FLOW.slice();
  }

  function timings(reduced) {
    if (reduced) {
      return {
        orderAt: (i) => 180 + i * 720,
        queue: 4000,
        worker: 5100,
        solo: 6000,
        pair: 7000,
        merge: 8200,
        saved: 9600,
        done: 11200,
      };
    }
    return {
      orderAt: (i) => 420 + i * 1050,
      queue: 6100,
      worker: 7900,
      solo: 9100,
      pair: 10500,
      merge: 12300,
      saved: 14300,
      done: 16300,
    };
  }

  function runBeats(beats, blocked) {
    let raf = 0;
    let origin = performance.now();
    let elapsed = 0;
    let cursor = 0;
    let dead = false;
    let frozen = blocked();

    function tick(now) {
      if (dead) return;
      elapsed = now - origin;
      while (cursor < beats.length && elapsed >= beats[cursor].at) {
        const fn = beats[cursor].fn;
        cursor += 1;
        fn();
        if (dead) return;
      }
      if (cursor < beats.length) raf = requestAnimationFrame(tick);
    }

    function sync() {
      if (dead) return;
      const next = blocked();
      if (next && !frozen) {
        frozen = true;
        cancelAnimationFrame(raf);
        elapsed = performance.now() - origin;
      } else if (!next && frozen) {
        frozen = false;
        origin = performance.now() - elapsed;
        raf = requestAnimationFrame(tick);
      }
    }

    document.addEventListener("visibilitychange", sync);
    window.addEventListener("hashchange", sync);
    if (!frozen) raf = requestAnimationFrame(tick);
    return function cancel() {
      dead = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("hashchange", sync);
    };
  }

  function mount(root, opts) {
    opts = opts || {};
    if (!root || root.nodeType !== 1) throw new Error("MergifyDemo.mount needs an element");
    if (root._mergify) root._mergify.destroy();

    const flow = flowOf(opts);
    let story = normalize(opts.story || canonical());
    let reduced = false;
    let stopClock = () => {};
    let stopCount = () => {};
    let foldTimer = 0;

    const subs = [flow[0], flow[1] + " → " + flow[2], flow[3], "one order", flow[4]];
    root.innerHTML =
      '<div class="mf" role="region" aria-label="Mergify pipeline demo" tabindex="-1" aria-busy="false">' +
      '<div class="mf-chrome"><span class="mf-lights" aria-hidden="true"><i></i><i></i><i></i></span><span class="mf-chrome-title">mergify · pipeline</span></div>' +
      '<ol class="mf-rail" aria-label="Pipeline stages">' +
      STAGES.map((id, i) => '<li data-stage="' + id + '"><span class="mf-rail-h">' + STAGE_LABEL[i] + '</span><span class="mf-rail-s">' + esc(subs[i]) + "</span></li>").join("") +
      "</ol>" +
      '<div class="mf-meter" aria-hidden="true"><span></span></div>' +
      '<p class="mf-say" aria-live="polite" aria-atomic="true"></p>' +
      '<div class="mf-board"></div>' +
      '<div class="mf-saved">' +
      '<div class="mf-saved-fig"><p class="mf-saved-k">shipping saved</p><p class="mf-saved-n">' +
      money(0) +
      "</p></div>" +
      '<div class="mf-saved-copy"><p class="mf-math"></p><p class="mf-undo">Original orders stay in ' +
      esc(flow[4]) +
      ", so undo can split them again.</p></div></div>" +
      '<div class="mf-actions"><button type="button" data-mf="replay">Replay</button><button type="button" data-mf="random">Random orders</button></div>' +
      "</div>";

    const panel = root.querySelector(".mf");
    const board = root.querySelector(".mf-board");
    const sayEl = root.querySelector(".mf-say");
    const numEl = root.querySelector(".mf-saved-n");
    const mathEl = root.querySelector(".mf-math");

    function say(text) {
      if (sayEl.textContent !== text) sayEl.textContent = text;
    }

    function cardAt(i) {
      return board.querySelector('.mf-order[data-i="' + i + '"]');
    }

    function setStatus(el, text) {
      const node = el && el.querySelector(".mf-status");
      if (node) node.textContent = text;
    }

    function setStage(id) {
      panel.dataset.stage = id;
      const at = STAGES.indexOf(id);
      panel.querySelectorAll(".mf-rail li").forEach((li) => {
        const i = STAGES.indexOf(li.dataset.stage);
        li.classList.toggle("is-done", i >= 0 && i < at);
        if (li.dataset.stage === id) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
      });
    }

    function cardBody(o) {
      return (
        '<div class="mf-oh"><span class="mf-no">#' +
        o.no +
        '</span><span class="mf-ship">ship ' +
        money(story.ship) +
        "</span></div>" +
        '<p class="mf-name">' +
        esc(o.name) +
        "</p>" +
        '<p class="mf-addr">' +
        esc(o.street) +
        "<br>" +
        esc(o.city) +
        "</p>" +
        '<p class="mf-line"><span>' +
        esc(o.item) +
        "</span><span>" +
        money(o.amount) +
        "</span></p>" +
        '<p class="mf-status"></p>'
      );
    }

    function renderBoard() {
      board.innerHTML = story.orders
        .map(
          (o, i) =>
            '<div class="mf-order" data-i="' +
            i +
            '" aria-hidden="true"><span class="mf-ph" aria-hidden="true">' +
            String(i + 1).padStart(2, "0") +
            '</span><div class="mf-order-body">' +
            cardBody(o) +
            "</div></div>",
        )
        .join("");
    }

    function reveal(i) {
      const el = cardAt(i);
      if (!el) return;
      el.classList.add("is-on");
      el.removeAttribute("aria-hidden");
      setStatus(el, "From Shopify");
    }

    function markQueued() {
      board.querySelectorAll(".mf-order.is-on").forEach((el) => setStatus(el, "Queued"));
    }

    function markSolos() {
      story.orders.forEach((_, i) => {
        if (story.pair.indexOf(i) !== -1) return;
        const el = cardAt(i);
        if (!el) return;
        el.classList.add("is-solo");
        setStatus(el, "Ships alone");
      });
    }

    function markPair() {
      story.pair.forEach((i) => {
        const el = cardAt(i);
        if (!el) return;
        el.classList.add("is-pair");
        setStatus(el, "Same address");
      });
      panel.classList.add("is-scanning");
    }

    function fillMerged(el, a, b) {
      const low = a.no <= b.no ? a : b;
      const high = a.no <= b.no ? b : a;
      const body = el.querySelector(".mf-order-body");
      body.innerHTML =
        '<div class="mf-oh"><span class="mf-no">#' +
        low.no +
        " + #" +
        high.no +
        '</span><span class="mf-ship">one label</span></div>' +
        '<p class="mf-name">' +
        esc(low.name) +
        "</p>" +
        '<p class="mf-addr">' +
        esc(low.street) +
        "<br>" +
        esc(low.city) +
        "</p>" +
        '<p class="mf-line"><span>' +
        esc(low.item) +
        "</span><span>" +
        money(low.amount) +
        "</span></p>" +
        '<p class="mf-line"><span>' +
        esc(high.item) +
        "</span><span>" +
        money(high.amount) +
        "</span></p>" +
        '<p class="mf-line mf-ship-line"><span>Shipping, once</span><span>' +
        money(story.ship) +
        "</span></p>" +
        '<p class="mf-status">One shipment</p>';
    }

    function mergePair() {
      panel.classList.remove("is-scanning");
      const keep = story.pair[0];
      const drop = story.pair[1];
      const el = cardAt(keep);
      const other = cardAt(drop);
      if (!el || !other) return;
      el.classList.remove("is-pair");
      el.classList.add("is-merged");
      fillMerged(el, story.orders[keep], story.orders[drop]);
      if (reduced) {
        other.hidden = true;
        return;
      }
      other.classList.add("is-fold");
      foldTimer = window.setTimeout(() => {
        other.hidden = true;
      }, 280);
    }

    function countTo(target) {
      stopCount();
      if (reduced) {
        numEl.textContent = money(target);
        return;
      }
      const t0 = performance.now();
      let raf = 0;
      let dead = false;
      const tick = (now) => {
        if (dead) return;
        const p = Math.min(1, (now - t0) / 800);
        const eased = 1 - Math.pow(1 - p, 3);
        numEl.textContent = p >= 1 ? money(target) : money(target * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stopCount = () => {
        dead = true;
        cancelAnimationFrame(raf);
      };
    }

    function finish() {
      panel.setAttribute("aria-busy", "false");
      panel.dataset.done = "1";
      if (window.Achievements) window.Achievements.unlock("mergify-watch");
      if (typeof opts.onComplete === "function") opts.onComplete();
    }

    function blocked() {
      if (!root.isConnected) return true;
      if (document.hidden) return true;
      const home = document.getElementById("home");
      return !!(home && home.hidden);
    }

    function stop() {
      stopClock();
      stopClock = () => {};
      stopCount();
      stopCount = () => {};
      window.clearTimeout(foldTimer);
      panel.classList.remove("is-scanning", "is-saved");
      delete panel.dataset.done;
      panel.setAttribute("aria-busy", "false");
    }

    function play() {
      stop();
      reduced = typeof opts.reducedMotion === "boolean"
        ? opts.reducedMotion
        : matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.classList.toggle("is-motion", !reduced);
      renderBoard();
      setStage("webhook");
      numEl.textContent = money(0);
      mathEl.textContent = "Each of the five would ship on its own.";
      say("A shop just received five different orders.");
      panel.setAttribute("aria-busy", "true");
      const t = timings(reduced);
      const pairOrder = story.orders[story.pair[0]];
      const beats = story.orders.map((_, i) => ({ at: t.orderAt(i), fn: () => reveal(i) }));
      beats.push({
        at: t.queue,
        fn: () => {
          setStage("queue");
          markQueued();
          say("The " + flow[1] + " accepted them. Five jobs are waiting in the " + flow[2] + ".");
        },
      });
      beats.push({
        at: t.worker,
        fn: () => {
          setStage("worker");
          board.querySelectorAll(".mf-order.is-on").forEach((el) => setStatus(el, "Checking"));
          say("A worker compares the customer and the address on every job.");
        },
      });
      beats.push({ at: t.solo, fn: markSolos });
      beats.push({
        at: t.pair,
        fn: () => {
          markPair();
          say(pairOrder.name + ", " + pairOrder.street + ", " + pairOrder.city + ". Two orders, one door.");
        },
      });
      beats.push({
        at: t.merge,
        fn: () => {
          setStage("merged");
          mergePair();
          mathEl.textContent = "Two labels would be " + money(story.ship * 2) + ". Shipping once is " + money(story.ship) + ".";
          say("Those two are now one order, so the shop prints a single shipping label.");
        },
      });
      beats.push({
        at: t.saved,
        fn: () => {
          setStage("saved");
          panel.classList.add("is-saved");
          countTo(story.ship);
          say(
            "Shipping saved " +
              money(story.ship) +
              ". The other three orders still ship on their own. Written to " +
              flow[4] +
              ".",
          );
          /* the trophy toast sits on the bottom edge; keep the total above it */
          const saved = root.querySelector(".mf-saved");
          if (saved) {
            const box = saved.getBoundingClientRect();
            const limit = window.innerHeight - 120;
            if (box.bottom > limit) {
              window.scrollBy({
                top: box.bottom - limit,
                behavior: reduced ? "auto" : "smooth",
              });
            }
          }
        },
      });
      beats.push({ at: t.done, fn: finish });
      stopClock = runBeats(beats, blocked);
    }

    function replay() {
      play();
    }

    function randomize() {
      try {
        story = normalize(randomStory(mulberry32(freshSeed())));
      } catch (err) {
        story = normalize(canonical());
      }
      play();
    }

    function onClick(e) {
      const button = e.target.closest("[data-mf]");
      if (!button || !root.contains(button)) return;
      if (button.dataset.mf === "random") randomize();
      else replay();
    }

    function destroy() {
      stop();
      root.removeEventListener("click", onClick);
      root.innerHTML = "";
      if (root._mergify === api) delete root._mergify;
    }

    root.addEventListener("click", onClick);
    const api = { root, play, replay, randomize, destroy };
    root._mergify = api;
    if (opts.autoplay) play();
    return api;
  }

  window.MergifyDemo = {
    mount,
    createStory(kind, seed) {
      if (kind === "random") return normalize(randomStory(mulberry32(seed >>> 0)));
      return normalize(canonical());
    },
  };
})();
