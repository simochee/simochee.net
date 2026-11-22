import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { dayKey } from "../lib/dates";
import { recentVisits, type PageviewSource } from "./analytics";
import { snapshot } from "./snapshots";

/** 閲覧者数は、この秒数のあいだ同じ値を見せる。Web Analytics への問い合わせを増やさないため。 */
export const viewersCacheSeconds = 5 * 60;
/** 人気記事は、この日数の閲覧数で決める。 */
export const popularDays = 30;
/** 人気記事は、この秒数のあいだ同じ並びを見せる。閲覧数の取り込みも 1 時間ごと。 */
export const popularCacheSeconds = 60 * 60;
/** 人気記事として数えておく件数。公開をやめた記事を除いても足りるよう、出す件数より多めに持つ。 */
const popularKept = 20;
const day = 24 * 60 * 60 * 1000;

/** これまでの訪問数の累計。Web Analytics から 1 時間ごとに足している。 */
export async function visitorTotal(db: D1Database) {
  return (
    (await db
      .prepare("SELECT value FROM counters WHERE name = 'visitors'")
      .first<number>("value")) ?? 0
  );
}

/** いま見ている人のおおよその数。Web Analytics を読めないあいだは null。 */
export async function currentViewers(
  db: D1Database,
  source: PageviewSource | undefined,
  now = Date.now(),
): Promise<number | null> {
  if (!source) return null;
  return snapshot(db, "viewers", viewersCacheSeconds, () => recentVisits(source, now), now);
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
