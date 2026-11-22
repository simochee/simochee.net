import { expect, test } from "vitest";
import { truncate } from "../src/lib/text";

test("切り詰めは、絵文字や合成した文字を途中で割らない", () => {
  expect(truncate("👨‍👩‍👧あいう", 3)).toBe("👨‍👩‍👧あ…");
  expect(truncate("あいう", 3)).toBe("あいう");
});
