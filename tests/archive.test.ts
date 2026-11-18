import { expect, test } from "vitest";
import { addMonths, calendarWeeks, groupByMonth } from "../src/lib/archive";
import { dayKey } from "../src/lib/dates";

const post = (iso: string) => ({ data: { publishedAt: new Date(iso) } });

test("記事は日本時間の公開月ごとにまとまり、新しい月から並ぶ", () => {
  const months = groupByMonth([
    post("2026-10-31T23:30:00+09:00"),
    post("2026-11-18T09:00:00+09:00"),
    post("2026-10-31T15:30:00Z"),
  ]);
  expect(months.map((month) => [month.label, month.posts.length])).toEqual([
    ["2026年11月", 2],
    ["2026年10月", 1],
  ]);
});
test("月別アーカイブの URL は年と 2 桁の月で決まる", () => {
  expect(groupByMonth([post("2026-03-05T12:00:00+09:00")])[0]!.path).toBe("/archive/2026/03/");
});
test("カレンダーは日曜はじまりで、月の前後を空白で埋めた週の並びになる", () => {
  const [month] = groupByMonth([post("2026-11-18T09:00:00+09:00")]);
  const weeks = calendarWeeks(month!);
  expect(weeks).toHaveLength(5);
  expect(weeks.every((week) => week.length === 7)).toBe(true);
  expect(weeks[0]!.map((cell) => cell?.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(weeks[4]!.map((cell) => cell?.day)).toEqual([
    29,
    30,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
});
test("カレンダーの各日は、その日に公開した記事を持つ", () => {
  const [month] = groupByMonth([
    post("2026-11-18T09:00:00+09:00"),
    post("2026-11-18T21:00:00+09:00"),
    post("2026-11-07T09:00:00+09:00"),
  ]);
  const days = calendarWeeks(month!).flat();
  expect(days.find((cell) => cell?.day === 18)!.posts).toHaveLength(2);
  expect(days.find((cell) => cell?.day === 8)!.posts).toHaveLength(0);
});
test("カレンダーの各日は、日本時間の日付と同じ形の日付を持つ", () => {
  const [month] = groupByMonth([post("2026-03-05T09:00:00+09:00")]);
  const days = calendarWeeks(month!).flat();
  expect(days.find((cell) => cell?.day === 5)!.date).toBe(
    dayKey(new Date("2026-03-05T00:00:00+09:00")),
  );
});
test("うるう年の 2 月は 29 日まである", () => {
  const [month] = groupByMonth([post("2028-02-10T09:00:00+09:00")]);
  expect(calendarWeeks(month!).flat().filter(Boolean)).toHaveLength(29);
});
test("月の移動は年をまたぎ、月を 2 桁で表す", () => {
  expect(addMonths({ year: "2026", month: "01" }, -1)).toEqual({ year: "2025", month: "12" });
  expect(addMonths({ year: "2026", month: "12" }, 1)).toEqual({ year: "2027", month: "01" });
  expect(addMonths({ year: "2026", month: "08" }, 1)).toEqual({ year: "2026", month: "09" });
});
test("記事のない月もカレンダーにできる", () => {
  const weeks = calendarWeeks({ year: "2026", month: "02", posts: [] });
  expect(weeks.flat().filter(Boolean)).toHaveLength(28);
  expect(weeks.flat().every((cell) => !cell?.posts.length)).toBe(true);
});
