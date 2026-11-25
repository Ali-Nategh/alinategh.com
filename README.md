<div align="center">

<img src="assets/icons/brass-192.png" width="72" alt="Calligraphic A logo">

# alinategh.com

**My portfolio. It looks like a concert hall after dark and it has a working piano in it.**

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

[Live site](https://alinategh.com) · [LinkedIn](https://www.linkedin.com/in/alinategh) · [GitHub](https://github.com/Ali-Nategh)

<img src="docs/home.jpg" alt="Home page: hero card with name and bio, and an interactive 3D sphere of technologies" width="100%">

</div>

---

## What's on the page

| | |
|---|---|
| **Hero and signal sphere** | A terminal-style intro card next to a draggable 3D sphere of points with my stack orbiting it. The sphere pulses whenever a piano note is played. |
| **Music, first** | A playable piano right on the page (mouse, touch, or the `A`–`'` keys on your keyboard), my instruments and years, and links to my music. |
| **Experience, skills, projects, education, certifications** | All driven by one content file, so I can reorder, hide or rewrite any section without touching code. |
| **The studio** (`#studio`) | A small sheet-music editor: write notes and chords on a staff, choose one of five synth voices, play it back and save it. |
| **The terminal** (`` ` `` key) | A fake zsh with real commands (`whoami`, `projects`, `goto music`, `theme light`, `sudo reboot`…). On a large screen, `startx` boots AliOS. |
| **Themes** | Navy & brass (default), Burgundy, Terminal, Light, Liquid glass and CRT. Visitors pick one from the top bar and their browser remembers it. |
| **Mini Ali** | A pixel-art me who lives at the edge of the page and gets up to things. Click him and he waves. |
| **Binary notes** | Faint musical notes in the background that assemble out of `0`s and `1`s, hold for a moment, then dissolve. |
| **In-page editor** (`#admin`) | Click any text on the page to edit it, then use the side panel for everything else. Export the result as `content.json`. |

<table>
<tr>
<td width="50%"><img src="docs/studio.jpg" alt="Studio: sheet music editor with a staff, toolbar and keyboard"></td>
<td width="50%"><img src="docs/terminal.jpg" alt="Terminal overlay showing the help command"></td>
</tr>
<tr>
<td><img src="docs/light.jpg" alt="Light theme"></td>
<td><img src="docs/editor.jpg" alt="In-page editor with its side panel open"></td>
</tr>
</table>

<p align="center"><img src="docs/phone.jpg" alt="Phone layout" width="300"></p>

---

## Stack

| Layer | What | Why |
|---|---|---|
| Markup / style | Semantic HTML, modern CSS (custom properties, grid, `clamp()`, `backdrop-filter`) | Each theme is mostly just a set of CSS variables |
| Behaviour | Vanilla JavaScript (ES2020+), no libraries | Everything here is small enough not to need a framework, and the page loads instantly |
| Graphics | Canvas 2D (sphere, binary notes, mini Ali), inline SVG (staff notation, icons) | Full control over every pixel, and it stays sharp at any size |
| Audio | Web Audio API: oscillators, filters, Karplus–Strong, a generated convolution reverb | Five instruments with zero audio files |
| Fonts | Self-hosted [Fraunces](https://fonts.google.com/specimen/Fraunces) and [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), with [Noto Music](https://fonts.google.com/noto/specimen/Noto+Music) loaded only when notation is drawn | Same faces as before, without a render-blocking request to Google and without a layout jump when they arrive |
| Content | `content.json` is the only published copy. `tools/prerender.mjs` writes it into `index.html` | A one-file CMS with no database, and the real text is in the first HTML response |
| Hosting | Any static host. Included: nginx in Docker with gzip, caching and security headers | Runs anywhere, from a $0 VPS to GitHub Pages |
| Assets | Python + Pillow scripts in `tools/` | The favicons and the link-preview image are generated, not hand-drawn |

---

## How the features work

<details>
<summary><b>Content model and the in-page editor</b></summary>

Everything the home page and studio show lives in one object, `C`, loaded from `content.json`. That file is the published copy. `DEFAULT` in `js/app.js` is only a shape for missing keys and for the case where `content.json` cannot be fetched at all. The page does not paint `DEFAULT` and then swap it out: if `index.html` was pre-rendered from the same file, the script wires the piano and the sphere and leaves the markup alone.

- Every editable piece of text has a `data-edit="path.to.field"` attribute. In edit mode those elements become `contentEditable`, and on `input` the new text is written back to that path in `C`.
- Lists (experience bullets, projects, courses, links) get small ↑ ↓ ✕ tool buttons and a "+ add" card. The side panel (**Site · Sections · Item · Terminal**) covers what can't be clicked: section order and visibility, theme, tab icon, mini-Ali settings, terminal commands and so on.
- Undo is a stack of JSON snapshots, capped at 60.
- **Save** keeps a draft in `localStorage`, and **Export** downloads `content.json`. Put that file next to `index.html` and every visitor sees the new version.
- The server's `content.json` always wins. A browser draft is only shown while it is still based on the `content.json` the server is serving; upload a different file and the draft is set aside (with a one-click *restore*). Once the exported file is live, the matching draft is cleared automatically.
- The editor waits for `content.json` before opening, so it never starts from the built-in defaults. If the file can't load (a 404, or the page opened as `file://`), the console and the editor say so.

The editor only ever changes the editing person's own browser, so it can be left open on the live site without risk. To lock it to `localhost` or turn it off, change one line at the top of the editor code:

```js
const EDITOR = 'anywhere'; // 'anywhere' | 'localhost' | 'off'
```

</details>

<details>
<summary><b>Themes</b></summary>

Each palette is a block of CSS custom properties under `:root[data-palette="…"]`, covering background, panels, lines, text, accent, claret, the cool accent and the "sunk" surfaces. Switching the theme only changes one attribute on `<html>`. The canvases (sphere, binary notes, mini Ali) re-read their colours whenever `data-palette` changes, using a `MutationObserver`.

**Liquid glass** goes one step further than colours: a colourful wallpaper behind clear panels with a heavy `backdrop-filter: blur() saturate()`, a light gradient sheen, and inset highlights along the edges, so every card, button and menu reads as a piece of glass.

The site owner sets the default theme in the editor. A visitor's choice is stored under `an.theme` and overrides that default for them only. The toggle icon is a small SVG half-circle, so it stays smooth at any zoom.

</details>

<details>
<summary><b>The signal sphere</b></summary>

760 points (420 on phones) are spread evenly over a sphere with a Fibonacci lattice, rotated in 3D, projected to 2D, and drawn back to front with depth-based size and opacity. Tags orbit on a tilted ring and are drawn as pills in the panel colour. It leans toward your cursor, and you can drag to spin it; it keeps spinning with inertia.

Playing a note sends a "kick" that briefly swells the sphere and brightens it. Resizing is debounced with `requestAnimationFrame` and only redraws when the size actually changed, which also avoids the classic `ResizeObserver loop` warning.

</details>

<details>
<summary><b>Five synth voices, no samples</b></summary>

All sound is generated live with the Web Audio API:

| Voice | Technique |
|---|---|
| Piano | Triangle plus a sine an octave up, a fast attack, a two-stage decay, and a low-pass filter that closes as the note fades |
| Guitar | Karplus–Strong plucked string: a short noise burst fed through a tuned feedback delay |
| Flute | A sine with breath noise through a band-pass filter, plus a slow vibrato |
| Xylophone | Inharmonic partials with very short decays |
| Voice | A sawtooth through three formant band-pass filters (an "ah" vowel) with vibrato |

Everything goes through a convolution reverb whose impulse response is generated in code from decaying noise. Playback is scheduled on the `AudioContext` clock rather than with `setTimeout`, so tempo stays steady even when the tab is busy.

</details>

<details>
<summary><b>The studio: staff notation and chords</b></summary>

A sheet is a list of events. Each event is `{ k: [{ s, a }], d, dot }`, where `s` is the staff step, `a` the accidental, `d` the duration and `dot` marks a dotted note. A rest is `{ r: true, d }`. Chords are simply events with more than one key.

- **Engraving.** The staff is drawn as SVG: clef, time signature, note heads, stems, flags, ledger lines, accidentals, dots, bar lines and rests. The treble clef is placed by measuring its real glyph with `getBBox()`, so its curl sits on the G line in every font.
- **Input.** Click the staff, the on-screen keyboard, or your computer keyboard: `A`–`'` for white notes, `W E T Y U O P` for black, `1`–`5` for durations, `.` to dot, `R` for a rest, and `C` or Shift for chords.
- **Library.** The built-in sheets are written in a compact notation, for example `P("q:C4+E4+G4 e.:A#4 h:r")`. The library has developer jingles (*Deploy Succeeded*, *Build Failed*, *404*, *Merge Conflict*, *Power On / Off*) and public-domain openings (Beethoven, Satie, Grieg, Joplin).
- **Playback.** Notes are scheduled on the audio clock and the page never scrolls on its own. Leave the studio while a sheet plays and it keeps going: the sphere reacts to every note, and a small *now playing* pill on the home page takes you back or stops it.
- **Saving.** Visitors' sheets are saved in their own browser. The owner can promote a sheet to the library or to the example sheet from the editor.

</details>

<details>
<summary><b>The terminal</b></summary>

Press `` ` `` or click **~/tty**. It has command history (↑ ↓) and accepts both built-in and custom commands:

- **Built-in:** `help`, `whoami`, `projects`, `experience`, `education`, `certs`, `stack`, `music`, `play [sheet]`, `studio`, `contact`, `copy-email`, `theme <name>`, `goto <section>`, `ls`, `cat`, `date`, `echo`, `run mergify`, `startx`, `logout`, `shutdown`, `clear`, `exit`, `sudo …`
- **Custom:** commands defined in `content.json` (editable from the editor's Terminal tab). Each one prints text and can optionally trigger an action: play a sheet, open a section, switch theme or open a link. The defaults are `coffee`, `fun-fact` and `signature`.

</details>

<details>
<summary><b>Binary notes background</b></summary>

A random note glyph (♪ ♫ ♩ ♬ 𝄞) is drawn once onto an offscreen canvas and sampled on a 6 px grid. Each inked cell becomes one character, `0` or `1`. Every cell gets its own appear time, flip rate and fade-out time, so the note seems to *compile* into place and then decay.

At most 5 notes are on screen at once (3 on phones), positioned so they don't overlap, and the loop runs at about 30 fps. While music plays (the home piano, *play my name*, the studio or the terminal) every note fires a `music:note` event: the cap rises to 10 (6 on phones) and smaller, quicker notes join in. They use the theme's accent colour. The background is skipped entirely when the visitor has `prefers-reduced-motion` turned on.

</details>

<details>
<summary><b>Mini Ali</b></summary>

A 61 × 46 pixel character drawn into a pixel buffer. A black outline is computed automatically around any filled cell, and the sprite is mirrored to face left or right. Hair is built from a small curl tile, and only the lower curls bounce, with a sway that follows his movement. His eyes are three cells wide, so a one-cell pupil shift reads as a glance.

His behaviour is a list of **activities**, each made of **phases** (frames, frame time, repeats, movement):

- **Desktop:** he idles in the side gutter, walks to the other side, peeks around the edge, sits down with headphones and a vinyl, does push-ups or codes on a laptop.
- **Phones:** he peeks in from the edge and every 10–15 s *visits*, stepping onto the page to do an activity before slipping back.
- **Click him:** phases marked `skip` are dropped, phases marked `loopFinish` finish their current cycle, and then he waves.

His hair, skin, jacket, glasses and beard can be changed from the editor (`C.mini`). There's also a console easter egg: `miniAli.wave()` or `miniAli.do('pushups')`.

</details>

<details>
<summary><b>Accessibility, performance and SEO</b></summary>

- **Accessibility:** semantic landmarks, labelled controls, `aria-pressed` toggles, a keyboard-navigable theme menu (`menuitemradio`), and visible focus rings. The terminal is a labelled modal dialog. All animations respect `prefers-reduced-motion`.
- **Performance:** the canvases pause when the tab is hidden, the background runs at a capped frame rate, and resize work is debounced. Text fonts are self-hosted woff2 files with metric-matched fallbacks. Fraunces uses `font-display: swap`, so the name and headings always end in the real face, and the matched fallback keeps that swap nearly still. IBM Plex Mono, which sets the running text, uses `optional`, so a slow first visit never reflows every paragraph. Noto Music is requested only when the studio opens or the binary notes need a glyph.
- **SEO:** a meta description, a canonical URL, Open Graph and Twitter cards with a generated 1200 × 630 preview image, `schema.org/Person` JSON-LD, `robots.txt` and `sitemap.xml`.

</details>

---

## Project structure

```
.
├── index.html            markup and meta tags
├── content.json          the site's content (export from the editor, or edit by hand)
├── css/
│   ├── fonts.css         self-hosted faces and metric-matched fallbacks
│   ├── music-font.css    Noto Music, loaded only when notation is drawn
│   ├── main.css          layout, themes, components, studio, editor
│   ├── mini.css          mini Ali's canvas
│   ├── eggs.css          trophies, developer mode, echo
│   ├── mergify.css       order-merge teaser and pipeline
│   ├── alios.css         AliOS desktop, loaded only after boot
│   └── notfound.css      the lost page
├── js/
│   ├── app.js            content model, render, editor, themes, sphere, synths, studio, terminal
│   ├── bitnotes.js       binary-note background
│   ├── mini.js           mini Ali
│   ├── achievements.js   trophy bus, toast, jingle, `trophies` data
│   ├── eggs.js           unlocks for themes, the name in notes, and watching Mini Ali
│   ├── konami.js         developer mode
│   ├── echo.js           Simon on five keys, C to G
│   ├── mergify.js        order-merge pipeline (loaded on play)
│   ├── mergify-card.js   play button, teaser, `run mergify`
│   ├── alios.js          AliOS desktop and window manager (loaded on boot)
│   ├── alios-apps.js     AliOS windows, drawn from content.json
│   ├── console-hello.js  the devtools greeting and `hire()`
│   └── notfound.js       the playable 404
├── assets/
│   ├── fonts/            self-hosted woff2 files (OFL)
│   ├── icons/            calligraphic-A tab icons (gray, brass, blend)
│   └── og-image.jpg      link-preview card
├── 404.html              lost page, served by nginx for unknown URLs
├── favicon.ico
├── robots.txt · sitemap.xml
├── deploy/               nginx config + security headers
├── docker-compose.yml
├── tools/                asset, screenshot, and prerender scripts
└── docs/                 README screenshots
```

---

## Run it locally

Any static server works, because the page fetches `content.json` (opening the file directly with `file://` blocks that fetch):

```bash
git clone https://github.com/Ali-Nategh/alinategh.com.git
cd alinategh.com
python3 -m http.server 8000      # Windows: python -m http.server 8000   ·   or: npx serve .
```

Then open <http://localhost:8000>, and <http://localhost:8000/#admin> to edit.

`index.html` carries a baked copy of `content.json`, so the first paint and link previews show the real content. You don't have to refresh it by hand: when a push to `main` changes `content.json`, `js/app.js` or the prerender script, the **Bake content into index.html** GitHub Action runs `tools/prerender.mjs` and commits the result (so `git pull` before your next push). If the bake is ever behind, nothing breaks: the page notices and renders from `content.json`.

To bake locally instead, you need Chrome or Chromium. The script looks for `google-chrome`, `chromium`, the usual Windows install folders and the macOS app path. If yours lives somewhere else:

```bash
node tools/prerender.mjs
# macOS, when `google-chrome` is not on PATH:
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node tools/prerender.mjs
```

## Deploy

**Docker + nginx** (what I use on a small VPS):

```bash
docker compose up -d             # serves on :8080; put Caddy or Certbot in front for HTTPS
```

The Docker nginx config compresses text, makes browsers revalidate `index.html`, `content.json`, CSS and JS on every visit (so a deploy shows up immediately), caches images and fonts for a month, adds security headers, refuses to serve `tools/`, `deploy/`, `docs/` and the README, and answers unknown URLs with `404.html`.

The live VPS does not use that file. There, `nginx/conf.d/portfolio.conf` is the server people actually hit: it terminates TLS, sets HSTS and the other security headers, rate-limits, and serves the files from `/usr/share/nginx/portfolio` itself. It is not a proxy in front of the container, so nothing in `deploy/nginx.conf` applies there.

`portfolio.conf` keeps the security side: the SSL lines, `limit_req`, the HSTS and framing headers, the port-80 redirect and the handshake-reject default server. Everything about the site lives in `deploy/portfolio.inc.conf`: compression, caching (`expires`, so the security headers still apply), the lost page for unknown URLs, and hiding dotfiles, `deploy/`, `tools/`, `docs/` and the README. Inside the `listen 443` server, that one line replaces the site's own `gzip` and `location` lines:

```nginx
include /usr/share/nginx/portfolio/deploy/portfolio.inc.conf;
```

Then `nginx -t` and reload. Do not include `deploy/nginx.conf`: it is a complete server block for Docker, and would drop HSTS and change `X-Frame-Options` from `DENY` to `SAMEORIGIN`.

A first visit makes about 20 requests (page, CSS, JS, fonts, content). Keep the `limit_req` burst comfortably above that, for example `burst=60 nodelay`, or a visitor who lands on the lost page and clicks straight home can hit the limit and get 503s.

**GitHub Pages / Netlify / Cloudflare Pages:** point them at the repo root. No build command is needed.

**Updating content:** open `#admin`, make your changes, press **save**, then **export content.json**. Then commit the file, or copy it to the server:

```bash
scp content.json user@server:~/site/
```

---

## Regenerating assets

```bash
pip install pillow fonttools brotli
python3 tools/make_favicons.py   # assets/icons/*, favicon.ico   (needs tools/fonts/pinyon-script.ttf)
python3 tools/make_og.py         # assets/og-image.jpg            (needs the fontsource packages, see the script header)
node tools/screenshots.js        # docs/*.png                     (needs Playwright and a local server)
```

---

## Easter eggs

Trophies live in `localStorage` under `an.achievements`. Anything new can register one:

```js
Achievements.register({ id: "my-egg", name: "Shown once found", hint: "Shown while it is locked." });
Achievements.unlock("my-egg");
```

A small toast and a short chime mark the unlock, and a count sits in the corner after the first one. `trophies` in the terminal lists them. Locked rows are a hint, not the name. Motion is dropped when the visitor has asked for less of it.

- `startx` or **boot AliOS** opens a desktop. Under 900px wide or 640px tall it opens a phone home screen instead, with the same apps full screen. `logout`, `exit` or **log out** returns to the page. `shutdown` and `reboot` play the boot chime. The Mergify demo plays in the Mergify window. Settings can turn the CRT look down
- `play echo` or the **echo** button is Simon on five keys, C D E F G. It works on the page and inside AliOS
- `sudo reboot` in the terminal plays a boot chime written for the site
- `sudo hire ali`
- `signature` plays the notes hidden in my name: **A · E · G · H** (H is B in German notation). Playing those four notes yourself on the piano is its own trophy
- Use every colour theme
- Click mini Ali, or wait and watch what he gets up to
- Open the console. `hire()` leaves my email. `miniAli.wave()` and `miniAli.do('music')` (also `'pushups'` and `'coding'`) poke the pixel
- The Konami code (↑ ↑ ↓ ↓ ← → ← → B A) turns on developer mode
- `play echo` or `echo-game`, or the **echo** button by the piano: Simon on C D E F G. Keys `A S D F G` or `1`–`5`. The same game opens inside AliOS
- **Play the pipeline** on the BarAI card, or `run mergify`: five orders, two from the same address, one label saved. Staying to the end is a trophy
- A missing URL is a small playable room. **Play the lost notes** and he finds his way back

---

## How it was built

I built this site by prompt engineering it with Claude (Anthropic) as my AI pair programmer. I set the direction, the taste and the constraints, and reviewed, tested and iterated on every feature. Claude did most of the typing. The commit history and this README are the honest record of that.

## Credits

- Fonts: Fraunces, IBM Plex Mono, Noto Music and Pinyon Script (logo), all under the SIL Open Font License.
- Library pieces by Beethoven, Satie, Grieg and Joplin are in the public domain. The developer jingles and *Signature* are original.
- Inspired by the many award-winning portfolios that treat a personal site as a small product.

## License

The code is under the [MIT license](LICENSE). The personal content is not: my bio, experience, compositions, the mini-Ali likeness, the logo and the preview image. If you fork this, make it yours.
