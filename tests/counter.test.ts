import { expect, test } from "vitest";
import { fillWeek, secondsUntilTokyoMidnight, tokyoDay, weekEndingOn } from "../src/lib/counter";

test("来訪の日付は閲覧者や実行環境の時間帯ではなく日本時間で数える", () => {
  expect(tokyoDay(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-18");
  expect(tokyoDay(new Date("2026-11-17T14:59:59Z"))).toBe("2026-11-17");
});

test("来訪済みの印は日本時間の 0 時に切れる", () => {
  expect(secondsUntilTokyoMidnight(new Date("2026-11-18T23:59:00+09:00"))).toBe(60);
  expect(secondsUntilTokyoMidnight(new Date("2026-11-18T00:00:00+09:00"))).toBe(24 * 60 * 60);
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

test("だれも来なかった日は 0 人として 1 週間に含め、範囲外の日は捨てる", () => {
  const days = weekEndingOn("2026-11-18");
  const week = fillWeek(days, [
    { day: "2026-11-10", visitors: 99 },
    { day: "2026-11-13", visitors: 3 },
    { day: "2026-11-18", visitors: 5 },
  ]);
  expect(week.map((entry) => entry.visitors)).toEqual([0, 3, 0, 0, 0, 0, 5]);
});
