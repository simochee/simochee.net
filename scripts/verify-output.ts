import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import sharp from "sharp";

/** アダプターが静的ファイルを書き出す場所。Worker 本体はその隣に出る。 */
const assets = ".cloudflare/output/v1/workers/default/assets";

const expected = (await readdir("content/posts", { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== "unfinished")
  .map((entry) => entry.name)
  .sort();
const archived = (await readdir(`${assets}/archive`)).filter(
  (name) => name !== "index.html" && !/^\d{4}$/.test(name),
);
assert.deepEqual(archived.sort(), expected);
for (const path of [
  "index.html",
  "tech/index.html",
  "personal/index.html",
  "tags/sample/index.html",
  "tags/日本語/index.html",
  "tags/CI~2fCD/index.html",
  "search/index.html",
  "search.json",
  "gallery/index.html",
  "404.html",
  "feed.xml",
  "sitemap-index.xml",
  "sitemap-0.xml",
  "robots.txt",
])
  await readFile(`${assets}/${path}`);
for (const slug of [...expected, null]) {
  const path = slug ? `${assets}/og/${slug}.jpg` : `${assets}/og.jpg`;
  const meta = await sharp(path).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  console.log(`${path}: JPEG ${meta.width}x${meta.height}`);
}
const images = (await readdir(`${assets}/_astro`)).filter((name) => name.endsWith(".webp"));
assert(images.some((name) => name.startsWith("thumbnail.")));
console.log(`Published pages: ${expected.join(", ")}; optimized WebP images: ${images.length}`);
async function checkMarkers(
  dir: string,
  marker = /DRAFT-MARKER-DO-NOT-SHIP|MATERIAL-MARKER-DO-NOT-SHIP/,
): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await checkMarkers(path, marker);
    else assert(!marker.test((await readFile(path)).toString()), `marker leaked: ${path}`);
  }
}
for (const dir of [".cloudflare/output", "dist", ".astro", "node_modules/.astro"]) {
  if (await stat(dir).catch(() => undefined)) await checkMarkers(dir);
}
// 手元の dev で入る見本のコメント（db/dev-seed.sql）は、本番の Worker にも静的ファイルにも入れない。
await checkMarkers(".cloudflare/output", /COMMENT-ON-DRAFT-DO-NOT-SHIP/);
// コメントと拍手は書かれたらすぐ出したいので、ページには器だけを書き出し、中身はサーバーから読む。
const morning = await readFile(`${assets}/archive/morning-at-kissaten/index.html`, "utf8");
assert.match(morning, /<post-comments data-slug="morning-at-kissaten"/);
assert.match(morning, /<clap-button [^>]*data-slug="morning-at-kissaten"/);
// サーバーが記事を知るための一覧には、公開中の記事だけを載せる。
const listed = JSON.parse(await readFile(`${assets}/posts.json`, "utf8")) as { id: string }[];
assert.deepEqual(listed.map((post) => post.id).sort(), expected);
// サーバーで動かすルートは、静的ファイルとして書き出されていてはいけない。
for (const path of ["api", "comments.xml"])
  assert.equal(await stat(`${assets}/${path}`).catch(() => undefined), undefined);
// 管理画面は検索にもサイトマップにも載せない。
assert.match(
  await readFile(`${assets}/admin/index.html`, "utf8"),
  /<meta name="robots" content="noindex, nofollow"/,
);
assert.doesNotMatch(await readFile(`${assets}/sitemap-0.xml`, "utf8"), /\/admin\//);
const markdown = await readFile(`${assets}/archive/markdown-lab/index.html`, "utf8");
for (const [slug, count] of [
  ["markdown-lab", 3],
  ["mdx-example", 1],
] as const) {
  const html = await readFile(`${assets}/archive/${slug}/index.html`, "utf8");
  const cards = [...html.matchAll(/<a class="link-card"[^>]*>[\s\S]*?<\/a>/g)];
  assert.equal(cards.length, count, `${slug}: link cards`);
  for (const [card] of cards) {
    assert.match(card, /target="_blank"/);
    assert.match(card, /rel="noopener"/);
    const href = /href="([^"]+)"/.exec(card)![1];
    assert(
      card.includes(
        `class="link-card-host">${new URL(href).hostname.replace(/^www\./, "")}</span>`,
      ),
    );
    assert.doesNotMatch(card, /<img\b/);
    assert.doesNotMatch(card, /<span class="link-card-label">[^<]/);
  }
  assert.doesNotMatch(html, /<img\b[^>]*src="https?:/);
  assert.match(
    html,
    /<a href="https:\/\/example.com\/"[^>]*>Example Domain<\/a> <span class="link-mention-host">\(example.com\)<\/span>/,
    slug,
  );
  assert.match(
    html,
    /<a href="https:\/\/example.com\/not-found-inline-link"[^>]*>https:\/\/example.com\/not-found-inline-link<\/a>/,
    slug,
  );
}
assert.match(markdown, /<a href="https:\/\/example.com\/"[^>]*>テキスト付きのリンク<\/a>/);
assert.match(markdown, /class="link-card-title">\/not-found-link-card<\/span>/);
assert.doesNotMatch(await readFile(`${assets}/feed.xml`, "utf8"), /link-card/);
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
  await readFile(`${assets}/archive/mdx-example/index.html`, "utf8"),
  /MDX で記述した要素です。/,
);
console.log(
  "No draft/material markers in the build output, .astro, node_modules/.astro; Markdown/MDX decoration verified.",
);
const search: { id: string; text: string }[] = JSON.parse(
  await readFile(`${assets}/search.json`, "utf8"),
);
assert.deepEqual(search.map((entry) => entry.id).sort(), expected);
const gallery = await readFile(`${assets}/gallery/index.html`, "utf8");
assert.match(gallery, /<gallery-viewer/);
assert.match(gallery, /\/_astro\/napolitan\.[^" ]+\.webp/);
console.log(`search.json: ${search.length} posts; gallery page rendered.`);
