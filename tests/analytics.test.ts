import { afterEach, expect, test, vi } from "vitest";
import {
  importAnalytics,
  maxHoursPerRun,
  settleMilliseconds,
  slugOfPath,
  windowsToImport,
  type PageviewSource,
  type PathViews,
  webAnalytics,
} from "../src/server/analytics";
import { migratedD1 } from "./support/d1";

const hour = 60 * 60 * 1000;
const at = (iso: string) => Date.parse(iso);

afterEach(() => {
  vi.unstubAllGlobals();
});

test("Web Analytics からは、サイトのホスト名の閲覧だけを、ページごとの閲覧数と訪問数として読む", async () => {
  const requests: { query: string; variables: Record<string, string> }[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    return Response.json({
      data: {
        viewer: {
          accounts: [
            {
              rumPageloadEventsAdaptiveGroups: [
                { count: 4, sum: { visits: 0 }, dimensions: { requestPath: "/archive/pudding/" } },
                { count: 10, sum: { visits: 5 }, dimensions: { requestPath: "/" } },
              ],
            },
          ],
        },
      },
      errors: null,
    });
  });
  const source = webAnalytics({
    accountId: "account",
    siteTag: "site",
    apiToken: "token",
    host: "simochee.net",
  });
  const rows = await source(new Date("2026-11-19T02:00:00Z"), new Date("2026-11-19T03:00:00Z"));
  expect(rows).toEqual([
    { path: "/archive/pudding/", views: 4, visits: 0 },
    { path: "/", views: 10, visits: 5 },
  ]);
  expect(requests[0]!.query).toMatch(/requestHost: \$host/);
  expect(requests[0]!.variables).toMatchObject({ site: "site", host: "simochee.net" });
});

test("記事のページの URL からだけ slug を取り出す", () => {
  expect(slugOfPath("/archive/morning-at-kissaten/")).toBe("morning-at-kissaten");
  expect(slugOfPath("/archive/morning-at-kissaten")).toBe("morning-at-kissaten");
  expect(slugOfPath("/archive/")).toBeUndefined();
  expect(slugOfPath("/archive/2026/11/")).toBeUndefined();
  expect(slugOfPath("/tags/喫茶店/")).toBeUndefined();
  expect(slugOfPath("/archive/a/b/")).toBeUndefined();
});

test("記事が /archive/ へ移る前の /posts/ の閲覧も、同じ記事の閲覧として数える", () => {
  expect(slugOfPath("/posts/morning-at-kissaten/")).toBe("morning-at-kissaten");
  expect(slugOfPath("/posts/")).toBeUndefined();
});

test("初めて取り込むときは、集計が落ち着いた直前の 1 時間だけを取り込む", () => {
  const now = at("2026-11-19T03:20:00Z");
  expect(windowsToImport(null, now)).toEqual([
    { start: at("2026-11-19T02:00:00Z"), end: at("2026-11-19T03:00:00Z") },
  ]);
});

test("まだ集計が落ち着いていない時間は、次の回まで取り込まない", () => {
  const now = at("2026-11-19T03:00:00Z") + settleMilliseconds - 1;
  expect(windowsToImport(at("2026-11-19T02:00:00Z"), now)).toEqual([]);
});

test("止まっていたあとは前回の続きから取り込み、1 回で進めるのは上限の時間数まで", () => {
  const until = at("2026-11-17T00:00:00Z");
  const windows = windowsToImport(until, at("2026-11-19T03:20:00Z"));
  expect(windows).toHaveLength(maxHoursPerRun);
  expect(windows[0]!.start).toBe(until);
  expect(windows.at(-1)!.end).toBe(until + maxHoursPerRun * hour);
});

