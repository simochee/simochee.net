import { expect, test } from "vitest";
import { moonAge, moonName, moonPath, nextFullMoon } from "../src/lib/moon";

const newMoon = new Date(Date.UTC(2000, 0, 6, 18, 14));
const days = (count: number) => new Date(newMoon.getTime() + count * 86400000);

test("月齢は新月からの日数で、朔望月ごとに 0 へ戻る", () => {
  expect(moonAge(newMoon)).toBe(0);
  expect(moonAge(days(7))).toBeCloseTo(7);
  expect(moonAge(days(30))).toBeCloseTo(30 - 29.530588853);
});
test("基準の新月より前の日付でも月齢は負にならない", () => {
  expect(moonAge(days(-1))).toBeCloseTo(28.530588853);
});
test("月齢から月の呼び名が決まる", () => {
  expect(moonName(0)).toBe("新月");
  expect(moonName(3)).toBe("三日月");
  expect(moonName(7.4)).toBe("上弦の月");
  expect(moonName(14.8)).toBe("満月");
  expect(moonName(22)).toBe("下弦の月");
  expect(moonName(29)).toBe("新月");
});
test("次の満月は、きょうが満月を過ぎていれば次の周期の満月になる", () => {
  expect(nextFullMoon(days(10)).getTime()).toBeCloseTo(days(29.530588853 / 2).getTime(), -3);
  expect(nextFullMoon(days(20)).getTime()).toBeCloseTo(days(29.530588853 * 1.5).getTime(), -3);
});
test("満ちていく月は右側が、欠けていく月は左側が光る", () => {
  expect(moonPath(3)).toMatch(/^M32 4 A28 28 0 0 1 32 60/);
  expect(moonPath(25)).toMatch(/^M32 4 A28 28 0 0 0 32 60/);
});
