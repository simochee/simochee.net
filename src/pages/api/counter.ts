import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  fillWeek,
  firstUnsettledDay,
  isSettled,
  tokyoDay,
  tokyoMidnight,
  visitsByTokyoDay,
  weekEndingOn,
  type CounterStats,
  type DailyVisits,
} from "../../lib/counter";
import { fetchHourlyVisits } from "../../lib/web-analytics";

export const prerender = false;

/** 秒。Web Analytics の GraphQL API は 5 分に 300 回までなので、表示のたびには問い合わせない。 */
const cacheFor = 10 * 60;

/**
 * 累計と今日までの 7 日間の訪問数を返す。
 * Web Analytics は古い集計を消していくので、確定した日の分は D1 に写して累計を保つ。
 */
export const GET: APIRoute = async ({ cache }) => {
  const now = new Date();
  const today = tokyoDay(now);
  const days = weekEndingOn(today);
  const db = env.COUNTER_DB;

  const lastSettled = await db
    .prepare("SELECT MAX(day) AS day FROM daily_visits")
    .first<string | null>("day");
  const since = firstUnsettledDay(today, lastSettled ?? undefined);
  const fresh = visitsByTokyoDay(
    await fetchHourlyVisits(
      {
        accountId: env.ANALYTICS_ACCOUNT_ID,
        siteTag: env.ANALYTICS_SITE_TAG,
        apiToken: env.ANALYTICS_API_TOKEN,
      },
      tokyoMidnight(since),
      now,
    ),
  );
  const settled = fresh.filter((entry) => isSettled(entry.day, today));
  const unsettled = fresh.filter((entry) => !isSettled(entry.day, today));

  if (settled.length > 0) {
    await db.batch(
      settled.map((entry) =>
        db
          .prepare("INSERT OR REPLACE INTO daily_visits (day, visits) VALUES (?1, ?2)")
          .bind(entry.day, entry.visits),
      ),
    );
  }
  const [storedTotal, storedWeek] = await db.batch([
    db.prepare("SELECT COALESCE(SUM(visits), 0) AS total FROM daily_visits"),
    db.prepare("SELECT day, visits FROM daily_visits WHERE day >= ?1").bind(days[0]),
  ]);

  const stats: CounterStats = {
    total:
      Number(storedTotal!.results[0]!.total) +
      unsettled.reduce((sum, entry) => sum + entry.visits, 0),
    week: fillWeek(days, [...(storedWeek!.results as unknown as DailyVisits[]), ...unsettled]),
  };
  cache.set({ maxAge: cacheFor });
  return Response.json(stats);
};
