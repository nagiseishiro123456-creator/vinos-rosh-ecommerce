import assert from "node:assert/strict";
import test from "node:test";
import { canonicalUrl, privatePageMetadata, publicImageUrl, publicPageMetadata, publicRobots, publicSitemap, readSeoConfig } from "../src/lib/seo";

const production = { NODE_ENV: "production", PREVIEW_MODE: "false", NEXT_PUBLIC_APP_URL: "https://rosh.example.test/" };
test("indexing requires explicit production publication and a public HTTPS origin", () => {
  assert.deepEqual(readSeoConfig(production), { origin: "https://rosh.example.test", indexable: true });
  for (const changed of [{ NODE_ENV: "development" }, { PREVIEW_MODE: "true" }, { PREVIEW_MODE: undefined },
    { NEXT_PUBLIC_APP_URL: "http://rosh.example.test" }, { NEXT_PUBLIC_APP_URL: "https://localhost" },
    { NEXT_PUBLIC_APP_URL: "https://127.0.0.1" }, { NEXT_PUBLIC_APP_URL: "https://[::1]" }, { NEXT_PUBLIC_APP_URL: "https://store.local" }]) {
    assert.equal(readSeoConfig({ ...production, ...changed }).indexable, false);
  }
});
test("missing or malformed public origins cannot produce indexed local or credential-bearing URLs", () => {
  for (const NEXT_PUBLIC_APP_URL of [undefined, "", "not-a-url", "javascript:alert(1)", "https://user:secret@rosh.example.test", "https://rosh.example.test/base", "https://rosh.example.test/?secret=qa", "https://rosh.example.test/#qa"]) {
    const config = readSeoConfig({ ...production, NEXT_PUBLIC_APP_URL });
    assert.deepEqual(config, { origin: null, indexable: false }); assert.deepEqual(publicSitemap([], config), []);
    assert.equal(canonicalUrl("/productos", config), undefined);
  }
});
test("canonical URLs normalize the origin and cannot redirect through a path or retain tracking parameters", () => {
  const config = readSeoConfig(production);
  assert.equal(canonicalUrl("/productos", config), "https://rosh.example.test/productos");
  for (const path of ["//other.example.test", "https://other.example.test", "/\\other.example.test", "/productos?q=qa", "/productos#qa"]) assert.throws(() => canonicalUrl(path, config), /INVALID_CANONICAL_PATH/);
});
test("product share metadata uses the product's title, description and image", () => {
  const meta = publicPageMetadata({ path: "/productos/qa", title: "Producto QA", description: "Descripción QA", image: "/products/qa.webp", imageAlt: "Foto QA" }, readSeoConfig(production));
  assert.equal(meta.title, "Producto QA"); assert.deepEqual(meta.alternates, { canonical: "https://rosh.example.test/productos/qa" });
  assert.equal(meta.openGraph?.title, "Producto QA | Vinos ROSH"); assert.equal(meta.twitter?.title, "Producto QA | Vinos ROSH");
  assert.deepEqual(meta.openGraph?.images, [{ url: "https://rosh.example.test/products/qa.webp", alt: "Foto QA" }]);
});
test("faceted catalog and private metadata remain unindexed on an otherwise public production site", () => {
  const filtered = publicPageMetadata({ path: "/productos", title: "Productos", description: "QA", filtered: true }, readSeoConfig(production));
  assert.deepEqual(filtered.robots, { index: false, follow: true, noarchive: false, nosnippet: false });
  assert.deepEqual(privatePageMetadata("Mi cuenta").robots, { index: false, follow: false, noarchive: true, nosnippet: true });
});
test("preview metadata and robots never advertise a sitemap or an indexable page", () => {
  const config = readSeoConfig({ ...production, PREVIEW_MODE: "true" });
  assert.deepEqual(publicRobots(config), { rules: { userAgent: "*", disallow: "/" } });
  assert.deepEqual(publicSitemap([{ slug: "qa", updatedAt: new Date() }], config), []);
  const meta = publicPageMetadata({ path: "/", title: "QA", description: "QA" }, config);
  assert.deepEqual(meta.robots, { index: false, follow: false, noarchive: true, nosnippet: true });
});
test("the public sitemap includes coverage and encoded active product paths without private routes", () => {
  const date = new Date("2026-01-01T00:00:00Z"); const config = readSeoConfig(production);
  const sitemap = publicSitemap([{ slug: "qa con espacio", updatedAt: date }], config);
  assert.ok(sitemap.some((entry) => entry.url === "https://rosh.example.test/envios"));
  assert.ok(sitemap.some((entry) => entry.url.endsWith("/productos/qa%20con%20espacio") && entry.lastModified === date));
  assert.equal(sitemap.some((entry) => /admin|mi-cuenta|checkout|pedidos|iniciar-sesion/.test(entry.url)), false);
  const robots = publicRobots(config); assert.equal(robots.sitemap, "https://rosh.example.test/sitemap.xml");
});
test("share images support configured relative images and public HTTPS URLs without executable or credential URLs", () => {
  const config = readSeoConfig(production);
  assert.equal(publicImageUrl("https://res.cloudinary.com/qa/image/upload/photo.webp", config), "https://res.cloudinary.com/qa/image/upload/photo.webp");
  for (const value of ["javascript:alert(1)", "data:image/png;base64,AA", "//other.example.test/a.png", "https://user:secret@cdn.example.test/a.png", "http://cdn.example.test/a.png", "https://localhost/a.png"]) assert.equal(publicImageUrl(value, config), undefined);
});
