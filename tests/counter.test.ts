import { expect, test } from "vitest";
import { counterDigits, visitBarRatios, visitWeek, visitDayLabel } from "../src/lib/counter";

test("カウンターは 7 桁に 0 を詰めて出す", () => {
  expect(counterDigits(12341)).toBe("0012341");
});

test("日別の棒は最大の日を100%にし、ほかの日はその割合にする", () => {
  expect(
    visitBarRatios([
      { day: "a", count: 10 },
      { day: "b", count: 40 },
      { day: "c", count: 0 },
    ]),
  ).toEqual([0.25, 1, 0]);
});

test("すべて0の日と空の期間でも棒の高さは有限の値になる", () => {
  expect(visitBarRatios(visitWeek([]))).toEqual([0, 0, 0, 0, 0, 0, 0]);
  expect(visitBarRatios([])).toEqual([]);
});

test("表の日付は月と日で読める", () => {
  expect(visitDayLabel("2026/11/05")).toBe("11月5日");
});
