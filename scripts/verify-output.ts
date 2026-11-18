import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const expected = ["markdown-lab", "mdx-example", "walking-note", "welcome"];
assert.deepEqual((await readdir("dist/posts")).sort(), expected);
for (const path of [
  "index.html",
  "tech/index.html",
  "personal/index.html",
  "tags/sample/index.html",
  "tags/日本語/index.html",
  "tags/CI~2fCD/index.html",
  "404.html",
  "feed.xml",
  "sitemap-index.xml",
  "sitemap-0.xml",
  "robots.txt",
])
  await readFile(`dist/${path}`);
for (const slug of [...expected, null]) {
  const path = slug ? `dist/og/${slug}.jpg` : "dist/og.jpg";
  const meta = await sharp(path).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  console.log(`${path}: JPEG ${meta.width}x${meta.height}`);
}
const images = (await readdir("dist/_astro")).filter((name) => name.endsWith(".webp"));
assert(images.some((name) => name.startsWith("thumbnail.")));
console.log(`Published pages: ${expected.join(", ")}; optimized WebP images: ${images.length}`);
async function checkMarkers(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await checkMarkers(path);
    else
      assert(
        !/DRAFT-MARKER-DO-NOT-SHIP|MATERIAL-MARKER-DO-NOT-SHIP/.test(
          (await readFile(path)).toString(),
        ),
        `marker leaked: ${path}`,
      );
  }
}
for (const dir of ["dist", ".astro", "node_modules/.astro"]) {
  if (await stat(dir).catch(() => undefined)) await checkMarkers(dir);
}
const markdown = await readFile("dist/posts/markdown-lab/index.html", "utf8");
for (const pattern of [
  /<a class="heading-anchor"/,
  /<div class="markdown-alert markdown-alert-note"/,
  /class="line diff add"/,
  /class="line diff remove"/,
  /class="line highlighted"/,
  /class="highlighted-word"/,
  /target="_blank"/,
  /rel="noopener"/,
  /aria-label="目次"/,
  /sample\.[^" ]+\.webp/,
])
  assert.match(markdown, pattern);
assert.match(
  await readFile("dist/posts/mdx-example/index.html", "utf8"),
  /MDX で記述した要素です。/,
);
console.log(
  "No draft/material markers in dist, .astro, node_modules/.astro; Markdown/MDX decoration verified.",
);
