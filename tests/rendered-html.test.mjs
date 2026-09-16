import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the 小小星球 application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>小小星球｜个人生活工作台<\/title>/i);
  assert.match(html, /正在整理你的生活轨道/);
  assert.match(html, /manifest\.webmanifest/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("ships core PWA and product capabilities", async () => {
  const [app, storage, manifest] = await Promise.all([
    readFile(new URL("../app/SmallPlanetApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);
  for (const label of ["首页", "存钱", "倒计时", "月度", "追星", "生活", "扩展", "心愿"]) {
    assert.match(app, new RegExp(label));
  }
  assert.match(app, /navigator\.serviceWorker\.register/);
  assert.match(storage, /AES-GCM/);
  assert.match(storage, /PBKDF2/);
  assert.match(storage, /210000/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  await Promise.all([
    access(new URL("../public/sw.js", import.meta.url)),
    access(new URL("../public/icon-192.png", import.meta.url)),
    access(new URL("../public/icon-512.png", import.meta.url)),
    access(new URL("../public/banner-still-life.png", import.meta.url)),
  ]);
});
