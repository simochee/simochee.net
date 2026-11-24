import { afterEach, expect, test, vi } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { bareURLs, cardURLs } from "../src/lib/link-urls";
import { linksSchema } from "../src/content/links-schema";
import { decodeHTML, fetchBytes, fetchLink, metadata, unfurl } from "../src/lib/unfurl";
import { readLinks } from "../src/lib/link-cache";

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
async function directory() {
  const path = await mkdtemp(resolve(tmpdir(), "unfurl-"));
  cleanups.push(() => rm(path, { recursive: true, force: true }));
  return path;
}
async function server() {
  const hits: string[] = [];
  const app = createServer((req, res) => {
    hits.push(req.url!);
    expect(req.headers["user-agent"]).toContain("simochee.net-link-unfurl");
    if (req.url === "/redirect") {
      res.writeHead(302, { location: "/page" }).end();
      return;
    }
    if (req.url === "/error") {
      res.writeHead(503).end();
      return;
    }
    res
      .writeHead(200, { "content-type": "text/html; charset=utf-8" })
      .end(
        `<title>予備</title><meta property="og:title" content="日本語 &amp; タイトル"><meta property="og:description" content="説明 &quot;文&quot;"><meta property="og:site_name" content="見本">`,
      );
  });
  await new Promise<void>((done, reject) => {
    app.once("error", reject);
    app.listen(0, "127.0.0.1", done);
  });
  cleanups.push(
    () =>
      new Promise<void>((done, reject) => {
        app.closeAllConnections();
        app.close((error) => (error ? reject(error) : done()));
      }),
  );
  const address = app.address();
  if (!address || typeof address === "string") throw new Error("listen failed");
  return { url: `http://127.0.0.1:${address.port}`, hits };
}

