import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { gunzipSync } from "node:zlib";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Two clean production builds, one isolated fixture, no external asset requests or real users.
assert.equal(process.env.CI, "true");
assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/vinos_rosh_ci");
assert.equal(process.env.PREVIEW_MODE, "false");
const expectedOrigin = "https://rosh.example.test";
assert.equal(process.env.NEXT_PUBLIC_APP_URL, expectedOrigin);
const [baselineDirectory, candidateDirectory] = process.argv.slice(2).map((value) => resolve(value));
assert.ok(baselineDirectory && candidateDirectory && baselineDirectory !== candidateDirectory);
const productPath = "/productos/rosh-qa-botella-de-prueba";
const routes = ["/", "/productos", productPath, "/envios"];
const servers = [];
function get(origin, path) {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin, "The audit may request only its own loopback server");
  return new Promise((resolveRequest, reject) => {
    const started = performance.now();
    const req = httpRequest(url, { headers: { "accept-encoding": "gzip", "user-agent": "Twitterbot/1.0" } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const bytes = Buffer.concat(chunks);
          const decoded = res.headers["content-encoding"] === "gzip" ? gunzipSync(bytes) : bytes;
          resolveRequest({ status: res.statusCode, text: decoded.toString("utf8"), decodedBytes: decoded.length, transferBytes: bytes.length, durationMs: performance.now() - started });
        } catch (error) { reject(error); }
      });
      res.on("error", reject);
    });
    req.setTimeout(20_000, () => req.destroy(new Error("AUDIT_REQUEST_TIMEOUT")));
    req.on("error", reject); req.end();
  });
}
function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[match[1].toLowerCase()] = (match[2] ?? match[3]).replaceAll("&amp;", "&").replaceAll("&quot;", '"');
  return result;
}
function tags(html, name) { return [...html.matchAll(new RegExp("<" + name + "\\b[^>]*>", "gi"))].map((match) => attributes(match[0])); }
function meta(html, key) { return tags(html, "meta").find((tag) => tag.name === key || tag.property === key)?.content; }
function canonical(html) { return tags(html, "link").find((tag) => tag.rel === "canonical")?.href; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); return Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100; }
async function start(directory, port) {
  const child = spawn(process.execPath, [".next/standalone/server.js"], { cwd: directory,
    env: { ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(port), NEXTAUTH_URL: `http://127.0.0.1:${port}` }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", () => {}); child.stderr.on("data", () => {});
  const server = { child, origin: `http://127.0.0.1:${port}` }; servers.push(server);
  let spawnError; child.on("error", (error) => { spawnError = error; });
  const limit = Date.now() + 60_000;
  while (Date.now() < limit) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error("AUDIT_SERVER_EXITED");
    try { if ((await get(server.origin, "/api/health")).status === 200) return server; } catch { /* Wait for the named isolated server. */ }
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error("AUDIT_SERVER_NOT_READY");
}
async function measure(server) {
  const results = [];
  for (const path of routes) {
    assert.equal((await get(server.origin, path)).status, 200, "Warmup " + path);
    const samples = [];
    for (let i = 0; i < 3; i++) samples.push(await get(server.origin, path));
    for (const sample of samples) assert.equal(sample.status, 200, path);
    const html = samples.at(-1).text;
    const styles = [...new Set(tags(html, "link").filter((tag) => tag.rel === "stylesheet").map((tag) => tag.href))];
    const scripts = [...new Set(tags(html, "script").map((tag) => tag.src).filter(Boolean))];
    const bytes = { cssDecoded: 0, cssTransfer: 0, jsDecoded: 0, jsTransfer: 0 };
    let css = "";
    for (const [kind, paths] of [["css", styles], ["js", scripts]]) {
      for (const asset of paths) {
        assert.match(asset, /^\/_next\/static\//);
        const resource = await get(server.origin, asset); assert.equal(resource.status, 200, asset);
        bytes[kind + "Decoded"] += resource.decodedBytes; bytes[kind + "Transfer"] += resource.transferBytes;
        if (kind === "css") css += resource.text;
      }
    }
    results.push({ path, ...bytes, styleCount: styles.length, scriptCount: scripts.length,
      htmlDecoded: samples.at(-1).decodedBytes, htmlResponseMedianMs: median(samples.map((sample) => sample.durationMs)),
      containsAdminOnlyStyles: css.includes(".adminCustomerReviewList") || css.includes(".backupSummaryGrid"), canonical: canonical(html) ?? null });
  }
  return results;
}
async function verifyProductionSeo(server) {
  for (const path of ["/", "/productos", productPath, "/envios", "/contacto", "/nuestra-historia", "/preguntas-frecuentes"]) {
    const response = await get(server.origin, path); assert.equal(response.status, 200, path);
    const declared = canonical(response.text); assert.ok(declared, "Missing canonical " + path);
    assert.equal(new URL(declared).href, new URL(path, expectedOrigin).href, "Canonical " + path);
    assert.ok(!meta(response.text, "robots")?.includes("noindex"), "Public production " + path);
  }
  const product = (await get(server.origin, productPath + "?utm_source=qa")).text;
  assert.equal(canonical(product), expectedOrigin + productPath);
  assert.equal(meta(product, "og:image"), expectedOrigin + "/products/morado-intenso.webp");
  assert.equal(meta(product, "og:title"), "ROSH QA — Botella de prueba | Vinos ROSH");
  assert.equal(meta(product, "twitter:title"), meta(product, "og:title"));
  const filtered = (await get(server.origin, "/productos?q=QA&orden=price-asc")).text;
  assert.equal(canonical(filtered), expectedOrigin + "/productos"); assert.match(meta(filtered, "robots"), /noindex/);
  for (const path of ["/carrito", "/iniciar-sesion", "/registrarse", "/recuperar-contrasena"]) {
    const response = await get(server.origin, path); assert.equal(response.status, 200, path); assert.match(meta(response.text, "robots"), /noindex/, path);
  }
  const robots = await get(server.origin, "/robots.txt"); assert.equal(robots.status, 200); assert.match(robots.text, /Disallow: \/pedidos/);
  assert.ok(robots.text.includes("Sitemap: " + expectedOrigin + "/sitemap.xml"));
  const sitemap = await get(server.origin, "/sitemap.xml"); assert.equal(sitemap.status, 200);
  assert.ok(sitemap.text.includes("<loc>" + expectedOrigin + "/envios</loc>"));
  assert.ok(sitemap.text.includes("<loc>" + expectedOrigin + productPath + "</loc>"));
  assert.ok(!/<loc>[^<]*(?:\/admin|\/mi-cuenta|\/pedidos|\/carrito|\/checkout)/.test(sitemap.text));
  return { productionCanonicals: 7, privateNoindexPages: 4, productShareMetadata: true, filteredCatalogNoindex: true, coverageInSitemap: true };
}
async function stop(server) {
  if (server.child.exitCode !== null || server.child.signalCode !== null) return;
  await new Promise((done) => {
    const timeout = setTimeout(() => server.child.kill("SIGKILL"), 5000);
    server.child.once("exit", () => { clearTimeout(timeout); done(); });
    server.child.kill("SIGTERM");
  });
}
try {
  const base = await start(baselineDirectory, 3101); const before = await measure(base); await stop(base);
  const head = await start(candidateDirectory, 3102); const after = await measure(head);
  const comparisons = after.map((current, index) => {
    const old = before[index]; assert.equal(current.path, old.path);
    return { path: current.path, cssBefore: old.cssDecoded, cssAfter: current.cssDecoded, cssSaved: old.cssDecoded - current.cssDecoded,
      cssTransferBefore: old.cssTransfer, cssTransferAfter: current.cssTransfer, jsBefore: old.jsDecoded, jsAfter: current.jsDecoded,
      responseMedianBeforeMs: old.htmlResponseMedianMs, responseMedianAfterMs: current.htmlResponseMedianMs };
  });
  const report = { passed: false, baseCommit: process.env.AUDIT_BASE_SHA, headCommit: process.env.AUDIT_HEAD_SHA, node: process.version,
    nextBefore: JSON.parse(readFileSync(resolve(baselineDirectory, "node_modules/next/package.json"), "utf8")).version,
    nextAfter: JSON.parse(readFileSync(resolve(candidateDirectory, "node_modules/next/package.json"), "utf8")).version,
    fixture: "vinos_rosh_ci, one synthetic product, anonymous requests", methodology: "Clean production builds; loopback HTTP; one warmup and three HTML requests; CSS/JS referenced by each initial HTML document. No external images, Lighthouse score, real-user Core Web Vitals or browser cache simulation.",
    before, after, comparisons, seo: null };
  mkdirSync("performance-report", { recursive: true });
  writeFileSync("performance-report/public-assets.json", JSON.stringify(report, null, 2) + "\n");
  const seo = await verifyProductionSeo(head); report.seo = seo;
  for (let index = 0; index < after.length; index++) {
    const old = before[index], current = after[index];
    assert.equal(current.containsAdminOnlyStyles, false, current.path);
    if (old.containsAdminOnlyStyles) assert.ok(current.cssDecoded < old.cssDecoded, `Remove unused CSS on ${current.path}: ${old.cssDecoded} -> ${current.cssDecoded}`);
    else assert.ok(current.cssDecoded <= old.cssDecoded + 1024, `Review CSS growth on ${current.path}: ${old.cssDecoded} -> ${current.cssDecoded}`);
  }
  report.passed = true;
  writeFileSync("performance-report/public-assets.json", JSON.stringify(report, null, 2) + "\n");
  writeFileSync("performance-report/README.md", `# Public asset comparison\n\nBase: ${report.baseCommit}\n\nCandidate: ${report.headCommit}\n\n| Route | CSS before (decoded bytes) | CSS after | Saved | Transfer before | Transfer after |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${comparisons.map((entry) => `| ${entry.path} | ${entry.cssBefore} | ${entry.cssAfter} | ${entry.cssSaved} | ${entry.cssTransferBefore} | ${entry.cssTransferAfter} |`).join("\n")}\n\n${report.methodology}\n`);
  console.log("PUBLIC_ASSET_AUDIT " + JSON.stringify({ base: report.baseCommit, head: report.headCommit, comparisons, seo }));
} finally { for (const server of servers) await stop(server); }
