import { expect, test } from "vitest";
import type { Comment } from "../src/content/comment-schema";
import { commentSchema } from "../src/content/comment-schema";
import {
  commentCount,
  recentComments,
  totalComments,
  visibleThreads,
  type Threads,
} from "../src/lib/comments";

const comment = (name: string, at: string): Comment => ({
  title: "題名",
  name,
  at: new Date(at),
  body: "本文",
});
const threads: Threads = new Map([
  [
    "morning",
    [comment("後", "2026-11-18T21:00:00+09:00"), comment("先", "2026-11-18T10:00:00+09:00")],
  ],
  ["template", [comment("中", "2026-11-18T12:00:00+09:00")]],
  ["draft", [comment("下書き", "2026-11-19T00:00:00+09:00")]],
  ["quiet", []],
]);
const visible = visibleThreads(threads, ["morning", "template", "quiet"]);

test("公開されていない記事のコメントは、数にも一覧にも入らない", () => {
  expect(visible.has("draft")).toBe(false);
  expect(totalComments(visible)).toBe(3);
  expect(recentComments(visible).map((placed) => placed.comment.name)).not.toContain("下書き");
});
test("記事のコメント欄は、書かれた順に並ぶ", () => {
  expect(visible.get("morning")!.map((item) => item.name)).toEqual(["先", "後"]);
});
test("コメントのない記事の件数は 0 件になる", () => {
  expect(commentCount(visible, "quiet")).toBe(0);
  expect(commentCount(visible, "no-such-post")).toBe(0);
});
test("最新コメントは記事をまたいで新しい順に並び、指定した件数で打ち切る", () => {
  expect(recentComments(visible, 2).map((placed) => [placed.slug, placed.comment.name])).toEqual([
    ["morning", "後"],
    ["template", "中"],
  ]);
});
test("最新コメントは、その記事のコメント欄で何番目かを持つ", () => {
  expect(recentComments(visible).map((placed) => [placed.comment.name, placed.number])).toEqual([
    ["後", 2],
    ["中", 1],
    ["先", 1],
  ]);
});
test("コメントの日時は時差つきで書く", () => {
  const base = { title: "題名", name: "名前", body: "本文" };
  expect(commentSchema.safeParse({ ...base, at: "2026-11-18T10:12:34+09:00" }).success).toBe(true);
  expect(commentSchema.safeParse({ ...base, at: "2026-11-18 10:12" }).success).toBe(false);
});
test("コメントの URL は http と https だけを受け付ける", () => {
  const base = { title: "題名", name: "名前", body: "本文", at: "2026-11-18T10:12:34+09:00" };
  expect(commentSchema.safeParse({ ...base, url: "https://example.com/" }).success).toBe(true);
  expect(commentSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
});
test("知らない経路や項目のあるコメントは受け付けない", () => {
  const base = { title: "題名", name: "名前", body: "本文", at: "2026-11-18T10:12:34+09:00" };
  expect(commentSchema.safeParse({ ...base, via: "x" }).success).toBe(false);
  expect(commentSchema.safeParse({ ...base, email: "a@example.com" }).success).toBe(false);
});
