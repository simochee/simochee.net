import { expect, test } from "vitest";
import { pageSize } from "../src/lib/paging";
import { resultPage, search, snippet, terms, type SearchEntry } from "../src/lib/search";

const entry = (id: string, title: string, text: string, publishedAt: string): SearchEntry => ({
  id,
  title,
  type: "tech",
  publishedAt,
  text,
});
const entries = [
  entry("old", "雨の日", "古い喫茶店でミルクティー", "2026-09-14T00:00:00Z"),
  entry("new", "Morning", "厚切りトーストと COFFEE", "2026-11-18T00:00:00Z"),
  entry("mid", "喫茶店のプリン", "固めのプリンを食べた", "2026-10-21T00:00:00Z"),
];

test("検索語は全角の空白も含めて空白で区切り、全角英数と大文字小文字をそろえる", () => {
  expect(terms("  喫茶店　ＣＯＦＦＥＥ  ")).toEqual(["喫茶店", "coffee"]);
  expect(terms("   ")).toEqual([]);
});
test("タイトルか本文のどちらかに語があれば一致し、新しい順に並ぶ", () => {
  expect(search(entries, "喫茶店").map((hit) => hit.id)).toEqual(["mid", "old"]);
});
test("複数の語はすべてがタイトルか本文にあるときだけ一致する", () => {
  expect(search(entries, "喫茶店 プリン").map((hit) => hit.id)).toEqual(["mid"]);
  expect(search(entries, "喫茶店 トースト")).toEqual([]);
});
test("全角英数と大文字小文字の違いを無視して一致する", () => {
  expect(search(entries, "ｃｏｆｆｅｅ").map((hit) => hit.id)).toEqual(["new"]);
  expect(search(entries, "morning").map((hit) => hit.id)).toEqual(["new"]);
});
test("空の検索語は何にも一致しない", () => {
  expect(search(entries, " 　")).toEqual([]);
});
test("スニペットは最初のヒットを前後の文脈つきで切り出し、元の表記を保つ", () => {
  const text = `${"あ".repeat(40)}Ｃｏｆｆｅｅを飲む${"い".repeat(100)}`;
  const result = snippet(text, ["coffee"], 5, 10);
  expect(result.hit).toBe("Ｃｏｆｆｅｅ");
  expect(result.before).toBe(`…${"あ".repeat(5)}`);
  expect(result.after).toBe(`を飲む${"い".repeat(7)}…`);
});
test("語が本文になくタイトルだけにあるときは、本文の冒頭をヒットなしで返す", () => {
  expect(snippet("本文の冒頭", ["題名"], 5, 10)).toEqual({
    before: "",
    hit: "",
    after: "本文の冒頭",
  });
});
test("正規化で文字数が変わる文字があっても、ヒットの位置がずれない", () => {
  expect(snippet("㌔を歩く。喫茶店", ["喫茶店"], 2, 5)).toMatchObject({ hit: "喫茶店" });
});
test("結果は既定の件数ごとに区切り、範囲外や不正なページは存在するページに寄せる", () => {
  const many = Array.from({ length: pageSize + 1 }, (_, index) =>
    entry(`p${index}`, "t", "x", "2026-01-01T00:00:00Z"),
  );
  expect(resultPage(many, "2")).toMatchObject({
    page: 2,
    last: 2,
    from: pageSize + 1,
    to: pageSize + 1,
  });
  expect(resultPage(many, "99").page).toBe(2);
  expect(resultPage(many, "0").page).toBe(1);
  expect(resultPage(many, "abc").page).toBe(1);
  expect(resultPage(many, null).items).toHaveLength(pageSize);
});
