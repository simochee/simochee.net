import { afterEach, expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import externalLinks from "rehype-external-links";
import { remarkLinkCards } from "../src/lib/remark-link-cards";
import { excerpt, plainText } from "../src/lib/posts-loader";

const paths: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const path of paths.splice(0)) await rm(path, { recursive: true, force: true });
});
async function article(entries = {}) {
  const path = await mkdtemp(resolve(tmpdir(), "link-cards-"));
  paths.push(path);
  await writeFile(resolve(path, "links.json"), JSON.stringify({ version: 1, entries }));
  return path;
}
async function render(path: string, body: string, ci = true) {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [[remarkLinkCards, { ci }]],
    rehypePlugins: [[externalLinks, { target: "_blank", rel: ["noopener"] }]],
  });
  return processor.render(body, { fileURL: pathToFileURL(resolve(path, "index.md")) });
}
const url = "https://example.com/page";
const fetchedAt = "2026-11-24T00:00:00.000Z";

test("保存されたカードは一つの外部リンクで囲み、帯にホスト名、本文にタイトルと説明を表示する", async () => {
  const path = await article({
    [url]: {
      status: "ok",
      title: "<script> & 見出し",
      description: "説明",
      siteName: "サイト",
      fetchedAt,
    },
  });
  const { code } = await render(path, url);
  expect(code).toContain('class="link-card"');
  expect(code).toContain('target="_blank"');
  expect(code).toContain('rel="noopener"');
  expect(code.match(/<a /g)).toHaveLength(1);
  expect(code).toContain('class="link-card-host">example.com');
  expect(code).toContain("&#x3C;script> &#x26; 見出し");
  expect(code).toContain('class="link-card-description">説明');
  expect(code).not.toContain(">サイト<");
});
test("帯の記号と案内文は内容に含めず、画像は出さない", async () => {
  const path = await article({
    [url]: { status: "ok", title: "見出し", fetchedAt },
  });
  const { code } = await render(path, url);
  expect(code).toContain('<span class="link-card-label"></span>');
  expect(code).toContain('<span class="link-card-go"></span>');
  expect(code).not.toContain("<img");
});
test("説明のないカードには説明の欄を作らない", async () => {
  const path = await article({ [url]: { status: "ok", title: "見出し", fetchedAt } });
  const { code } = await render(path, url);
  expect(code).not.toContain("link-card-description");
});
test("取得失敗のカードは帯にホスト名、本文にパスを表示し、リンク先は元の URL のままにする", async () => {
  const path = await article({ [url]: { status: "error", reason: "HTTP 404", fetchedAt } });
  const { code } = await render(path, `<${url}>`);
  expect(code).toContain('class="link-card-title">/page</span>');
  expect(code).toContain('class="link-card-host">example.com');
  expect(code).toContain(`href="${url}"`);
  expect(code).not.toContain("HTTP 404");
});
test("取得失敗のカードはクエリとフラグメントを含め、パーセントエンコードを読める形にする", async () => {
  const target = "https://example.com/%E8%A8%98%E4%BA%8B?q=%E6%A4%9C%E7%B4%A2#%E7%AB%A0";
  const path = await article({ [target]: { status: "error", reason: "HTTP 404", fetchedAt } });
  const { code } = await render(path, target);
  expect(code).toContain('class="link-card-title">/記事?q=検索#章</span>');
  expect(code).toContain(`href="${target}"`);
});
test("デコードできないパスは元のまま表示する", async () => {
  const target = "https://example.com/%E0%A4%A";
  const path = await article({ [target]: { status: "error", reason: "HTTP 404", fetchedAt } });
  const { code } = await render(path, target);
  expect(code).toContain('class="link-card-title">/%E0%A4%A</span>');
});
test("パスが / だけの取得失敗は本文のタイトルにホスト名を表示する", async () => {
  const target = "https://www.example.com/";
  const path = await article({ [target]: { status: "error", reason: "HTTP 500", fetchedAt } });
  const { code } = await render(path, target);
  expect(code).toContain('class="link-card-title">example.com</span>');
});
test("ホスト名の先頭の www だけを省き、サイト名は表示しない", async () => {
  const target = "https://www.example.com/page";
  const path = await article({
    [target]: { status: "ok", title: "タイトル", siteName: "タイトル", fetchedAt },
  });
  const { code } = await render(path, target);
  expect(code).toContain('class="link-card-host">example.com');
  expect(code.match(/タイトル/g)).toHaveLength(1);
});
test("未保存の URL は CI で記事名とコマンドを示して停止し、dev では警告して通常リンクを残す", async () => {
  const path = await article();
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(render(path, url)).rejects.toThrow(
    new RegExp(`${path}/index.md[\\s\\S]*${url}[\\s\\S]*vp run unfurl`),
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { code } = await render(path, url, false);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(url));
  expect(code).toContain(`<a href="${url}"`);
  expect(code).not.toContain("link-card");
});
test("ラベル付きリンクにはキャッシュを求めず、文中でも変更しない", async () => {
  const { code } = await render(
    await article(),
    `文中の [見出し](${url}) と [${url}](${url}) です`,
  );
  expect(code).toContain(`<a href="${url}"`);
  expect(code).toContain(">見出し</a>");
  expect(code).toContain(`>${url}</a>`);
  expect(code).not.toContain("link-card");
});
test("文中やリスト項目の素の URL は href をそのままにタイトルへ置き換え、ホスト名を小さく添える", async () => {
  const path = await article({
    [url]: { status: "ok", title: "<b>題名</b>", description: "説明", fetchedAt },
  });
  const { code } = await render(path, `文中 ${url} と <${url}> です\n\n- 参考 ${url}`);
  expect(
    code.match(
      new RegExp(
        `<a href="${url}"[^>]*>&#x3C;b>題名&#x3C;/b></a> <span class="link-mention-host">\\(example.com\\)</span>`,
        "g",
      ),
    ),
  ).toHaveLength(3);
  expect(code).not.toContain("link-card");
  expect(code).not.toContain("説明");
  expect(code).not.toContain("<img");
});
test("取得失敗した文中の URL にはホスト名を添えない", async () => {
  const path = await article({ [url]: { status: "error", reason: "HTTP 404", fetchedAt } });
  const { code } = await render(path, `文中 ${url} です`);
  expect(code).not.toContain("link-mention-host");
});
test("取得失敗した文中の URL は URL のまま表示する", async () => {
  const path = await article({ [url]: { status: "error", reason: "HTTP 404", fetchedAt } });
  const { code } = await render(path, `文中 ${url} です`);
  expect(code).toContain(`<a href="${url}"`);
  expect(code).toContain(`>${url}</a>`);
});
test("未保存の文中 URL は CI で停止し、dev では警告して URL のまま表示する", async () => {
  const path = await article();
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(render(path, `文中 ${url} です`)).rejects.toThrow(
    new RegExp(`${path}/index.md[\\s\\S]*${url}[\\s\\S]*vp run unfurl`),
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { code } = await render(path, `文中 ${url} です`, false);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining(url));
  expect(code).toContain(`>${url}</a>`);
});
test("スマート引用符やダッシュの変換が先に走っても取得時と同じ URL をカード化する", async () => {
  const literal = "https://example.com/it's--a-test";
  const path = await article({ [literal]: { status: "ok", title: "引用符の URL", fetchedAt } });
  const { code } = await render(path, literal);
  expect(code).toContain('class="link-card"');
  expect(code).toContain("引用符の URL");
  expect(code).toContain('href="https://example.com/it&#x27;s--a-test"');
});
test("リンクカードのメタデータは抜粋と検索本文に混ざらず、山括弧 URL も読める", () => {
  const body = `本文\n\n<${url}>\n\n${url}`;
  expect(plainText(body, false)).toBe(`本文 ${url} ${url}`);
  expect(excerpt(body, false)).toBe(`本文 ${url} ${url}`);
});
