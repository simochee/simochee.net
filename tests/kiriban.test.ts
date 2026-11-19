import { expect, test } from "vitest";
import { counterDigits, isKiriban, nextKiriban } from "../src/lib/kiriban";

test("ゾロ目・連番・1 万ごとの数がキリ番になる", () => {
  expect([11111, 12345, 20000].map(isKiriban)).toEqual([true, true, true]);
  expect([12300, 12341, 12346].map(isKiriban)).toEqual([false, false, false]);
});

test("次のキリ番は、いまの数より大きい最初のキリ番", () => {
  expect(nextKiriban(12341)).toBe(12345);
  expect(nextKiriban(12345)).toBe(20000);
  expect(nextKiriban(21000)).toBe(22222);
});

test("カウンターは 7 桁に 0 を詰めて出す", () => {
  expect(counterDigits(12341)).toBe("0012341");
});
