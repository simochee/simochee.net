import { expect, test } from "vitest";
import { counterDigits } from "../src/lib/counter";

test("カウンターは 7 桁に 0 を詰めて出す", () => {
  expect(counterDigits(12341)).toBe("0012341");
});
