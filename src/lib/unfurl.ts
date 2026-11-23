import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";
import { Parser } from "htmlparser2";
import { linksSchema, type LinkEntry, type Links } from "../content/links-schema.ts";
import { bareURLs } from "./link-urls.ts";
import { readLinks } from "./link-cache.ts";

const userAgent = "simochee.net-link-unfurl/1.0 (+https://simochee.net/)";
const htmlLimit = 2 * 1024 * 1024;

export async function fetchBytes(url: string, limit: number, fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": userAgent },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > limit) throw new Error("size limit");
    if (!response.body) throw new Error("empty body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > limit) throw new Error("size limit");
      chunks.push(chunk);
    }
    return {
      bytes: Buffer.concat(chunks),
      contentType: response.headers.get("content-type") ?? "",
      url: response.url || url,
    };
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function charset(contentType: string) {
  return /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType)?.[1];
}

export function decodeHTML(bytes: Uint8Array, contentType: string): string {
  let encoding = charset(contentType);
  if (!encoding) {
    const parser = new Parser({
      onopentag(name, attrs) {
        if (name !== "meta" || encoding) return;
        encoding =
          attrs.charset ??
          (attrs["http-equiv"]?.toLowerCase() === "content-type"
            ? charset(attrs.content ?? "")
            : undefined);
      },
    });
    parser.end(Buffer.from(bytes.subarray(0, 16_384)).toString("latin1"));
  }
  return new TextDecoder(encoding ?? "utf-8").decode(bytes);
}

export function metadata(html: string, base: string) {
  const meta = new Map<string, string>();
  let inTitle = false;
  let title = "";
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === "title") inTitle = true;
      if (name !== "meta") return;
      const key = (attrs.property ?? attrs.name)?.toLowerCase();
      if (key && attrs.content?.trim() && !meta.has(key)) meta.set(key, attrs.content.trim());
    },
    ontext(text) {
      if (inTitle) title += text;
    },
    onclosetag(name) {
      if (name === "title") inTitle = false;
    },
  });
  parser.end(html);
  const clean = (value: string | undefined) => value?.replace(/\s+/g, " ").trim() || undefined;
  return {
    title:
      clean(meta.get("og:title") ?? meta.get("twitter:title") ?? title) ?? new URL(base).hostname,
    description: clean(
      meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description"),
    ),
    siteName: clean(meta.get("og:site_name")),
  };
}

export async function fetchLink(url: string, fetcher = fetch): Promise<LinkEntry> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetchBytes(url, htmlLimit, fetcher);
    if (!/^(text\/html|application\/xhtml\+xml)\b/i.test(response.contentType))
      throw new Error(`unsupported Content-Type: ${response.contentType || "missing"}`);
    const data = metadata(decodeHTML(response.bytes, response.contentType), response.url);
    return {
      status: "ok",
      title: data.title,
      description: data.description,
      siteName: data.siteName,
      fetchedAt,
    };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      fetchedAt,
    };
  }
}

export type UnfurlOptions = {
  refresh?: true | string;
  fetcher?: typeof fetch;
  log?: (message: string) => void;
};

export async function unfurl(postsDir: string, options: UnfurlOptions = {}) {
  const log = options.log ?? console.log;
  const totals = { ok: 0, error: 0, cached: 0, removed: 0 };
  // 取得は直列にし、記事をまたいでも同じホストへ並列リクエストを送らない。
  for (const dir of (await readdir(postsDir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!dir.isDirectory()) continue;
    const directory = resolve(postsDir, dir.name);
    const indexes = (await readdir(directory)).filter((name) => /^index\.mdx?$/.test(name));
    if (!indexes.length) continue;
    if (indexes.length !== 1)
      throw new Error(`index.md と index.mdx は併用できません: ${directory}`);
    const file = indexes[0];
    const { content } = matter(await readFile(resolve(directory, file), "utf8"));
    const urls = bareURLs(content, file.endsWith(".mdx"));
    const previous = await readLinks(directory);
    const entries: Links["entries"] = {};
    for (const url of urls) {
      const cached = previous.entries[url];
      if (cached && options.refresh !== true && options.refresh !== url) {
        entries[url] = cached;
        totals.cached++;
        continue;
      }
      const entry = await fetchLink(url, options.fetcher);
      entries[url] = entry;
      totals[entry.status]++;
      log(
        `${dir.name}: ${url} ${entry.status}${entry.status === "error" ? ` (${entry.reason})` : ""}`,
      );
    }
    totals.removed += Object.keys(previous.entries).filter((url) => !urls.includes(url)).length;
    const next = linksSchema.parse({ version: 1, entries });
    if (urls.length || Object.keys(previous.entries).length) {
      await writeFile(resolve(directory, "links.json"), `${JSON.stringify(next, null, 2)}\n`);
    }
  }
  log(
    `unfurl: ok=${totals.ok} error=${totals.error} cached=${totals.cached} removed=${totals.removed}`,
  );
  return totals;
}