test("記事ごとの閲覧数を日本時間の日付ごとに足し、訪問数をアクセスカウンターに足す", async () => {
  const db = await migratedD1();
  const rows: Record<string, PathViews[]> = {
    "2026-11-19T14:00:00.000Z": [
      { path: "/archive/pudding/", views: 3, visits: 2 },
      { path: "/archive/pudding", views: 1, visits: 0 },
      { path: "/", views: 4, visits: 4 },
    ],
    "2026-11-19T15:00:00.000Z": [{ path: "/archive/pudding/", views: 5, visits: 1 }],
  };
  const source: PageviewSource = async (start) => rows[start.toISOString()] ?? [];
  await db.prepare("INSERT INTO counters (name, value) VALUES ('visitors', 100)").run();
  await db
    .prepare("INSERT INTO counters (name, value) VALUES ('analytics_until', ?)")
    .bind(at("2026-11-19T14:00:00Z"))
    .run();
  await importAnalytics(db, source, at("2026-11-19T16:20:00Z"));
  const { results } = await db
    .prepare("SELECT slug, day, count FROM page_views ORDER BY day")
    .all<{ slug: string; day: string; count: number }>();
  expect(results).toEqual([
    { slug: "pudding", day: "2026/11/19", count: 4 },
    { slug: "pudding", day: "2026/11/20", count: 5 },
  ]);
  expect(
    await db.prepare("SELECT value FROM counters WHERE name = 'visitors'").first("value"),
  ).toBe(107);
  expect(
    (await db.prepare("SELECT day, count FROM daily_visits ORDER BY day").all()).results,
  ).toEqual([
    { day: "2026/11/19", count: 6 },
    { day: "2026/11/20", count: 1 },
  ]);
});

test("同じ時間は二度取り込まず、取り込みに失敗した時間は次の回にやりなおす", async () => {
  const db = await migratedD1();
  let failing = true;
  const source: PageviewSource = async () => {
    if (failing) throw new Error("Web Analytics に届かない");
    return [{ path: "/archive/pudding/", views: 2, visits: 1 }];
  };
  const now = at("2026-11-19T03:20:00Z");
  await expect(importAnalytics(db, source, now)).rejects.toThrow();
  expect(await db.prepare("SELECT COUNT(*) AS n FROM page_views").first("n")).toBe(0);
  failing = false;
  await importAnalytics(db, source, now);
  await importAnalytics(db, source, now);
  expect(await db.prepare("SELECT count FROM page_views").first("count")).toBe(2);
  expect((await db.prepare("SELECT day, count FROM daily_visits").all()).results).toEqual([
    { day: "2026/11/19", count: 1 },
  ]);
  expect(
    await db.prepare("SELECT value FROM counters WHERE name = 'visitors'").first("value"),
  ).toBe(1);
});

test("日別訪問数の保存に失敗したbatchは累計も進捗も戻し、次の取り込みで一度だけ足す", async () => {
  const db = await migratedD1();
  const now = at("2026-11-19T03:20:00Z");
  const source: PageviewSource = async () => [{ path: "/archive/pudding/", views: 5, visits: 3 }];
  await db.prepare("DROP TABLE daily_visits").run();
  await expect(importAnalytics(db, source, now)).rejects.toThrow();
  expect(await db.prepare("SELECT COUNT(*) AS n FROM page_views").first("n")).toBe(0);
  expect(
    await db
      .prepare("SELECT COUNT(*) AS n FROM counters WHERE name IN ('visitors', 'analytics_until')")
      .first("n"),
  ).toBe(0);
  await db
    .prepare("CREATE TABLE daily_visits (day TEXT PRIMARY KEY, count INTEGER NOT NULL)")
    .run();
  await importAnalytics(db, source, now);
  await importAnalytics(db, source, now);
  expect(await db.prepare("SELECT count FROM daily_visits").first("count")).toBe(3);
  expect(
    await db.prepare("SELECT value FROM counters WHERE name = 'visitors'").first("value"),
  ).toBe(3);
});

test("同じ日の別の時間の訪問数は日別の同じ行に足す", async () => {
  const db = await migratedD1();
  await db
    .prepare("INSERT INTO counters (name, value) VALUES ('analytics_until', ?)")
    .bind(at("2026-11-19T01:00:00Z"))
    .run();
  await importAnalytics(
    db,
    async () => [{ path: "/", views: 4, visits: 2 }],
    at("2026-11-19T03:20:00Z"),
  );
  expect((await db.prepare("SELECT day, count FROM daily_visits").all()).results).toEqual([
    { day: "2026/11/19", count: 4 },
  ]);
});
