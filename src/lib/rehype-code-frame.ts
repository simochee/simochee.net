import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const labels: Record<string, string> = {
  astro: "Astro",
  bash: "シェル",
  css: "CSS",
  diff: "差分",
  html: "HTML",
  js: "JavaScript",
  javascript: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  md: "Markdown",
  mdx: "MDX",
  plaintext: "テキスト",
  sh: "シェル",
  shell: "シェル",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  yaml: "YAML",
  zsh: "シェル",
};
export const codeLabel = (language: string) => labels[language.toLowerCase()] ?? language;

export function rehypeCodeFrame() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      const language = node.properties.dataLanguage;
      if (node.tagName !== "pre" || typeof language !== "string") return;
      if (!parent || index === undefined) return;
      const frame: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["code-head"] },
            children: [
              {
                type: "element",
                tagName: "span",
                properties: {},
                children: [{ type: "text", value: `コード：${codeLabel(language)}` }],
              },
            ],
          },
          node,
        ],
      };
      parent.children[index] = frame;
      return "skip";
    });
  };
}
