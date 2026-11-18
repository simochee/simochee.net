import { expect, test } from "vitest";
import type { Element, ElementContent } from "hast";
import { hasNoLink } from "../src/lib/heading-links";

const el = (tagName: string, ...children: ElementContent[]): Element => ({
  type: "element",
  tagName,
  properties: {},
  children,
});
const text = (value: string): ElementContent => ({ type: "text", value });

test("文字と装飾だけの見出しは、見出しごとリンクにできる", () => {
  expect(hasNoLink(el("h2", text("朝の"), el("code", text("kissaten"))))).toBe(true);
});

test("リンクを含む見出しは、入れ子の深さにかかわらずリンクにしない", () => {
  expect(hasNoLink(el("h2", el("a", text("公式サイト"))))).toBe(false);
  expect(hasNoLink(el("h3", el("strong", el("a", text("公式サイト")))))).toBe(false);
});
