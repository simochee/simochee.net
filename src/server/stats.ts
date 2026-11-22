import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { dayKey } from "../lib/dates";
import { snapshot } from "./snapshots";

/** この秒数のあいだに便りがあった訪問者を「いま見ている人」と数える。 */
export const presenceSeconds = 5 * 60;
/** 閲覧者数は、この秒数のあいだ同じ値を見せる。 */
export const viewersCacheSeconds = 60;
/** 人気記事は、この日数の閲覧数で決める。 */
export const popularDays = 30;
/** 人気記事は、この秒数のあいだ同じ並びを見せる。 */
export const popularCacheSeconds = 60 * 60;
/** 人気記事として数えておく件数。公開をやめた記事を除いても足りるよう、出す件数より多めに持つ。 */
const popularKept = 20;
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
  const [, counter] = await db.batch(statements);
  const total = (counter!.results[0] as { value: number } | undefined)?.value ?? 0;
  // 訪問のたびに数えると、同時に見ている人が増えるほど読む行が掛け算で増える。
  const viewers = await snapshot(
    db,
    "viewers",
    viewersCacheSeconds,
    async () =>
      (await db
        .prepare("SELECT COUNT(*) AS viewers FROM presence WHERE seen_at > ?")
        .bind(seconds - presenceSeconds)
        .first<number>("viewers")) ?? 0,
    now.getTime(),
  );
  return { number: first ? total : null, total, viewers };
}

export async function popularPosts(
  db: D1Database,
  published: Iterable<string>,
  limit: number,
  now = new Date(),
) {
  const ranked = await snapshot(
    db,
    "popular",
    popularCacheSeconds,
    async () =>
      (
        await db
          .prepare(
            `SELECT slug, SUM(count) AS views FROM page_views WHERE day >= ?
             GROUP BY slug ORDER BY views DESC, slug LIMIT ?`,
          )
          .bind(dayKey(new Date(now.getTime() - (popularDays - 1) * day)), popularKept)
          .all<{ slug: string; views: number }>()
      ).results,
    now.getTime(),
  );
  const shown = new Set(published);
  return ranked.filter((post) => shown.has(post.slug)).slice(0, limit);
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
