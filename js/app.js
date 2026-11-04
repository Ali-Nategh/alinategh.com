/* app.js — content model, rendering, editor, studio, synths, terminal, sphere
   Part of alinategh.com. Plain browser JavaScript, no build step. */
(() => {
    "use strict";
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const E = (s) =>
        String(s ?? "").replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c],
        );
    const uid = () => Math.random().toString(36).slice(2, 9);
    const LS = {
        get(k, d) {
            try {
                const v = localStorage.getItem(k);
                return v ? JSON.parse(v) : d;
            } catch {
                return d;
            }
        },
        set(k, v) {
            try {
                localStorage.setItem(k, JSON.stringify(v));
                return true;
            } catch {
                return false;
            }
        },
        del(k) {
            try {
                localStorage.removeItem(k);
            } catch {}
        },
    };

    /* =====================================================================
   CONTENT MODEL — everything on the home page comes from here.
   ===================================================================== */
    /* compact sheet notation: "q:C4+E4+G4" = quarter chord, "e.:A#4" = dotted eighth, "h:r" = half rest, "|" is just for reading */
    function P(str) {
        const L = "CDEFGAB";
        return str
            .split(/\s+/)
            .filter((t) => t && t !== "|")
            .map((t) => {
                const [dd, pp] = t.split(":"),
                    d = dd[0],
                    dot = dd.includes(".");
                if (pp === "r") return {r: true, d, dot};
                return {
                    k: pp
                        .split("+")
                        .map((x) => {
                            const m = /^([A-G])([#b]?)(\d)$/.exec(x);
                            return {
                                s: (+m[3] - 4) * 7 + L.indexOf(m[1]),
                                a: m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0,
                            };
                        })
                        .sort((x, y) => x.s - y.s),
                    d,
                    dot,
                };
            });
    }
    const LIB = (id, title, composer, note, tempo, time, voice, notes) => ({
        id,
        title,
        composer,
        note,
        tempo,
        time,
        voice,
        notes: P(notes),
    });
    /* tab icons: calligraphic A on a navy tile, three colourways (32 px for tabs, 180 px for home screens) */
    const FAVICONS = Object.fromEntries(
        ["gray", "brass", "blend"].map((v) => [
            v,
            {
                icon: `assets/icons/${v}-192.png`,
                touch: `assets/icons/${v}-180.png`,
            },
        ]),
    );
    const FAV_LABELS = {gray: "Gray", brass: "Brass", blend: "Gray to brass"};
    function applyFavicon() {
        const v = FAVICONS[C.favicon] ? C.favicon : "brass";
        [
            ["favIcon", "icon"],
            ["favTouch", "touch"],
        ].forEach(([id, k]) => {
            const l = document.getElementById(id);
            if (l && l.dataset.variant !== v) {
                l.href = FAVICONS[v][k];
                l.dataset.variant = v;
            }
        });
    }
    const DEFAULT = {
        v: 1,
        theme: "navy",
        favicon: "brass",
        mini: {
            on: "yes",
            hair: "dark brown",
            skin: "light-medium",
            shirt: "cream",
            glasses: "no",
            beard: "mustache & goatee",
        },
        site: {
            first: "Ali",
            last: "Nategh",
            initials: "AN",
            tagline: "software engineer · toronto",
            status: "open to work",
            statusLong: "full-stack · HTTP APIs · GTA",
            location: "Toronto, ON, Canada",
            school: "BCS · York University 2026",
            email: "AliNategh005@gmail.com",
        },
        hero: {
            cmd: "whoami",
            bio: "Software engineer in Toronto building *full-stack apps and HTTP APIs* with *TypeScript, Node.js and C#/.NET* on SQL Server. At BarAI I built and ran Mergify, a Shopify app rated 4.6/5. Off the clock, I write music at a *piano*.",
        },
        order: [
            {id: "music", on: true},
            {id: "experience", on: true},
            {id: "stack", on: true},
            {id: "projects", on: true},
            {id: "education", on: true},
            {id: "certs", on: true},
            {id: "contact", on: true},
        ],
        projects: {
            eyebrow: "selected work",
            title: "Projects.",
            intro: "From production SaaS to coursework. Each one taught me something I still use.",
            items: [
                {
                    id: "p1",
                    title: "Mergify",
                    sub: "Shopify SaaS · BarAI · 2023 – 2025",
                    status: "live",
                    size: "wide",
                    desc: "A Shopify-integrated app that merges orders automatically so merchants save on shipping. I built production features end to end, moved its Shopify integration from REST to GraphQL for 30% faster fetches, and shipped the undo-merge feature merchants asked for most.",
                    tags: [
                        "Node.js",
                        "Express.js",
                        "MongoDB",
                        "BullMQ",
                        "GraphQL",
                        "AWS",
                        "Docker",
                    ],
                    url: "https://apps.shopify.com/bestapper-mergify",
                    linkLabel: "view on the Shopify App Store",
                    detail: "flow",
                    flow: [
                        "Shopify webhook",
                        "Express API",
                        "BullMQ queue",
                        "Workers",
                        "MongoDB",
                    ],
                    ledger: [],
                },
                {
                    id: "p2",
                    title: "ZibaEats + Todo CRUD",
                    sub: ".NET backends · 2026 · in progress",
                    status: "building",
                    size: "wide",
                    desc: "Two .NET applications: a CRUD Todo app and the backend of ZibaEats, an e-commerce concept. HTTP endpoints with ASP.NET Core Minimal APIs, data in SQL Server through Entity Framework, organised as vertical slices with CQRS and unit tests alongside each feature.",
                    tags: [
                        "C#",
                        ".NET",
                        "Minimal APIs",
                        "Entity Framework",
                        "SQL Server",
                        "Vertical Slice",
                        "CQRS",
                    ],
                    url: "",
                    linkLabel: "",
                    detail: "flow",
                    flow: [
                        "POST /orders",
                        "PlaceOrder.Command",
                        "Validator",
                        "Handler",
                        "EF Core",
                        "SQL Server",
                    ],
                    ledger: [],
                },
                {
                    id: "p3",
                    title: "MyTones",
                    sub: "Music streaming backend · 2022 – 2023",
                    status: "shipped",
                    size: "wide",
                    desc: "A production-grade HTTP/REST API with 25+ endpoints written without a framework: JWT authentication, role-based authorization, a PostgreSQL schema through Prisma, and Redis caching. Three services run in Docker Compose behind Nginx, deployed by GitHub Actions and documented in Swagger.",
                    tags: [
                        "TypeScript",
                        "Node.js",
                        "PostgreSQL",
                        "Prisma",
                        "Redis",
                        "Docker",
                        "Nginx",
                        "GitHub Actions",
                        "Swagger",
                    ],
                    url: "",
                    linkLabel: "",
                    detail: "flow",
                    flow: [
                        "Client",
                        "Nginx",
                        "API · 25+ endpoints",
                        "Redis cache",
                        "PostgreSQL",
                    ],
                    ledger: [],
                },
                {
                    id: "p4",
                    title: "FXLedger",
                    sub: "Payments & ledger · .NET · planned",
                    status: "designing",
                    size: "wide",
                    desc: "FX quotes, payments and a double-entry ledger where every transfer writes balanced entries, so the books can be checked at any point in time.",
                    tags: ["C#", "SQL Server", "Transactions", "Idempotency"],
                    url: "",
                    linkLabel: "",
                    detail: "ledger",
                    flow: [],
                    ledger: [
                        ["customer:cad", "1000", ""],
                        ["fx:clearing", "", "1000"],
                    ],
                },
                {
                    id: "p5",
                    title: "MarketMate",
                    sub: "AI chatbot · NSBE Hacks 3rd place · Feb 2025",
                    status: "shipped",
                    size: "wide",
                    desc: "I led a team of four to build an AI chatbot that helps people price and negotiate marketplace listings. I owned the requirements, the backend API integration and the coordination, and we placed 3rd.",
                    tags: ["Cohere AI", "JavaScript", "Express.js", "React"],
                    url: "",
                    linkLabel: "",
                    detail: "none",
                    flow: [],
                    ledger: [],
                },
                {
                    id: "p6",
                    title: "3D Rendering Engine",
                    sub: "Animation & rendering · Jan 2025",
                    status: "shipped",
                    size: "wide",
                    desc: "A 3D rendering pipeline that draws 1,000+ polygons at 60 FPS, with vertex processing, rasterization, fragment shading, matrix transformations and Phong lighting.",
                    tags: ["JavaScript", "WebGL", "Linear algebra"],
                    url: "",
                    linkLabel: "",
                    detail: "flow",
                    flow: [
                        "Vertices",
                        "Matrix transforms",
                        "Rasterize",
                        "Phong shading",
                        "60 FPS",
                    ],
                    ledger: [],
                },
                {
                    id: "p7",
                    title: "OS Simulation",
                    sub: "Scheduling & memory · Feb 2026",
                    status: "shipped",
                    size: "normal",
                    desc: "An operating system simulation that compares 4 CPU scheduling algorithms across 100+ simulated processes, measuring efficiency and resource-allocation trade-offs.",
                    tags: ["C", "Linux", "Algorithms", "Memory management"],
                    url: "",
                    linkLabel: "",
                    detail: "none",
                    flow: [],
                    ledger: [],
                },
                {
                    id: "p8",
                    title: "Java Projects",
                    sub: "Spring Boot Todo · Othello · coursework & personal",
                    status: "shipped",
                    size: "normal",
                    desc: "A Todo CRUD app in Java and Spring Boot, plus an Othello game and a command-line library-management system built with classes, abstraction and inheritance.",
                    tags: ["Java", "Spring Boot", "OOP"],
                    url: "",
                    linkLabel: "",
                    detail: "none",
                    flow: [],
                    ledger: [],
                },
                {
                    id: "p9",
                    title: "Django & Flask APIs",
                    sub: "Todo backends · personal",
                    status: "shipped",
                    size: "normal",
                    desc: "Todo CRUD REST API backends built twice, once in Django and once in Flask, with create, read, update and delete endpoints in Python.",
                    tags: ["Python", "Django", "Flask", "REST"],
                    url: "",
                    linkLabel: "",
                    detail: "none",
                    flow: [],
                    ledger: [],
                },
                {
                    id: "p10",
                    title: "AllinServer",
                    sub: "Self-hosted infra",
                    status: "live",
                    size: "wide",
                    desc: "My own Ubuntu server on Oracle Cloud in Toronto. Hardened, Dockerised, and fronted by Nginx. This site is served from it.",
                    tags: ["Linux", "Docker", "Nginx", "OCI"],
                    url: "",
                    linkLabel: "",
                    detail: "none",
                    flow: [],
                    ledger: [],
                },
                {
                    id: "p11",
                    title: "Abanico Dance",
                    sub: "Client work · website",
                    status: "live",
                    size: "wide",
                    desc: "Maintaining and improving the website for a Toronto-area dance studio, from fixes and performance to new pages for its upcoming café.",
                    tags: ["Web", "SEO", "Performance"],
                    url: "https://abanicodance.com",
                    linkLabel: "visit abanicodance.com",
                    detail: "none",
                    flow: [],
                    ledger: [],
                },
            ],
        },
        experience: {
            eyebrow: "professional experience",
            title: "Experience.",
            items: [
                {
                    id: "e1",
                    role: "Software Engineer",
                    org: "BarAI (startup)",
                    when: "Mar 2023 — Apr 2025 · remote",
                    desc: "Mergify, a Shopify-integrated SaaS app for automated order merging.",
                    bullets: [
                        "Built and maintained production parts of Mergify: HTTP/REST APIs in Node.js (Express.js) and React front-end work, backed by Mocha/Chai unit tests and code reviews.",
                        "Cut Shopify fetch time by 30% by moving 16+ functions from its REST API to GraphQL, including currency conversion for order data.",
                        "Implemented BullMQ job queues handling 100+ concurrent jobs, with worker orchestration that prevents race conditions in order processing.",
                        "Built the fault-tolerant undo-merge feature, walking order trees backwards to restore original states, which helped the app reach 4.6/5 on the Shopify App Store.",
                        "Worked across SQL Server and MongoDB (Mongoose), and migrated services to AWS on EC2, S3 and Elastic Load Balancing.",
                        "Handled on-call production support and incident analysis, completed 130+ user stories at a 90%+ rate in biweekly sprints, and wrote 1,900+ lines of API, schema and architecture docs.",
                    ],
                },
                {
                    id: "e2",
                    role: "Web Developer",
                    org: "Abanico Dance Studio",
                    when: "2026 — present",
                    desc: "I keep the studio's site fast, accurate and easy to update, and I'm building out its online presence as the studio opens a café. I also perform with the studio's company on stage.",
                    bullets: [],
                },
            ],
        },
        education: {
            eyebrow: "education",
            title: "Education.",
            items: [
                {
                    id: "d1",
                    role: "Bachelor of Computer Science",
                    org: "York University",
                    when: "2026 · Toronto, ON",
                    desc: "Selected coursework and grades:",
                    bullets: [],
                    courses: [
                        ["Design and Analysis of Algorithms", "A"],
                        ["Software Design", "A"],
                        ["Professional Practice in Computing", "A"],
                        ["Introduction to Computer Security", "B"],
                        ["Introduction to AI and Logic Programming", "B"],
                        ["Introduction to 3D Computer Graphics", "B"],
                        ["Operating System Fundamentals", "C+"],
                        ["Advanced Object-Oriented Programming", "A"],
                        ["Software Tools", "A"],
                        ["Computer Organization", "A"],
                        ["Elementary Probability", "A"],
                        ["Introduction to the Theory of Computation", "B"],
                        ["Introductory Marketing", "B"],
                        ["Fundamentals of Data Structures", "D+"],
                        ["Introduction to Object-Oriented Programming", "A"],
                        ["Introduction to Logic for Computer Science", "A"],
                        ["Reasoning About Morality and Values", "A+"],
                        ["Discrete Math for Computer Science", "B"],
                        ["Research Directions in Computing", "P"],
                    ],
                },
            ],
        },
        certs: {
            eyebrow: "certifications & awards",
            title: "Certifications.",
            items: [
                {
                    id: "c1",
                    badge: "A+",
                    title: "CompTIA A+",
                    issuer: "CompTIA",
                    when: "",
                    note: "Hardware, operating systems, troubleshooting and IT support fundamentals.",
                },
                {
                    id: "c2",
                    badge: "N+",
                    title: "CompTIA Network+",
                    issuer: "CompTIA",
                    when: "",
                    note: "Networking concepts, infrastructure, network operations and security.",
                },
                {
                    id: "c3",
                    badge: "★",
                    title: "Student Excellence Bursary Award",
                    issuer: "York University",
                    when: "",
                    note: "Awarded for academic standing, with a 3.2+ GPA requirement.",
                },
            ],
        },
        stack: {
            eyebrow: "technical skills",
            title: "What I work with.",
            intro: "Grouped the way I use them, from the language up to the server it runs on.",
            groups: [
                {
                    id: "g1",
                    name: "Languages",
                    items: [
                        ["TypeScript", ""],
                        ["JavaScript", ""],
                        ["C#", ""],
                        ["SQL", ""],
                        ["Java", ""],
                        ["Python", ""],
                        ["C", ""],
                        ["HTML / CSS", ""],
                    ],
                },
                {
                    id: "g2",
                    name: "HTTP APIs & Backend",
                    items: [
                        ["Node.js", ""],
                        ["Express.js", ""],
                        ["ASP.NET Core", ""],
                        ["Minimal APIs", ""],
                        ["ASP.NET MVC", ""],
                        ["Blazor", ""],
                        ["REST & HTTP APIs", ""],
                        ["GraphQL", ""],
                        ["JWT auth", ""],
                        ["Webhooks", ""],
                        ["Spring Boot", ""],
                        ["Django", ""],
                        ["Flask", ""],
                    ],
                },
                {
                    id: "g3",
                    name: "Databases",
                    items: [
                        ["SQL Server", ""],
                        ["PostgreSQL", ""],
                        ["MongoDB", ""],
                        ["Mongoose", ""],
                        ["Redis", ""],
                        ["Entity Framework", ""],
                        ["Prisma", ""],
                        ["Schema design", ""],
                    ],
                },
                {
                    id: "g4",
                    name: "Architecture & Patterns",
                    items: [
                        ["SOLID", ""],
                        ["MVC", ""],
                        ["Vertical Slice", ""],
                        ["CQRS", ""],
                        ["Dependency Injection", ""],
                        ["Factory", ""],
                        ["Singleton", ""],
                        ["Separation of concerns", ""],
                    ],
                },
                {
                    id: "g5",
                    name: "Practices",
                    items: [
                        ["Agile / Scrum", ""],
                        ["Unit testing", ""],
                        ["Mocha", ""],
                        ["Chai", ""],
                        ["xUnit", ""],
                        ["Code reviews", ""],
                        ["CI/CD", ""],
                        ["GitHub Actions", ""],
                        ["Incident analysis", ""],
                        ["On-call support", ""],
                    ],
                },
                {
                    id: "g6",
                    name: "Tools & Cloud",
                    items: [
                        ["AWS", ""],
                        ["EC2", ""],
                        ["S3", ""],
                        ["ELB", ""],
                        ["Docker", ""],
                        ["Nginx", ""],
                        ["Linux", ""],
                        ["Git", ""],
                        ["GitLab", ""],
                        ["Swagger / OpenAPI", ""],
                        ["BullMQ", ""],
                        ["React", ""],
                        ["WebGL", ""],
                    ],
                },
            ],
        },
        music: {
            eyebrow: "off the clock",
            title: "The other",
            titleEm: "instrument.",
            body: "I'm a composer, producer and singer. Piano came first, twelve years ago, and the rest followed. I've performed on stage with Abanico Dance Studio, and I may play a show at the opening of its new café.",
            tags: [
                "piano · 12 yrs",
                "production · 4 yrs",
                "composition · 3 yrs",
                "guitar · 2 yrs",
                "singing · 2 yrs",
                "flute",
                "xylophone",
            ],
            cta: "open the studio",
            phraseLabel: "play my name ♪",
            phraseHint:
                "The phrase spells my name in notes: A, E, G and H, which is B in German notation.",
        },
        contact: {
            eyebrow: "contact",
            title: "Start a session.",
            body: "I'm looking for junior and full-stack developer roles in the Greater Toronto Area, hybrid or on-site. The fastest way to reach me is email.",
            links: [
                {
                    id: "l1",
                    label: "linkedin",
                    url: "https://www.linkedin.com/in/alinategh",
                },
                {
                    id: "l2",
                    label: "github",
                    url: "https://github.com/Ali-Nategh",
                },
            ],
            pings: [
                "happy to chat",
                "replies within a day",
                "available to start soon",
            ],
        },
        sphere: {
            tags: [
                "TypeScript",
                "Node.js",
                "C#",
                ".NET",
                "SQL Server",
                "PostgreSQL",
                "MongoDB",
                "Redis",
                "GraphQL",
                "Docker",
                "AWS",
                "♪",
            ],
        },
        footer: {
            line: "You've reached the end of the page. The terminal has more.",
            copy: "© 2026 Ali Nategh · hand-built, self-hosted",
        },
        nav: {
            cta: "get in touch",
            projects: "projects",
            experience: "experience",
            education: "education",
            certs: "certifications",
            stack: "skills",
            music: "music",
            studio: "studio ♪",
            terminal: "terminal",
            topStudio: "♪ studio",
            topTty: "~/tty",
            footTty: "open ~/tty",
        },
        studio: {
            back: "back to the site",
            backSub: "ali nategh · studio",
            eyebrow: "studio",
            title1: "The",
            titleEm: "music",
            title2: "room.",
            intro: "Write a melody on the staff, choose an instrument, and press play. Click the staff or the keyboard to add notes, drag a note up or down to change its pitch, and sign it with your name before you save.",
            sheetsTitle: "My sheets",
            instruments: [
                {
                    id: "piano",
                    name: "Piano",
                    note: "Struck and decaying. Triangle wave with a closing filter.",
                },
                {
                    id: "guitar",
                    name: "Guitar",
                    note: "Plucked string, modelled with Karplus–Strong.",
                },
                {
                    id: "flute",
                    name: "Flute",
                    note: "Breath noise, a pure tone, slow vibrato.",
                },
                {
                    id: "xylophone",
                    name: "Xylophone",
                    note: "Bright mallet hit with a short ring.",
                },
                {
                    id: "voice",
                    name: "Voice",
                    note: 'Sawtooth through vowel formants, sung "ah".',
                },
            ],
            example: null,
            linksLabel: "Hear more of my music",
            links: [
                {
                    id: "m0",
                    label: "▶ Spotify · Ali Nategh",
                    url: "https://open.spotify.com/artist/1CHSJfFKd4UCEoLyvLUkPx?si=vjbDSP1OQ8WdtowOOZJjeg&utm_source=copy-link",
                },
                {
                    id: "m1",
                    label: "▶ YouTube · @AllinBeats",
                    url: "https://www.youtube.com/@AllinBeats",
                },
                {
                    id: "m2",
                    label: "Instagram · @allin.beats",
                    url: "https://www.instagram.com/allin.beats",
                },
            ],
            libTitle: "Sheet library",
            libIntro:
                "Open any of these to play it or use it as a starting point. Opening one gives you your own copy to edit.",
            library: [
                LIB(
                    "lb1",
                    "Signature (A–E–G–H)",
                    "Ali Nategh",
                    "The notes hidden in my name",
                    84,
                    "4/4",
                    "piano",
                    "q:A4 q:E5 q:G4 q:B4 | e:A4 e:E5 e:G4 e:B4 h:A4+B4+E5 | w:A3+E4+B4",
                ),
                LIB(
                    "lb2",
                    "Deploy Succeeded",
                    "",
                    "Green checks all the way down",
                    132,
                    "4/4",
                    "piano",
                    "e:G4 e:C5 e:E5 q:G5 e:E5 q:G5 | w:C5+E5+G5",
                ),
                LIB(
                    "lb3",
                    "Build Failed",
                    "",
                    "Wah, wah, wah, waaah",
                    66,
                    "4/4",
                    "voice",
                    "q:G4 q:r q:F#4 q:r | q:F4 q:r h:E4",
                ),
                LIB(
                    "lb4",
                    "404",
                    "",
                    "Not found: a tritone that never resolves",
                    80,
                    "4/4",
                    "xylophone",
                    "h:C5 h:F#5 | w:C5+F#5",
                ),
                LIB(
                    "lb5",
                    "Merge Conflict",
                    "",
                    "Two branches, one tune, half a step apart",
                    96,
                    "4/4",
                    "piano",
                    "q:C4+Db4 q:E4+F4 q:G4+Ab4 q:E4+F4 | h:C5+Db5 h:G4+Ab4 | w:C4+Db4",
                ),
                LIB(
                    "lb6",
                    "Power On",
                    "",
                    "The boot chime from sudo reboot",
                    100,
                    "4/4",
                    "piano",
                    "e:C4 e:G4 e:D5 e:E5 h:C5+E5+G5 | w:C5+E5+G5",
                ),
                LIB(
                    "lb7",
                    "Power Off",
                    "",
                    "And the way back down",
                    100,
                    "4/4",
                    "piano",
                    "e:G5 e:D5 e:B4 e:G4 h:C4+G4 | w:C4+G4",
                ),
                LIB(
                    "lb8",
                    "Für Elise (opening)",
                    "Ludwig van Beethoven",
                    "Public domain, 1810",
                    70,
                    "3/8",
                    "piano",
                    "q:r s:E5 s:D#5 | s:E5 s:D#5 s:E5 s:B4 s:D5 s:C5 | e:A4 s:r s:C4 s:E4 s:A4 | e:B4 s:r s:E4 s:G#4 s:B4 | e:C5 s:r s:E4 s:E5 s:D#5 | s:E5 s:D#5 s:E5 s:B4 s:D5 s:C5 | e:A4 s:r s:C4 s:E4 s:A4 | e:B4 s:r s:E4 s:C5 s:B4 | q.:A4",
                ),
                LIB(
                    "lb9",
                    "Gymnopédie No. 1 (opening)",
                    "Erik Satie",
                    "Public domain, 1888",
                    72,
                    "3/4",
                    "piano",
                    "q:r h:B3+D4+F#4 | q:r h:A3+C#4+F#4 | q:r h:B3+D4+F#4 | q:r h:A3+C#4+F#4 | q:r q:F#5 q:A5 | q:G5 q:F#5 q:C#5 | q:B4 q:C#5 q:D5 | h.:A4 | h.:F#4",
                ),
                LIB(
                    "lb10",
                    "In the Hall of the Mountain King (opening)",
                    "Edvard Grieg",
                    "Public domain, 1875",
                    120,
                    "4/4",
                    "piano",
                    "e:B3 e:C#4 e:D4 e:E4 e:F#4 e:D4 q:F#4 | e:F4 e:C#4 q:F4 e:E4 e:C4 q:E4 | e:B3 e:C#4 e:D4 e:E4 e:F#4 e:D4 e:F#4 e:B4 | e:A4 e:F#4 e:D4 e:F#4 h:A4",
                ),
                LIB(
                    "lb11",
                    "The Entertainer (opening)",
                    "Scott Joplin",
                    "Public domain, 1902 · simplified",
                    80,
                    "2/4",
                    "piano",
                    "q.:r s:D4 s:D#4 | s:E4 e:C5 s:E4 e:C5 s:E4 s:C5 | q:C5 s:C5 s:D5 s:D#5 s:E5 | s:C5 s:D5 e:E5 s:B4 e:D5 s:C5 | q:C5 q:r",
                ),
                LIB(
                    "lb12",
                    "Shave and a Haircut",
                    "Traditional",
                    "Knock knock. The last two notes are the answer.",
                    120,
                    "4/4",
                    "piano",
                    "q:C5 e:G4 e:G4 q:A4 q:G4 | q:r q:B4 q:C5 q:r",
                ),
            ],
        },
        tty: {
            welcome:
                "Welcome to {first}'s terminal. Type *help* to see what you can do here.",
            commands: [
                {
                    id: "t1",
                    name: "coffee",
                    desc: "refuel",
                    out: "Brewing… ☕\n*Done.* Back to work.",
                    action: "nothing",
                    arg: "",
                },
                {
                    id: "t2",
                    name: "fun-fact",
                    desc: "something about me",
                    out: "I've played piano for twelve years, longer than I've been writing code.",
                    action: "nothing",
                    arg: "",
                },
                {
                    id: "t3",
                    name: "signature",
                    desc: "play the notes hidden in my name",
                    out: "A · E · G · H  (H is B in German notation)",
                    action: "play sheet",
                    arg: "signature",
                },
            ],
        },
    };
    const SECTION_NAMES = {
        projects: "Projects",
        experience: "Experience",
        education: "Education",
        certs: "Certifications",
        stack: "Skills",
        music: "Music",
        contact: "Contact",
    };
    const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
    function merge(def, src) {
        if (!isObj(def) || !isObj(src))
            return src === undefined ? clone(def) : clone(src);
        const out = {};
        for (const k of new Set([...Object.keys(def), ...Object.keys(src)]))
            out[k] =
                k in src
                    ? isObj(def[k]) && isObj(src[k])
                        ? merge(def[k], src[k])
                        : clone(src[k])
                    : clone(def[k]);
        // make sure every known section is in the order list
        if (Array.isArray(out.order))
            for (const id of Object.keys(SECTION_NAMES))
                if (!out.order.some((o) => o.id === id))
                    out.order.push({id, on: false});
        return out;
    }
    const getP = (o, p) =>
        p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
    const setP = (o, p, v) => {
        const ks = p.split(".");
        let a = o;
        for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]];
        a[ks[ks.length - 1]] = v;
    };

    let C = clone(DEFAULT);
    let saved = clone(C);
    let editing = false;

    /* ---------- rendering helpers ---------- */
    const fmt = (s) => E(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
    const T = (path, tag = "span", cls = "", rich = false) => {
        const v = getP(C, path) ?? "";
        return `<${tag}${cls ? ` class="${cls}"` : ""} data-edit="${path}"${rich ? " data-rich" : ""}>${rich && !editing ? fmt(v) : E(v)}</${tag}>`;
    };
    const safeUrl = (u) =>
        /^(https?:|mailto:)/i.test(String(u || "").trim())
            ? E(String(u).trim())
            : "#";
    const STATUS_CLASS = {
        live: "live",
        shipped: "live",
        building: "build",
        designing: "plan",
        planned: "plan",
        paused: "paused",
    };
    const itemTools = () =>
        `<div class="adm item-tools" role="group" aria-label="Item tools"><button type="button" data-act="up" title="Move earlier" aria-label="Move earlier">↑</button><button type="button" data-act="down" title="Move later" aria-label="Move later">↓</button><button type="button" data-act="edit" title="Edit all fields" aria-label="Edit all fields">✎</button><button type="button" data-act="dup" title="Duplicate" aria-label="Duplicate">⧉</button><button type="button" class="del" data-act="del" title="Delete" aria-label="Delete">✕</button></div>`;
    const secTools = (id, on) =>
        `<div class="adm sec-tools" data-sec="${id}"><span>${SECTION_NAMES[id]}</span><button type="button" data-sact="up" aria-label="Move section up">↑</button><button type="button" data-sact="down" aria-label="Move section down">↓</button><button type="button" data-sact="toggle">${on ? "hide" : "show"}</button></div>`;
    const addBtn = (list, label) =>
        `<button type="button" class="adm add-item" data-add="${list}">+ add ${label}</button>`;
    const tagsHTML = (path, arr) =>
        editing
            ? (arr || [])
                  .map(
                      (t, i) =>
                          `<span class="tag-ed">${T(`${path}.${i}`)}<button type="button" class="adm tag-x" data-tag-del="${path}" data-i="${i}" aria-label="Remove ${E(t)}">×</button></span>`,
                  )
                  .join("") +
              `<button type="button" class="adm tag-add" data-tag-add="${path}">+ tag</button>`
            : (arr || []).map((t) => `<span>${E(t)}</span>`).join("");
    const num = (v) => {
        const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
        return isFinite(n) ? n : 0;
    };
    const money = (n) =>
        n.toLocaleString("en-CA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    function detailHTML(it, p) {
        if (it.detail === "flow" && it.flow && it.flow.length) {
            const step = (s, i) => (editing ? T(`${p}.flow.${i}`) : E(s));
            return `<div class="flow" aria-label="Request flow">${it.flow.map((s, i) => (i === 0 || i === it.flow.length - 1 ? `<b>${step(s, i)}</b>` : step(s, i))).join(" <i>→</i> ")}${editing ? ` <button type="button" class="adm tag-add" data-tag-add="${p}.flow" style="display:inline-flex">+ step</button>` : ""}</div>`;
        }
        if (it.detail === "ledger" && it.ledger && it.ledger.length) {
            let d = 0,
                c = 0;
            const rows = it.ledger
                .map((r) => {
                    d += num(r[1]);
                    c += num(r[2]);
                    return `<tr><td>${E(r[0])}</td><td class="n">${r[1] ? money(num(r[1])) : ""}</td><td class="n">${r[2] ? money(num(r[2])) : ""}</td></tr>`;
                })
                .join("");
            const ok = Math.abs(d - c) < 0.005;
            return `<div class="ledger-wrap"><table class="ledger" aria-label="Example double-entry posting"><thead><tr><th>account</th><th class="n">debit</th><th class="n">credit</th></tr></thead><tbody>${rows}<tr class="sum${ok ? "" : " off"}"><td>${ok ? "balanced" : "unbalanced"}</td><td class="n">${money(d)}</td><td class="n">${money(c)}</td></tr></tbody></table></div>`;
        }
        return "";
    }

    function timelineSection(id, o, addLabel) {
        return `<section class="sec${o.on ? "" : " is-off"}" id="${id}" data-section="${id}">${secTools(id, o.on)}
    <div class="sec-head"><div><p class="eyebrow"><b>~/</b>${T(id + ".eyebrow")}</p>${T(id + ".title", "h2")}</div></div>
    <div class="timeline">${C[id].items
        .map((it, i) => {
            const p = `${id}.items.${i}`,
                pts = it.bullets || [];
            return `
      <div class="t-item"><span class="t-node" aria-hidden="true"></span>
        <article class="glass glow t-card" data-item="${id}.items" data-idx="${i}">${itemTools()}
          <h3>${T(p + ".role")} <span class="org">· ${T(p + ".org")}</span></h3>
          ${T(p + ".when", "p", "when")}
          ${it.desc || editing ? T(p + ".desc", "p") : ""}
          ${it.courses && (it.courses.length || editing) ? `<ul class="courses">${it.courses.map((c, j) => `<li><span class="cname">${T(`${p}.courses.${j}.0`)}</span><span class="grade${/^A/.test(c[1]) ? " top" : ""}">${T(`${p}.courses.${j}.1`)}</span>${editing ? `<button type="button" class="adm tag-x" data-tag-del="${p}.courses" data-i="${j}" aria-label="Remove course">×</button>` : ""}</li>`).join("")}</ul>${editing ? `<button type="button" class="adm tag-add" data-tag-add="${p}.courses" style="justify-self:start">+ course</button>` : ""}` : ""}
          ${pts.length || editing ? `<ul class="t-points">${pts.map((b, j) => `<li>${T(`${p}.bullets.${j}`)}${editing ? `<button type="button" class="adm tag-x" data-tag-del="${p}.bullets" data-i="${j}" aria-label="Remove point">×</button>` : ""}</li>`).join("")}</ul>${editing ? `<button type="button" class="adm tag-add" data-tag-add="${p}.bullets" style="justify-self:start">+ point</button>` : ""}` : ""}
        </article></div>`;
        })
        .join("")}${addBtn(id + ".items", addLabel)}</div></section>`;
    }
    const SECT = {
        projects: (
            o,
        ) => `<section class="sec${o.on ? "" : " is-off"}" id="projects" data-section="projects">${secTools("projects", o.on)}
    <div class="sec-head"><div><p class="eyebrow"><b>~/</b>${T("projects.eyebrow")}</p>${T("projects.title", "h2")}</div>${T("projects.intro", "p")}</div>
    <div class="grid">${C.projects.items
        .map((it, i) => {
            const p = `projects.items.${i}`;
            return `
      <article class="glass glow card ${it.size === "wide" ? "span-3" : "span-2"}" data-item="projects.items" data-idx="${i}">${itemTools()}
        <div class="card-top"><div>${T(p + ".title", "h3")}${T(p + ".sub", "p", "sub")}</div><span class="chip ${STATUS_CLASS[it.status] || "plan"}">${E(it.status)}</span></div>
        ${T(p + ".desc", "p")}
        ${detailHTML(it, p)}
        ${it.url ? `<a class="more" href="${safeUrl(it.url)}" target="_blank" rel="noopener">${T(p + ".linkLabel")} ↗</a>` : ""}
        <div class="tags">${tagsHTML(p + ".tags", it.tags)}</div>
      </article>`;
        })
        .join("")}${addBtn("projects.items", "project")}</div></section>`,

        experience: (o) => timelineSection("experience", o, "entry"),
        education: (o) => timelineSection("education", o, "school"),
        certs: (
            o,
        ) => `<section class="sec${o.on ? "" : " is-off"}" id="certs" data-section="certs">${secTools("certs", o.on)}
    <div class="sec-head"><div><p class="eyebrow"><b>~/</b>${T("certs.eyebrow")}</p>${T("certs.title", "h2")}</div></div>
    <div class="certs">${C.certs.items
        .map((it, i) => {
            const p = `certs.items.${i}`;
            return `
      <article class="glass glow cert" data-item="certs.items" data-idx="${i}">${itemTools()}
        ${it.badge === "★" && !editing ? '<span class="badge" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><polygon points="12,2.6 14.9,8.95 21.8,9.65 16.6,14.25 18.05,21.1 12,17.55 5.95,21.1 7.4,14.25 2.2,9.65 9.1,8.95" fill="currentColor"/></svg></span>' : T(p + ".badge", "span", "badge")}
        <div class="cert-body">${T(p + ".title", "h3")}<p class="issuer">${T(p + ".issuer")}${it.when || editing ? ` · ${T(p + ".when")}` : ""}</p>${it.note || editing ? T(p + ".note", "p") : ""}</div>
      </article>`;
        })
        .join("")}${addBtn("certs.items", "certification")}</div></section>`,

        stack: (
            o,
        ) => `<section class="sec${o.on ? "" : " is-off"}" id="stack" data-section="stack">${secTools("stack", o.on)}
    <div class="sec-head"><div><p class="eyebrow"><b>~/</b>${T("stack.eyebrow")}</p>${T("stack.title", "h2")}</div>${T("stack.intro", "p")}</div>
    <div class="stack">${C.stack.groups
        .map(
            (g, i) => `
      <div class="glass glow" data-item="stack.groups" data-idx="${i}">${itemTools()}${T(`stack.groups.${i}.name`, "h3")}
        <ul>${g.items.map((r, j) => `<li>${T(`stack.groups.${i}.items.${j}.0`)}${editing ? `<button type="button" class="adm tag-x" data-tag-del="stack.groups.${i}.items" data-i="${j}" aria-label="Remove ${E(r[0])}">×</button>` : ""}</li>`).join("")}</ul>${editing ? `<button type="button" class="adm tag-add" data-tag-add="stack.groups.${i}.items" style="justify-self:start">+ item</button>` : ""}</div>`,
        )
        .join("")}${addBtn("stack.groups", "group")}</div></section>`,

        music: (
            o,
        ) => `<section class="sec${o.on ? "" : " is-off"}" id="music" data-section="music">${secTools("music", o.on)}
    <div class="glass music glow">
      <div class="copy">
        <p class="eyebrow"><b>~/</b>${T("music.eyebrow")}</p>
        <h2>${T("music.title")} <em>${T("music.titleEm")}</em></h2>
        ${T("music.body", "p")}
        <div class="instruments">${tagsHTML("music.tags", C.music.tags)}</div>
        <a class="btn claret" href="#studio" style="justify-self:start">${T("music.cta")} <span class="arrow" aria-hidden="true">→</span></a>
      </div>
      <div class="piano-box">
        <div class="piano-head"><span>~/piano · C4–G5</span><span class="note-read" id="noteRead" aria-live="polite">—</span></div>
        <div class="piano" id="homePiano" aria-label="Playable piano keyboard"></div>
        <div class="piano-actions"><button class="btn claret" type="button" id="riff">${T("music.phraseLabel")}</button><span class="name-notes" id="nameNotes" aria-hidden="true">${nameNotesHTML()}</span></div>
        ${T("music.phraseHint", "p", "hint")}
        <p class="hint">Click, tap or drag across the keys. On a keyboard, use <kbd>A</kbd>–<kbd>'</kbd> for white keys and <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> <kbd>O</kbd> <kbd>P</kbd> for black keys.</p>
      </div>
    </div></section>`,

        contact: (
            o,
        ) => `<section class="sec${o.on ? "" : " is-off"}" id="contact" data-section="contact">${secTools("contact", o.on)}
    <div class="glass contact">
      <div class="left">
        <p class="eyebrow"><b>~/</b>${T("contact.eyebrow")}</p>
        ${T("contact.title", "h2")}
        ${T("contact.body", "p")}
        <div class="mailrow">${T("site.email", "span", "mail")}<button class="btn" type="button" data-copy-email>copy</button></div>
        <div class="links">${C.contact.links.map((l, i) => `<span class="link-wrap" data-item="contact.links" data-idx="${i}">${itemTools()}<a class="btn" href="${safeUrl(l.url)}" target="_blank" rel="noopener">${T(`contact.links.${i}.label`)} ↗</a></span>`).join("")}
          <button class="btn" type="button" data-open-tty>${T("nav.topTty")}</button>${addBtn("contact.links", "link")}</div>
      </div>
      <div class="right" aria-label="Terminal transcript">
        <span><span class="ok">${E(C.site.first.toLowerCase())}@dev</span>:<span class="k">~/contact</span>$ ping ${E(C.site.first.toLowerCase())}</span>
        <span>PING ${E(C.site.first.toLowerCase())} (${E(C.site.location.split(",").slice(0, 2).join(","))}): 56 data bytes</span>
        ${C.contact.pings.map((p, i) => `<span>64 bytes: icmp_seq=${i} reply=<span class="ok">"${E(p)}"</span></span>`).join("")}
        <span>--- ${C.contact.pings.length} packets sent, ${C.contact.pings.length} received, 0% loss ---</span>
      </div>
    </div></section>`,
    };

    function render() {
        applyPalette();
        applyFavicon();
        window.__miniCfg = clone(C.mini || {});
        window.dispatchEvent(new Event("mini:config"));
        const s = C.site,
            first = E(s.first.toLowerCase() || "me");
        $("#topbar").innerHTML = `
    <a class="pill glass glow brand" href="#top" aria-label="${E(s.first + " " + s.last)}, back to top">
      ${T("site.initials", "span", "brand-mark")}
      <span><b>${T("site.first")} <span class="sl">/</span> ${T("site.last")}</b>${T("site.tagline", "small")}</span></a>
    <div class="top-right">
      <div class="pill glass status"><i class="dot" aria-hidden="true"></i><span>${T("site.status")}<span class="long"> · ${T("site.statusLong")}</span></span></div>
      <button class="tty-btn theme-btn" type="button" data-theme-menu aria-haspopup="menu" aria-expanded="false" aria-label="Change colour theme"><svg class="tdot" viewBox="0 0 16 16" aria-hidden="true"><circle class="t-bg" cx="8" cy="8" r="6.6"/><path class="t-fill" d="M8 1.4a6.6 6.6 0 0 1 0 13.2z"/><circle class="t-ring" cx="8" cy="8" r="6.6"/></svg><span class="tlbl">theme</span></button>
      <a class="tty-btn" href="#studio">${T("nav.topStudio")}</a>
      <button class="tty-btn" type="button" data-open-tty>${T("nav.topTty")} <kbd aria-hidden="true">\`</kbd></button>
    </div>`;
        const vis = C.order.filter((o) => o.on).map((o) => o.id);
        const navIds = vis.filter((id) => id !== "contact"),
            navCount = navIds.length;
        const nav = vis
            .filter((id) => id !== "contact")
            .map((id) => `<a class="btn" href="#${id}">${T("nav." + id)}</a>`)
            .join("");
        $("#heroMain").innerHTML = `
    <div class="term-chrome"><div class="lights" aria-hidden="true"><i></i><i></i><i></i></div><span class="title">${first}@portfolio</span></div>
    <div class="term-body">
      <p class="prompt"><span class="u">${first}@dev</span>:<span class="p">~</span>$ ${T("hero.cmd", "span")}<span class="caret" aria-hidden="true"></span></p>
      <h1>${T("site.first")} ${T("site.last", "em")}</h1>
      ${T("hero.bio", "p", "bio", true)}
      <div class="actions" style="--cols:${navCount > 4 ? 3 : Math.max(1, navCount)}">
        <a class="btn primary" href="${vis.includes("contact") ? "#contact" : "#studio"}">${T("nav.cta")} <span class="arrow" aria-hidden="true">→</span></a>
        ${nav}
      </div>
      <div class="term-foot">${T("site.location")}${T("site.school")}</div>
    </div>`;
        $("#sections").innerHTML = C.order
            .filter((o) => o.on || editing)
            .map((o) => (SECT[o.id] ? SECT[o.id](o) : ""))
            .join("");
        $("#footer").innerHTML =
            `${T("footer.line", "p")}<button class="tty-btn" type="button" data-open-tty>${T("nav.footTty")} <kbd aria-hidden="true">press \`</kbd></button>${T("footer.copy", "p")}`;
        const hp = $("#homePiano");
        if (hp) buildPiano(hp, HOME_KEYS, onHomeKey);
        renderStudioChrome();
        renderInstruments();
        if (editing) makeEditable();
        const pg = $("#admPage");
        if (pg)
            pg.innerHTML = $("#studio").hidden
                ? "studio page →"
                : "← home page";
        readColors();
        setSphereTags(C.sphere.tags);
        document.title = `${s.first} ${s.last} | Software Engineer`;
    }

    /* glow follows the cursor on any card */
    document.addEventListener(
        "pointermove",
        (e) => {
            const el = e.target.closest && e.target.closest(".glow");
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", e.clientX - r.left + "px");
            el.style.setProperty("--my", e.clientY - r.top + "px");
        },
        {passive: true},
    );

    /* ---------- toast ---------- */
    function toast(msg, act, fn) {
        const t = $("#toast");
        $("#toastMsg").textContent = msg;
        const b = $("#toastAct");
        b.hidden = !act;
        if (act) {
            b.textContent = act;
            b.onclick = () => {
                t.hidden = true;
                fn();
            };
        }
        t.hidden = false;
        clearTimeout(toast.t);
        toast.t = setTimeout(() => (t.hidden = true), act ? 5000 : 2400);
    }

    /* ---------- copy email ---------- */
    async function copyEmail() {
        try {
            await navigator.clipboard.writeText(C.site.email);
            toast("Email copied");
            return true;
        } catch {
            const m = $(".mail");
            if (m) {
                const r = document.createRange();
                r.selectNodeContents(m);
                const s = getSelection();
                s.removeAllRanges();
                s.addRange(r);
            }
            toast("Selected. Press Ctrl/⌘ + C to copy");
            return false;
        }
    }

    /* =====================================================================
   3D SIGNAL SPHERE
   ===================================================================== */
    const cv = $("#sphere"),
        cx = cv.getContext("2d");
    let W = 0,
        H = 0;
    const DPR = Math.min(devicePixelRatio || 1, 2);
    const small = matchMedia("(max-width:640px)").matches;
    const N = small ? 420 : 760,
        pts = [],
        GA = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2,
            r = Math.sqrt(1 - y * y),
            th = GA * i;
        pts.push({
            x: Math.cos(th) * r,
            y,
            z: Math.sin(th) * r,
            lat: Math.asin(y),
            ph: Math.random() * 6.28,
        });
    }
    let tags = [],
        tagsKey = "";
    function setSphereTags(list) {
        list = (Array.isArray(list) ? list : [])
            .map((t) => String(t).trim())
            .filter(Boolean)
            .slice(0, 18);
        const key = list.join("\u0001");
        if (key === tagsKey) return;
        tagsKey = key;
        tags = list.map((t, i) => ({
            t,
            a: (i / list.length) * Math.PI * 2,
            tilt: ((i % 3) - 1) * 0.55,
            sp: 0.25 + (i % 4) * 0.05,
        }));
    }
    let rotY = 0.6,
        rotX = -0.25,
        vY = reduce ? 0.0008 : 0.0035,
        vX = 0,
        drag = null,
        energy = 0,
        last = performance.now(),
        sphereVisible = true,
        tgtX = 0,
        tgtY = 0,
        parX = 0,
        parY = 0;
    function resize() {
        const r = cv.getBoundingClientRect();
        if (
            Math.round(r.width) === Math.round(W) &&
            Math.round(r.height) === Math.round(H) &&
            cv.width > 1
        )
            return;
        W = r.width;
        H = r.height;
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    /* resize after the observer's callback, and only when the size really changed, so the canvas never re-triggers its own observer */
    let roFrame = 0;
    new ResizeObserver(() => {
        cancelAnimationFrame(roFrame);
        roFrame = requestAnimationFrame(resize);
    }).observe(cv);
    resize();
    let colA,
        colB,
        colC,
        colT,
        colP = [4, 7, 15];
    const hex = (h) => {
        h = (h || "#888").trim().replace("#", "");
        if (h.length === 3)
            h = h
                .split("")
                .map((c) => c + c)
                .join("");
        const n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    function readColors() {
        const c = getComputedStyle(document.documentElement);
        colA = hex(c.getPropertyValue("--accent"));
        colB = hex(c.getPropertyValue("--cool"));
        colC = hex(c.getPropertyValue("--accent-2"));
        colT = hex(c.getPropertyValue("--text"));
        colP = hex(c.getPropertyValue("--panel-solid"));
    }
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    cv.addEventListener("pointerdown", (e) => {
        drag = {x: e.clientX, y: e.clientY};
        cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", (e) => {
        const r = cv.getBoundingClientRect();
        tgtX = (e.clientX - r.left) / r.width - 0.5;
        tgtY = (e.clientY - r.top) / r.height - 0.5;
        if (!drag) return;
        const dx = e.clientX - drag.x,
            dy = e.clientY - drag.y;
        drag = {x: e.clientX, y: e.clientY};
        vY = dx * 0.0025;
        vX = dy * 0.0025;
    });
    cv.addEventListener("pointerup", () => (drag = null));
    cv.addEventListener("pointercancel", () => (drag = null));
    cv.addEventListener("pointerleave", () => {
        tgtX = tgtY = 0;
    });
    let rafOn = false;
    function kick() {
        if (!rafOn && sphereVisible && !document.hidden && !$("#home").hidden) {
            rafOn = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }
    }
    new IntersectionObserver((es) => {
        sphereVisible = es[0].isIntersecting;
        kick();
    }).observe(cv);
    document.addEventListener("visibilitychange", kick);
    function frame(now) {
        if (!sphereVisible || document.hidden || $("#home").hidden) {
            rafOn = false;
            return;
        }
        const dt = Math.min(48, now - last) / 16.67;
        last = now;
        if (!drag) {
            vY += ((reduce ? 0.0008 : 0.0035) - vY) * 0.02 * dt;
            vX *= Math.pow(0.94, dt);
        }
        rotY += vY * dt;
        rotX = Math.max(-1.2, Math.min(1.2, rotX + vX * dt));
        parX += (tgtX - parX) * 0.06 * dt;
        parY += (tgtY - parY) * 0.06 * dt;
        energy *= Math.pow(0.955, dt);
        cx.clearRect(0, 0, W, H);
        const R = Math.min(W, H) * 0.34,
            ox = W / 2 + parX * 24,
            oy = H / 2 + parY * 18;
        const cy = Math.cos(rotY),
            sy = Math.sin(rotY),
            cxr = Math.cos(rotX),
            sxr = Math.sin(rotX),
            t = now / 1000;
        const g = cx.createRadialGradient(ox, oy, R * 0.2, ox, oy, R * 1.6);
        g.addColorStop(0, `rgba(${colA},${0.07 + energy * 0.12})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        cx.fillStyle = g;
        cx.fillRect(0, 0, W, H);
        cx.save();
        cx.translate(ox, oy);
        cx.rotate(-0.35);
        cx.scale(1, 0.28);
        cx.beginPath();
        cx.arc(0, 0, R * 1.42, 0, Math.PI * 2);
        cx.strokeStyle = `rgba(${colB},.18)`;
        cx.lineWidth = 1;
        cx.stroke();
        cx.restore();
        for (let pass = 0; pass < 2; pass++)
            for (const p of pts) {
                const wave = reduce
                    ? 0
                    : energy * 0.16 * Math.sin(p.lat * 7 - t * 9 + p.ph * 0.3);
                const s =
                    1 + wave + (reduce ? 0 : 0.012 * Math.sin(t * 1.4 + p.ph));
                const x = p.x * s,
                    y = p.y * s,
                    z = p.z * s,
                    x1 = x * cy - z * sy,
                    z1 = x * sy + z * cy,
                    y1 = y * cxr - z1 * sxr,
                    z2 = y * sxr + z1 * cxr;
                if ((pass === 0) !== z2 < 0) continue;
                const persp = 2.6 / (2.6 + z2),
                    px = ox + x1 * R * persp,
                    py = oy + y1 * R * persp,
                    depth = (z2 + 1) / 2;
                let c = mix(colA, colB, (y1 + 1) / 2);
                if (energy > 0.02)
                    c = mix(
                        c,
                        colC,
                        Math.min(1, energy * 0.9) * (wave > 0 ? 1 : 0.3),
                    );
                const sz = (1 - depth) * 1.9 + 0.5 + Math.max(0, wave) * 6;
                cx.fillStyle = `rgba(${c},${0.12 + (1 - depth) * 0.8})`;
                cx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
            }
        cx.font = `500 ${small ? 11 : 12}px "IBM Plex Mono", monospace`;
        cx.textAlign = "center";
        cx.textBaseline = "middle";
        for (const tg of tags) {
            const a = tg.a + t * tg.sp * (reduce ? 0.2 : 1) + rotY * 0.4,
                x = Math.cos(a) * 1.42,
                z = Math.sin(a) * 1.42,
                y = Math.sin(a + tg.tilt) * 0.32 + tg.tilt * 0.4;
            const y1 = y * cxr - z * sxr,
                z2 = y * sxr + z * cxr,
                persp = 2.6 / (2.6 + z2),
                px = ox + x * R * persp,
                py = oy + y1 * R * persp,
                front = z2 < 0;
            const tc = tg.t === "♪" ? colC : colA;
            if (front) {
                const w = cx.measureText(tg.t).width + 14;
                cx.fillStyle = `rgba(${colP},.82)`;
                cx.beginPath();
                if (cx.roundRect) cx.roundRect(px - w / 2, py - 11, w, 22, 11);
                else cx.rect(px - w / 2, py - 11, w, 22);
                cx.fill();
                cx.strokeStyle = `rgba(${tc},.4)`;
                cx.stroke();
            }
            cx.fillStyle = `rgba(${tg.t === "♪" ? colC : mix(colA, colT, 0.5)},${front ? 0.95 : 0.22})`;
            cx.fillText(tg.t, px, py + 0.5);
        }
        requestAnimationFrame(frame);
    }
    const pulse = (amt = 0.55) => {
        energy = Math.min(1.3, energy + amt);
        vY += 0.01;
        dispatchEvent(new Event("music:note"));
    }; // bitnotes.js listens

    /* =====================================================================
   AUDIO — five synth voices shared by the home piano and the studio
   ===================================================================== */
    let ac, master, noiseBuf;
    function audio() {
        if (!ac) {
            ac = new (window.AudioContext || window.webkitAudioContext)();
            master = ac.createGain();
            master.gain.value = 0.32;
            master.connect(ac.destination);
            const conv = ac.createConvolver(),
                len = ac.sampleRate * 2.2,
                ir = ac.createBuffer(2, len, ac.sampleRate);
            for (let ch = 0; ch < 2; ch++) {
                const d = ir.getChannelData(ch);
                for (let i = 0; i < len; i++)
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
            }
            conv.buffer = ir;
            const wet = ac.createGain();
            wet.gain.value = 0.2;
            master.connect(conv);
            conv.connect(wet);
            wet.connect(ac.destination);
            noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
            const nd = noiseBuf.getChannelData(0);
            for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        }
        if (ac.state === "suspended") ac.resume();
        return ac;
    }
    const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function env(g, t0, peak, a, hold, rel) {
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + a);
        g.gain.setValueAtTime(peak, t0 + Math.max(a, hold));
        g.gain.linearRampToValueAtTime(0, t0 + Math.max(a, hold) + rel);
    }
    function osc(type, f, t0, t1) {
        const o = ac.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.start(t0);
        o.stop(t1);
        return o;
    }
    function vibrato(o, f, t0, t1, depth, delay) {
        const l = ac.createOscillator();
        l.frequency.value = 5.3;
        const lg = ac.createGain();
        lg.gain.setValueAtTime(0, t0);
        lg.gain.linearRampToValueAtTime(f * depth, t0 + delay + 0.2);
        l.connect(lg);
        lg.connect(o.frequency);
        l.start(t0);
        l.stop(t1);
    }
    const VOICES = {
        piano(m, t0, dur, out) {
            const f = freq(m),
                end = t0 + Math.max(0.6, dur) + 0.6,
                g = ac.createGain();
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(0.5, t0 + 0.008);
            g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.25);
            g.gain.exponentialRampToValueAtTime(0.0008, end);
            const lp = ac.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.setValueAtTime(Math.min(9000, f * 8), t0);
            lp.frequency.exponentialRampToValueAtTime(
                Math.max(400, f * 1.5),
                end,
            );
            const o1 = osc("triangle", f, t0, end),
                o2 = osc("sine", f * 2, t0, end),
                g2 = ac.createGain();
            g2.gain.value = 0.18;
            o1.connect(lp);
            o2.connect(g2);
            g2.connect(lp);
            lp.connect(g);
            g.connect(out);
        },
        guitar(m, t0, dur, out) {
            const f = freq(m),
                sr = ac.sampleRate,
                len = Math.floor(sr * Math.min(2.6, Math.max(0.8, dur + 0.6))),
                buf = ac.createBuffer(1, len, sr),
                d = buf.getChannelData(0),
                P = Math.max(2, Math.round(sr / f));
            for (let i = 0; i < P; i++) d[i] = Math.random() * 2 - 1;
            for (let i = P; i < len; i++)
                d[i] = 0.497 * (d[i - P] + d[i - P + 1]);
            const src = ac.createBufferSource();
            src.buffer = buf;
            const lp = ac.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 3200;
            const g = ac.createGain();
            g.gain.value = 0.8;
            src.connect(lp);
            lp.connect(g);
            g.connect(out);
            src.start(t0);
        },
        flute(m, t0, dur, out) {
            const f = freq(m),
                end = t0 + dur + 0.12,
                g = ac.createGain();
            env(g, t0, 0.42, 0.07, dur - 0.04, 0.1);
            const o = osc("sine", f, t0, end),
                o2 = osc("triangle", f, t0, end),
                g2 = ac.createGain();
            g2.gain.value = 0.12;
            vibrato(o, f, t0, end, 0.006, 0.15);
            vibrato(o2, f, t0, end, 0.006, 0.15);
            const n = ac.createBufferSource();
            n.buffer = noiseBuf;
            n.loop = true;
            const bp = ac.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = f * 2;
            bp.Q.value = 1.4;
            const ng = ac.createGain();
            env(ng, t0, 0.05, 0.03, dur * 0.6, 0.1);
            n.connect(bp);
            bp.connect(ng);
            ng.connect(out);
            n.start(t0);
            n.stop(end);
            o.connect(g);
            o2.connect(g2);
            g2.connect(g);
            g.connect(out);
        },
        xylophone(m, t0, dur, out) {
            const f = freq(m),
                end = t0 + 0.9,
                g = ac.createGain();
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(0.55, t0 + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.55);
            const o = osc("sine", f, t0, end),
                o2 = osc("sine", f * 3, t0, end),
                g2 = ac.createGain();
            g2.gain.setValueAtTime(0.3, t0);
            g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
            const o3 = osc("sine", f * 6.27, t0, end),
                g3 = ac.createGain();
            g3.gain.setValueAtTime(0.08, t0);
            g3.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
            o.connect(g);
            o2.connect(g2);
            g2.connect(g);
            o3.connect(g3);
            g3.connect(g);
            g.connect(out);
        },
        voice(m, t0, dur, out) {
            const f = freq(m),
                end = t0 + dur + 0.2,
                g = ac.createGain();
            env(g, t0, 1.1, 0.09, dur - 0.05, 0.16);
            const o = osc("sawtooth", f, t0, end);
            vibrato(o, f, t0, end, 0.009, 0.18);
            const sum = ac.createGain();
            [
                [800, 8, 1],
                [1150, 10, 0.55],
                [2900, 12, 0.18],
            ].forEach(([fr, q, gv]) => {
                const bp = ac.createBiquadFilter();
                bp.type = "bandpass";
                bp.frequency.value = fr;
                bp.Q.value = q;
                const bg = ac.createGain();
                bg.gain.value = gv;
                o.connect(bp);
                bp.connect(bg);
                bg.connect(sum);
            });
            const lp = ac.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 3400;
            sum.connect(lp);
            lp.connect(g);
            g.connect(out);
        },
    };
    function tone(m, dur = 1.2, voice = "piano", when = 0, out) {
        const a = audio();
        VOICES[voice](m, a.currentTime + when, dur, out || master);
    }
    const NAMES = [
        "C",
        "C♯",
        "D",
        "D♯",
        "E",
        "F",
        "F♯",
        "G",
        "G♯",
        "A",
        "A♯",
        "B",
    ];
    const noteName = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);

    /* ---------- keyboard builder (used on home and in the studio) ---------- */
    function buildPiano(el, keys, onKey) {
        el.innerHTML = "";
        const whites = keys.filter((k) => !k.black),
            nW = whites.length,
            map = {};
        whites.forEach((k) => {
            const d = document.createElement("div");
            d.className = "wk";
            d.dataset.k = k.id;
            d.textContent = k.label || "";
            el.appendChild(d);
            map[k.id] = d;
        });
        keys.filter((k) => k.black).forEach((k) => {
            const d = document.createElement("div");
            d.className = "bk";
            d.dataset.k = k.id;
            d.style.width = `calc(100% / ${nW} * .62)`;
            d.style.left = `calc(${((k.after + 1) * 100) / nW}% - (100% / ${nW} * .31))`;
            el.appendChild(d);
            map[k.id] = d;
        });
        const byId = Object.fromEntries(keys.map((k) => [k.id, k]));
        let down = false,
            lastK = null;
        const at = (x, y) => {
            const t = document.elementFromPoint(x, y);
            return t && t.dataset && t.dataset.k && el.contains(t)
                ? t.dataset.k
                : null;
        };
        el.onpointerdown = (e) => {
            down = true;
            try {
                el.setPointerCapture(e.pointerId);
            } catch {}
            const k = at(e.clientX, e.clientY);
            if (k) {
                onKey(byId[k], false, e.shiftKey);
                lastK = k;
            }
        };
        el.onpointermove = (e) => {
            if (!down) return;
            const k = at(e.clientX, e.clientY);
            if (k && k !== lastK) {
                onKey(byId[k], true);
                lastK = k;
            }
        };
        el.onpointerup = el.onpointercancel = () => {
            down = false;
            lastK = null;
        };
        el._light = (id) => {
            const d = map[id];
            if (d) {
                d.classList.add("on");
                clearTimeout(d._t);
                d._t = setTimeout(() => d.classList.remove("on"), 180);
            }
        };
    }

    /* ---------- home piano ---------- */
    const HOME_KEYS = (() => {
        const W = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79],
            ks = [];
        W.forEach((m, i) =>
            ks.push({
                id: "h" + m,
                midi: m,
                label: m % 12 === 0 ? noteName(m) : "",
            }),
        );
        [
            [61, 0],
            [63, 1],
            [66, 3],
            [68, 4],
            [70, 5],
            [73, 7],
            [75, 8],
            [78, 10],
        ].forEach(([m, a]) =>
            ks.push({id: "h" + m, midi: m, black: true, after: a}),
        );
        return ks;
    })();
    const HOME_KEYMAP = {
        a: 60,
        s: 62,
        d: 64,
        f: 65,
        g: 67,
        h: 69,
        j: 71,
        k: 72,
        l: 74,
        ";": 76,
        "'": 77,
        w: 61,
        e: 63,
        t: 66,
        y: 68,
        u: 70,
        o: 73,
        p: 75,
    };
    function playHome(m, dur) {
        tone(m, dur, "piano");
        pulse();
        const p = $("#homePiano");
        if (p && p._light) p._light("h" + m);
        const nr = $("#noteRead");
        if (nr) nr.textContent = noteName(m);
    }
    function onHomeKey(k, glide) {
        playHome(k.midi, glide ? 1 : 1.2);
    }
    /* phrases: [midi, start, length] in beats of ~420 ms */
    const SIGNATURE = [
        [69, 0, 1.2],
        [76, 0.5, 1.2],
        [67, 1, 1.2],
        [71, 1.5, 2.6],
        [69, 3, 0.8],
        [76, 3.25, 0.8],
        [67, 3.5, 0.8],
        [71, 3.75, 0.8],
        [69, 4.5, 3.2],
        [76, 4.5, 3.2],
        [71, 4.5, 3.2],
    ];
    const BOOT = [
        [60, 0, 1.8],
        [67, 0.35, 1.7],
        [74, 0.7, 1.6],
        [76, 1.05, 1.8],
        [72, 1.6, 3],
        [76, 1.6, 3],
        [79, 1.6, 3],
    ];
    const SHUTDOWN = [
        [79, 0, 1.1],
        [74, 0.35, 1.1],
        [71, 0.7, 1.3],
        [67, 1.05, 1.8],
        [60, 1.7, 3],
        [67, 1.7, 3],
    ];
    function playSeq(seq, beatMs = 420, voice = "piano") {
        seq.forEach(([m, at, d]) =>
            setTimeout(() => {
                tone(m, d * 1.2, voice);
                pulse(0.4);
                const p = $("#homePiano");
                if (p && p._light) p._light("h" + m);
            }, at * beatMs),
        );
        return Math.max(...seq.map((x) => x[1] + x[2] * 0.6)) * beatMs;
    }
    /* letters A–H are notes (H is B in German); the rest of the name is shown dimmed */
    function nameNotesHTML() {
        return [...String(C.site.last || "")]
            .map(
                (ch) =>
                    `<span class="nn ${/[a-h]/i.test(ch) ? "on" : "off"}">${E(ch.toUpperCase())}</span>`,
            )
            .join("");
    }
    function lightName(i) {
        const on = $$("#nameNotes .nn.on");
        on.forEach((el, k) =>
            el.classList.toggle("lit", i === "all" || k === i),
        );
    }
    let riffing = false;
    function riff() {
        if (riffing) return;
        riffing = true;
        const nr = $("#noteRead"),
            names = ["A", "E", "G", "H"];
        SIGNATURE.slice(0, 4).forEach((x, i) =>
            setTimeout(() => {
                if (nr) nr.textContent = names[i];
                lightName(i);
            }, x[1] * 420),
        );
        SIGNATURE.slice(4, 8).forEach((x, i) =>
            setTimeout(() => lightName(i), x[1] * 420),
        );
        setTimeout(() => {
            if (nr) nr.textContent = "A·E·G·H";
            lightName("all");
        }, 4.5 * 420);
        setTimeout(() => lightName(-1), 7.6 * 420);
        playSeq(SIGNATURE);
        setTimeout(() => (riffing = false), 5 * 420);
    }

    /* =====================================================================
   STUDIO — sheet model, renderer, editor, playback, storage
   A sheet event is either a rest {r:true,d,dot} or a note/chord {k:[{s,a}…],d,dot}
   where s is the staff step (C4 = 0) and a the accidental (-1, 0, 1).
   ===================================================================== */
    const DUR = {w: 4, h: 2, q: 1, e: 0.5, s: 0.25};
    const DUR_ORDER = ["w", "h", "q", "e", "s"];
    const DUR_NAME = {
        w: "whole",
        h: "half",
        q: "quarter",
        e: "eighth",
        s: "sixteenth",
    };
    const STEP_SEMI = [0, 2, 4, 5, 7, 9, 11];
    const mod = (a, b) => ((a % b) + b) % b;
    const S_MIN = -2,
        S_MAX = 14; // A3 .. C6
    const TIMES = ["4/4", "3/4", "2/4", "3/8", "6/8"];
    const clampS = (s) => Math.max(S_MIN, Math.min(S_MAX, s));
    const midiOf = (p) =>
        60 + 12 * Math.floor(p.s / 7) + STEP_SEMI[mod(p.s, 7)] + (p.a || 0);
    const pitchLabel = (s, a = 0) =>
        "CDEFGAB"[mod(s, 7)] +
        (a > 0 ? "♯" : a < 0 ? "♭" : "") +
        (4 + Math.floor(s / 7));
    const beatsOf = (n) => DUR[n.d] * (n.dot ? 1.5 : 1);
    const chordLabel = (n) => n.k.map((p) => pitchLabel(p.s, p.a)).join("–");
    function normNote(n) {
        if (!n || typeof n !== "object") return null;
        const d = DUR[n.d] ? n.d : "q",
            dot = !!n.dot;
        if (n.r) return {r: true, d, dot};
        let k = Array.isArray(n.k)
            ? n.k
            : typeof n.s === "number"
              ? [{s: n.s, a: n.a}]
              : null;
        if (!k || !k.length) return null;
        const seen = new Set();
        k = k
            .map((p) => ({
                s: clampS(Math.round(+p.s || 0)),
                a: [-1, 0, 1].includes(p.a) ? p.a : 0,
            }))
            .filter((p) => !seen.has(p.s) && seen.add(p.s))
            .sort((x, y) => x.s - y.s)
            .slice(0, 6);
        return {k, d, dot};
    }
    function normSheet(sh) {
        sh = sh && typeof sh === "object" ? sh : {};
        sh.notes = (Array.isArray(sh.notes) ? sh.notes : [])
            .map(normNote)
            .filter(Boolean);
        if (!TIMES.includes(sh.time)) sh.time = "4/4";
        sh.tempo = Math.min(200, Math.max(40, Math.round(+sh.tempo || 96)));
        if (!VOICES[sh.voice]) sh.voice = "piano";
        sh.title = sh.title || "";
        sh.composer = sh.composer || "";
        return sh;
    }
    const BUILTIN_EXAMPLE = () => {
        // the sheet a first-time visitor sees: Für Elise from the library
        const lib = (C.studio && C.studio.library) || [],
            pick =
                lib.find((x) => /^f[üu]r elise/i.test(x.title || "")) || lib[0];
        return normSheet(
            Object.assign(clone(pick || {title: "", notes: []}), {
                id: null,
                example: true,
            }),
        );
    };
    const EXAMPLE = () =>
        C.studio && C.studio.example && Array.isArray(C.studio.example.notes)
            ? normSheet(
                  Object.assign(clone(C.studio.example), {
                      id: null,
                      example: true,
                  }),
              )
            : BUILTIN_EXAMPLE();
    function afterContentLoad() {
        if (sheet && sheet.example && !play) {
            sheet = EXAMPLE();
            sel = -1;
            selK = 0;
            undoStack = [];
            if (!$("#studio").hidden) loadSheetIntoUI();
        }
    }
    const BLANK = () =>
        normSheet({
            id: null,
            title: "",
            composer: LS.get("an.composer", ""),
            tempo: 96,
            time: "4/4",
            voice: sheet ? sheet.voice : "piano",
            notes: [],
        });

    let sheet = normSheet(
        ((c) => (c && !c.example ? c : null))(
            LS.get("an.studio.current", null),
        ) || EXAMPLE(),
    ); // an untouched example is always the current one
    let sel = -1; // selected event index
    let selK = 0; // active note inside the selected chord
    let tool = {mode: "note", d: "q", dot: false, a: 0, chord: false};
    let undoStack = [];
    let layout = []; // per event: {x, w, cx, sys}
    let systems = [];
    let play = null; // playback state

    const INST_IC = {
        piano: "𝅘𝅥𝅮",
        guitar: "♬",
        flute: "𝆑",
        xylophone: "𝅘𝅥",
        voice: "𝆓",
    };
    const instName = (id) =>
        ((C.studio.instruments || []).find((i) => i.id === id) || {}).name ||
        id;
    function renderInstruments() {
        $("#instRow").innerHTML = (C.studio.instruments || [])
            .map((i, k) =>
                VOICES[i.id]
                    ? `<div class="inst" role="button" tabindex="0" data-voice="${E(i.id)}" aria-pressed="${sheet.voice === i.id}"><span class="try" aria-hidden="true">try ▶</span><span class="ic" aria-hidden="true">${INST_IC[i.id] || "♪"}</span>${T(`studio.instruments.${k}.name`, "b")}${T(`studio.instruments.${k}.note`, "small")}</div>`
                    : "",
            )
            .join("");
        if (editing) makeEditable();
    }
    function pickVoice(b) {
        sheet.voice = b.dataset.voice;
        renderInstruments();
        persistCurrent();
        [60, 64, 67, 72].forEach((m, i) =>
            tone(m, 0.45, sheet.voice, i * 0.16),
        );
        toast(`${instName(sheet.voice)} selected for playback`);
    }
    $("#instRow").addEventListener("click", (e) => {
        if (editing && e.target.closest("[data-edit]")) return;
        const b = e.target.closest("[data-voice]");
        if (b) pickVoice(b);
    });
    $("#instRow").addEventListener("keydown", (e) => {
        if (
            e.target.closest("[data-edit]") ||
            (e.key !== "Enter" && e.key !== " ")
        )
            return;
        const b = e.target.closest("[data-voice]");
        if (b) {
            e.preventDefault();
            pickVoice(b);
        }
    });
    function renderStudioChrome() {
        $("#studioTop").innerHTML = `
    <a class="pill glass glow brand" href="#top"><span class="brand-mark" aria-hidden="true">←</span><span><b>${T("studio.back")}</b>${T("studio.backSub", "small")}</span></a>
    <div class="top-right"><button class="tty-btn theme-btn" type="button" data-theme-menu aria-haspopup="menu" aria-expanded="false" aria-label="Change colour theme"><svg class="tdot" viewBox="0 0 16 16" aria-hidden="true"><circle class="t-bg" cx="8" cy="8" r="6.6"/><path class="t-fill" d="M8 1.4a6.6 6.6 0 0 1 0 13.2z"/><circle class="t-ring" cx="8" cy="8" r="6.6"/></svg><span class="tlbl">theme</span></button><button class="tty-btn" type="button" data-open-tty>${T("nav.topTty")}</button></div>`;
        $("#studioHero").innerHTML =
            `<p class="eyebrow"><b>~/</b>${T("studio.eyebrow")}</p>
    <h1>${T("studio.title1")} <em>${T("studio.titleEm")}</em> ${T("studio.title2")}</h1>${T("studio.intro", "p")}
    <div class="studio-links"><p class="eyebrow"><b>♪</b> ${T("studio.linksLabel")}</p><div class="links">${(C.studio.links || []).map((l, i) => `<span class="link-wrap" data-item="studio.links" data-idx="${i}">${itemTools()}<a class="btn claret" href="${safeUrl(l.url)}" target="_blank" rel="noopener">${T(`studio.links.${i}.label`)} ↗</a></span>`).join("")}${addBtn("studio.links", "link")}</div></div>
    <div class="adm row ex-tools"><button class="btn" type="button" id="exMake">★ make the sheet below the example visitors see</button>${C.studio.example ? '<button class="btn" type="button" id="exReset">use the built-in example</button>' : ""}<button class="btn" type="button" id="libAdd">+ add the sheet below to the library</button></div>`;
        $("#sheetsTitle").innerHTML = T("studio.sheetsTitle", "h2");
        $("#libHead").innerHTML =
            `${T("studio.libTitle", "h2")}${T("studio.libIntro", "p")}`;
        renderLibrary();
    }
    function renderLibrary() {
        const L = C.studio.library || [];
        $("#libList").innerHTML = L.length
            ? L.map(
                  (
                      r,
                      i,
                  ) => `<li data-item="studio.library" data-idx="${i}">${itemTools()}<span class="meta">${T(`studio.library.${i}.title`, "b")}<small>${T(`studio.library.${i}.note`)}${r.composer ? ` · ${E(r.composer)}` : ""} · ${E(instName(r.voice || "piano"))}</small></span>
    <span class="acts"><button class="btn" type="button" data-lib="open">open</button><button class="btn" type="button" data-lib="play" aria-label="Play ${E(r.title)}">▶</button></span></li>`,
              ).join("")
            : '<li class="empty-note">The library is empty.</li>';
    }
    function openLibrary(i, andPlay) {
        const r = (C.studio.library || [])[i];
        if (!r) return;
        stopPlay();
        undoStack = [];
        sheet = normSheet(Object.assign(clone(r), {id: null, example: false}));
        sel = -1;
        selK = 0;
        loadSheetIntoUI();
        scrollTo({
            top: $(".sheet-card").offsetTop - 20,
            behavior: reduce ? "auto" : "smooth",
        });
        if (andPlay) setTimeout(() => startPlay(0), 300);
        else toast(`Opened a copy of "${sheet.title}". Your edits stay yours.`);
    }
    $("#libList").addEventListener("click", (e) => {
        const b = e.target.closest("[data-lib]");
        if (!b) return;
        openLibrary(+b.closest("li").dataset.idx, b.dataset.lib === "play");
    });

    /* duration buttons with drawn notes */
    function durIcon(d, rest) {
        if (rest)
            return `<span class="mus">${{w: "𝄻", h: "𝄼", q: "𝄽", e: "𝄾", s: "𝄿"}[d]}</span>`;
        const head =
            d === "w" || d === "h"
                ? '<ellipse cx="7" cy="17" rx="5" ry="3.6" transform="rotate(-20 7 17)" fill="none" stroke="currentColor" stroke-width="1.6"/>'
                : '<ellipse cx="7" cy="17" rx="5" ry="3.6" transform="rotate(-20 7 17)" fill="currentColor"/>';
        const stem =
            d === "w"
                ? ""
                : '<line x1="11.4" y1="16" x2="11.4" y2="2" stroke="currentColor" stroke-width="1.4"/>';
        const fl =
            (d === "e" || d === "s"
                ? '<path d="M11.4 2 C12 6 17 7 15.5 12 C17 7 13 6 11.4 5 Z" fill="currentColor"/>'
                : "") +
            (d === "s"
                ? '<path d="M11.4 6 C12 10 17 11 15.5 16 C17 11 13 10 11.4 9 Z" fill="currentColor"/>'
                : "");
        return `<svg viewBox="0 0 18 22" aria-hidden="true">${head}${stem}${fl}</svg>`;
    }
    const curEvent = () => (sel >= 0 ? sheet.notes[sel] : null);
    const activePitch = () => {
        const n = curEvent();
        return n && !n.r ? n.k[Math.min(selK, n.k.length - 1)] : null;
    };
    function renderToolbar() {
        const cur = curEvent(),
            ap = activePitch();
        const mode = cur ? (cur.r ? "rest" : "note") : tool.mode,
            d = cur ? cur.d : tool.d,
            dot = cur ? !!cur.dot : tool.dot,
            a = ap ? ap.a : tool.a;
        $("#durGroup").innerHTML =
            DUR_ORDER.map(
                (k, i) =>
                    `<button class="tb" type="button" data-dur="${k}" aria-pressed="${d === k}" title="${DUR_NAME[k]} (${i + 1})" aria-label="${DUR_NAME[k]}">${durIcon(k, mode === "rest")}</button>`,
            ).join("") +
            `<button class="tb" type="button" id="sDot" aria-pressed="${dot}" title="Dotted (.)" aria-label="Dotted">•</button>`;
        $$("[data-mode]").forEach((b) =>
            b.setAttribute("aria-pressed", b.dataset.mode === mode),
        );
        $("#sChord").setAttribute("aria-pressed", tool.chord);
        $$("[data-acc]").forEach((b) => {
            b.setAttribute("aria-pressed", +b.dataset.acc === a);
            b.disabled = !!(cur && cur.r);
        });
        $("#sDel").disabled = sel < 0;
        $("#sUndo").disabled = !undoStack.length;
        $("#sClear").disabled = !sheet.notes.length;
        $("#sPlay").textContent = play ? "■ stop" : "▶ play";
        $("#sTempo").value = sheet.tempo;
        $("#sTempoRead").textContent = sheet.tempo;
        $("#sTempoMeta").textContent = sheet.tempo;
        $("#sTime").value = sheet.time;
    }

    /* ---------- edit operations ---------- */
    function snapshot() {
        undoStack.push(JSON.stringify({notes: sheet.notes, sel, selK}));
        if (undoStack.length > 120) undoStack.shift();
    }
    function changed() {
        sheet.example = false;
        persistCurrent();
        renderSheet();
        renderToolbar();
        markSheetDirty();
    }
    function chordOut(n) {
        const g = ac.createGain();
        g.gain.value = 1 / Math.sqrt(n);
        return g;
    }
    function playEvent(n, dur, t0, out) {
        if (!n || n.r) return;
        audio();
        const g = chordOut(n.k.length);
        g.connect(out || master);
        n.k.forEach((p) =>
            VOICES[sheet.voice](
                midiOf(p),
                t0 != null ? t0 : ac.currentTime,
                dur,
                g,
            ),
        );
    }
    function insertNote(n, at) {
        snapshot();
        const idx = at != null ? at : sel >= 0 ? sel + 1 : sheet.notes.length;
        sheet.notes.splice(idx, 0, n);
        sel = idx;
        selK = 0;
        changed();
        playEvent(n, Math.min(1.4, (beatsOf(n) * 60) / sheet.tempo + 0.2));
    }
    function newNoteAt(s, a = tool.a) {
        return tool.mode === "rest"
            ? {r: true, d: tool.d, dot: tool.dot}
            : {k: [{s: clampS(s), a}], d: tool.d, dot: tool.dot};
    }
    function chordWanted(shift) {
        const n = curEvent();
        return (tool.chord || !!shift) && tool.mode !== "rest" && n && !n.r;
    }
    function addToChord(s, a) {
        const n = curEvent();
        if (!n || n.r) return;
        s = clampS(s);
        snapshot();
        const i = n.k.findIndex((p) => p.s === s);
        if (i >= 0) {
            if (n.k.length > 1) {
                n.k.splice(i, 1);
                selK = Math.min(selK, n.k.length - 1);
                toast(`${pitchLabel(s, a)} taken out of the chord`);
            } else {
                undoStack.pop();
                return;
            }
        } else {
            if (n.k.length >= 6) {
                undoStack.pop();
                toast("A chord can hold up to six notes");
                return;
            }
            const p = {s, a};
            n.k.push(p);
            n.k.sort((x, y) => x.s - y.s);
            selK = n.k.indexOf(p);
            tone(midiOf(p), 0.8, sheet.voice);
        }
        changed();
    }
    function delSel() {
        if (sel < 0) return;
        snapshot();
        sheet.notes.splice(sel, 1);
        sel = Math.min(sel, sheet.notes.length - 1);
        selK = 0;
        changed();
    }
    function undo() {
        const u = undoStack.pop();
        if (!u) return;
        const o = JSON.parse(u);
        sheet.notes = o.notes;
        sel = Math.min(o.sel, sheet.notes.length - 1);
        selK = o.selK || 0;
        persistCurrent();
        renderSheet();
        renderToolbar();
    }
    function moveSel(ds, onlyActive) {
        const n = curEvent();
        if (!n || n.r) return;
        if (onlyActive && n.k.length > 1) {
            const p = activePitch(),
                ns = clampS(p.s + ds);
            if (ns === p.s || n.k.some((q) => q !== p && q.s === ns)) return;
            snapshot();
            p.s = ns;
            n.k.sort((x, y) => x.s - y.s);
            selK = n.k.indexOf(p);
            changed();
            tone(midiOf(p), 0.5, sheet.voice);
            return;
        }
        const lo = n.k[0].s,
            hi = n.k[n.k.length - 1].s;
        if (lo + ds < S_MIN || hi + ds > S_MAX) return;
        snapshot();
        n.k.forEach((p) => (p.s += ds));
        changed();
        playEvent(n, 0.5);
    }

    /* ---------- renderer ---------- */
    const GAP = 12,
        HALF = 6,
        SYS_H = 152,
        STAFF_OFF = 54,
        SHIFT = 11.6;
    function geom(n) {
        const ks = n.k,
            avg = ks.reduce((a, p) => a + p.s, 0) / ks.length,
            up = avg < 6,
            disp = ks.map(() => 0);
        if (up) {
            for (let j = 1; j < ks.length; j++)
                if (ks[j].s - ks[j - 1].s === 1 && disp[j - 1] === 0)
                    disp[j] = 1;
        } else {
            for (let j = ks.length - 2; j >= 0; j--)
                if (ks[j + 1].s - ks[j].s === 1 && disp[j + 1] === 0)
                    disp[j] = -1;
        }
        const col = ks.map(() => -1),
            placed = [];
        let cols = 0;
        for (let j = ks.length - 1; j >= 0; j--)
            if (ks[j].a) {
                let c = 0;
                while (
                    placed.some((q) => q.c === c && Math.abs(q.s - ks[j].s) < 6)
                )
                    c++;
                col[j] = c;
                placed.push({c, s: ks[j].s});
                cols = Math.max(cols, c + 1);
            }
        return {
            up,
            disp,
            col,
            cols,
            left: disp.includes(-1),
            right: disp.includes(1),
        };
    }
    function noteW(n) {
        const base = 30 + 18 * Math.sqrt(beatsOf(n)) + (n.dot ? 7 : 0);
        if (n.r) return Math.round(base);
        const g = geom(n);
        return Math.round(
            base +
                (g.cols ? 6 + g.cols * 10 : 0) +
                (g.left || g.right ? 12 : 0),
        );
    }
    function headX(n, x0) {
        if (n.r) return x0 + 14;
        const g = geom(n);
        return (
            x0 +
            14 +
            (g.cols ? 6 + (g.cols - 1) * 10 : 0) +
            (g.left ? SHIFT : 0)
        );
    }
    /* The treble clef glyph differs between fonts, so measure it once and fit it to standard engraving:
   the box runs from ~1.4 spaces above the top line to ~1.6 below the bottom line, which puts the curl on the G line. */
    let clefFit = null;
    function measureClef() {
        try {
            const t = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text",
            );
            t.setAttribute("class", "clef");
            t.setAttribute("x", 0);
            t.setAttribute("y", 100);
            t.setAttribute("font-size", 50);
            t.textContent = "𝄞";
            svgEl.appendChild(t);
            const bb = t.getBBox();
            t.remove();
            if (bb.height > 5) {
                const size = (50 * 7.02 * GAP) / bb.height;
                clefFit = {
                    size,
                    off: ((bb.y - 100) * size) / 50,
                    dx: (-bb.x * size) / 50,
                };
            }
        } catch {
            clefFit = null;
        }
    }
    function clefSVG(top) {
        if (!clefFit) measureClef();
        if (!clefFit)
            return `<text class="clef" x="12" y="${top + 4 * GAP + 1}" font-size="50">𝄞</text>`;
        return `<text class="clef" x="${(10 + clefFit.dx).toFixed(1)}" y="${(top - 1.39 * GAP - clefFit.off).toFixed(1)}" font-size="${clefFit.size.toFixed(1)}">𝄞</text>`;
    }
    if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => {
            clefFit = null;
            if (!$("#studio").hidden) renderSheet();
        });
    function renderSheet() {
        const svg = $("#sheetSvg"),
            Wd = Math.max(
                280,
                svg.clientWidth || svg.parentNode.clientWidth || 600,
            );
        const [num, den] = sheet.time.split("/").map(Number),
            measure = (num * 4) / den;
        const els = [];
        let acc = 0;
        sheet.notes.forEach((n, i) => {
            els.push({k: "n", i, w: noteW(n)});
            acc += beatsOf(n);
            if (acc >= measure - 1e-6 && i < sheet.notes.length - 1) {
                els.push({k: "bar", w: 16});
                acc = acc - measure * Math.floor(acc / measure + 1e-9);
                if (acc < 1e-6) acc = 0;
            }
        });
        systems = [];
        layout = [];
        const startX = (si) => (si === 0 ? 86 : 56);
        let sys = {els: [], x: startX(0)};
        systems.push(sys);
        for (const el of els) {
            if (sys.x + el.w > Wd - 10 && sys.els.length) {
                if (el.k === "bar") continue;
                sys = {els: [], x: startX(systems.length)};
                systems.push(sys);
            }
            el.x = sys.x;
            sys.els.push(el);
            sys.x += el.w;
        }
        const Ht = Math.max(1, systems.length) * SYS_H + 10;
        svg.setAttribute("viewBox", `0 0 ${Wd} ${Ht}`);
        svg.setAttribute("height", Ht);
        let out = "";
        systems.forEach((sy, si) => {
            const top = si * SYS_H + STAFF_OFF;
            sy.top = top;
            out += `<g class="staff">${[0, 1, 2, 3, 4].map((k) => `<line x1="6" x2="${Wd - 6}" y1="${top + k * GAP}" y2="${top + k * GAP}"/>`).join("")}</g>`;
            out += `<line class="bar" x1="6" x2="6" y1="${top}" y2="${top + 4 * GAP}"/>${clefSVG(top)}`;
            if (si === 0)
                out += `<text class="ts" x="62" y="${top + 2 * GAP - 3}" text-anchor="middle">${num}</text><text class="ts" x="62" y="${top + 4 * GAP - 3}" text-anchor="middle">${den}</text>`;
            for (const el of sy.els) {
                if (el.k === "bar") {
                    const bx = el.x + el.w / 2;
                    out += `<line class="bar" x1="${bx}" x2="${bx}" y1="${top}" y2="${top + 4 * GAP}"/>`;
                    continue;
                }
                const n = sheet.notes[el.i],
                    cxn = headX(n, el.x);
                layout[el.i] = {x: el.x, w: el.w, cx: cxn, sys: si};
                out += noteSVG(n, el.i, cxn, top, el.x, el.w);
            }
            if (si === systems.length - 1) {
                const ex = Wd - 8;
                out += sheet.notes.length
                    ? `<line class="bar" x1="${ex - 6}" x2="${ex - 6}" y1="${top}" y2="${top + 4 * GAP}"/><line class="bar end" x1="${ex}" x2="${ex}" y1="${top}" y2="${top + 4 * GAP}"/>`
                    : `<line class="bar" x1="${Wd - 6}" x2="${Wd - 6}" y1="${top}" y2="${top + 4 * GAP}"/>`;
            }
        });
        if (!sheet.notes.length)
            out += `<text class="empty" x="${Wd / 2 + 30}" y="${STAFF_OFF + 2 * GAP - 18}" text-anchor="middle">click the staff or the keyboard to write your first note</text>`;
        const ci = sel >= 0 ? layout[sel] : null;
        let caretX, caretSys;
        if (ci) {
            caretX = ci.x + ci.w - 2;
            caretSys = ci.sys;
        } else if (sheet.notes.length) {
            const L = layout[sheet.notes.length - 1];
            caretX = L.x + L.w - 2;
            caretSys = L.sys;
        } else {
            caretX = 92;
            caretSys = 0;
        }
        if (!play) {
            const t = systems[caretSys].top;
            out += `<line class="caretline" x1="${caretX}" x2="${caretX}" y1="${t - 14}" y2="${t + 4 * GAP + 14}"/>`;
        }
        out += '<g id="ghostG"></g>';
        svg.innerHTML = out;
        const beats = sheet.notes.reduce((a, n) => a + beatsOf(n), 0),
            secs = (beats * 60) / sheet.tempo,
            bars = Math.ceil(beats / measure - 1e-9);
        const notesN = sheet.notes.filter((n) => !n.r).length,
            chordsN = sheet.notes.filter((n) => !n.r && n.k.length > 1).length,
            restsN = sheet.notes.length - notesN;
        const cur = curEvent();
        $("#sInfo").innerHTML =
            `<b>${notesN}</b> notes${chordsN ? ` (<b>${chordsN}</b> chords)` : ""} · <b>${restsN}</b> rests · <b>${bars}</b> bar${bars === 1 ? "" : "s"} · ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")} at ${sheet.tempo} bpm` +
            (cur
                ? ` · selected: <b>${cur.r ? DUR_NAME[cur.d] + " rest" : chordLabel(cur) + " " + DUR_NAME[cur.d] + (cur.k.length > 1 ? " chord" : "")}</b>`
                : "") +
            (tool.chord ? " · <b>chord mode</b>" : "");
        $("#exampleTag").hidden = !sheet.example;
    }
    function noteSVG(n, i, cxn, top, x0, w) {
        const cls = `n${i === sel ? " sel" : ""}${play && play.cur === i ? " playing" : ""}`;
        let g = `<g class="${cls}" data-i="${i}"><rect class="hit" x="${x0 + 2}" y="${top - 20}" width="${w - 4}" height="${4 * GAP + 40}" rx="6"/>`;
        if (n.r) {
            const mid = top + 2 * GAP,
                x = cxn;
            if (n.d === "w")
                g += `<rect class="ink" x="${x - 7}" y="${top + GAP}" width="14" height="6"/>`;
            else if (n.d === "h")
                g += `<rect class="ink" x="${x - 7}" y="${mid - 6}" width="14" height="6"/>`;
            else if (n.d === "q")
                g += `<path class="ink" stroke-width="0" d="M${x - 2} ${mid - 17} L${x + 5} ${mid - 9} C${x + 1} ${mid - 5} ${x + 1} ${mid - 3} ${x + 5} ${mid + 3} C${x - 3} ${mid} ${x - 4} ${mid + 7} ${x + 1} ${mid + 12} C${x - 8} ${mid + 7} ${x - 5} ${mid - 3} ${x + 1} ${mid + 1} L${x - 5} ${mid - 7} C${x - 1} ${mid - 10} ${x - 1} ${mid - 13} ${x - 2} ${mid - 17} Z"/>`;
            else {
                g += `<circle class="ink" cx="${x - 3}" cy="${mid - 5}" r="3"/><line class="stem" x1="${x + 4}" y1="${mid - 7}" x2="${x - 1}" y2="${mid + (n.d === "s" ? 16 : 10)}"/><path class="ink" stroke-width="0" d="M${x - 5} ${mid - 4} Q${x} ${mid - 3} ${x + 4} ${mid - 8} L${x + 4} ${mid - 6} Q${x} ${mid - 1} ${x - 5} ${mid - 2} Z"/>`;
                if (n.d === "s")
                    g += `<circle class="ink" cx="${x - 5}" cy="${mid + 2}" r="3"/><path class="ink" stroke-width="0" d="M${x - 7} ${mid + 3} Q${x - 2} ${mid + 4} ${x + 2} ${mid - 1} L${x + 2} ${mid + 1} Q${x - 2} ${mid + 6} ${x - 7} ${mid + 5} Z"/>`;
            }
            if (n.dot)
                g += `<circle class="ink" cx="${x + 10}" cy="${mid - 3}" r="2"/>`;
            return g + "</g>";
        }
        const ge = geom(n),
            hollow = n.d === "w" || n.d === "h",
            ys = n.k.map((p) => top + (10 - p.s) * HALF);
        const lo = n.k[0].s,
            hi = n.k[n.k.length - 1].s,
            lx1 = cxn - 10 - (ge.left ? SHIFT : 0),
            lx2 = cxn + 10 + (ge.right ? SHIFT : 0);
        for (let k = 0; k >= lo; k -= 2)
            g += `<line class="ledger" x1="${lx1}" x2="${lx2}" y1="${top + (10 - k) * HALF}" y2="${top + (10 - k) * HALF}"/>`;
        for (let k = 12; k <= hi; k += 2)
            g += `<line class="ledger" x1="${lx1}" x2="${lx2}" y1="${top + (10 - k) * HALF}" y2="${top + (10 - k) * HALF}"/>`;
        n.k.forEach((p, j) => {
            if (p.a)
                g += `<text class="acc" x="${cxn - (ge.left ? SHIFT : 0) - 18 - ge.col[j] * 10}" y="${ys[j] + 6}">${p.a > 0 ? "♯" : "♭"}</text>`;
        });
        n.k.forEach((p, j) => {
            const hx = cxn + ge.disp[j] * SHIFT,
                y = ys[j];
            g += hollow
                ? `<ellipse class="hollow head" data-k="${j}" cx="${hx}" cy="${y}" rx="6" ry="4.3" transform="rotate(-20 ${hx} ${y})"/>`
                : `<ellipse class="ink head" data-k="${j}" cx="${hx}" cy="${y}" rx="6.2" ry="4.4" transform="rotate(-20 ${hx} ${y})"/>`;
            if (
                i === sel &&
                j === Math.min(selK, n.k.length - 1) &&
                n.k.length > 1
            )
                g += `<circle class="ring" cx="${hx}" cy="${y}" r="9"/>`;
            if (n.dot)
                g += `<circle class="ink" cx="${cxn + 11 + (ge.right ? SHIFT : 0)}" cy="${p.s % 2 === 0 ? y - 4 : y}" r="2.1"/>`;
        });
        if (n.d !== "w") {
            const up = ge.up,
                sx = up ? cxn + 5.6 : cxn - 5.6,
                sy1 = up ? ys[0] - 1 : ys[ys.length - 1] + 1,
                sy2 = up ? ys[ys.length - 1] - 36 : ys[0] + 36;
            g += `<line class="stem" x1="${sx}" y1="${sy1}" x2="${sx}" y2="${sy2}"/>`;
            const flag = (off) => {
                const b = sy2 + (up ? off : -off),
                    k = up ? 1 : -1;
                return `<path class="ink" stroke-width="0" d="M${sx} ${b} C${sx + 1} ${b + 8 * k} ${sx + 11} ${b + 11 * k} ${sx + 8} ${b + 22 * k} C${sx + 12} ${b + 12 * k} ${sx + 4} ${b + 9 * k} ${sx} ${b + 6 * k} Z"/>`;
            };
            if (n.d === "e" || n.d === "s") g += flag(0);
            if (n.d === "s") g += flag(8);
        }
        return g + "</g>";
    }

    /* ---------- pointer editing on the staff ---------- */
    const svgEl = $("#sheetSvg");
    function svgPoint(e) {
        const r = svgEl.getBoundingClientRect(),
            vb = svgEl.viewBox.baseVal;
        return {
            x: ((e.clientX - r.left) * vb.width) / r.width,
            y: ((e.clientY - r.top) * vb.height) / r.height,
        };
    }
    function sysAt(y) {
        return Math.max(0, Math.min(systems.length - 1, Math.floor(y / SYS_H)));
    }
    function stepAt(y, si) {
        const top = systems[si].top;
        return clampS(Math.round(10 - (y - top) / HALF));
    }
    let noteDrag = null;
    svgEl.addEventListener("pointerdown", (e) => {
        if (play) return;
        const p = svgPoint(e),
            g = e.target.closest(".n"),
            si = sysAt(p.y),
            s = stepAt(p.y, si);
        if (chordWanted(e.shiftKey) && (!g || +g.dataset.i === sel)) {
            addToChord(s, tool.a);
            return;
        }
        if (g) {
            const i = +g.dataset.i,
                n = sheet.notes[i],
                head = e.target.closest(".head");
            if (sel !== i) selK = 0;
            sel = i;
            if (head) selK = +head.dataset.k;
            if (!n.r) {
                const one = head && n.k.length > 1 ? n.k[selK] : null;
                noteDrag = {
                    i,
                    y: p.y,
                    one,
                    s0: one ? one.s : 0,
                    base: n.k.map((q) => q.s),
                    moved: false,
                    snap: JSON.stringify({notes: sheet.notes, sel, selK}),
                };
            } else noteDrag = null;
            try {
                svgEl.setPointerCapture(e.pointerId);
            } catch {}
            renderSheet();
            renderToolbar();
            if (!n.r) {
                if (head && n.k.length > 1)
                    tone(midiOf(n.k[selK]), 0.45, sheet.voice);
                else playEvent(n, 0.45);
            }
            return;
        }
        const inSys = layout
            .map((L, i) => (L && L.sys === si ? i : -1))
            .filter((i) => i >= 0);
        let at = sheet.notes.length;
        if (inSys.length) {
            const right = inSys.find((i) => layout[i].cx > p.x);
            at = right != null ? right : inSys[inSys.length - 1] + 1;
        } else if (si < systems.length - 1) at = 0;
        insertNote(newNoteAt(s), at);
    });
    svgEl.addEventListener("pointermove", (e) => {
        const p = svgPoint(e);
        if (noteDrag) {
            const n = sheet.notes[noteDrag.i],
                ds = Math.round((noteDrag.y - p.y) / HALF);
            let did = false;
            if (noteDrag.one) {
                const ns = clampS(noteDrag.s0 + ds),
                    q = noteDrag.one;
                if (ns !== q.s && !n.k.some((o) => o !== q && o.s === ns)) {
                    if (!noteDrag.moved) {
                        undoStack.push(noteDrag.snap);
                        noteDrag.moved = true;
                    }
                    q.s = ns;
                    n.k.sort((x, y) => x.s - y.s);
                    selK = n.k.indexOf(q);
                    did = true;
                    tone(midiOf(q), 0.35, sheet.voice);
                }
            } else {
                const lo = Math.min(...noteDrag.base),
                    hi = Math.max(...noteDrag.base),
                    d = Math.max(S_MIN - lo, Math.min(S_MAX - hi, ds));
                if (n.k[0].s !== noteDrag.base[0] + d) {
                    if (!noteDrag.moved) {
                        undoStack.push(noteDrag.snap);
                        noteDrag.moved = true;
                    }
                    n.k.forEach((q, j) => (q.s = noteDrag.base[j] + d));
                    did = true;
                    playEvent(n, 0.35);
                }
            }
            if (did) {
                sheet.example = false;
                renderSheet();
                renderToolbar();
            }
            return;
        }
        const gG = $("#ghostG"),
            chordy = chordWanted(e.shiftKey);
        if (!gG || play || (e.target.closest(".n") && !chordy)) {
            if (gG) gG.innerHTML = "";
            return;
        }
        const si = sysAt(p.y),
            s = stepAt(p.y, si),
            top = systems[si].top,
            y = top + (10 - s) * HALF;
        const gx =
            chordy && layout[sel] && layout[sel].sys === si
                ? layout[sel].cx
                : p.x;
        gG.innerHTML =
            tool.mode === "rest"
                ? `<text class="ghost-lbl" x="${p.x}" y="${top - 18}" text-anchor="middle">+ ${DUR_NAME[tool.d]} rest</text>`
                : `<ellipse class="ghost" cx="${gx}" cy="${y}" rx="6.2" ry="4.4" transform="rotate(-20 ${gx} ${y})"/><text class="ghost-lbl" x="${gx + 12}" y="${y - 8}">${chordy ? "+ " : ""}${pitchLabel(s, tool.a)}</text>`;
    });
    svgEl.addEventListener("pointerleave", () => {
        const gG = $("#ghostG");
        if (gG) gG.innerHTML = "";
    });
    const endNoteDrag = () => {
        if (noteDrag && noteDrag.moved) {
            persistCurrent();
            markSheetDirty();
        }
        noteDrag = null;
    };
    svgEl.addEventListener("pointerup", endNoteDrag);
    svgEl.addEventListener("pointercancel", endNoteDrag);

    /* ---------- toolbar actions ---------- */
    let chordHintShown = false;
    $(".toolbar").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const cur = curEvent();
        if (b.dataset.dur) {
            if (cur) {
                snapshot();
                cur.d = b.dataset.dur;
                changed();
            } else {
                tool.d = b.dataset.dur;
                renderToolbar();
            }
        } else if (b.id === "sDot") {
            if (cur) {
                snapshot();
                cur.dot = !cur.dot;
                changed();
            } else {
                tool.dot = !tool.dot;
                renderToolbar();
            }
        } else if (b.dataset.mode) {
            const m = b.dataset.mode;
            if (cur && (m === "rest") !== !!cur.r) {
                snapshot();
                if (m === "rest") {
                    delete cur.k;
                    cur.r = true;
                } else {
                    delete cur.r;
                    cur.k = [{s: 6, a: 0}];
                    selK = 0;
                }
                changed();
            }
            tool.mode = m;
            renderToolbar();
        } else if (b.id === "sChord") {
            tool.chord = !tool.chord;
            if (tool.chord && tool.mode === "rest") tool.mode = "note";
            renderToolbar();
            renderSheet();
            if (tool.chord && !chordHintShown) {
                chordHintShown = true;
                toast(
                    sel >= 0
                        ? "Chord mode: click the staff or a key to stack notes on the selected one. Click a note again to take it out."
                        : "Chord mode: add a note first, then click the staff or keys to stack more on it.",
                );
            }
        } else if (b.dataset.acc != null) {
            const a = +b.dataset.acc,
                ap = activePitch();
            if (ap) {
                snapshot();
                ap.a = a;
                changed();
                tone(midiOf(ap), 0.5, sheet.voice);
            } else {
                tool.a = a;
                renderToolbar();
            }
        } else if (b.id === "sDel") delSel();
        else if (b.id === "sUndo") undo();
        else if (b.id === "sClear") {
            if (!sheet.notes.length) return;
            snapshot();
            sheet.notes = [];
            sel = -1;
            changed();
            toast("Sheet cleared", "undo", undo);
        } else if (b.id === "sPlay") play ? stopPlay() : startPlay();
        else if (b.id === "sLoop") {
            b.setAttribute(
                "aria-pressed",
                b.getAttribute("aria-pressed") !== "true",
            );
        } else if (b.id === "sNew") newSheet();
        else if (b.id === "sSave") saveSheet();
    });
    $("#exampleNew").addEventListener("click", newSheet);
    $("#sTempo").addEventListener("input", (e) => {
        sheet.tempo = +e.target.value;
        $("#sTempoRead").textContent = sheet.tempo;
        $("#sTempoMeta").textContent = sheet.tempo;
        renderSheet();
        persistCurrent();
        markSheetDirty();
    });
    $("#sTime").addEventListener("change", (e) => {
        sheet.time = e.target.value;
        renderSheet();
        persistCurrent();
        markSheetDirty();
    });
    $("#sTitle").addEventListener("input", (e) => {
        sheet.title = e.target.value;
        sheet.example = false;
        persistCurrent();
        markSheetDirty();
        $("#exampleTag").hidden = true;
    });
    $("#sComposer").addEventListener("input", (e) => {
        sheet.composer = e.target.value;
        LS.set("an.composer", sheet.composer);
        persistCurrent();
        markSheetDirty();
    });

    /* ---------- studio keyboard (A3–C6) ---------- */
    const STUDIO_KEYS = (() => {
        const ks = [];
        let wi = 0;
        for (let s = S_MIN; s <= S_MAX; s++) {
            ks.push({
                id: "s" + s,
                s,
                a: 0,
                midi: midiOf({s}),
                label: mod(s, 7) === 0 ? "C" + (4 + Math.floor(s / 7)) : "",
            });
            if ([0, 1, 3, 4, 5].includes(mod(s, 7)) && s < S_MAX)
                ks.push({
                    id: "s" + s + "#",
                    s,
                    a: 1,
                    midi: midiOf({s, a: 1}),
                    black: true,
                    after: wi,
                });
            wi++;
        }
        return ks;
    })();
    function onStudioKey(k, glide, shift) {
        let s = k.s,
            a = k.a;
        if (a === 1 && tool.a === -1) {
            s = k.s + 1;
            a = -1;
        } else if (!k.black && tool.a) a = tool.a;
        $("#sKeys")._light(k.id);
        if (glide) {
            tone(k.midi, 0.6, sheet.voice);
            return;
        }
        if (tool.mode === "rest") {
            insertNote({r: true, d: tool.d, dot: tool.dot});
            return;
        }
        if (chordWanted(shift)) {
            addToChord(s, a);
            return;
        }
        insertNote({k: [{s, a}], d: tool.d, dot: tool.dot});
    }
    const STUDIO_CODES = {
        KeyA: [0, 0],
        KeyS: [1, 0],
        KeyD: [2, 0],
        KeyF: [3, 0],
        KeyG: [4, 0],
        KeyH: [5, 0],
        KeyJ: [6, 0],
        KeyK: [7, 0],
        KeyL: [8, 0],
        Semicolon: [9, 0],
        Quote: [10, 0],
        KeyW: [0, 1],
        KeyE: [1, 1],
        KeyT: [3, 1],
        KeyY: [4, 1],
        KeyU: [5, 1],
        KeyO: [7, 1],
        KeyP: [8, 1],
    };

    /* ---------- playback ---------- */
    function startPlay(from) {
        if (!sheet.notes.length) {
            toast("Add a few notes first");
            return;
        }
        audio();
        const spb = 60 / sheet.tempo,
            start =
                from != null
                    ? from
                    : sel >= 0 && sel < sheet.notes.length - 1
                      ? sel
                      : 0;
        const bus = ac.createGain();
        bus.gain.value = 1;
        bus.connect(master);
        const t0 = ac.currentTime + 0.08,
            times = [];
        let t = 0;
        for (let i = start; i < sheet.notes.length; i++) {
            const n = sheet.notes[i],
                dur = beatsOf(n) * spb;
            times.push({i, at: t0 + t, end: t0 + t + dur});
            if (!n.r) playEvent(n, Math.max(0.12, dur * 0.94), t0 + t, bus);
            t += dur;
        }
        play = {
            bus,
            times,
            end: t0 + t,
            cur: -1,
            title: sheet.title || "Untitled",
        };
        renderToolbar();
        renderSheet();
        updateNowPlaying();
        const tick = () => {
            if (!play) return;
            const now = ac.currentTime,
                cur = play.times.find((x) => now >= x.at && now < x.end),
                ci = cur ? cur.i : -1;
            if (ci !== play.cur) {
                play.cur = ci;
                $$("#sheetSvg .n.playing").forEach((g) =>
                    g.classList.remove("playing"),
                );
                if (ci >= 0) {
                    const g = $(`#sheetSvg .n[data-i="${ci}"]`);
                    if (g) g.classList.add("playing");
                    const n = sheet.notes[ci];
                    $("#sSaved").textContent = n.r
                        ? "rest"
                        : `♪ ${chordLabel(n)}`;
                    if (!n.r) {
                        const kb = $("#sKeys");
                        n.k.forEach((p) => {
                            if (p.a !== -1)
                                kb._light("s" + p.s + (p.a === 1 ? "#" : ""));
                        });
                        pulse(0.25 + 0.08 * n.k.length);
                    }
                }
            }
            if (now >= play.end + 0.05) {
                const loop =
                    $("#sLoop").getAttribute("aria-pressed") === "true";
                stopPlay(true);
                if (loop) startPlay(0);
                return;
            }
            play.raf = requestAnimationFrame(tick);
        };
        play.raf = requestAnimationFrame(tick);
    }
    function stopPlay(natural) {
        if (!play) return;
        const b = play.bus;
        cancelAnimationFrame(play.raf);
        if (!natural) {
            b.gain.setTargetAtTime(0, ac.currentTime, 0.03);
        }
        setTimeout(
            () => {
                try {
                    b.disconnect();
                } catch {}
            },
            natural ? 2500 : 300,
        );
        play = null;
        $("#sSaved").textContent = "";
        renderSheet();
        renderToolbar();
        updateNowPlaying();
    }
    /* a small "now playing" pill, so a sheet can keep playing while you look around the home page */
    const nowPlaying = document.createElement("div");
    nowPlaying.id = "nowPlaying";
    nowPlaying.className = "now-playing";
    nowPlaying.hidden = true;
    nowPlaying.innerHTML =
        '<button type="button" data-np="open" title="Back to the studio"><span class="np-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="np-t"></span></button><button type="button" data-np="stop" aria-label="Stop playback">■</button>';
    document.body.appendChild(nowPlaying);
    nowPlaying.addEventListener("click", (e) => {
        const b = e.target.closest("[data-np]");
        if (!b) return;
        if (b.dataset.np === "stop") stopPlay();
        else location.hash = "studio";
    });
    function updateNowPlaying() {
        const show = !!play && $("#studio").hidden;
        nowPlaying.hidden = !show;
        if (show) nowPlaying.querySelector(".np-t").textContent = play.title;
    }

    /* ---------- storage: current draft, saved sheets ---------- */
    function persistCurrent() {
        clearTimeout(persistCurrent.t);
        persistCurrent.t = setTimeout(
            () => LS.set("an.studio.current", sheet),
            250,
        );
    }
    function markSheetDirty() {
        if (sheet.id) $("#sSave").textContent = "save*";
    }
    function localSheets() {
        return LS.get("an.studio.sheets", []);
    }
    async function saveSheet() {
        if (!sheet.notes.length) {
            toast("Add some notes before saving");
            return;
        }
        if (!sheet.title.trim()) {
            sheet.title = "Untitled";
            $("#sTitle").value = sheet.title;
        }
        sheet.id = sheet.id || "sh" + Date.now().toString(36) + uid();
        sheet.example = false;
        const rec = {
            id: sheet.id,
            title: sheet.title,
            composer: sheet.composer,
            tempo: sheet.tempo,
            time: sheet.time,
            voice: sheet.voice,
            notes: sheet.notes,
            updatedAt: Date.now(),
        };
        const btn = $("#sSave");
        btn.disabled = true;
        try {
            const list = localSheets().filter((x) => x.id !== rec.id);
            list.unshift(rec);
            if (!LS.set("an.studio.sheets", list)) throw new Error("storage");
            toast(`Saved "${rec.title}" in this browser`);
            btn.textContent = "saved ✓";
            setTimeout(() => {
                if (btn.textContent === "saved ✓") btn.textContent = "save";
            }, 1800);
        } catch (err) {
            toast(
                "This browser blocked saving. Try a regular (non-private) window.",
            );
        }
        btn.disabled = false;
        persistCurrent();
        renderSheetList();
    }
    function newSheet() {
        stopPlay();
        undoStack = [];
        sheet = BLANK();
        sel = -1;
        loadSheetIntoUI();
        toast("New blank sheet");
    }
    function loadSheetIntoUI() {
        $("#sTitle").value = sheet.title || "";
        $("#sComposer").value = sheet.composer || "";
        renderInstruments();
        renderSheet();
        renderToolbar();
        persistCurrent();
        renderSheetList();
    }
    function renderSheetList() {
        const list = localSheets();
        const ul = $("#sheetList");
        if (!list.length) {
            ul.innerHTML =
                '<li class="empty-note">No saved sheets yet. Give your sheet a title and your name, then press save.</li>';
            return;
        }
        ul.innerHTML = list
            .map(
                (
                    r,
                ) => `<li class="${r.id === sheet.id ? "cur" : ""}" data-id="${E(r.id)}"><span class="meta"><b>${E(r.title || "Untitled")}</b><small>${r.composer ? "by " + E(r.composer) + " · " : ""}${(r.notes || []).length} notes · ${E(instName(r.voice || "piano"))} · ${new Date(r.updatedAt || Date.now()).toLocaleDateString("en-CA", {month: "short", day: "numeric"})}</small></span>
    <span class="acts"><button class="btn" type="button" data-sh="open">open</button><button class="btn" type="button" data-sh="play">▶</button><button class="btn" type="button" data-sh="del">delete</button></span></li>`,
            )
            .join("");
    }
    $("#sheetList").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-sh]");
        if (!b) return;
        const id = b.closest("li").dataset.id,
            list = localSheets(),
            rec = list.find((x) => x.id === id);
        if (!rec) return;
        if (b.dataset.sh === "open" || b.dataset.sh === "play") {
            stopPlay();
            undoStack = [];
            sheet = normSheet(clone(rec));
            sel = -1;
            selK = 0;
            loadSheetIntoUI();
            scrollTo({
                top: $(".sheet-card").offsetTop - 20,
                behavior: reduce ? "auto" : "smooth",
            });
            if (b.dataset.sh === "play") setTimeout(() => startPlay(0), 300);
        }
        if (b.dataset.sh === "del") {
            if (b.dataset.armed !== "1") {
                b.dataset.armed = "1";
                b.textContent = "confirm";
                setTimeout(() => {
                    b.dataset.armed = "";
                    b.textContent = "delete";
                }, 3000);
                return;
            }
            LS.set(
                "an.studio.sheets",
                localSheets().filter((x) => x.id !== id),
            );
            if (sheet.id === id) sheet.id = null;
            toast(`Deleted "${rec.title}"`);
            renderSheetList();
        }
    });

    /* =====================================================================
   ADMIN — edit the live home page in place
   ===================================================================== */
    /* Who can open the editor with #admin. Edits only ever touch the editor's own browser;
   the live site changes when you replace content.json on the server.
   'anywhere'  — any visitor can open it (harmless, it is their own copy)
   'localhost' — only when the site is served from localhost / 127.0.0.1
   'off'       — no editor at all */
    const EDITOR = "anywhere";
    const canEdit =
        EDITOR === "anywhere" ||
        (EDITOR === "localhost" &&
            /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
    let dirty = false;
    let adminUndo = [];
    let panelTab = "site",
        panelItem = null;

    function setDirty(v) {
        dirty = v;
        const s = $("#admState");
        s.textContent = v ? "unsaved changes" : "all changes saved";
        s.classList.toggle("dirty", v);
    }
    function pushUndo() {
        adminUndo.push(JSON.stringify(C));
        if (adminUndo.length > 60) adminUndo.shift();
    }
    function enterEdit() {
        if (!canEdit) return;
        editing = true;
        document.body.classList.add("editing");
        $("#admBar").hidden = false;
        setDirty(JSON.stringify(C) !== JSON.stringify(saved));
        render();
        openPanel("site");
        toast(
            "Editing. Save keeps changes in this browser; export content.json to publish them.",
        );
    }
    function exitEdit() {
        editing = false;
        document.body.classList.remove("editing");
        $("#admBar").hidden = true;
        $("#admPanel").hidden = true;
        $("#admConfirm").hidden = true;
        if (location.hash === "#admin") {
            try {
                history.replaceState(
                    null,
                    "",
                    location.pathname + location.search,
                );
            } catch {}
        }
        render();
    }
    function makeEditable() {
        $$("main [data-edit]").forEach((el) => {
            try {
                el.contentEditable = "plaintext-only";
            } catch {
                el.contentEditable = "true";
            }
            if (el.contentEditable !== "plaintext-only")
                el.contentEditable = "true";
            el.spellcheck = true;
        });
    }
    document.addEventListener("input", (e) => {
        const el = e.target.closest && e.target.closest("main [data-edit]");
        if (!el || !editing) return;
        const path = el.dataset.edit,
            v = el.textContent;
        if (!el._undoPushed) {
            pushUndo();
            el._undoPushed = true;
        }
        setP(C, path, v);
        setDirty(true);
        $$(`main [data-edit="${path}"]`).forEach((o) => {
            if (o !== el) o.textContent = v;
        });
        refreshPanelFields();
    });
    document.addEventListener("focusout", (e) => {
        const el = e.target.closest && e.target.closest("main [data-edit]");
        if (!el) return;
        el._undoPushed = false;
        const m = el.dataset.edit.match(/^(.*\.(?:tags|flow|bullets))\.(\d+)$/);
        if (editing && m && !el.textContent.trim()) {
            getP(C, m[1]).splice(+m[2], 1);
            setDirty(true);
            setTimeout(() => {
                render();
                refreshPanelFields();
            }, 0);
        }
    });
    document.addEventListener("keydown", (e) => {
        if (
            editing &&
            e.key === "Enter" &&
            e.target.closest &&
            e.target.closest("main [data-edit]")
        ) {
            e.preventDefault();
            e.target.blur();
        }
    });
    document.addEventListener("paste", (e) => {
        const el = e.target.closest && e.target.closest("main [data-edit]");
        if (!el || !editing || el.contentEditable === "plaintext-only") return;
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData)
            .getData("text/plain")
            .replace(/\s+/g, " ");
        document.execCommand("insertText", false, t);
    });
    /* in edit mode links and nav buttons stop navigating so you can edit their text */
    document.addEventListener(
        "click",
        (e) => {
            if (!editing) return;
            const inHome = e.target.closest(
                "#home, #studioTop, #studioHero, .sheets-head",
            );
            if (!inHome) return;
            if (
                e.target.closest(
                    ".item-tools, .sec-tools, .add-item, .ex-tools",
                )
            )
                return;
            const a = e.target.closest(
                "a, [data-open-tty], [data-copy-email], #riff",
            );
            if (a) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true,
    );

    /* item / section tools */
    const BLANKS = {
        "projects.items": () => ({
            id: uid(),
            title: "New project",
            sub: "What it is · stack",
            status: "building",
            size: "normal",
            desc: "One or two sentences about what it does and why it was interesting to build.",
            tags: ["Tag"],
            url: "",
            linkLabel: "",
            detail: "none",
            flow: [],
            ledger: [],
        }),
        "experience.items": () => ({
            id: uid(),
            role: "Role",
            org: "Organisation",
            when: "2026",
            desc: "What you did there and what came of it.",
            bullets: [],
        }),
        "certs.items": () => ({
            id: uid(),
            badge: "✓",
            title: "Certification name",
            issuer: "Issuer",
            when: "2026",
            note: "",
        }),
        "education.items": () => ({
            id: uid(),
            role: "Degree or certificate",
            org: "School",
            when: "2026",
            desc: "",
            bullets: [],
            courses: [],
        }),
        "stack.groups": () => ({
            id: uid(),
            name: "Group",
            items: [["Tool", ""]],
        }),
        "contact.links": () => ({id: uid(), label: "link", url: "https://"}),
        "studio.links": () => ({id: uid(), label: "link", url: "https://"}),
    };
    document.addEventListener("click", (e) => {
        if (!editing) return;
        const tb = e.target.closest(".item-tools button");
        if (tb) {
            const host = tb.closest("[data-item]"),
                list = host.dataset.item,
                i = +host.dataset.idx,
                arr = getP(C, list);
            e.preventDefault();
            if (tb.dataset.act === "edit") {
                openPanel("item", {list, i});
                return;
            }
            pushUndo();
            if (tb.dataset.act === "up" && i > 0)
                [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
            else if (tb.dataset.act === "down" && i < arr.length - 1)
                [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
            else if (tb.dataset.act === "dup") {
                const c = clone(arr[i]);
                c.id = uid();
                arr.splice(i + 1, 0, c);
            } else if (tb.dataset.act === "del") {
                arr.splice(i, 1);
                if (panelItem && panelItem.list === list) panelItem = null;
                toast("Deleted", "undo", adminUndoStep);
            } else {
                adminUndo.pop();
                return;
            }
            setDirty(true);
            render();
            if (panelTab === "item") renderPanel();
            return;
        }
        const tx = e.target.closest("[data-tag-del]");
        if (tx) {
            pushUndo();
            getP(C, tx.dataset.tagDel).splice(+tx.dataset.i, 1);
            setDirty(true);
            render();
            refreshPanelFields();
            return;
        }
        const ta = e.target.closest("[data-tag-add]");
        if (ta) {
            const path = ta.dataset.tagAdd,
                arr = getP(C, path);
            pushUndo();
            arr.push(
                path.endsWith(".courses")
                    ? ["Course name", "B"]
                    : path.endsWith(".items")
                      ? ["New tool", ""]
                      : path.endsWith(".flow")
                        ? "Step"
                        : path.endsWith(".bullets")
                          ? "New point"
                          : "new tag",
            );
            setDirty(true);
            render();
            refreshPanelFields();
            const el = $(
                `main [data-edit="${path}.${arr.length - 1}${path.endsWith(".items") ? ".0" : ""}"]`,
            );
            if (el) {
                el.focus();
                const r = document.createRange();
                r.selectNodeContents(el);
                const sl = getSelection();
                sl.removeAllRanges();
                sl.addRange(r);
            }
            return;
        }
        const add = e.target.closest(".add-item");
        if (add) {
            pushUndo();
            const list = add.dataset.add,
                arr = getP(C, list);
            arr.push(BLANKS[list]());
            setDirty(true);
            render();
            openPanel("item", {list, i: arr.length - 1});
            return;
        }
        const st = e.target.closest(".sec-tools button");
        if (st) {
            sectionAct(st.closest(".sec-tools").dataset.sec, st.dataset.sact);
        }
    });
    function sectionAct(id, act) {
        const i = C.order.findIndex((o) => o.id === id);
        if (i < 0) return;
        pushUndo();
        if (act === "up" && i > 0)
            [C.order[i - 1], C.order[i]] = [C.order[i], C.order[i - 1]];
        else if (act === "down" && i < C.order.length - 1)
            [C.order[i + 1], C.order[i]] = [C.order[i], C.order[i + 1]];
        else if (act === "toggle") C.order[i].on = !C.order[i].on;
        setDirty(true);
        render();
        if (panelTab === "sections") renderPanel();
    }
    function adminUndoStep() {
        const u = adminUndo.pop();
        if (!u) {
            toast("Nothing to undo");
            return;
        }
        C = JSON.parse(u);
        setDirty(JSON.stringify(C) !== JSON.stringify(saved));
        render();
        renderPanel();
    }

    /* ---------- side panel ---------- */
    /* visitor theme: anyone can pick one in the top bar; it is remembered in their browser.
   The site default (C.theme) is what first-time visitors see and what the editor shows. */
    const THEME_KEY = "an.theme";
    let visitorTheme = LS.get(THEME_KEY, null);
    function currentPalette() {
        const v = editing
            ? C.theme
            : visitorTheme && THEMES[visitorTheme]
              ? visitorTheme
              : C.theme;
        return THEMES[v] ? v : "navy";
    }
    function applyPalette() {
        const p = currentPalette();
        if (document.documentElement.dataset.palette !== p)
            document.documentElement.dataset.palette = p;
        readColors();
        renderThemeMenu();
    }
    function renderThemeMenu() {
        const m = $("#themeMenu");
        if (!m) return;
        const p = currentPalette();
        m.innerHTML = Object.entries(THEMES)
            .map(
                ([k, t]) =>
                    `<button type="button" role="menuitemradio" aria-checked="${k === p}" data-theme-set="${k}"><span class="sw" aria-hidden="true">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span>${t.label}${!editing && k === C.theme ? ' <small style="color:var(--dim)">default</small>' : ""}</button>`,
            )
            .join("");
    }
    function setVisitorTheme(k) {
        if (!THEMES[k]) return;
        if (editing) {
            pushUndo();
            C.theme = k;
            setDirty(true);
            render();
            if (panelTab === "site") renderPanel();
            toast(
                `Site default theme: ${THEMES[k].label}. Save to publish it.`,
            );
            return;
        }
        visitorTheme = k === C.theme ? null : k;
        if (visitorTheme) LS.set(THEME_KEY, k);
        else LS.del(THEME_KEY);
        applyPalette();
    }
    let themeAnchor = null;
    function openThemeMenu(btn) {
        const m = $("#themeMenu");
        renderThemeMenu();
        m.hidden = false;
        themeAnchor = btn;
        btn.setAttribute("aria-expanded", "true");
        const r = btn.getBoundingClientRect(),
            w = m.offsetWidth;
        m.style.top = Math.round(r.bottom + 8) + "px";
        m.style.left =
            Math.round(
                Math.max(12, Math.min(innerWidth - w - 12, r.right - w)),
            ) + "px";
        const cur =
            m.querySelector('[aria-checked="true"]') ||
            m.querySelector("button");
        if (cur) cur.focus();
    }
    function closeThemeMenu() {
        const m = $("#themeMenu");
        if (m.hidden) return;
        m.hidden = true;
        if (themeAnchor) {
            themeAnchor.setAttribute("aria-expanded", "false");
            themeAnchor.focus();
        }
        themeAnchor = null;
    }
    document.addEventListener("click", (e) => {
        const b = e.target.closest && e.target.closest("[data-theme-menu]");
        if (b) {
            e.preventDefault();
            $("#themeMenu").hidden ? openThemeMenu(b) : closeThemeMenu();
            return;
        }
        const o = e.target.closest && e.target.closest("[data-theme-set]");
        if (o) {
            setVisitorTheme(o.dataset.themeSet);
            closeThemeMenu();
            return;
        }
        if (!$("#themeMenu").hidden && !e.target.closest("#themeMenu"))
            closeThemeMenu();
    });
    document.addEventListener(
        "keydown",
        (e) => {
            const m = $("#themeMenu");
            if (m.hidden) return;
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closeThemeMenu();
                return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const bs = [...m.querySelectorAll("button")],
                    i = bs.indexOf(document.activeElement);
                bs[
                    (i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) %
                        bs.length
                ].focus();
            }
        },
        true,
    );
    addEventListener("resize", closeThemeMenu);
    const THEMES = {
        navy: {
            label: "Navy & brass",
            sw: ["#0a1124", "#131d3d", "#e2b25a", "#d9607f"],
        },
        burgundy: {
            label: "Burgundy",
            sw: ["#1a0810", "#2e0f1d", "#f0b882", "#ff7d98"],
        },
        terminal: {
            label: "Terminal",
            sw: ["#0c1218", "#0f1922", "#3ef5b8", "#6cc8ff"],
        },
        light: {
            label: "Light",
            sw: ["#eceff6", "#ffffff", "#9b6416", "#b2385d"],
        },
        glass: {
            label: "Liquid glass",
            sw: ["#ff7ab8", "#6f7bff", "#1fc8c0", "#ffffff"],
        },
    };
    function openPanel(tab, item) {
        if (item) panelItem = item;
        panelTab = tab;
        $("#admPanel").hidden = false;
        renderPanel();
    }
    function fieldValue(path, kind) {
        const v = getP(C, path);
        if (kind === "list") return (v || []).join(", ");
        if (kind === "lines") return (v || []).join("\n");
        if (kind === "ledger")
            return (v || []).map((r) => r.join(" | ")).join("\n");
        if (kind === "pairs")
            return (v || [])
                .map((r) => (r[1] ? `${r[0]} | ${r[1]}` : r[0]))
                .join("\n");
        return v ?? "";
    }
    function refreshPanelFields() {
        $$("#admPanel [data-path]").forEach((f) => {
            if (f !== document.activeElement)
                f.value = fieldValue(f.dataset.path, f.dataset.kind);
        });
    }
    const fld = (label, path, kind = "text", opts) => {
        const v = getP(C, path),
            id = "f_" + path.replace(/\./g, "_"),
            val = fieldValue(path, kind);
        const input =
            kind === "select"
                ? `<select id="${id}" data-path="${path}" data-kind="${kind}">${opts.map((o) => `<option value="${E(o)}"${o === v ? " selected" : ""}>${E(o)}</option>`).join("")}</select>`
                : kind === "text"
                  ? `<input id="${id}" data-path="${path}" data-kind="${kind}" value="${E(val)}">`
                  : `<textarea id="${id}" data-path="${path}" data-kind="${kind}" rows="${kind === "textarea" ? 4 : 3}">${E(val)}</textarea>`;
        return `<label class="fld" for="${id}"><span>${label}</span>${input}</label>`;
    };
    function renderPanel() {
        $$("#admPanel [data-tab]").forEach((b) =>
            b.setAttribute("aria-selected", b.dataset.tab === panelTab),
        );
        const body = $("#panelBody");
        let h = "";
        if (panelTab === "site") {
            h += `<h4>Colour theme</h4><div class="themes">${Object.entries(
                THEMES,
            )
                .map(
                    ([k, t]) =>
                        `<button type="button" class="theme-opt" data-theme-pick="${k}" aria-pressed="${C.theme === k}"><span class="swatch">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span>${t.label}</button>`,
                )
                .join("")}</div>`;
            h += `<h4>Mini me</h4><p class="note">The little pixel you that hangs around the sides of the page. Visitors can click him to get a wave.</p>${fld("Show him", "mini.on", "select", ["yes", "no"])}${fld("Hair colour (curls)", "mini.hair", "select", ["black", "dark brown", "brown", "light brown", "blonde", "auburn", "gray"])}${fld("Skin tone", "mini.skin", "select", ["light", "light-medium", "medium", "olive", "tan", "brown", "deep"])}${fld("Jacket", "mini.shirt", "select", ["cream", "theme colour", "navy", "black", "claret", "forest", "gray"])}${fld("Glasses", "mini.glasses", "select", ["no", "yes"])}${fld("Facial hair", "mini.beard", "select", ["mustache & goatee", "stubble", "full beard", "none"])}`;
            h += `<h4>Tab icon</h4><div class="themes">${Object.keys(FAVICONS)
                .map(
                    (k) =>
                        `<button type="button" class="theme-opt fav-opt" data-fav-pick="${k}" aria-pressed="${(C.favicon || "brass") === k}"><img src="${FAVICONS[k].touch}" alt="" width="52" height="52">${FAV_LABELS[k]}</button>`,
                )
                .join("")}</div>`;
            h += `<h4>Identity</h4>${fld("First name", "site.first")}${fld("Last name", "site.last")}${fld("Initials (logo)", "site.initials")}${fld("Tagline under the name", "site.tagline")}${fld("Location", "site.location")}${fld("Education line", "site.school")}`;
            h += `<h4>Availability</h4>${fld("Status", "site.status")}${fld("Status detail", "site.statusLong")}`;
            h += `<h4>Hero</h4>${fld("Terminal command", "hero.cmd")}${fld("Bio", "hero.bio", "textarea")}<p class="note">Wrap words in *asterisks* to highlight them.</p>`;
            h += `<h4>Contact</h4>${fld("Email", "site.email")}${fld("Ping replies (one per line)", "contact.pings", "lines")}`;
            h += `<h4>Sphere</h4>${fld("Words orbiting the sphere (comma separated)", "sphere.tags", "list")}<p class="note">Changes show on the sphere as you type. Around 8 to 14 words look best; ♪ is drawn in the accent colour.</p>`;
            h += `<h4>Music</h4>${fld("Instrument tags (comma separated)", "music.tags", "list")}`;
            h += `<h4>Footer</h4>${fld("Closing line", "footer.line")}${fld("Copyright", "footer.copy")}`;
            h += `<h4>Data</h4><div class="row"><button class="btn" type="button" id="pExport">export content.json</button><button class="btn" type="button" id="pImport">import</button><button class="btn" type="button" id="pReset">reset to defaults</button></div>
      <p class="note">Export content.json and put it next to index.html (or commit it). The site loads it on every visit.</p>`;
        } else if (panelTab === "sections") {
            h += `<p class="note">Order and visibility of the sections on the home page. Hidden sections stay saved; you can show them again any time.</p>
      <ul class="sec-list">${C.order.map((o, i) => `<li class="${o.on ? "" : "off"}"><span>${SECTION_NAMES[o.id]}</span><button class="mini" type="button" data-ps="up" data-id="${o.id}" aria-label="Move ${SECTION_NAMES[o.id]} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="mini" type="button" data-ps="down" data-id="${o.id}" aria-label="Move ${SECTION_NAMES[o.id]} down" ${i === C.order.length - 1 ? "disabled" : ""}>↓</button><button class="mini" type="button" data-ps="toggle" data-id="${o.id}">${o.on ? "hide" : "show"}</button></li>`).join("")}</ul>
      <h4>Section headings</h4>${fld("Projects title", "projects.title")}${fld("Projects intro", "projects.intro", "textarea")}${fld("Experience title", "experience.title")}${fld("Education title", "education.title")}${fld("Stack title", "stack.title")}${fld("Stack intro", "stack.intro")}${fld("Music title", "music.title")}${fld("Music title, highlighted part", "music.titleEm")}${fld("Music text", "music.body", "textarea")}${fld("Studio button label", "music.cta")}${fld("Piano phrase button", "music.phraseLabel")}${fld("Piano phrase note", "music.phraseHint")}${fld("Contact title", "contact.title")}${fld("Contact text", "contact.body", "textarea")}
      <h4>Buttons &amp; labels</h4>${fld("Main button (hero)", "nav.cta")}${["experience", "stack", "projects", "education", "certs", "music"].map((k) => fld(`Hero button: ${k}`, "nav." + k)).join("")}${fld("Top bar: studio", "nav.topStudio")}${fld("Top bar: terminal", "nav.topTty")}${fld("Footer: terminal", "nav.footTty")}
      <h4>Studio page</h4>${fld("Back link", "studio.back")}${fld("Back link, small line", "studio.backSub")}${fld("Eyebrow", "studio.eyebrow")}${fld("Title, first word", "studio.title1")}${fld("Title, highlighted word", "studio.titleEm")}${fld("Title, last word", "studio.title2")}${fld("Intro", "studio.intro", "textarea")}${fld("Library heading", "studio.libTitle")}${fld("Library intro", "studio.libIntro", "textarea")}${fld("Saved sheets heading", "studio.sheetsTitle")}
      <p class="note">Instrument names and descriptions are edited right on the studio page. To change the example sheet visitors see, open the studio page while editing and use ★.</p>`;
        } else if (panelTab === "tty") {
            const acts = [
                "nothing",
                "open link",
                "go to section",
                "play sheet",
                "copy email",
            ];
            const argLabel = {
                "open link": "Link URL",
                "go to section":
                    "Section (projects, experience, stack, music, contact, studio)",
                "play sheet":
                    "Sheet: signature, boot, shutdown, reboot, or a library title",
            };
            h += `<p class="note">Built-in commands use your site content automatically. Add your own below; a command with the same name as a built-in one replaces it. Built-ins: ${BUILTIN_HELP()
                .map((r) => r[0])
                .join(", ")}.</p>`;
            h += `<h4>Welcome message</h4>${fld("Shown when the terminal opens", "tty.welcome", "textarea")}<p class="note">*Asterisks* highlight a word. {first}, {last}, {email} and {location} fill in your details.</p>`;
            h += `<h4>Your commands</h4>`;
            (C.tty.commands || []).forEach((c, i) => {
                const q = `tty.commands.${i}`;
                h += `<div class="cmd-card"><div class="cmd-head"><b>$ ${E(cmdName(c) || "untitled")}</b><span class="row"><button class="mini" type="button" data-tc="up" data-i="${i}" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button><button class="mini" type="button" data-tc="down" data-i="${i}" aria-label="Move down" ${i === C.tty.commands.length - 1 ? "disabled" : ""}>↓</button><button class="mini" type="button" data-tc="del" data-i="${i}" aria-label="Delete command">✕</button></span></div>
        ${fld("Command name", q + ".name")}${fld("Description in help", q + ".desc")}${fld("Answer", q + ".out", "textarea")}${fld("Then also", q + ".action", "select", acts)}${argLabel[c.action] ? fld(argLabel[c.action], q + ".arg") : ""}</div>`;
            });
            h += `<div class="row"><button class="btn" type="button" id="ttyAdd">+ add command</button><button class="btn" type="button" id="ttyTest">try it in the terminal</button></div>`;
        } else {
            const pi = panelItem,
                arr = pi && getP(C, pi.list),
                it = arr && arr[pi.i];
            if (!it)
                h += `<p class="note">Choose ✎ on any card to edit all of its fields here, including links, tags and status.</p>`;
            else {
                const p = `${pi.list}.${pi.i}`;
                if (pi.list === "projects.items") {
                    h += `<h4>Project</h4>${fld("Title", p + ".title")}${fld("Subtitle", p + ".sub")}${fld("Status", p + ".status", "select", ["live", "shipped", "building", "designing", "planned", "paused"])}${fld("Card size", p + ".size", "select", ["normal", "wide"])}${fld("Description", p + ".desc", "textarea")}${fld("Tags (comma separated)", p + ".tags", "list")}`;
                    h += `<h4>Link</h4>${fld("URL (leave empty for none)", p + ".url")}${fld("Link label", p + ".linkLabel")}`;
                    h += `<h4>Detail block</h4>${fld("Type", p + ".detail", "select", ["none", "flow", "ledger"])}`;
                    if (it.detail === "flow")
                        h += fld(
                            "Flow steps (one per line)",
                            p + ".flow",
                            "lines",
                        );
                    if (it.detail === "ledger")
                        h +=
                            fld(
                                "Ledger rows: account | debit | credit",
                                p + ".ledger",
                                "ledger",
                            ) +
                            '<p class="note">Totals and the balanced check are calculated for you.</p>';
                } else if (pi.list === "certs.items") {
                    h += `<h4>Certification or award</h4>${fld("Name", p + ".title")}${fld("Issued by", p + ".issuer")}${fld("When (optional)", p + ".when")}${fld("Badge (1–3 characters)", p + ".badge")}${fld("Short description", p + ".note", "textarea")}`;
                } else if (
                    pi.list === "experience.items" ||
                    pi.list === "education.items"
                ) {
                    h += `<h4>Timeline entry</h4>${fld(pi.list === "education.items" ? "Degree or certificate" : "Role", p + ".role")}${fld(pi.list === "education.items" ? "School" : "Organisation", p + ".org")}${fld("When", p + ".when")}${fld("Summary line", p + ".desc", "textarea")}${fld("Bullet points (one per line)", p + ".bullets", "lines")}${pi.list === "education.items" ? fld("Courses: name | grade (one per line)", p + ".courses", "pairs") : ""}`;
                } else if (pi.list === "stack.groups") {
                    h += `<h4>Stack group</h4>${fld("Name", p + ".name")}${fld("Skills (one per line)", p + ".items", "pairs")}`;
                } else if (pi.list === "studio.library") {
                    h += `<h4>Library sheet</h4>${fld("Title", p + ".title")}${fld("Composer", p + ".composer")}${fld("Short description", p + ".note")}${fld("Tempo (bpm)", p + ".tempo")}${fld("Time signature", p + ".time", "select", TIMES)}${fld("Instrument", p + ".voice", "select", Object.keys(VOICES))}
          <p class="note">To change the notes: open the sheet in the studio, edit it, press “+ add the sheet below to the library”, then delete the old one.</p>`;
                } else if (
                    pi.list === "contact.links" ||
                    pi.list === "studio.links"
                ) {
                    h += `<h4>Link</h4>${fld("Label", p + ".label")}${fld("URL", p + ".url")}`;
                }
                h += `<div class="row"><button class="btn" type="button" id="pDup">duplicate</button><button class="btn" type="button" id="pDel">delete</button></div>`;
            }
        }
        body.innerHTML = h;
    }
    let panelRenderT;
    $("#panelBody").addEventListener("input", (e) => {
        const f = e.target.closest("[data-path]");
        if (!f) return;
        if (!f._undoPushed) {
            pushUndo();
            f._undoPushed = true;
        }
        const k = f.dataset.kind,
            raw = f.value;
        let v = raw;
        if (k === "list")
            v = raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        if (k === "lines")
            v = raw
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
        if (k === "ledger")
            v = raw
                .split("\n")
                .filter((s) => s.trim())
                .map((s) => {
                    const c = s.split("|").map((x) => x.trim());
                    return [c[0] || "", c[1] || "", c[2] || ""];
                });
        if (k === "pairs")
            v = raw
                .split("\n")
                .filter((s) => s.trim())
                .map((s) => {
                    const c = s.split("|").map((x) => x.trim());
                    return [c[0] || "", c[1] || ""];
                });
        setP(C, f.dataset.path, v);
        setDirty(true);
        clearTimeout(panelRenderT);
        panelRenderT = setTimeout(render, 140);
        if (/\.(detail|action)$/.test(f.dataset.path))
            setTimeout(renderPanel, 150);
    });
    $("#panelBody").addEventListener("change", (e) => {
        const f = e.target.closest("[data-path]");
        if (f) f._undoPushed = false;
    });
    $("#panelBody").addEventListener("click", (e) => {
        const tp = e.target.closest("[data-theme-pick]");
        if (tp) {
            pushUndo();
            C.theme = tp.dataset.themePick;
            setDirty(true);
            render();
            renderPanel();
            return;
        }
        const fp = e.target.closest("[data-fav-pick]");
        if (fp) {
            pushUndo();
            C.favicon = fp.dataset.favPick;
            setDirty(true);
            render();
            renderPanel();
            toast(`${FAV_LABELS[C.favicon]} tab icon. Save to keep it.`);
            return;
        }
        const ps = e.target.closest("[data-ps]");
        if (ps) {
            sectionAct(ps.dataset.id, ps.dataset.ps);
            renderPanel();
            return;
        }
        const tc = e.target.closest("[data-tc]");
        if (tc) {
            const arr = C.tty.commands,
                i = +tc.dataset.i;
            pushUndo();
            if (tc.dataset.tc === "up" && i > 0)
                [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
            else if (tc.dataset.tc === "down" && i < arr.length - 1)
                [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
            else if (tc.dataset.tc === "del") {
                arr.splice(i, 1);
                toast("Command deleted", "undo", adminUndoStep);
            }
            setDirty(true);
            renderPanel();
            return;
        }
        if (e.target.id === "ttyAdd") {
            pushUndo();
            C.tty.commands.push({
                id: uid(),
                name: "new-command",
                desc: "what it does",
                out: "What the terminal should answer.",
                action: "nothing",
                arg: "",
            });
            setDirty(true);
            renderPanel();
            const pb = $("#panelBody");
            pb.scrollTop = pb.scrollHeight;
            return;
        }
        if (e.target.id === "ttyTest") {
            booted = false;
            out.innerHTML = "";
            openTTY();
            return;
        }
        if (e.target.id === "pExport") exportContent();
        if (e.target.id === "pImport") $("#importFile").click();
        if (e.target.id === "pReset") {
            const b = e.target;
            if (b.dataset.armed !== "1") {
                b.dataset.armed = "1";
                b.textContent = "click again to reset";
                return;
            }
            pushUndo();
            C = clone(DEFAULT);
            setDirty(true);
            render();
            renderPanel();
            toast("Reset to defaults", "undo", adminUndoStep);
        }
        if (e.target.id === "pDup" || e.target.id === "pDel") {
            const pi = panelItem,
                arr = getP(C, pi.list);
            pushUndo();
            if (e.target.id === "pDup") {
                const c = clone(arr[pi.i]);
                c.id = uid();
                arr.splice(pi.i + 1, 0, c);
                panelItem = {list: pi.list, i: pi.i + 1};
            } else {
                arr.splice(pi.i, 1);
                panelItem = null;
                toast("Deleted", "undo", adminUndoStep);
            }
            setDirty(true);
            render();
            renderPanel();
        }
    });
    $$("#admPanel [data-tab]").forEach((b) =>
        b.addEventListener("click", () => {
            panelTab = b.dataset.tab;
            renderPanel();
        }),
    );
    $("#panelX").addEventListener(
        "click",
        () => ($("#admPanel").hidden = true),
    );
    $("#admPanelBtn").addEventListener("click", () => {
        const p = $("#admPanel");
        if (p.hidden) openPanel(panelTab);
        else p.hidden = true;
    });
    $("#admUndo").addEventListener("click", adminUndoStep);
    $("#admTty").addEventListener("click", () => openPanel("tty"));
    $("#admPage").addEventListener("click", () => {
        location.hash = $("#studio").hidden ? "studio" : "top";
    });
    $("#admDiscard").addEventListener("click", () => {
        if (!dirty) return;
        pushUndo();
        C = clone(saved);
        setDirty(false);
        render();
        renderPanel();
        toast("Changes discarded", "undo", adminUndoStep);
    });
    $("#admSave").addEventListener("click", () => saveSite());
    $("#admDone").addEventListener("click", () => {
        if (dirty) {
            $("#admConfirm").hidden = false;
            return;
        }
        exitEdit();
    });
    $("#cSave").addEventListener("click", async () => {
        if (await saveSite()) exitEdit();
    });
    $("#cDiscard").addEventListener("click", () => {
        C = clone(saved);
        setDirty(false);
        exitEdit();
    });
    $("#cCancel").addEventListener(
        "click",
        () => ($("#admConfirm").hidden = true),
    );
    $("#importFile").addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const o = JSON.parse(r.result);
                if (!o || !o.site || !o.order) throw 0;
                pushUndo();
                C = merge(DEFAULT, o);
                setDirty(true);
                render();
                renderPanel();
                toast("Imported. Press save to keep it.");
            } catch {
                toast("That file is not a content.json from this site.");
            }
        };
        r.readAsText(f);
        e.target.value = "";
    });
    async function saveSite() {
        const btn = $("#admSave");
        btn.disabled = true;
        try {
            if (!saveDraft()) throw new Error("storage");
            toast("Saved in this browser. Export content.json to publish it.");
            saved = clone(C);
            setDirty(false);
            btn.disabled = false;
            return true;
        } catch (err) {
            btn.disabled = false;
            toast(
                "This browser blocked saving. Try a regular (non-private) window.",
            );
            return false;
        }
    }
    async function exportContent() {
        C.updatedAt = Date.now();
        const data = JSON.stringify(C, null, 2);
        LS.set(DRAFT_KEY, {base: C.updatedAt, content: C}); // once this file is on the server, the draft matches it and is dropped
        try {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
                new Blob([data], {type: "application/json"}),
            );
            a.download = "content.json";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                URL.revokeObjectURL(a.href);
                a.remove();
            }, 500);
        } catch {
            toast("Export is not available here.");
        }
    }
    document.addEventListener("click", (e) => {
        if (!editing) return;
        if (e.target.closest("#exMake")) {
            pushUndo();
            C.studio.example = {
                title: sheet.title || "Untitled",
                composer: sheet.composer || "",
                tempo: sheet.tempo,
                time: sheet.time,
                voice: sheet.voice,
                notes: clone(sheet.notes),
            };
            setDirty(true);
            renderStudioChrome();
            makeEditable();
            toast(
                "Visitors will now open the studio on this sheet. Save to publish it.",
            );
        }
        if (e.target.closest("#libAdd")) {
            if (!sheet.notes.length) {
                toast("Write some notes first");
                return;
            }
            pushUndo();
            C.studio.library.push({
                id: uid(),
                title: sheet.title || "Untitled",
                composer: sheet.composer || "",
                note: "",
                tempo: sheet.tempo,
                time: sheet.time,
                voice: sheet.voice,
                notes: clone(sheet.notes),
            });
            setDirty(true);
            renderStudioChrome();
            makeEditable();
            toast("Added to the library. Save to publish it.");
        }
        if (e.target.closest("#exReset")) {
            pushUndo();
            C.studio.example = null;
            setDirty(true);
            renderStudioChrome();
            makeEditable();
            toast("Back to the built-in example. Save to publish it.");
        }
    });
    addEventListener("beforeunload", (e) => {
        if (editing && dirty) {
            e.preventDefault();
            e.returnValue = "";
        }
    });

    /* =====================================================================
   TERMINAL
   ===================================================================== */
    const tty = $("#tty"),
        out = $("#ttyOut"),
        inp = $("#ttyIn");
    let lastFocus = null,
        hist = [],
        hi = 0,
        booted = false;
    const print = (html, cls) => {
        const d = document.createElement("div");
        if (cls) d.className = cls;
        d.innerHTML = html;
        out.appendChild(d);
        out.scrollTop = out.scrollHeight;
    };
    const me = () => E(C.site.first.toLowerCase() || "me");
    const fillVars = (t) =>
        String(t || "").replace(/\{(first|last|email|location)\}/g, (_, k) =>
            k === "email" ? C.site.email : C.site[k] || "",
        );
    const ttyFmt = (t) =>
        E(fillVars(t)).replace(/\*(.+?)\*/g, '<span class="c">$1</span>');
    const cmdName = (c) =>
        String(c.name || "")
            .trim()
            .toLowerCase()
            .split(/\s+/)[0];
    const customCmds = () =>
        ((C.tty && C.tty.commands) || []).filter((c) => cmdName(c));
    const BUILTIN_HELP = () => [
        ["whoami", "who is " + C.site.first],
        ["projects", "what I'm building"],
        ["experience", "where I've worked"],
        ["education", "degree and coursework"],
        ["certs", "certifications and awards"],
        ["stack", "tools and languages"],
        ["music", "the other instrument"],
        ["play", "play my name in notes, or: play <sheet title>"],
        ["studio", "open the music room"],
        ["contact", "how to reach me"],
        ["copy-email", "copy my email address"],
        [
            "theme",
            "[navy|burgundy|terminal|light|glass] recolour the site for you",
        ],
        ["goto", "[section] scroll to a section"],
        ["sudo", "reboot · hire " + C.site.first.toLowerCase()],
        ["clear", "clear the screen"],
        ["exit", "close the terminal (or press esc)"],
    ];
    function reboot() {
        print(
            `<span class="a">Broadcast message from ${me()}@dev:</span>\nThe system is going down for reboot NOW!`,
        );
        playSeq(SHUTDOWN);
        if (!reduce) document.body.classList.add("rebooting");
        setTimeout(() => {
            document.body.classList.remove("rebooting");
            playSeq(BOOT);
            print(
                `<span class="d">[  OK  ]</span> Started portfolio.service\n<span class="d">[  OK  ]</span> Reached target <span class="c">${E(C.site.first)}</span>\nWelcome back.`,
            );
        }, 2000);
    }
    function playByName(name) {
        const n = String(name || "")
            .trim()
            .toLowerCase();
        if (!n || n === "signature" || n === "name") {
            riff();
            return true;
        }
        if (n === "boot" || n === "power on") {
            playSeq(BOOT);
            return true;
        }
        if (n === "shutdown" || n === "power off") {
            playSeq(SHUTDOWN);
            return true;
        }
        if (n === "reboot") {
            reboot();
            return true;
        }
        const L = C.studio.library || [],
            i =
                L.findIndex((r) => (r.title || "").toLowerCase() === n) >= 0
                    ? L.findIndex((r) => (r.title || "").toLowerCase() === n)
                    : L.findIndex((r) =>
                          (r.title || "").toLowerCase().startsWith(n),
                      );
        if (i < 0) return false;
        closeTTY();
        if ($("#studio").hidden) {
            location.hash = "studio";
            setTimeout(() => openLibrary(i, true), 250);
        } else openLibrary(i, true);
        return true;
    }
    const CMDS = {
        help: () => {
            const custom = customCmds(),
                over = new Set(custom.map(cmdName));
            const rows = BUILTIN_HELP()
                .filter((r) => !over.has(r[0]))
                .concat(custom.map((c) => [cmdName(c), c.desc || ""]));
            print(
                `<span class="c">available commands</span>\n` +
                    rows
                        .map(
                            ([n, d]) =>
                                `  <span class="b">${E(n.padEnd(12))}</span> ${E(d)}`,
                        )
                        .join("\n"),
            );
        },
        whoami: () =>
            print(`${E(C.site.first + " " + C.site.last)}, ${E(C.site.location)}.
${E(C.hero.bio.replace(/\*/g, ""))}`),
        projects: () =>
            print(
                C.projects.items
                    .map(
                        (p) =>
                            `<span class="${p.status === "live" || p.status === "shipped" ? "c" : "a"}">●</span> <span class="b">${E(p.title.padEnd(14))}</span> ${E(p.sub)}  <span class="d">${E(p.status)}</span>`,
                    )
                    .join("\n"),
            ),
        experience: () =>
            print(
                C.experience.items
                    .map(
                        (x) =>
                            `<span class="c">${E(x.when)}</span>  ${E(x.role)}, ${E(x.org)}` +
                            (x.bullets || [])
                                .slice(0, 3)
                                .map(
                                    (b) =>
                                        `\n  <span class="d">·</span> ${E(b)}`,
                                )
                                .join(""),
                    )
                    .join("\n\n"),
            ),
        certs: () =>
            print(
                C.certs.items
                    .map(
                        (x) =>
                            `<span class="c">${E(x.badge || "·")}</span>  ${E(x.title)}, ${E(x.issuer)}${x.when ? " · " + E(x.when) : ""}`,
                    )
                    .join("\n"),
            ),
        certifications: (a, r) => CMDS.certs(a, r),
        education: () =>
            print(
                C.education.items
                    .map(
                        (x) =>
                            `<span class="c">${E(x.when)}</span>  ${E(x.role)}, ${E(x.org)}` +
                            (x.courses || [])
                                .map(
                                    (c) =>
                                        `\n  <span class="d">·</span> ${E(c[0])} <span class="a">${E(c[1])}</span>`,
                                )
                                .join("") +
                            (x.bullets || [])
                                .map(
                                    (b) =>
                                        `\n  <span class="d">·</span> ${E(b)}`,
                                )
                                .join(""),
                    )
                    .join("\n\n"),
            ),
        stack: () =>
            print(
                C.stack.groups
                    .map(
                        (g) =>
                            `<span class="c">${E(g.name.padEnd(11))}</span> ${E(g.items.map((r) => r[0]).join(", "))}`,
                    )
                    .join("\n"),
            ),
        music: () =>
            print(`<span class="a">${E(C.music.tags.join(" · "))}</span>
${E(C.music.body)}
Type <span class="b">play</span> to hear my name, <span class="b">play 404</span> for a joke, or <span class="b">studio</span> to write your own.`),
        play: (a, raw) => {
            if (a) {
                if (!playByName(a))
                    print(
                        `no sheet called "${E(raw)}". Try: ${(
                            C.studio.library || []
                        )
                            .slice(0, 5)
                            .map((r) => `<span class="b">${E(r.title)}</span>`)
                            .join(", ")}…`,
                    );
                return;
            }
            if (!$("#studio").hidden) {
                startPlay(0);
                print('<span class="a">♪ playing the sheet</span>');
                return;
            }
            riff();
            print(
                '<span class="a">♪ A · E · G · H</span> <span class="d">(the notes in my name; H is B in German)</span>',
            );
        },
        studio: () => {
            closeTTY();
            location.hash = "studio";
        },
        contact: () =>
            print(`email     <span class="c">${E(C.site.email)}</span>   <span class="d">(type copy-email)</span>
links     ${C.contact.links.map((l) => `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener">${E(l.label)}</a>`).join("  ")}`),
        "copy-email": async () => {
            try {
                await navigator.clipboard.writeText(C.site.email);
                print('<span class="c">copied to clipboard ✓</span>');
            } catch {
                print(
                    `<span class="a">clipboard blocked here, the address is:</span> ${E(C.site.email)}`,
                );
            }
        },
        theme: (a) => {
            if (!THEMES[a])
                return print(
                    `usage: theme <span class="d">[${Object.keys(THEMES).join("|")}]</span>`,
                );
            setVisitorTheme(a);
            print(
                `theme set to <span class="c">${a}</span> <span class="d">(remembered in this browser)</span>`,
            );
        },
        goto: (a) => {
            if (a === "studio") return CMDS.studio();
            const ok = ["top", ...C.order.filter((o) => o.on).map((o) => o.id)];
            if (!ok.includes(a))
                return print(
                    `usage: goto <span class="d">[${ok.join("|")}|studio]</span>`,
                );
            closeTTY();
            if ($("#home").hidden) location.hash = a;
            else
                document
                    .getElementById(a)
                    .scrollIntoView({behavior: reduce ? "auto" : "smooth"});
        },
        ls: () =>
            print(
                `<span class="b">projects/</span>  <span class="b">experience/</span>  <span class="b">stack/</span>  <span class="b">studio/</span>  contact.txt  resume.md`,
            ),
        cat: (a) =>
            a === "contact.txt"
                ? CMDS.contact()
                : a === "resume.md"
                  ? print(
                        '<span class="d">Resume on request. Email me and I\'ll send it.</span>',
                    )
                  : print(`cat: ${E(a || "")}: no such file`),
        reboot: () =>
            print(
                'reboot: must be superuser. Try <span class="b">sudo reboot</span>.',
            ),
        sudo: (a) => {
            if (a.startsWith("reboot")) return reboot();
            if (a.startsWith("shutdown")) {
                playSeq(SHUTDOWN);
                return print(
                    '<span class="a">Shutting down…</span> just kidding. Try <span class="b">sudo reboot</span>.',
                );
            }
            print(
                a.startsWith("hire")
                    ? `<span class="c">[sudo] permission granted.</span> Great choice. Email: ${E(C.site.email)}`
                    : `<span class="e">${me()} is not in the sudoers file. This incident will be reported.</span>`,
            );
        },
        clear: () => (out.innerHTML = ""),
        exit: () => closeTTY(),
        date: () => print(new Date().toString()),
        echo: (a, raw) => print(E(raw)),
    };
    function runCustom(c) {
        if (c.out) print(ttyFmt(c.out));
        const arg = String(c.arg || "").trim();
        if (c.action === "open link" && arg)
            print(
                `<a href="${safeUrl(arg)}" target="_blank" rel="noopener">${E(arg)} ↗</a>`,
            );
        else if (c.action === "go to section") CMDS.goto(arg.toLowerCase());
        else if (c.action === "play sheet") {
            if (!playByName(arg))
                print(`<span class="e">no sheet called "${E(arg)}"</span>`);
        } else if (c.action === "copy email") CMDS["copy-email"]();
    }
    function run(line) {
        print(
            `<span class="c">${me()}@dev</span>:<span class="b">~</span>$ ${E(line)}`,
        );
        const raw = line.trim();
        if (!raw) return;
        hist.push(raw);
        hi = hist.length;
        const [cmd, ...rest] = raw.split(/\s+/),
            name = cmd.toLowerCase();
        const custom = customCmds().find((c) => cmdName(c) === name);
        if (custom) return runCustom(custom);
        const fn = CMDS[name];
        if (fn) fn(rest.join(" ").toLowerCase(), rest.join(" "));
        else
            print(
                `zsh: command not found: ${E(cmd)}. Type <span class="b">help</span>.`,
            );
    }
    function openTTY() {
        lastFocus = document.activeElement;
        tty.hidden = false;
        $("#ttyPrompt").innerHTML =
            `<span class="u">${me()}@dev</span>:<span class="p">~</span>$`;
        $("#ttyTitle").textContent = `${me()}@dev — zsh`;
        if (!booted) {
            booted = true;
            print(
                `<span class="d">Last login: ${new Date().toDateString()} on ttys001</span>\n${ttyFmt(C.tty.welcome)}`,
            );
        }
        setTimeout(() => inp.focus(), 30);
    }
    function closeTTY() {
        tty.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.addEventListener("click", (e) => {
        if (editing && e.target.closest("#home, #studioTop, #studioHero"))
            return;
        if (e.target.closest("[data-open-tty]")) openTTY();
        if (e.target.closest("[data-copy-email]")) copyEmail();
        if (e.target.closest("#riff")) riff();
    });
    $("#ttyClose").addEventListener("click", closeTTY);
    tty.addEventListener("click", (e) => {
        if (e.target === tty) closeTTY();
    });
    inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            run(inp.value);
            inp.value = "";
        } else if (e.key === "Escape") closeTTY();
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (hi > 0) inp.value = hist[--hi];
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            hi = Math.min(hist.length, hi + 1);
            inp.value = hist[hi] || "";
        } else if (e.key === "Tab") {
            e.preventDefault();
            const v = inp.value.toLowerCase(),
                m = [
                    ...new Set(
                        Object.keys(CMDS).concat(customCmds().map(cmdName)),
                    ),
                ].filter((k) => k.startsWith(v));
            if (m.length === 1) inp.value = m[0] + " ";
            else if (m.length) print(m.join("  "), "d");
        }
    });
    tty.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeTTY();
    });

    /* ---------- global keyboard ---------- */
    const held = new Set();
    addEventListener("keydown", (e) => {
        if (!tty.hidden || e.altKey) return;
        const t = document.activeElement,
            typing =
                t &&
                (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
                    t.isContentEditable);
        if (
            (e.ctrlKey || e.metaKey) &&
            e.key.toLowerCase() === "z" &&
            !typing
        ) {
            if (!$("#studio").hidden) {
                e.preventDefault();
                undo();
            } else if (editing) {
                e.preventDefault();
                adminUndoStep();
            }
            return;
        }
        if (e.ctrlKey || e.metaKey || typing) return;
        if (e.key === "`") {
            e.preventDefault();
            openTTY();
            return;
        }
        if (!$("#studio").hidden) {
            studioKey(e);
            return;
        }
        if (editing) return;
        const m = HOME_KEYMAP[e.key.toLowerCase()];
        if (m && !held.has(e.key) && $("#homePiano")) {
            held.add(e.key);
            playHome(m);
        }
    });
    addEventListener("keyup", (e) => {
        held.delete(e.key);
        held.delete(e.code);
    });
    function studioKey(e) {
        const k = e.key,
            cur = curEvent(),
            ap = activePitch();
        if (k === " ") {
            e.preventDefault();
            play ? stopPlay() : startPlay();
            return;
        }
        if (play) return;
        if (/^[1-5]$/.test(k)) {
            const d = DUR_ORDER[+k - 1];
            if (cur) {
                snapshot();
                cur.d = d;
                changed();
            } else {
                tool.d = d;
                renderToolbar();
            }
            return;
        }
        if (k === ".") {
            if (cur) {
                snapshot();
                cur.dot = !cur.dot;
                changed();
            } else {
                tool.dot = !tool.dot;
                renderToolbar();
            }
            return;
        }
        if (k === "r" || k === "R") {
            insertNote({r: true, d: tool.d, dot: tool.dot});
            return;
        }
        if (k === "n" || k === "N") {
            tool.mode = "note";
            renderToolbar();
            return;
        }
        if (k === "c" || k === "C") {
            $("#sChord").click();
            return;
        }
        const setAcc = (a) => {
            if (ap) {
                snapshot();
                ap.a = a;
                changed();
                tone(midiOf(ap), 0.5, sheet.voice);
            } else {
                tool.a = a;
                renderToolbar();
            }
        };
        if (k === "+" || k === "#" || k === "=") {
            setAcc(1);
            return;
        }
        if (k === "-" || k === "_") {
            setAcc(-1);
            return;
        }
        if (k === "0") {
            setAcc(0);
            return;
        }
        if (k === "Backspace" || k === "Delete") {
            e.preventDefault();
            delSel();
            return;
        }
        if (k === "Escape") {
            sel = -1;
            selK = 0;
            renderSheet();
            renderToolbar();
            return;
        }
        if (k === "ArrowLeft") {
            e.preventDefault();
            sel = Math.max(0, sel < 0 ? sheet.notes.length - 1 : sel - 1);
            selK = 0;
            renderSheet();
            renderToolbar();
            return;
        }
        if (k === "ArrowRight") {
            e.preventDefault();
            sel = sel < 0 ? 0 : Math.min(sheet.notes.length - 1, sel + 1);
            selK = 0;
            renderSheet();
            renderToolbar();
            return;
        }
        if (k === "ArrowUp" && cur) {
            e.preventDefault();
            moveSel(1, e.shiftKey);
            return;
        }
        if (k === "ArrowDown" && cur) {
            e.preventDefault();
            moveSel(-1, e.shiftKey);
            return;
        }
        const m = STUDIO_CODES[e.code];
        if (m && !held.has(e.code)) {
            held.add(e.code);
            const [s, a] = m,
                key = STUDIO_KEYS.find((x) => x.s === s && x.a === a);
            onStudioKey(key, false, e.shiftKey);
        }
    }

    /* =====================================================================
   ROUTER + BOOT
   ===================================================================== */
    let studioReady = false;
    function route() {
        const h = location.hash.slice(1);
        const studio = h === "studio";
        $("#home").hidden = studio;
        $("#studio").hidden = !studio;
        if (studio) {
            if (!studioReady) {
                studioReady = true;
                buildPiano($("#sKeys"), STUDIO_KEYS, onStudioKey);
            }
            loadSheetIntoUI();
            scrollTo(0, 0);
            if (editing) makeEditable();
        } else {
            kick();
            if (h === "admin" && !editing)
                contentReady.then(() => {
                    if (!editing && location.hash === "#admin") enterEdit();
                });
        }
        const pg = $("#admPage");
        if (pg) pg.innerHTML = studio ? "← home page" : "studio page →";
        updateNowPlaying();
    }
    addEventListener("hashchange", route);
    addEventListener("resize", () => {
        if (!$("#studio").hidden) {
            clearTimeout(route.r);
            route.r = setTimeout(renderSheet, 120);
        }
    });

    /* ---------- content loading ----------
   content.json next to index.html is the published content; every visitor sees it.
   A draft saved in this browser (by the editor) is shown instead only while it is still
   based on that same content.json. Upload a new content.json and the server wins. */
    const DRAFT_KEY = "an.site.draft";
    let published = clone(C); // what the server is serving (defaults until it loads)
    const stamp = (o) => (o && o.updatedAt) || 0;
    const bare = (o) => {
        const c = clone(o);
        delete c.updatedAt;
        return JSON.stringify(c);
    };
    function saveDraft() {
        return LS.set(DRAFT_KEY, {base: stamp(published), content: C});
    }
    function readDraft() {
        const d = LS.get(DRAFT_KEY, null);
        if (d && d.content && d.content.site) return d;
        if (d && d.site) return {base: -1, content: d}; // older draft format: treat as out of date
        return null;
    }
    function useContent(o) {
        C = merge(DEFAULT, o);
        saved = clone(C);
        if (!editing || !dirty) {
            render();
            if (editing) renderPanel();
        }
        afterContentLoad();
    }
    function applyLoaded(serverObj) {
        if (serverObj) published = merge(DEFAULT, serverObj);
        const d = readDraft();
        if (d && bare(merge(DEFAULT, d.content)) === bare(published)) {
            LS.del(DRAFT_KEY);
            d.drop = true;
        } // draft already published
        if (d && !d.drop && d.base === stamp(published)) {
            useContent(d.content);
            toast(
                "Showing edits saved in this browser. They are not published yet.",
                "discard them",
                () => {
                    LS.del(DRAFT_KEY);
                    useContent(published);
                    toast("Showing the published content.json");
                },
            );
            return;
        }
        if (d && !d.drop) {
            // content.json changed on the server after this draft was made: the server wins
            LS.del(DRAFT_KEY);
            LS.set(DRAFT_KEY + ".old", d);
            useContent(published);
            toast(
                "content.json on the server changed since your browser draft, so the server version is showing. The draft was set aside.",
                "restore it",
                () => {
                    useContent(d.content);
                    saveDraft();
                    toast("Draft restored. Export content.json to publish it.");
                },
            );
            return;
        }
        if (serverObj) useContent(published);
    }
    render();
    renderToolbar();
    if (!reduce) {
        const tEl = document.querySelector('#heroMain [data-edit="hero.cmd"]');
        if (tEl) {
            const w = tEl.textContent;
            tEl.textContent = "";
            let i = 0;
            const step = () => {
                if (editing) {
                    tEl.textContent = w;
                    return;
                }
                tEl.textContent = w.slice(0, ++i);
                if (i < w.length) setTimeout(step, 90 + Math.random() * 80);
            };
            setTimeout(step, 400);
        }
    }
    const contentReady = (
        location.protocol === "file:"
            ? Promise.reject(new Error("file"))
            : fetch("content.json", {cache: "no-cache"})
                  .then((r) => {
                      if (!r.ok) throw new Error("HTTP " + r.status);
                      return r.json();
                  })
                  .then((o) => {
                      if (!o || !o.site) throw new Error("not a content.json");
                      return o;
                  })
    ).then(
        (o) => applyLoaded(o),
        (err) => {
            const why =
                location.protocol === "file:"
                    ? "This page was opened as a file, so content.json cannot load. Serve the folder instead: run  python -m http.server 8000  in it, then open http://localhost:8000"
                    : `content.json did not load (${err.message}), so the built-in content is showing.`;
            console.warn("[content] " + why);
            if (location.hash === "#admin") setTimeout(() => toast(why), 600);
            applyLoaded(null);
        },
    );
    route();
})();
