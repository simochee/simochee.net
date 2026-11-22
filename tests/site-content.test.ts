import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parseSiteContent, readSiteContent } from "../src/lib/site-content";

const file = "/articles/_site.yaml";
const sample = readFileSync(new URL("../content/posts/_site.yaml", import.meta.url), "utf8");

test("コメントを含む正しい YAML を受け入れる", () => {
  const content = parseSiteContent(`# メモ\n${sample}`, file);
  expect(content.author.bio).toBe("技術のことや日々のこと、写真などを書いています。");
  expect(content.links[0]).toEqual({
    label: "Zenn",
    href: "https://zenn.dev/lollipop_onl",
    note: "技術",
  });
  expect(content.poll.options).toEqual(["ブレンド", "カフェオレ", "ココア", "クリームソーダ"]);
  expect(content.profile.facts[0]).toEqual(["なまえ", "しもちぃ（simochee）"]);
});

test.each([
  ["author: {}", "author.bio"],
  [sample.replace(/bio: .*/, "bio: 123"), "author.bio"],
  [sample.replace(/question: .*/, "question: []"), "poll.question"],
  [sample.replace("href: https://zenn.dev/lollipop_onl", "href: invalid"), "links.0.href"],
])("必須項目の欠落や型の違いはファイルとフィールドを示す: %s", (source, field) => {
  expect(() => parseSiteContent(source, file)).toThrow(file);
  expect(() => parseSiteContent(source, file)).toThrow(field);
});

test("YAML が壊れているとファイルと行番号を示す", () => {
  expect(() => parseSiteContent("author: [", file)).toThrow(/\/articles\/_site.yaml:[\s\S]*line 1/);
});

test("ファイルがないと読み込もうとした場所を示す", async () => {
  await expect(readSiteContent("/nonexistent/_site.yaml")).rejects.toThrow(
    "/nonexistent/_site.yaml",
  );
});

const required = `author:
  bio: 自己紹介
links: []
poll:
  question: 好きなものは？
  options: [本, 写真]
profile:
  facts:
    なまえ: しもちぃ
  greeting: [こんにちは]
`;

test("favorites と notes と history を省略できる", () => {
  expect(parseSiteContent(required, file).profile).toMatchObject({
    favorites: [],
    notes: [],
    history: [],
  });
});

test.each([
  "  favorites: {}\n  notes: []\n  history: {}\n",
  "  favorites:\n  notes:\n  history:\n",
])("任意項目を空にできる: %s", (optional) => {
  expect(parseSiteContent(required + optional, file).profile).toMatchObject({
    favorites: [],
    notes: [],
    history: [],
  });
});

test("facts と favorites と history は数値に見えるキーの表記と YAML の順序を保つ", () => {
  const mapping =
    "    2026.10: 十月\n    0x1A: 十六進\n    2026: 新しい\n    2024: 古い\n    最後: おわり";
  const source =
    required.replace("    なまえ: しもちぃ", mapping) +
    `  history:\n${mapping}\n  favorites:\n${mapping}\n`;
  const { profile } = parseSiteContent(source, file);
  const expected = ["2026.10", "0x1A", "2026", "2024", "最後"];
  expect(profile.facts.map(([key]) => key)).toEqual(expected);
  expect(profile.history.map(([key]) => key)).toEqual(expected);
  expect(profile.favorites.map(([key]) => key)).toEqual(expected);
});

test.each(["facts", "favorites", "history"])(
  "%s がマップでないとファイルと項目と書き方を示す",
  (field) => {
    const source =
      field === "facts"
        ? required.replace("  facts:\n    なまえ: しもちぃ", "  facts: []")
        : required + `  ${field}: []\n`;
    expect(() => parseSiteContent(source, file)).toThrow(
      `${file}: サイト設定が正しくありません\nprofile.${field}: マップで書いてください`,
    );
  },
);

test.each(
  ["facts", "favorites", "history"].flatMap((field) =>
    ["[見出し, 値]", "{見出し: 値}"].map((key) => [field, key]),
  ),
)("%s の複合キー %s はファイルとキーの場所を示す schema エラーになる", (field, key) => {
  const mapping = `  ${field}:\n    ? ${key}\n    : 内容`;
  const source =
    field === "facts"
      ? required.replace("  facts:\n    なまえ: しもちぃ", mapping)
      : required + `${mapping}\n`;
  expect(() => parseSiteContent(source, file)).toThrow(
    `${file}: サイト設定が正しくありません\nprofile.${field}.0.key: 見出しはスカラーのキーで書いてください`,
  );
});

test("同じ質問と選択肢は同じ id になり質問か選択肢を変えると別の id になる", () => {
  const id = parseSiteContent(required, file).poll.id;
  expect(id).toMatch(/^[a-f0-9]{16}$/);
  expect(parseSiteContent(`# コメント\n${required}`, file).poll.id).toBe(id);
  expect(parseSiteContent(required.replace("自己紹介", "別の自己紹介"), file).poll.id).toBe(id);
  expect(parseSiteContent(required.replace("好きなものは？", "何が好き？"), file).poll.id).not.toBe(
    id,
  );
  expect(parseSiteContent(required.replace("[本, 写真]", "[本, 音楽]"), file).poll.id).not.toBe(id);
  expect(parseSiteContent(required.replace("[本, 写真]", "[写真, 本]"), file).poll.id).not.toBe(id);
});

test.each(["facts", "favorites", "history"])(
  "%s は数値として等しくても表記が違うキーを別の見出しとして受け入れる",
  (field) => {
    const mapping = "    2026.1: 一月\n    2026.10: 十月\n    0x1A: 十六進\n    26: 十進";
    const source =
      field === "facts"
        ? required.replace("    なまえ: しもちぃ", mapping)
        : required + `  ${field}:\n${mapping}\n`;
    const entries = parseSiteContent(source, file).profile[field as "facts"];
    expect(entries).toEqual([
      ["2026.1", "一月"],
      ["2026.10", "十月"],
      ["0x1A", "十六進"],
      ["26", "十進"],
    ]);
  },
);

test("表記まで同じキーの重複は行番号つきのエラーになる", () => {
  const source = required.replace("    なまえ: しもちぃ", "    2026.1: 一月\n    2026.1: 二月");
  expect(() => parseSiteContent(source, file)).toThrow(/Map keys must be unique at line 10/);
});

test("値が数値だと項目のキーと引用符で囲む手がかりを示す", () => {
  const source = required.replace("なまえ: しもちぃ", "ブログ開設: 2024");
  expect(() => parseSiteContent(source, file)).toThrow(
    `${file}: サイト設定が正しくありません\nprofile.facts.ブログ開設: 文字列で書いてください（数値や真偽値に見える値は引用符で囲んでください）`,
  );
});

test("facts がないとマップで書くよう示す", () => {
  const source = required.replace("  facts:\n    なまえ: しもちぃ\n", "");
  expect(() => parseSiteContent(source, file)).toThrow(
    `${file}: サイト設定が正しくありません\nprofile.facts: マップで書いてください`,
  );
});

test("facts が空のマップだと 1 件以上書くよう示す", () => {
  const source = required.replace("  facts:\n    なまえ: しもちぃ", "  facts: {}");
  expect(() => parseSiteContent(source, file)).toThrow(
    `${file}: サイト設定が正しくありません\nprofile.facts: マップで 1 件以上書いてください`,
  );
});

test("そのほかの型の違いも日本語で示す", () => {
  expect(() => parseSiteContent(required.replace("自己紹介", "[]"), file)).toThrow(
    "author.bio: 無効な入力",
  );
});
