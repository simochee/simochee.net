import type { D1Database } from "@cloudflare/workers-types/index.ts";

/**
 * 数えるのに表を広く読む値を、maxAgeSeconds のあいだ使い回す。古くなっていれば数えなおして置きなおす。
 * D1 の無料枠は読んだ行の数で決まるので、リクエストのたびに数えなおすと記事や閲覧が増えるほど枠を食う。
 */
export async function snapshot<T>(
  db: D1Database,
  key: string,
  maxAgeSeconds: number,
  compute: () => Promise<T>,
  now = Date.now(),
): Promise<T> {
  const saved = await db
    .prepare("SELECT value, computed_at FROM snapshots WHERE key = ?")
    .bind(key)
    .first<{ value: string; computed_at: number }>();
  if (saved && saved.computed_at > now - maxAgeSeconds * 1000) return JSON.parse(saved.value) as T;
  const value = await compute();
  await db
    .prepare(
      `INSERT INTO snapshots (key, value, computed_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, computed_at = excluded.computed_at`,
    )
    .bind(key, JSON.stringify(value), now)
    .run();
  return value;
}
