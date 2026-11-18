import type { Element, ElementContent } from "hast";

/** 見出しの中にリンクがあると、見出し全体をリンクで包めない（a の入れ子は HTML として不正）。 */
export function hasNoLink(heading: Element): boolean {
  const containsLink = (node: ElementContent): boolean =>
    node.type === "element" && (node.tagName === "a" || node.children.some(containsLink));
  return !heading.children.some(containsLink);
}
