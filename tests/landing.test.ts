import { expect, test } from "vitest";
import { landingTop } from "../src/lib/landing";

const contentTop = 205;

test("本文まで読み進めてから移ると、新しいページの本文の先頭に着く", () => {
  expect(landingTop({ navigationType: "push", hash: "", scrolledFrom: 2593, contentTop })).toBe(
    contentTop,
  );
});
test("ヘッダーが見えている位置から移ると、スクロール位置は変わらない", () => {
  expect(landingTop({ navigationType: "push", hash: "", scrolledFrom: 0, contentTop })).toBe(0);
  expect(landingTop({ navigationType: "push", hash: "", scrolledFrom: 120, contentTop })).toBe(120);
});
test("履歴を置き換える移動も、進む移動と同じ位置に着く", () => {
  expect(landingTop({ navigationType: "replace", hash: "", scrolledFrom: 2593, contentTop })).toBe(
    contentTop,
  );
});
test("戻る・進むでは、離れたときの位置の復元をルーターに任せる", () => {
  expect(
    landingTop({ navigationType: "traverse", hash: "", scrolledFrom: 2593, contentTop }),
  ).toBeUndefined();
});
test("# 付きの URL では、その要素への移動をブラウザに任せる", () => {
  expect(
    landingTop({ navigationType: "push", hash: "#comments", scrolledFrom: 2593, contentTop }),
  ).toBeUndefined();
});
