import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import { resolve } from "node:path";
import { defineConfig, envField } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import remarkAlerts from "remark-github-blockquote-alert";
import externalLinks from "rehype-external-links";
import autolinkHeadings from "rehype-autolink-headings";
import { rehypeAlerts } from "./src/lib/rehype-alerts";
import { rehypeCodeFrame } from "./src/lib/rehype-code-frame";
import { hasNoLink } from "./src/lib/heading-links";
import { resolveContentSource } from "./src/lib/content-source";
import { avatarPlugin } from "./src/lib/avatar-plugin";
import { siteContentPlugin } from "./src/lib/site-content-plugin";
const contentDir = process.env.SIMOCHEE_CONTENT_DIR;
const { postsDir } = resolveContentSource(process.cwd());
export default defineConfig({
  site: process.env.SIMOCHEE_SITE_URL || "https://simochee.net",
  output: "static",
  // アダプターは既定でセッション用の KV を用意する。セッションは使わないので、要らない KV を作らせない。
  session: false,
  adapter: cloudflare({
    // 記事の読み込みは git の履歴を、OGP 画像は sharp を使う。どちらも Node でしか動かないので、事前生成は Node で行う。
    prerenderEnvironment: "node",
    // 画像はビルド時に sharp で最適化して静的ファイルにする。既定の Cloudflare Images は、配信のたびに変換する有料の機能。
    imageService: "compile",
  }),
  cacheDir: "./.astro/",
  trailingSlash: "always",
  env: {
    schema: {
      SIMOCHEE_NOINDEX: envField.boolean({ context: "server", access: "public", default: false }),
      // Cloudflare Web Analytics の計測スクリプトに入れるサイトのトークン。未登録のあいだは計測しない。
      WEB_ANALYTICS_TOKEN: envField.string({ context: "server", access: "public", optional: true }),
      // 未登録のあいだは Cloudflare の試験用の鍵（必ず通る）になる。本番の秘密鍵とは組にならないので、投稿は受け付けられない。
      TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
        default: "1x00000000000000000000AA",
      }),
    },
  },
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.endsWith("/404/") && !page.endsWith("/admin/") }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkAlerts],
      remarkRehype: { footnoteLabel: "脚注", footnoteBackLabel: "本文へ戻る" },
      rehypePlugins: [
        rehypeCodeFrame,
        rehypeAlerts,
        [externalLinks, { target: "_blank", rel: ["noopener"] }],
        // Astro は見出しの id をユーザーのプラグインより後に付ける。autolinkHeadings は id のない見出しを素通しするので、先に付けておく。
        rehypeHeadingIds,
        [
          autolinkHeadings,
          { behavior: "wrap", properties: { className: ["heading-anchor"] }, test: hasNoLink },
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
    plugins: [tailwindcss(), siteContentPlugin(postsDir), avatarPlugin(postsDir)],
    // 既定ではドット絵アイコンのような小さなファイルが data URI として CSS へ埋め込まれ、使わないアイコンまで毎回読み込むことになる。
    build: { assetsInlineLimit: 0 },
    // 既定の許可範囲は site ルートのみで、外部の記事ディレクトリの画像が dev で 403 になる。
    server: { fs: { allow: [process.cwd(), ...(contentDir ? [resolve(contentDir)] : [])] } },
  } as Record<string, unknown>,
});