test("リストの外の段落が裸の HTTP URL または山括弧リンクだけのときにカードの対象になる", () => {
  expect(
    cardURLs(
      `https://example.com/a\n\n<http://example.com/b>\n\n文中 https://example.com/c\n\n[見出し](https://example.com/d)\n\n[https://example.com/e](https://example.com/e)\n\n<ftp://example.com/f>\n\n\`https://example.com/g\`\n\n- https://example.com/h\n\n1. <https://example.com/i>\n\nhttps://example.com/a`,
    ),
  ).toEqual(["http://example.com/b", "https://example.com/a"]);
  expect(cardURLs("import A from './a'\n\nhttps://example.com/mdx\n\n<A />", true)).toEqual([
    "https://example.com/mdx",
  ]);
});
test("文中やリスト内の素の URL も収集し、テキスト付きリンクとコードは収集しない", () => {
  expect(
    bareURLs(
      `文中 https://example.com/a と <https://example.com/b> です\n\n- https://example.com/c\n\n[見出し](https://example.com/d)\n\n[https://example.com/e](https://example.com/e)\n\n\`https://example.com/f\`\n\nhttps://example.com/a`,
    ),
  ).toEqual(["https://example.com/a", "https://example.com/b", "https://example.com/c"]);
});
test("保存形式は画像や未知のフィールドと未知の版を拒む", () => {
  const entry = { status: "ok", title: "title", fetchedAt: "2026-11-24T00:00:00.000Z" };
  expect(
    linksSchema.safeParse({
      version: 1,
      entries: { "https://example.com/": { ...entry, image: "./links/a.webp" } },
    }).success,
  ).toBe(false);
  expect(linksSchema.safeParse({ version: 2, entries: {} }).success).toBe(false);
});
test("大文字の HTTP スキームも受け入れ、不正な URL はカード化しない", () => {
  expect(
    cardURLs("<HTTPS://example.com/>\n\n<https://[>\n\n<https://example.com:invalid/>"),
  ).toEqual(["HTTPS://example.com/"]);
});
test("本文の読み取りが終わらなければ10秒で中断する", async () => {
  vi.useFakeTimers();
  const fetcher = (async (_url, options) =>
    new Response(
      new ReadableStream({
        start(controller) {
          options?.signal?.addEventListener("abort", () =>
            controller.error(options.signal?.reason),
          );
        },
      }),
    )) as typeof fetch;
  const failed = expect(fetchBytes("https://example.com/", 100, fetcher)).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(10_000);
  await failed;
});
test("OGP、Twitter、HTML の順で値を選び実体参照を解く", () => {
  expect(
    metadata(
      '<title>最後</title><meta name="twitter:title" content="次"><meta property="og:title" content="先 &amp; 頭"><meta name="description" content="説明"><meta property="og:image" content="../image.png"><meta property="og:site_name" content="サイト">',
      "https://example.com/posts/a",
    ),
  ).toEqual({
    title: "先 & 頭",
    description: "説明",
    siteName: "サイト",
  });
  expect(
    metadata(
      '<title>A &lt; B</title><meta name="twitter:description" content="説明">',
      "https://example.com",
    ).title,
  ).toBe("A < B");
});
test("HTTP ヘッダーを優先し meta の Shift_JIS と EUC-JP も復号する", () => {
  const sjis = Buffer.concat([
    Buffer.from('<meta charset="Shift_JIS"><title>'),
    Buffer.from([0x93, 0xfa, 0x96, 0x7b]),
    Buffer.from("</title>"),
  ]);
  expect(decodeHTML(sjis, "text/html")).toContain("日本");
  const euc = Buffer.concat([
    Buffer.from('<meta http-equiv="Content-Type" content="text/html; charset=EUC-JP"><title>'),
    Buffer.from([0xc6, 0xfc, 0xcb, 0xdc]),
    Buffer.from("</title>"),
  ]);
  expect(decodeHTML(euc, "text/html")).toContain("日本");
  expect(
    decodeHTML(Buffer.from('<meta charset="Shift_JIS">日本'), "text/html; charset=UTF-8"),
  ).toContain("日本");
});
test("リダイレクト先のページからタイトルと説明とサイト名を保存し、画像は取得しない", async () => {
  const { url, hits } = await server();
  const entry = await fetchLink(`${url}/redirect`);
  expect(entry).toEqual({
    status: "ok",
    title: "日本語 & タイトル",
    description: '説明 "文"',
    siteName: "見本",
    fetchedAt: expect.any(String),
  });
  expect(hits).toEqual(["/redirect", "/page"]);
});
test("サイズ上限とタイムアウトと HTTP エラーを取得失敗として扱う", async () => {
  const { url } = await server();
  expect(await fetchLink(`${url}/error`)).toMatchObject({
    status: "error",
    reason: "Error: HTTP 503",
  });
  const declared = (async () =>
    new Response("large", { headers: { "content-length": "100" } })) as typeof fetch;
  await expect(fetchBytes(url, 4, declared)).rejects.toThrow("size limit");
  const streamed = (async () => new Response("large")) as typeof fetch;
  await expect(fetchBytes(url, 4, streamed)).rejects.toThrow("size limit");
  const timedOut = (async () => {
    throw new DOMException("timeout", "TimeoutError");
  }) as typeof fetch;
  expect(await fetchLink(url, timedOut)).toMatchObject({
    status: "error",
    reason: "TimeoutError: timeout",
  });
});
test("下書きと MDX も取得し、成功と失敗のキャッシュを再利用し、指定 URL と全件を更新できる", async () => {
  const { url, hits } = await server();
  const posts = await directory();
  const path = resolve(posts, "draft");
  await mkdir(path);
  await writeFile(
    resolve(path, "index.mdx"),
    `---\nstatus: draft\n---\n\n${url}/page\n\n文中の ${url}/error です`,
  );
  expect(await unfurl(posts, { log: () => {} })).toEqual({
    ok: 1,
    error: 1,
    cached: 0,
    removed: 0,
  });
  const serialized = await readFile(resolve(path, "links.json"), "utf8");
  expect(Object.keys((await readLinks(path)).entries)).toEqual([`${url}/error`, `${url}/page`]);
  hits.length = 0;
  expect(await unfurl(posts, { log: () => {} })).toMatchObject({ ok: 0, error: 0, cached: 2 });
  expect(hits).toEqual([]);
  expect(await readFile(resolve(path, "links.json"), "utf8")).toBe(serialized);
  await unfurl(posts, { refresh: `${url}/error`, log: () => {} });
  expect(hits).toEqual(["/error"]);
  hits.length = 0;
  await unfurl(posts, { refresh: true, log: () => {} });
  expect(hits).toEqual(["/error", "/page"]);
  await writeFile(resolve(path, "index.mdx"), "本文から削除");
  expect(await unfurl(posts, { log: () => {} })).toMatchObject({ removed: 2 });
  expect((await readLinks(path)).entries).toEqual({});
});
