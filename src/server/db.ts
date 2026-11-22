import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { env } from "cloudflare:workers";
import { applyMigrations, type Migration } from "./migrations";

const files = import.meta.glob<string>("../../db/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});
const migrations: Migration[] = Object.entries(files)
  .map(([path, sql]) => ({ name: path.split("/").at(-1)!, sql }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Workers は、あるリクエストで作った Promise を別のリクエストで待つことを許さない。済んだかどうかだけを覚える。
let migrated = false;

/**
 * マイグレーションを当て終えたデータベース。isolate ごとに最初の 1 回だけ確かめる。
 *
 * CLI の `cf d1 migrations apply` はデータベースの ID を要求する。ID を決める前の自動作成でも、
 * ローカルのエミュレータでも手順なしで動くよう、Worker が自分で当てる。
 */
export async function database(): Promise<D1Database> {
  if (!migrated) {
    const pending = [...migrations];
    if (import.meta.env.DEV) {
      const { default: sql } = await import("../../db/dev-seed.sql?raw");
      pending.push({ name: "dev-seed.sql", sql });
    }
    await applyMigrations(env.DB, pending);
    migrated = true;
  }
  return env.DB;
}
