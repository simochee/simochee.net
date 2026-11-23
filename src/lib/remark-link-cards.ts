import { dirname } from "node:path";
import type { Paragraph, PhrasingContent, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { cardURL } from "./link-urls";
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
    const targets: { node: Paragraph; url: string }[] = [];
    visit(tree, "paragraph", (node) => {
      const url = cardURL(node, String(file));
      if (url) targets.push({ node, url });
    });
    if (!targets.length) return;
    if (!file.path) throw new Error("リンクカードの記事パスがありません");
    const entries = await linkCardEntries(
      file.path,
      targets.map(({ url }) => url),
      options.ci,
    );
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
