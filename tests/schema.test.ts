import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { frontmatterSchema, frontmatterJSONSchema } from "../src/content/schema";
import { bodyImages, excerpt, includeDrafts, plainText } from "../src/lib/posts-loader";
const valid = { title: "サンプル", status: "published", type: "tech" };
test("コミットされた JSON Schema は frontmatter と一致する", () => {
  expect(
    JSON.parse(readFileSync(new URL("../schema/frontmatter.schema.json", import.meta.url), "utf8")),
  ).toEqual(frontmatterJSONSchema());
});
test("未知のキーと重複タグと不正な日時を拒否する", () => {
  for (const value of [
    { typo: true },
    { tags: ["a", "a"] },
    { date: "2025-02-30" },
    { date: "2025-01-01T00:00:00" },
    { title: " " },
  ])
    expect(frontmatterSchema.safeParse({ ...valid, ...value }).success).toBe(false);
  expect(frontmatterSchema.parse(valid).tags).toEqual([]);
});
test("下書きは CI と本番ビルドで有効化できない", () => {
  expect(includeDrafts("dev", { SIMOCHEE_INCLUDE_DRAFTS: "1" })).toBe(true);
  expect(includeDrafts("build", { SIMOCHEE_INCLUDE_DRAFTS: "1" })).toBe(false);
  expect(includeDrafts("dev", { SIMOCHEE_INCLUDE_DRAFTS: "1", WORKERS_CI: "1" })).toBe(false);
});
test("抜粋には Markdown 記法や MDX 要素を含めない", () => {
  expect(excerpt("## 見出し\n\n**本文**と[リンク](https://example.com)\n\n<div>文章</div>")).toBe(
    "見出し 本文 と リンク 文章",
  );
});
test("抜粋は 160 文字までで、全文のプレーンテキストは切らない", () => {
  const body = "あ".repeat(300);
  expect(excerpt(body)).toHaveLength(160);
  expect(plainText(body)).toHaveLength(300);
});
test("本文の画像は ./ で始まる相対パスだけを、重複を除いて拾う", () => {
  expect(
    bodyImages(
      "![朝](./a.png)\n\n![](./b.png)\n\n![再掲](./a.png)\n\n![外](https://example.com/c.png)\n\n![上](../d.png)",
    ),
  ).toEqual([
    { src: "./a.png", alt: "朝" },
    { src: "./b.png", alt: "" },
  ]);
});
