import { expect, test } from "vitest";
import { applyMigrations, statements } from "../src/server/migrations";
import { hashSecret, matchesSecret } from "../src/server/secrets";
import { closeSession, hasSession, openSession } from "../src/server/sessions";
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
