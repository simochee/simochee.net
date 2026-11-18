import { expect, test } from "vitest";
import { formatDay, formatMonthDay } from "../src/lib/dates";

test("日付は年月日と曜日を 2008 年のブログ風に並べる", () => {
  expect(formatDay(new Date("2026-11-18T12:00:00+09:00"))).toBe("2026/11/18 (水)");
});
test("日付は閲覧者や実行環境の時間帯ではなく日本時間で数える", () => {
  expect(formatDay(new Date("2026-11-17T15:00:00Z"))).toBe("2026/11/18 (水)");
  expect(formatDay(new Date("2026-11-17T14:59:59Z"))).toBe("2026/11/17 (火)");
});
test("月日だけの表記は 1 桁の月日を 0 で埋める", () => {
  expect(formatMonthDay(new Date("2026-03-05T12:00:00+09:00"))).toBe("03/05");
});
