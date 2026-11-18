import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  fillWeek,
  tokyoDay,
  weekEndingOn,
  type CounterStats,
  type DailyVisitors,
} from "../../lib/counter";

export const prerender = false;

/** 1 回数え、累計と今日までの 7 日間を返す。 */
export const POST: APIRoute = async () => {
  const today = tokyoDay(new Date());
  const days = weekEndingOn(today);
  const db = env.COUNTER_DB;
  const countToday = db
    .prepare(
      "INSERT INTO daily_visitors (day, visitors) VALUES (?1, 1) ON CONFLICT (day) DO UPDATE SET visitors = visitors + 1",
    )
    .bind(today);
  const readTotal = db.prepare("SELECT COALESCE(SUM(visitors), 0) AS total FROM daily_visitors");
  const readWeek = db
    .prepare("SELECT day, visitors FROM daily_visitors WHERE day >= ?1")
    .bind(days[0]);
  const [, total, week] = await db.batch([countToday, readTotal, readWeek]);

  const stats: CounterStats = {
    total: Number(total!.results[0]!.total),
    week: fillWeek(days, week!.results as unknown as DailyVisitors[]),
  };
  return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
};
