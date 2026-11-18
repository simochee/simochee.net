import { expect, test } from "vitest";
import type { Element, Root } from "hast";
import { codeLabel, rehypeCodeFrame } from "../src/lib/rehype-code-frame";

const pre = (properties: Element["properties"]): Element => ({
  type: "element",
  tagName: "pre",
  properties,
  children: [],
});
const tree = (...children: Element[]): Root => ({ type: "root", children });

test("ハイライトされたコードは、言語名を示す見出しつきの枠で包む", () => {
  const root = tree(pre({ dataLanguage: "ts" }));
  rehypeCodeFrame()(root);
  const frame = root.children[0] as Element;
  expect(frame.properties.className).toEqual(["code-block"]);
  expect(JSON.stringify(frame.children[0])).toContain("コード：TypeScript");
  expect((frame.children[1] as Element).tagName).toBe("pre");
});
test("言語のわからない pre は枠で包まない", () => {
  const root = tree(pre({}));
  rehypeCodeFrame()(root);
  expect((root.children[0] as Element).tagName).toBe("pre");
});
test("知らない言語は記事に書かれた名前をそのまま見出しにする", () => {
  expect(codeLabel("gleam")).toBe("gleam");
});
test("言語名は大文字小文字を区別せずに読み替える", () => {
  expect(codeLabel("SH")).toBe("シェル");
});
