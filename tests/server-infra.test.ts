import { expect, test } from "vitest";
import { applyMigrations, statements } from "../src/server/migrations";
import { hashSecret, matchesSecret } from "../src/server/secrets";
import { closeSession, hasSession, openSession } from "../src/server/sessions";
import {
  claim,
  complete,
  isFresh,
  markChecked,
  release,
  watchList,
  watchPerRun,
} from "../src/server/social/syndications";
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

test("管理人のログインは、期限内で、ログアウトしていないあいだだけ通る", async () => {
  const db = await migratedD1();
  const token = await openSession(db, 60, 1_000);
  expect(await hasSession(db, token, 2_000)).toBe(true);
  expect(await hasSession(db, token, 61_001)).toBe(false);
  expect(await hasSession(db, "でたらめ", 2_000)).toBe(false);
  expect(await hasSession(db, undefined, 2_000)).toBe(false);
  await closeSession(db, token);
  expect(await hasSession(db, token, 2_000)).toBe(false);
});

test("ログインの cookie の値そのものは、データベースに残さない", async () => {
  const db = await migratedD1();
  const token = await openSession(db, 60);
  const { results } = await db
    .prepare("SELECT token_hash FROM admin_sessions")
    .all<{ token_hash: string }>();
  expect(results.map((row) => row.token_hash)).not.toContain(token);
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

test("返信は、知らせてから 30 日のあいだ、前に見にいった時刻の古いものから順に見にいく", async () => {
  const db = await migratedD1();
  const announce = async (slug: string, at: string) => {
    await claim(db, slug, "bsky", new Date(at));
    await complete(db, slug, "bsky", { remoteId: `at://${slug}`, url: "" });
  };
  await announce("old", "2026-10-19T12:00:00Z");
  for (let i = 0; i <= watchPerRun; i++) await announce(`p${i}`, `2026-11-${10 + i}T12:00:00Z`);
  const first = await watchList(db, "bsky", now);
  expect(first).toHaveLength(watchPerRun);
  expect(first.map((item) => item.slug)).not.toContain("old");
  for (const { slug } of first) await markChecked(db, slug, "bsky", now);
  expect((await watchList(db, "bsky", now))[0]!.slug).toBe("p0");
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
