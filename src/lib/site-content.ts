import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAlias, isMap, isNode, isScalar, isSeq, parseDocument, type Document } from "yaml";
import { z } from "zod";
import { siteContentSchema, type SiteContent } from "../content/site-schema";

function normalize(
  value: unknown,
  node: unknown,
  document: Document,
  path: string[] = [],
): unknown {
  if (isAlias(node)) node = node.resolve(document);
  if (
    path.length === 2 &&
    path[0] === "profile" &&
    ["facts", "favorites", "history"].includes(path[1]!)
  ) {
    if (value == null && path[1] !== "facts") return value;
    if (!isMap(node) || !(value instanceof Map))
      throw new z.ZodError([{ code: "custom", path, message: "マップで書いてください" }]);
    return node.items.map(({ key, value: item }, index) => {
      if (!isScalar(key))
        throw new z.ZodError([
          {
            code: "custom",
            path: [...path, index, "key"],
            message: "見出しはスカラーのキーで書いてください",
          },
        ]);
      return [key.source, isNode(item) ? item.toJS(document, { mapAsMap: true }) : item];
    });
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value].map(([key, item]) => [
        key,
        normalize(item, isMap(node) ? node.get(key, true) : undefined, document, [
          ...path,
          String(key),
        ]),
      ]),
    );
  }
  if (Array.isArray(value))
    return value.map((item, index) =>
      normalize(item, isSeq(node) ? node.items[index] : undefined, document, [
        ...path,
        String(index),
      ]),
    );
  return value;
}

const MAP_FIELDS = ["facts", "favorites", "history"];

// 2026.1 と 2026.10 は数値として等しいが、書き手には別の見出し
function sameKeySource(a: unknown, b: unknown): boolean {
  return isScalar(a) && isScalar(b) && a.source === b.source;
}

function describePath(path: PropertyKey[], normalized: unknown): string {
  const [section, field, index] = path;
  if (section === "profile" && MAP_FIELDS.includes(String(field)) && typeof index === "number") {
    const entries = (normalized as { profile?: Record<string, unknown> })?.profile?.[String(field)];
    const key = Array.isArray(entries) ? (entries[index] as unknown[] | undefined)?.[0] : undefined;
    if (typeof key === "string") return ["profile", field, key].map(String).join(".");
  }
  return path.map(String).join(".") || "(root)";
}

export function parseSiteContent(source: string, file: string): SiteContent {
  const document = parseDocument(source, { uniqueKeys: sameKeySource });
  if (document.errors.length) {
    throw new Error(
      `${file}: YAML の構文が正しくありません\n${document.errors.map((error) => error.message).join("\n")}`,
    );
  }
  let data: z.output<typeof siteContentSchema>;
  let normalized: unknown;
  try {
    normalized = normalize(document.toJS({ mapAsMap: true }), document.contents, document);
    data = siteContentSchema.parse(normalized, { error: z.locales.ja().localeError });
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    throw new Error(
      `${file}: サイト設定が正しくありません\n${error.issues.map((issue) => `${describePath(issue.path, normalized)}: ${issue.message}`).join("\n")}`,
    );
  }
  const id = createHash("sha256")
    .update(JSON.stringify([data.poll.question, data.poll.options]))
    .digest("hex")
    .slice(0, 16);
  return { ...data, poll: { ...data.poll, id } };
}

export async function readSiteContent(file: string): Promise<SiteContent> {
  let source: string;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    throw new Error(`${file}: サイト設定を読み込めません`, { cause: error });
  }
  return parseSiteContent(source, file);
}
