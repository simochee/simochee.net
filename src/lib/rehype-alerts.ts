import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

/** 読み上げで注意書きの種類を伝える名前。画面には出ない。 */
export const alertLabels: Record<string, string> = {
  note: "メモ",
  tip: "ヒント",
  important: "重要",
  warning: "注意",
  caution: "警告",
};
/** remark のプラグインが付けたクラスは、className の配列ではなく class の文字列で届くことがある。 */
function classes(node: Element): string[] {
  return [node.properties.className, node.properties.class].flatMap((value) =>
    Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/\s+/) : [],
  );
}
const paragraph = (className: string[], children: ElementContent[]): Element => ({
  type: "element",
  tagName: "p",
  properties: className.length ? { className } : {},
  children,
});

/** 段落の中身を、最初の改行の前と後に分ける。 */
function splitAtFirstBreak(children: ElementContent[]): [ElementContent[], ElementContent[]] {
  for (const [index, child] of children.entries()) {
    if (child.type === "element" && child.tagName === "br")
      return [children.slice(0, index), children.slice(index + 1)];
    if (child.type !== "text" || !child.value.includes("\n")) continue;
    const at = child.value.indexOf("\n");
    const before = child.value.slice(0, at);
    const after = child.value.slice(at + 1);
    return [
      [...children.slice(0, index), ...(before ? [{ type: "text" as const, value: before }] : [])],
      [...(after ? [{ type: "text" as const, value: after }] : []), ...children.slice(index + 1)],
    ];
  }
  return [children, []];
}

/**
 * GitHub 形式の注意書きを、デザインの形に組み替える。
 * プラグインが出す英語の題名（NOTE など）を捨て、本文の 1 行目をアイコンつきの見出しにする。
 */
export function rehypeAlerts() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      const kind = classes(node)
        .find((name) => name.startsWith("markdown-alert-") && name !== "markdown-alert-title")
        ?.slice("markdown-alert-".length);
      if (node.tagName !== "div" || !kind || !(kind in alertLabels)) return;
      const body = node.children.filter(
        (child) => !(child.type === "element" && classes(child).includes("markdown-alert-title")),
      );
      const first = body.findIndex((child) => child.type === "element" && child.tagName === "p");
      const icon: Element = {
        type: "element",
        tagName: "span",
        properties: { className: ["ico", `ico-alert-${kind}`], ariaHidden: "true" },
        children: [],
      };
      if (first >= 0) {
        const [heading, rest] = splitAtFirstBreak((body[first] as Element).children);
        body.splice(
          first,
          1,
          paragraph(["markdown-alert-heading"], [icon, ...heading]),
          ...(rest.length ? [paragraph([], rest)] : []),
        );
      }
      node.properties = {
        className: ["markdown-alert", `markdown-alert-${kind}`],
        role: "note",
        ariaLabel: alertLabels[kind],
      };
      node.children = body;
      return "skip";
    });
  };
}
