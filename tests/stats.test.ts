import { expect, test } from "vitest";
import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { clap, clapCounts } from "../src/server/claps";
import { dayKey } from "../src/lib/dates";
import {
  currentViewers,
  dailyVisits,
  popularCacheSeconds,
  popularPosts,
  viewersCacheSeconds,
  visitorTotal,
} from "../src/server/stats";
import type { PageviewSource } from "../src/server/analytics";
import { migratedD1 } from "./support/d1";

const now = new Date("2026-11-19T12:00:00+09:00");
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

async function views(db: D1Database, slug: string, at: Date, count: number) {
  await db
    .prepare(
      `INSERT INTO page_views (slug, day, count) VALUES (?, ?, ?)
       ON CONFLICT (slug, day) DO UPDATE SET count = count + excluded.count`,
    )
    .bind(slug, dayKey(at), count)
    .run();
}

test("人気記事は、ここ 30 日の閲覧数の多い順で、公開中の記事だけを並べる", async () => {
  const db = await migratedD1();
  await views(db, "pudding", now, 3);
  await views(db, "morning", daysAgo(29), 1);
  await views(db, "morning", now, 1);
  await views(db, "old", daysAgo(30), 5);
  await views(db, "draft", now, 9);
  expect(await popularPosts(db, ["pudding", "morning", "old"], 5, now)).toEqual([
    { slug: "pudding", views: 3 },
    { slug: "morning", views: 2 },
  ]);
});

test("人気記事は 1 時間のあいだ同じ並びを見せ、それを過ぎたら数えなおす", async () => {
  const db = await migratedD1();
  const published = ["pudding", "morning"];
  await views(db, "pudding", now, 1);
  expect((await popularPosts(db, published, 5, now)).map((post) => post.slug)).toEqual(["pudding"]);
  await views(db, "morning", now, 3);
  const soon = later(popularCacheSeconds - 1);
  expect((await popularPosts(db, published, 5, soon)).map((post) => post.slug)).toEqual([
    "pudding",
  ]);
  const after = later(popularCacheSeconds + 1);
  expect((await popularPosts(db, published, 5, after)).map((post) => post.slug)).toEqual([
    "morning",
    "pudding",
  ]);
});

test("アクセスカウンターは、取り込んだ訪問数の累計を出す", async () => {
  const db = await migratedD1();
  expect(await visitorTotal(db)).toBe(0);
  await db.prepare("INSERT INTO counters (name, value) VALUES ('visitors', 12341)").run();
  expect(await visitorTotal(db)).toBe(12341);
});

test("閲覧者数は Web Analytics の直近の訪問数で、5 分のあいだ同じ値を見せる", async () => {
  const db = await migratedD1();
  let visits = 3;
  let asked = 0;
  const source: PageviewSource = async () => {
    asked++;
    return [{ path: "/", views: visits + 2, visits }];
  };
  expect(await currentViewers(db, source, now.getTime())).toBe(3);
  visits = 7;
  expect(await currentViewers(db, source, later(viewersCacheSeconds - 1).getTime())).toBe(3);
  expect(await currentViewers(db, source, later(viewersCacheSeconds + 1).getTime())).toBe(7);
  expect(asked).toBe(2);
});

test("Web Analytics を読めないあいだは、閲覧者数を出さない", async () => {
  expect(await currentViewers(await migratedD1(), undefined, now.getTime())).toBeNull();
});

test("拍手は押すたびに 1 つ増え、公開中の記事の分だけ数を返す", async () => {
  const db = await migratedD1();
  expect(await clap(db, "morning")).toBe(1);
  expect(await clap(db, "morning")).toBe(2);
  await clap(db, "draft");
  expect(await clapCounts(db, ["morning", "quiet"])).toEqual({ morning: 2 });
});

test("直近7日の訪問数は日本時間の今日までを古い順に並べ、記録のない日は0にする", async () => {
  const db = await migratedD1();
  for (const [day, count] of [
    ["2026/11/18", 99],
    ["2026/11/19", 2],
    ["2026/11/23", 8],
    ["2026/11/25", 5],
    ["2026/11/26", 70],
  ] as const) {
    await db.prepare("INSERT INTO daily_visits (day, count) VALUES (?, ?)").bind(day, count).run();
  }
  expect(await dailyVisits(db, new Date("2026-11-25T14:59:59Z"))).toEqual([
    { day: "2026/11/19", count: 2 },
    { day: "2026/11/20", count: 0 },
    { day: "2026/11/21", count: 0 },
    { day: "2026/11/22", count: 0 },
    { day: "2026/11/23", count: 8 },
    { day: "2026/11/24", count: 0 },
    { day: "2026/11/25", count: 5 },
  ]);
  const next = await dailyVisits(db, new Date("2026-11-25T15:00:00Z"));
  expect(next[0]).toEqual({ day: "2026/11/20", count: 0 });
  expect(next.at(-1)).toEqual({ day: "2026/11/26", count: 70 });
});

test("日本時間の年越しでも7日ぶんを返す", async () => {
  const days = await dailyVisits(await migratedD1(), new Date("2026-12-31T15:00:00Z"));
  expect(days.map(({ day }) => day)).toEqual([
    "2026/12/26",
    "2026/12/27",
    "2026/12/28",
    "2026/12/29",
    "2026/12/30",
    "2026/12/31",
    "2027/01/01",
  ]);
  expect(days.every(({ count }) => count === 0)).toBe(true);
});
