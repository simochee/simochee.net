import { expect, test } from "vitest";
import type { Element, ElementContent, Root } from "hast";
import { rehypeAlerts } from "../src/lib/rehype-alerts";

const el = (tagName: string, className: string[], children: ElementContent[] = []): Element => ({
  type: "element",
  tagName,
  properties: className.length ? { className } : {},
  children,
});
const text = (value: string) => ({ type: "text" as const, value });
const alert = (kind: string, ...body: ElementContent[]): Root => ({
  type: "root",
  children: [
    el(
      "div",
      ["markdown-alert", `markdown-alert-${kind}`],
      [el("p", ["markdown-alert-title"], [text(kind.toUpperCase())]), ...body],
    ),
  ],
});
const run = (tree: Root) => {
  rehypeAlerts()(tree);
  return tree.children[0] as Element;
};
const plain = (node: ElementContent): string =>
  node.type === "text"
    ? node.value
    : node.type === "element"
      ? node.children.map(plain).join("")
      : "";

test("注意書きの 1 行目は、種類ごとのアイコンがついた見出しになる", () => {
  const box = run(
    alert(
      "note",
      el("p", [], [text("拍手はログインなしで押せます\n記事の下の「拍手する」から。")]),
    ),
  );
  const [heading, rest] = box.children as Element[];
  expect(heading!.properties.className).toEqual(["markdown-alert-heading"]);
  expect((heading!.children[0] as Element).properties.className).toEqual(["ico", "ico-alert-note"]);
  expect(plain(heading!)).toBe("拍手はログインなしで押せます");
  expect(plain(rest!)).toBe("記事の下の「拍手する」から。");
});
test("プラグインが出す英語の題名は残さない", () => {
  const box = run(alert("tip", el("p", [], [text("モーニングは11時まで")])));
  expect(JSON.stringify(box)).not.toContain("markdown-alert-title");
  expect(plain(box)).toBe("モーニングは11時まで");
});
test("1 行だけの注意書きは、見出しだけになる", () => {
  const box = run(alert("warning", el("p", [], [text("写真の無断転載はご遠慮ください")])));
  expect(box.children).toHaveLength(1);
});
test("見出しの中の飾りは保ち、改行のあとだけを本文へ回す", () => {
  const box = run(
    alert(
      "important",
      el(
        "p",
        [],
        [
          text("コメントは"),
          el("strong", [], [text("確認してから")]),
          text("表示します\n少し時間がかかります。"),
        ],
      ),
    ),
  );
  const [heading, rest] = box.children as Element[];
  expect(plain(heading!)).toBe("コメントは確認してから表示します");
  expect(JSON.stringify(heading)).toContain('"tagName":"strong"');
  expect(plain(rest!)).toBe("少し時間がかかります。");
});
test("2 つめ以降の段落はそのまま残る", () => {
  const box = run(
    alert("caution", el("p", [], [text("削除キーを忘れずに")]), el("p", [], [text("別の段落")])),
  );
  expect((box.children as Element[]).map(plain)).toEqual(["削除キーを忘れずに", "別の段落"]);
});
test("注意書きの種類は、読み上げ用に日本語の名前で伝える", () => {
  const box = run(alert("caution", el("p", [], [text("本文")])));
  expect(box.properties.role).toBe("note");
  expect(box.properties.ariaLabel).toBe("警告");
});
test("注意書きではない要素には手を付けない", () => {
  const tree: Root = {
    type: "root",
    children: [el("div", ["code-block"], [el("p", [], [text("本文")])])],
  };
  const before = JSON.stringify(tree);
  rehypeAlerts()(tree);
  expect(JSON.stringify(tree)).toBe(before);
});
test("クラスが class の文字列で届いても、題名を見分けて捨てる", () => {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { class: "markdown-alert markdown-alert-note" },
        children: [
          {
            type: "element",
            tagName: "p",
            properties: { class: "markdown-alert-title" },
            children: [text("NOTE")],
          },
          el("p", [], [text("本文")]),
        ],
      },
    ],
  };
  expect(plain(run(tree))).toBe("本文");
});
