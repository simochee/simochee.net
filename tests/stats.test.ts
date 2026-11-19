import { expect, test } from "vitest";
import { clap, clapCounts } from "../src/server/claps";
import { forgetOldStats, popularPosts, presenceSeconds, recordVisit } from "../src/server/stats";
import { migratedD1 } from "./support/d1";

const now = new Date("2026-11-19T12:00:00+09:00");
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

test("アクセスカウンターは、そのブラウザで最初に開いたページでだけ進む", async () => {
  const db = await migratedD1();
  expect(await recordVisit(db, { visitor: "a", first: true }, now)).toMatchObject({
    number: 1,
    total: 1,
  });
  expect(await recordVisit(db, { visitor: "a", first: false }, now)).toMatchObject({
    number: null,
    total: 1,
  });
  expect(await recordVisit(db, { visitor: "b", first: true }, now)).toMatchObject({
    number: 2,
    total: 2,
  });
});

test("閲覧者数は、少し前までに便りのあった訪問者だけを数える", async () => {
  const db = await migratedD1();
  await recordVisit(db, { visitor: "a", first: true }, now);
  await recordVisit(db, { visitor: "b", first: true }, later(presenceSeconds - 1));
  expect(
    (await recordVisit(db, { visitor: "b", first: false }, later(presenceSeconds - 1))).viewers,
  ).toBe(2);
  expect(
    (await recordVisit(db, { visitor: "b", first: false }, later(presenceSeconds + 1))).viewers,
  ).toBe(1);
});

test("人気記事は、ここ 30 日の閲覧数の多い順で、公開中の記事だけを並べる", async () => {
  const db = await migratedD1();
  const view = (slug: string, at: Date) =>
    recordVisit(db, { visitor: "a", slug, first: false }, at);
  for (let i = 0; i < 3; i++) await view("pudding", now);
  await view("morning", daysAgo(29));
  await view("morning", now);
  for (let i = 0; i < 5; i++) await view("old", daysAgo(30));
  for (let i = 0; i < 9; i++) await view("draft", now);
  expect(await popularPosts(db, ["pudding", "morning", "old"], 5, now)).toEqual([
    { slug: "pudding", views: 3 },
    { slug: "morning", views: 2 },
  ]);
});

test("古い閲覧の記録は、人気記事の集計から外れたら捨てる", async () => {
  const db = await migratedD1();
  await recordVisit(db, { visitor: "a", slug: "old", first: false }, daysAgo(31));
  await recordVisit(db, { visitor: "b", slug: "new", first: false }, now);
  await forgetOldStats(db, now);
  const { results } = await db.prepare("SELECT slug FROM page_views").all<{ slug: string }>();
  expect(results.map((row) => row.slug)).toEqual(["new"]);
});

test("拍手は押すたびに 1 つ増え、公開中の記事の分だけ数を返す", async () => {
  const db = await migratedD1();
  expect(await clap(db, "morning")).toBe(1);
  expect(await clap(db, "morning")).toBe(2);
  await clap(db, "draft");
  expect(await clapCounts(db, ["morning", "quiet"])).toEqual({ morning: 2 });
});
