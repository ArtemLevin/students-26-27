import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const teacherDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(teacherDir);
const page = await readFile(path.join(teacherDir, "index.html"), "utf8");
const urls = [...page.matchAll(/\bhref="(\.\.\/students\/[^"]+\/index\.html)"/g)].map(match => match[1]);
const slugs = [...page.matchAll(/\bdata-slug="([^"]+)"/g)].map(match => match[1]);

test("has one tile per student and links to every subject navigator", async () => {
  const studentDirs = await readdir(path.join(repoRoot, "students"), { withFileTypes: true });
  const available = [];
  for (const entry of studentDirs) {
    if (!entry.isDirectory()) continue;
    try {
      await access(path.join(repoRoot, "students", entry.name, "site", "index.html"));
      available.push(entry.name);
    } catch { /* A student directory without a homepage is not a navigator. */ }
  }

  assert.equal(slugs.length, new Set(slugs).size, "student tiles must be unique");
  assert.equal(slugs.length, 26, "expected 26 distinct student tiles");
  assert.equal(urls.length, new Set(urls).size, "links must be unique");
  assert.equal(urls.length, 28, "include two additional subject navigators");

  const standardPages = new Set(available.map(slug => "../students/" + slug + "/site/index.html"));
  for (const standardPage of standardPages) {
    assert.ok(urls.includes(standardPage), "missing navigator: " + standardPage);
  }
  assert.ok(urls.includes("../students/xenia_klykova/chemistry/site/index.html"));
  assert.ok(urls.includes("../students/denis_ermolaev/site/index.html"), "Denis cabinet must be reachable");
  assert.ok(urls.includes("../students/daniil_khriastov/site/index.html"), "Daniil cabinet must be reachable");
  assert.match(page, /data-slug="daniil_khriastov"[^>]*data-level="ЕГЭ"[^>]*data-topics="math"/, "Daniil tile must support exam and subject filters");
  assert.match(page, /data-slug="denis_ermolaev"[^>]*data-level="ЕГЭ"[^>]*data-topics="math"/, "Denis tile must support exam and subject filters");
  for (const url of urls) {
    const resolved = path.resolve(teacherDir, url);
    assert.ok(resolved.startsWith(path.join(repoRoot, "students") + path.sep), "link escapes student tree");
    await access(resolved);
  }
});

test("teacher-only navigation does not embed private URL tokens", () => {
  assert.match(page, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(page, /<meta name="referrer" content="no-referrer">/);
  assert.ok(urls.every(url => url.startsWith("../students/")));
});

test("loads local assets without external dependencies", async () => {
  for (const file of ["style.css", "app.js"]) await access(path.join(teacherDir, file));
  assert.match(page, /<link rel="stylesheet" href="\.\/style\.css">/);
  assert.match(page, /<script src="\.\/app\.js" defer><\/script>/);
});
