import { expect, test } from "vitest";
import { isAuthorName, nameKey } from "../src/lib/names";

test("管理人の名前は、書き方を少し変えても管理人の名前とみなす", () => {
  for (const name of [
    "しもちぃ",
    "しもちい",
    "シモチィ",
    "ｼﾓﾁｨ",
    "し も ち ぃ",
    "しも​ちぃ",
    "SIMOCHEE",
    "ｓｉｍｏｃｈｅｅ",
  ])
    expect(isAuthorName(name), name).toBe(true);
});

test("管理人の名前に似ていても、別の名前は通す", () => {
  for (const name of ["しもちゃん", "もちぃ", "simochee2"])
    expect(isAuthorName(name), name).toBe(false);
});

test("名前の比べ方は、全角半角・大小文字・カタカナと小さい仮名の違いを消す", () => {
  expect(nameKey("ﾐｶﾝ Ａｂｃ")).toBe(nameKey("みかんabc"));
});
