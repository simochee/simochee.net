import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { dayKey } from "../lib/dates";

/** この秒数のあいだに便りがあった訪問者を「いま見ている人」と数える。 */
export const presenceSeconds = 5 * 60;
/** 人気記事は、この日数の閲覧数で決める。 */
export const popularDays = 30;
const day = 24 * 60 * 60 * 1000;

export interface Visit {
  visitor: string;
  /** 記事のページなら、その記事の slug。閲覧数を数える。 */
  slug?: string;
  /** そのブラウザで最初に開いたページなら true。アクセスカウンターを 1 つ進める。 */
  first: boolean;
}

export interface VisitResult {
  /** カウンターを進めたときの、この訪問者の番号。 */
  number: number | null;
  total: number;
  viewers: number;
}

export async function recordVisit(
  db: D1Database,
  { visitor, slug, first }: Visit,
  now = new Date(),
): Promise<VisitResult> {
  const seconds = Math.floor(now.getTime() / 1000);
  const statements = [
    db
      .prepare(
        "INSERT INTO presence (visitor, seen_at) VALUES (?, ?) ON CONFLICT (visitor) DO UPDATE SET seen_at = excluded.seen_at",
      )
      .bind(visitor, seconds),
    db
      .prepare("SELECT COUNT(*) AS viewers FROM presence WHERE seen_at > ?")
      .bind(seconds - presenceSeconds),
    first
      ? db.prepare(
          `INSERT INTO counters (name, value) VALUES ('visitors', 1)
           ON CONFLICT (name) DO UPDATE SET value = value + 1 RETURNING value`,
        )
      : db.prepare("SELECT value FROM counters WHERE name = 'visitors'"),
  ];
  if (slug)
    statements.push(
      db
        .prepare(
          `INSERT INTO page_views (slug, day, count) VALUES (?, ?, 1)
           ON CONFLICT (slug, day) DO UPDATE SET count = count + 1`,
        )
        .bind(slug, dayKey(now)),
    );
  const [, viewers, counter] = await db.batch(statements);
  const total = (counter!.results[0] as { value: number } | undefined)?.value ?? 0;
  return {
    number: first ? total : null,
    total,
    viewers: (viewers!.results[0] as { viewers: number }).viewers,
  };
}

export async function popularPosts(
  db: D1Database,
  published: Iterable<string>,
  limit: number,
  now = new Date(),
) {
  const { results } = await db
    .prepare(
      `SELECT slug, SUM(count) AS views FROM page_views
       WHERE day >= ? AND slug IN (SELECT value FROM json_each(?))
       GROUP BY slug ORDER BY views DESC, slug LIMIT ?`,
    )
    .bind(
      dayKey(new Date(now.getTime() - (popularDays - 1) * day)),
      JSON.stringify([...published]),
      limit,
    )
    .all<{ slug: string; views: number }>();
  return results;
}

/** 数え終えた古い記録を捨て、表が際限なく育たないようにする。 */
export async function forgetOldStats(db: D1Database, now = new Date()) {
  await db.batch([
    db
      .prepare("DELETE FROM presence WHERE seen_at <= ?")
      .bind(Math.floor(now.getTime() / 1000) - presenceSeconds),
    db
      .prepare("DELETE FROM page_views WHERE day < ?")
      .bind(dayKey(new Date(now.getTime() - popularDays * day))),
  ]);
}
