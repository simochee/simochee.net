import { expect, test } from "vitest";
import { pageCount, pageOf, pagePath, pageSize } from "../src/lib/paging";

const items = Array.from({ length: pageSize * 2 + 1 }, (_, index) => index);

test("記事は新しい順のまま 1 ページ分ずつに区切る", () => {
  expect(pageOf(items, 1)).toEqual(items.slice(0, pageSize));
  expect(pageOf(items, 3)).toEqual([pageSize * 2]);
});
test("端数の記事にも 1 ページを割り当てる", () => {
  expect(pageCount(items.length)).toBe(3);
  expect(pageCount(pageSize)).toBe(1);
});
test("記事が 1 件もなくてもトップページは存在する", () => {
  expect(pageCount(0)).toBe(1);
});
test("1 ページ目はトップページそのもので、2 ページ目以降だけが /page/ 配下になる", () => {
  expect(pagePath(1)).toBe("/");
  expect(pagePath(2)).toBe("/page/2/");
});
