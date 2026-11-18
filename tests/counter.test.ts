import { expect, test } from "vitest";
import {
  fillWeek,
  firstUnsettledDay,
  isSettled,
  tokyoDay,
  tokyoMidnight,
  visitsByTokyoDay,
  weekEndingOn,
} from "../src/lib/counter";

test("訪問の日付は閲覧者や実行環境の時間帯ではなく日本時間で数える", () => {
  expect(tokyoDay(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-18");
  expect(tokyoDay(new Date("2026-11-17T14:59:59Z"))).toBe("2026-11-17");
});

test("日本時間の 1 日は UTC の前日 15 時に始まる", () => {
  expect(tokyoMidnight("2026-11-18").toISOString()).toBe("2026-11-17T15:00:00.000Z");
});

test("1 週間は今日までの 7 日間で、月をまたいでも古い順に並ぶ", () => {
  expect(weekEndingOn("2026-12-03")).toEqual([
    "2026-11-27",
    "2026-11-28",
    "2026-11-29",
    "2026-11-30",
    "2026-12-01",
    "2026-12-02",
    "2026-12-03",
  ]);
});

test("UTC で区切られた 1 時間ごとの訪問数を、日本時間の日付でまとめ直す", () => {
  expect(
    visitsByTokyoDay([
      { hour: "2026-11-17T14:00:00Z", visits: 2 },
      { hour: "2026-11-17T15:00:00Z", visits: 3 },
      { hour: "2026-11-18T14:00:00Z", visits: 4 },
      { hour: "2026-11-16T23:00:00Z", visits: 1 },
    ]),
  ).toEqual([
    { day: "2026-11-17", visits: 3 },
    { day: "2026-11-18", visits: 7 },
  ]);
});

test("だれも来なかった日は 0 回として 1 週間に含め、範囲外の日は捨てる", () => {
  const week = fillWeek(weekEndingOn("2026-11-18"), [
    { day: "2026-11-10", visits: 99 },
    { day: "2026-11-13", visits: 3 },
    { day: "2026-11-18", visits: 5 },
  ]);
  expect(week.map((entry) => entry.visits)).toEqual([0, 3, 0, 0, 0, 0, 5]);
});

test("集計が遅れて届くことがあるので、昨日と今日は保存せず毎回問い合わせる", () => {
  expect(isSettled("2026-11-16", "2026-11-18")).toBe(true);
  expect(isSettled("2026-11-17", "2026-11-18")).toBe(false);
  expect(isSettled("2026-11-18", "2026-11-18")).toBe(false);
});

test("問い合わせは保存済みの翌日から始め、少なくとも昨日からは問い合わせる", () => {
  expect(firstUnsettledDay("2026-11-18", "2026-11-10")).toBe("2026-11-11");
  expect(firstUnsettledDay("2026-11-18", "2026-11-16")).toBe("2026-11-17");
  expect(firstUnsettledDay("2026-11-18", "2026-11-17")).toBe("2026-11-17");
});

test("保存がないか古すぎるときは、Web Analytics が保証する 30 日前までしかさかのぼらない", () => {
  expect(firstUnsettledDay("2026-11-18", undefined)).toBe("2026-10-19");
  expect(firstUnsettledDay("2026-11-18", "2026-01-01")).toBe("2026-10-19");
});
