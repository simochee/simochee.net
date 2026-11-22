import type { D1Database } from "@cloudflare/workers-types/index.ts";

export async function clap(db: D1Database, slug: string) {
  const row = await db
    .prepare(
      `INSERT INTO claps (slug, count) VALUES (?, 1)
       ON CONFLICT (slug) DO UPDATE SET count = count + 1 RETURNING count`,
    )
    .bind(slug)
    .first<{ count: number }>();
  return row!.count;
}

export async function clapCounts(db: D1Database, published: Iterable<string>) {
  const { results } = await db
    .prepare("SELECT slug, count FROM claps WHERE slug IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify([...published]))
    .all<{ slug: string; count: number }>();
  return Object.fromEntries(results.map((row) => [row.slug, row.count]));
}
