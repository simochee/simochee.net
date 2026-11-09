import { unified } from "@astrojs/markdown-remark";
import { resolve } from "node:path";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import remarkAlerts from "remark-github-blockquote-alert";
import externalLinks from "rehype-external-links";
import autolinkHeadings from "rehype-autolink-headings";
const contentDir = process.env.SIMOCHEE_CONTENT_DIR;
export default defineConfig({
  site: "https://simochee.net",
  output: "static",
  cacheDir: "./.astro/",
  trailingSlash: "always",
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith("/404/") })],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkAlerts],
      rehypePlugins: [
        [externalLinks, { target: "_blank", rel: ["noopener"] }],
        [
          autolinkHeadings,
          {
            behavior: "append",
            properties: { className: ["heading-anchor"], ariaLabel: "この見出しへのリンク" },
            content: { type: "text", value: " #" },
          },
        ],
      ],
    }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
      ],
    },
  },
  // vite.config.ts は Vite+ 用で、Astro の Vite に読み込ませると衝突する。型定義に configFile がないため断言で渡す。
  vite: {
    configFile: false,
    // 既定の許可範囲は site ルートのみで、外部の記事ディレクトリの画像が dev で 403 になる。
    server: { fs: { allow: [process.cwd(), ...(contentDir ? [resolve(contentDir)] : [])] } },
  } as Record<string, unknown>,
});
