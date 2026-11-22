import type { D1Database } from "@cloudflare/workers-types/index.ts";

export interface Migration {
  name: string;
  sql: string;
}

/**
 * SQL ファイルを 1 文ずつに分ける。
 * 行末の `;` で区切るだけなので、トリガーの本体のように文の途中で行が `;` で終わる SQL は書けない。
 */
export function statements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;[ \t]*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/** cf / wrangler の `d1 migrations apply` と同じ表に記録し、CLI で当てたものとも食い違わないようにする。 */
const bookkeeping =
  "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)";

export async function applyMigrations(db: D1Database, migrations: Migration[]) {
  await db.prepare(bookkeeping).run();
  const { results } = await db.prepare("SELECT name FROM d1_migrations").all<{ name: string }>();
  const applied = new Set(results.map((row) => row.name));
  for (const { name, sql } of migrations) {
    if (applied.has(name)) continue;
    try {
      await db.batch([
        ...statements(sql).map((statement) => db.prepare(statement)),
        db.prepare("INSERT INTO d1_migrations (name) VALUES (?)").bind(name),
      ]);
    } catch (error) {
      // 別の isolate が同じマイグレーションを同時に当てると、こちらの batch は丸ごと巻き戻る。その場合は当たっているので進む。
      const done = await db
        .prepare("SELECT 1 FROM d1_migrations WHERE name = ?")
        .bind(name)
        .first();
      if (!done) throw error;
    }
  }
}
