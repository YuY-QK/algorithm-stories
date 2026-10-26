#!/usr/bin/env node
// 页面文字快照：给重构做回归基准。先 npm run build，再运行本脚本。
// 打开每个关卡页，依次点开四个标签，把可见文字写进 tests/snapshots/pages/<slug>.txt。
// Math.random 换成固定种子、计时器冻住，所以同样的页面每次得到同样的文字。
//
// 用法：
//   node scripts/snapshot-text.cjs            写入快照（只在定基准时用）
//   node scripts/snapshot-text.cjs --check    和已有快照比，不一致就打印差异并以 1 退出
//   node scripts/snapshot-text.cjs --check binary-search stack   只查这几关

"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "tests", "snapshots", "pages");
const BASE = "/algorithm-stories/";

const args = process.argv.slice(2);
const check = args.includes("--check");
const only = args.filter((a) => !a.startsWith("--"));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
    p = path.join(DIST, p.slice(BASE.length));
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => server.listen(0, () => ok(server)));
}

// 在页面里运行：固定种子的 Math.random（mulberry32）。
// 各个交互组件（astro-island）加载完成的先后不固定，共用一个随机序列会每次不同，
// 所以按页面上的先后顺序逐个挂载，每个挂载前用它的序号重新播种。
function seedRandom() {
  let a = 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // 迁移到配置的关卡：每块自己向 src/runtime/rand.ts 要随机源，种子和上面按序号重新播种时一样
  window.__islandRandom = (el) => {
    let b = 20261026 + [...document.querySelectorAll("astro-island")].indexOf(el) * 7919;
    return () => {
      b |= 0; b = (b + 0x6d2b79f5) | 0;
      let t = Math.imul(b ^ (b >>> 15), 1 | b);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  let turn = 0;
  const waiting = [];
  const wake = () => waiting.splice(0).forEach((f) => f());
  const define = customElements.define.bind(customElements);
  customElements.define = (name, Island, options) => {
    if (name === "astro-island") {
      Island = class extends Island {
        constructor() {
          super();
          const run = this.hydrate;
          this.hydrate = async (...args) => {
            const k = [...document.querySelectorAll("astro-island")].indexOf(this);
            while (turn !== k) await new Promise((ok) => waiting.push(ok));
            a = 20261026 + k * 7919;
            try { return await run(...args); } finally { turn++; wake(); }
          };
        }
      };
    }
    return define(name, Island, options);
  };
}

function diff(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  const out = [];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) out.push("  第 " + (i + 1) + " 行\n    基准：" + (x[i] ?? "（无）") + "\n    现在：" + (y[i] ?? "（无）"));
    if (out.length >= 10) { out.push("  ……"); break; }
  }
  return out.join("\n");
}

(async () => {
  if (!fs.existsSync(path.join(DIST, "algo"))) { console.error("先运行 npm run build"); process.exit(2); }
  const { chromium } = require("playwright");
  const slugs = fs.readdirSync(path.join(DIST, "algo")).filter((s) => !only.length || only.includes(s)).sort();
  const server = await serve();
  const origin = "http://localhost:" + server.address().port;
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  let bad = 0;

  for (const slug of slugs) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    await page.clock.install({ time: new Date("2026-10-26T00:00:00Z") });
    await page.addInitScript(seedRandom);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + BASE + "algo/" + slug + "/", { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    const parts = [await page.locator(".mast").innerText()];
    const tabs = page.locator("[role=tab][data-stage]");
    for (let i = 0; i < (await tabs.count()); i++) {
      const tab = tabs.nth(i);
      await tab.click();
      const stage = await tab.getAttribute("data-stage");
      parts.push("==== " + stage + " ====\n" + (await page.locator("#panel-" + stage).innerText()));
    }
    parts.push(await page.locator(".foot").innerText());
    if (errors.length) parts.push("!! 页面错误：" + errors.join(" | "));
    const text = parts.join("\n\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
    await page.close();

    const file = path.join(OUT, slug + ".txt");
    if (!check) {
      fs.writeFileSync(file, text);
      console.log("写入 " + path.relative(ROOT, file));
    } else if (!fs.existsSync(file)) {
      bad++; console.log("✗ " + slug + "：没有基准");
    } else {
      const base = fs.readFileSync(file, "utf8");
      if (base === text) console.log("✓ " + slug);
      else { bad++; console.log("✗ " + slug + "\n" + diff(base, text)); }
    }
  }

  await browser.close();
  server.close();
  process.exit(bad ? 1 : 0);
})();
