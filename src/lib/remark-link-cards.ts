import { dirname } from "node:path";
import type { Link, Parents, PhrasingContent, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { bareLinkURL, cardParagraphs } from "./link-urls";
import { readLinks } from "./link-cache";
import { isCI } from "./git-dates";

const span = (className: string, children: PhrasingContent[]): PhrasingContent => ({
  type: "emphasis",
  data: { hName: "span", hProperties: { className: [className] } },
  children,
});
const text = (value: string): PhrasingContent => ({ type: "text", value });

function readablePath(url: URL): string {
  const path = url.pathname + url.search + url.hash;
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

const errorTitle = (href: string, host: string) => {
  const path = readablePath(new URL(href));
  return path === "/" ? host : path;
};

export async function linkCardEntries(path: string, urls: string[], ci = isCI()) {
  const { entries } = await readLinks(dirname(path));
  for (const url of urls) {
    if (entries[url]) continue;
    const message = `リンクカードが未取得です: ${path}\n${url}\nvp run unfurl を実行し、links.json を保存してください。`;
    if (ci) throw new Error(message);
    console.warn(message);
  }
  return entries;
}

export const remarkLinkCards: Plugin<[{ ci?: boolean }?], Root> = (options = {}) => {
  return async (tree, file) => {
    const targets = cardParagraphs(tree, String(file));
    const cardLinks = new Set(targets.map(({ node }) => node.children[0]));
    const mentions: { node: Link; parent: Parents; url: string }[] = [];
    visit(tree, "link", (node, _index, parent) => {
      const url = bareLinkURL(node, String(file));
      if (url && parent && !cardLinks.has(node)) mentions.push({ node, parent, url });
    });
    if (!targets.length && !mentions.length) return;
    if (!file.path) throw new Error("リンクカードの記事パスがありません");
    const entries = await linkCardEntries(
      file.path,
      [...new Set([...targets, ...mentions].map(({ url }) => url))],
      options.ci,
    );
    // 同じ親に複数あっても挿入で添字がずれないよう、後ろの出現から処理する。
    for (const { node, parent, url } of mentions.reverse()) {
      const entry = entries[url];
      if (entry?.status !== "ok") continue;
      node.children = [text(entry.title)];
      const host = new URL(url).hostname.replace(/^www\./, "");
      const index = (parent.children as PhrasingContent[]).indexOf(node);
      (parent.children as PhrasingContent[]).splice(
        index + 1,
        0,
        text(" "),
        span("link-mention-host", [text(`(${host})`)]),
      );
    }
    for (const { node, url } of targets) {
      const entry = entries[url];
      if (!entry) continue;
      const host = new URL(url).hostname.replace(/^www\./, "");
      const [title, description] =
        entry.status === "ok"
          ? [entry.title, entry.description]
          : [errorTitle(url, host), undefined];
      const children: PhrasingContent[] = [
        span("link-card-bar", [span("link-card-label", []), span("link-card-host", [text(host)])]),
        span("link-card-body", [
          span("link-card-title", [text(title)]),
          ...(description ? [span("link-card-description", [text(description)])] : []),
          span("link-card-go", []),
        ]),
      ];
      node.data = { hName: "a", hProperties: { className: ["link-card"], href: url } };
      node.children = children;
    }
  };
};
