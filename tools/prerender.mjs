#!/usr/bin/env node
/* Write the published page into index.html so the first paint is the real content.

   content.json stays the source of truth. This script loads the site in headless
   Chrome, waits until app.js has rendered from that file, and copies the resulting
   markup back between the existing elements. Re-run it after editing content.json.
   It is optional: the Docker deploy does not need it, but the live HTML should be
   regenerated before you ship a content change.

   Usage:  node tools/prerender.mjs
*/

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = join(root, "index.html");
const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".woff2": "font/woff2",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
};

function serve() {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            const url = new URL(req.url, "http://127.0.0.1");
            let path = decodeURIComponent(url.pathname);
            if (path === "/") path = "/index.html";
            const file = join(root, path);
            if (!file.startsWith(root)) {
                res.writeHead(403);
                res.end();
                return;
            }
            try {
                const body = readFileSync(file);
                res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
                res.end(body);
            } catch {
                res.writeHead(404);
                res.end("not found");
            }
        });
        server.listen(0, "127.0.0.1", () => resolve(server));
    });
}

function httpCall(url, method) {
    return new Promise((resolve, reject) => {
        const req = httpRequest(url, { method }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve({ status: res.statusCode, body: data }));
        });
        req.on("error", reject);
        req.end();
    });
}
const get = (url) => httpCall(url, "GET");
const put = (url) => httpCall(url, "PUT");

function cdpClient(ws) {
    let id = 0;
    const pending = new Map();
    const socket = new WebSocket(ws);
    const ready = new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve);
        socket.addEventListener("error", () => reject(new Error("devtools socket failed")));
    });
    socket.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else resolve(msg.result);
        }
    });
    return {
        ready,
        send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const msgId = ++id;
                pending.set(msgId, { resolve, reject });
                socket.send(JSON.stringify({ id: msgId, method, params }));
            });
        },
        close() { socket.close(); },
    };
}

function setInner(html, id, inner) {
    const openRe = new RegExp(`<([a-zA-Z0-9]+)([^>]*\\bid=["']${id}["'][^>]*)>`);
    const m = openRe.exec(html);
    if (!m) throw new Error("index.html is missing #" + id);
    const tag = m[1];
    const start = m.index + m[0].length;
    const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    token.lastIndex = start;
    let depth = 1;
    let mm;
    while ((mm = token.exec(html))) {
        if (mm[1]) depth--;
        else depth++;
        if (depth === 0) return html.slice(0, start) + inner + html.slice(mm.index);
    }
    throw new Error("unclosed #" + id);
}

function setRev(html, rev) {
    return html.replace(/(<main\b[^>]*\bid=["']home["'])([^>]*)>/, (full, open, rest) => {
        const attrs = /data-rev=/.test(rest)
            ? rest.replace(/data-rev="[^"]*"/, `data-rev="${rev}"`)
            : `${rest} data-rev="${rev}"`;
        return `${open}${attrs}>`;
    });
}

const server = await serve();
const port = server.address().port;
const chrome = spawn(
    "google-chrome",
    [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--remote-debugging-port=9223",
        `--user-data-dir=/tmp/prerender-chrome-${process.pid}`,
        "about:blank",
    ],
    { stdio: "ignore" },
);

let html;
try {
    let version;
    for (let i = 0; i < 40; i++) {
        try {
            version = JSON.parse((await get("http://127.0.0.1:9223/json/version")).body);
            break;
        } catch {
            await new Promise((r) => setTimeout(r, 150));
        }
    }
    if (!version) throw new Error("Chrome devtools did not start");
    const opened = await put(`http://127.0.0.1:9223/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/?prerender=1`)}`);
    if (opened.status >= 400) throw new Error("devtools refused a new tab: " + opened.body.slice(0, 200));
    const page = JSON.parse(opened.body);
    const client = cdpClient(page.webSocketDebuggerUrl);
    await client.ready;
    await client.send("Runtime.enable");
    await client.send("Runtime.evaluate", {
        expression: `new Promise((resolve) => {
            const done = () => document.documentElement.dataset.boot === "done";
            if (done()) return resolve(true);
            const obs = new MutationObserver(() => { if (done()) { obs.disconnect(); resolve(true); } });
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-boot"] });
            setTimeout(() => resolve(false), 8000);
        })`,
        awaitPromise: true,
        returnByValue: true,
    });
    const grabbed = await client.send("Runtime.evaluate", {
        expression: `(() => {
            const pick = (id) => { const el = document.getElementById(id); return el ? el.innerHTML : ""; };
            return JSON.stringify({
                rev: (document.getElementById("home") || {}).dataset ? document.getElementById("home").dataset.rev : "",
                topbar: pick("topbar"),
                heroMain: pick("heroMain"),
                sections: pick("sections"),
                footer: pick("footer"),
                studioTop: pick("studioTop"),
                studioHero: pick("studioHero"),
                instRow: pick("instRow"),
                libHead: pick("libHead"),
                libList: pick("libList"),
                sheetsTitle: pick("sheetsTitle"),
            });
        })()`,
        returnByValue: true,
    });
    client.close();
    const data = JSON.parse(grabbed.result.value);
    if (!data.rev || !data.heroMain || !data.sections) {
        throw new Error("the page did not finish rendering. Is content.json being served?");
    }
    html = readFileSync(indexPath, "utf8");
    for (const id of ["topbar", "heroMain", "sections", "footer", "studioTop", "studioHero", "instRow", "libHead", "libList", "sheetsTitle"]) {
        html = setInner(html, id, data[id]);
    }
    html = setRev(html, data.rev);
    writeFileSync(indexPath, html);
    console.log(`prerendered index.html (rev ${data.rev})`);
} finally {
    chrome.kill("SIGKILL");
    server.close();
}
