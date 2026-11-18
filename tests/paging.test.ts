import { expect, test } from "vitest";
import {
  pageCount,
  pageNumbers,
  pageOf,
  pageParams,
  pagePath,
  pageRange,
  pageSize,
} from "../src/lib/paging";

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
test("カテゴリなどの一覧も、その一覧の URL の下で同じ形のページ送りになる", () => {
  expect(pagePath(1, "/tech/")).toBe("/tech/");
  expect(pagePath(3, "/tech/")).toBe("/tech/page/3/");
});
test("ページに出ている記事の範囲は 1 件目から数え、最後のページは総数で止まる", () => {
  expect(pageRange(12, 1)).toEqual({ from: 1, to: pageSize });
  expect(pageRange(12, 3)).toEqual({ from: pageSize * 2 + 1, to: 12 });
});
test("記事が 1 件もない一覧の範囲は 0 件目になる", () => {
  expect(pageRange(0, 1)).toEqual({ from: 0, to: 0 });
});
test("ページ番号は先頭・末尾といまのページの前後を出し、あいだは省く", () => {
  expect(pageNumbers(1, 11)).toEqual([1, 2, undefined, 11]);
  expect(pageNumbers(6, 11)).toEqual([1, undefined, 5, 6, 7, undefined, 11]);
  expect(pageNumbers(11, 11)).toEqual([1, undefined, 10, 11]);
});
test("ページが少なければ番号は省かずに全部出す", () => {
  expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  expect(pageNumbers(1, 1)).toEqual([1]);
});
test("一覧の 1 ページ目は URL に番号を持たない", () => {
  expect(pageParams(pageSize + 1)).toEqual([
    { page: 1, param: undefined },
    { page: 2, param: "page/2" },
  ]);
});
