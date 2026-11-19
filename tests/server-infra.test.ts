import { expect, test } from "vitest";
import { applyMigrations, statements } from "../src/server/migrations";
import { hashSecret, matchesSecret, signUntil, verifySigned } from "../src/server/secrets";
import { claim, complete, isFresh, isWatched, release } from "../src/server/social/syndications";
import type { PublishedPost } from "../src/server/posts";
import { memoryD1, migratedD1 } from "./support/d1";

test("SQL ファイルは文ごとに分け、コメント行と空の文を捨てる", () => {
  expect(
    statements("-- 説明\nCREATE TABLE a (x TEXT);\n\nINSERT INTO a VALUES ('1;2');\n"),
  ).toEqual(["CREATE TABLE a (x TEXT)", "INSERT INTO a VALUES ('1;2')"]);
});

test("マイグレーションは当てていないものだけを当て、名前を記録する", async () => {
  const db = memoryD1();
  const first = { name: "0001_a.sql", sql: "CREATE TABLE a (x INTEGER);" };
  await applyMigrations(db, [first]);
  await applyMigrations(db, [first, { name: "0002_b.sql", sql: "CREATE TABLE b (x INTEGER);" }]);
  const { results } = await db
    .prepare("SELECT name FROM d1_migrations ORDER BY id")
    .all<{ name: string }>();
  expect(results.map((row) => row.name)).toEqual(["0001_a.sql", "0002_b.sql"]);
});

test("途中で失敗したマイグレーションは丸ごと巻き戻り、記録も残らない", async () => {
  const db = memoryD1();
  await expect(
    applyMigrations(db, [{ name: "0001_bad.sql", sql: "CREATE TABLE a (x INTEGER);\nNOT SQL;" }]),
  ).rejects.toThrow();
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE name = 'a'").all();
  expect(results).toEqual([]);
  expect(await db.prepare("SELECT COUNT(*) AS n FROM d1_migrations").first("n")).toBe(0);
});

test("削除キーは元の値と照らし合わせられるが、保存した形からは元の値が見えない", async () => {
  const stored = await hashSecret("abc123");
  expect(stored).not.toContain("abc123");
  expect(await matchesSecret("abc123", stored)).toBe(true);
  expect(await matchesSecret("abc124", stored)).toBe(false);
  expect(await matchesSecret("abc123", null)).toBe(false);
  expect(await hashSecret("abc123")).not.toBe(stored);
});

test("ログインの署名は、期限内で鍵が同じときだけ通る", async () => {
  const token = await signUntil("password", 2_000);
  expect(await verifySigned("password", token, 1_000)).toBe(true);
  expect(await verifySigned("password", token, 3_000)).toBe(false);
  expect(await verifySigned("changed", token, 1_000)).toBe(false);
  expect(await verifySigned("password", token.replace(/.$/, "0"), 1_000)).toBe(false);
});

const post = (publishedAt: string): PublishedPost => ({
  id: "a",
  title: "題名",
  type: "tech",
  description: "",
  tags: [],
  publishedAt,
});
const now = new Date("2026-11-19T12:00:00Z");

test("SNS には、公開から 1 日以内の記事だけを知らせる", () => {
  expect(isFresh(post("2026-11-18T13:00:00Z"), now)).toBe(true);
  expect(isFresh(post("2026-11-18T11:00:00Z"), now)).toBe(false);
  expect(isFresh(post("2026-11-19T13:00:00Z"), now)).toBe(false);
});

test("返信は、公開から 30 日のあいだ取り込む", () => {
  expect(isWatched(post("2026-10-21T12:00:00Z"), now)).toBe(true);
  expect(isWatched(post("2026-10-19T12:00:00Z"), now)).toBe(false);
});

test("同じ記事を知らせる権利は 1 回しか取れず、失敗して手放せばまた取れる", async () => {
  const db = await migratedD1();
  expect(await claim(db, "a", "bsky")).toBe(true);
  expect(await claim(db, "a", "bsky")).toBe(false);
  expect(await claim(db, "a", "mastodon")).toBe(true);
  await release(db, "a", "bsky");
  expect(await claim(db, "a", "bsky")).toBe(true);
  await complete(db, "a", "bsky", { remoteId: "at://x", url: "https://bsky.app/x" });
  await release(db, "a", "bsky");
  expect(await claim(db, "a", "bsky")).toBe(false);
});
