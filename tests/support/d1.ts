import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { applyMigrations } from "../../src/server/migrations";

/**
 * テストで使う D1。D1 の中身も SQLite なので、Node に入っている SQLite に同じ呼び出し口をかぶせる。
 * サーバーのコードが使う prepare / bind / first / all / run / batch だけを用意している。
 */
export function memoryD1(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  class Statement {
    constructor(
      readonly sql: string,
      readonly values: SQLInputValue[] = [],
    ) {}
    bind(...values: SQLInputValue[]) {
      return new Statement(this.sql, values);
    }
    async first(column?: string) {
      const row = sqlite.prepare(this.sql).get(...this.values) as
        | Record<string, unknown>
        | undefined;
      if (!row) return null;
      return column ? row[column] : { ...row };
    }
    async all() {
      const results = sqlite
        .prepare(this.sql)
        .all(...this.values)
        .map((row) => ({ ...row }));
      return { success: true, results, meta: {} };
    }
    async run() {
      const statement = sqlite.prepare(this.sql);
      if (/\bRETURNING\b/i.test(this.sql) || /^\s*SELECT\b/i.test(this.sql)) {
        const results = statement.all(...this.values).map((row) => ({ ...row }));
        return { success: true, results, meta: { changes: results.length } };
      }
      const { changes } = statement.run(...this.values);
      return { success: true, results: [], meta: { changes: Number(changes) } };
    }
  }
  const database = {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return database as unknown as D1Database;
}

/** 本番と同じマイグレーションを当てた、空のデータベース。 */
export async function migratedD1() {
  const db = memoryD1();
  const names = readdirSync("db/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort();
  await applyMigrations(
    db,
    names.map((name) => ({ name, sql: readFileSync(`db/migrations/${name}`, "utf8") })),
  );
  return db;
}
