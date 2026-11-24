import type { Link, Paragraph, Root } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { SKIP, visit } from "unist-util-visit";

export function bareLinkURL(link: Link, source: string): string | undefined {
  if (link.children.length !== 1) return;
  const label = link.children[0];
  if (label.type !== "text" || !URL.canParse(link.url)) return;
  if (!/^https?:\/\//i.test(link.url)) return;
  const start = link.position?.start.offset;
  const end = link.position?.end.offset;
  if (start === undefined || end === undefined) return;
  const literal = source.slice(start, end);
  // Astro はこの判定より先にスマート引用符へ変換するので、表示テキストではなく原文で裸の URL を確かめる。
  if (literal !== link.url && literal !== `<${link.url}>`) return;
  return link.url;
}

function cardURL(node: Paragraph, source: string): string | undefined {
  if (node.children.length !== 1) return;
  const link = node.children[0];
  return link.type === "link" ? bareLinkURL(link, source) : undefined;
}

export function cardParagraphs(tree: Root, source: string): { node: Paragraph; url: string }[] {
  const found: { node: Paragraph; url: string }[] = [];
  visit(tree, (node) => {
    if (node.type === "list") return SKIP;
    if (node.type !== "paragraph") return;
    const url = cardURL(node, source);
    if (url) found.push({ node, url });
  });
  return found;
}

export function cardURLs(body: string, mdx = false): string[] {
  const parser = unified().use(remarkParse).use(remarkGfm);
  if (mdx) parser.use(remarkMdx);
  return [...new Set(cardParagraphs(parser.parse(body), body).map(({ url }) => url))].sort();
}

export function bareURLs(body: string, mdx = false): string[] {
  const parser = unified().use(remarkParse).use(remarkGfm);
  if (mdx) parser.use(remarkMdx);
  const found = new Set<string>();
  visit(parser.parse(body), "link", (node) => {
    const url = bareLinkURL(node, body);
    if (url) found.add(url);
  });
  return [...found].sort();
}
