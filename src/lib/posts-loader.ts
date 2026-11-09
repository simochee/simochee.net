import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import matter from "gray-matter";
import { parse } from "yaml";
import { glob, type Loader } from "astro/loaders";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import { frontmatterSchema } from "../content/schema";
import { resolveContentSource } from "./content-source";
import { isCI, readHistory, resolveDates, type History } from "./git-dates";

export function excerpt(body: string): string {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(body);
  const text: string[] = [];
  visit(tree, (node) => {
    if (node.type === "text" || node.type === "inlineCode") text.push(node.value);
  });
  return text.join(" ").replace(/\s+/g, " ").trim().slice(0, 160);
}
export function includeDrafts(command: string, env: NodeJS.ProcessEnv = process.env) {
  return command === "dev" && !isCI(env) && env.SIMOCHEE_INCLUDE_DRAFTS === "1";
}
export function postsLoader(): Loader {
  return {
    name: "published-posts",
    async load(context) {
      const root = fileURLToPath(context.config.root);
      const source = resolveContentSource(root);
      const base = source.postsDir;
      async function sync() {
        context.store.clear();
        const history = source.git
          ? readHistory(source.git.root, source.git.path)
          : new Map<string, History>();
        const selected: string[] = [];
        const metadata = new Map<string, Record<string, unknown>>();
        for (const dir of await readdir(base, { withFileTypes: true })) {
          if (!dir.isDirectory()) continue;
          const files = await readdir(resolve(base, dir.name));
          const indexes = files.filter((name) => /^index\.mdx?$/.test(name));
          if (!indexes.length) continue;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dir.name))
            throw new Error(`不正な slug: ${dir.name}`);
          if (indexes.length > 1)
            throw new Error(`index.md と index.mdx は併用できません: ${dir.name}`);
          const file = `${dir.name}/${indexes[0]}`;
          const raw = await readFile(resolve(base, file), "utf8");
          const { data, content } = matter(raw, { engines: { yaml: (source) => parse(source) } });
          const frontmatter = frontmatterSchema.parse(data);
          const thumbnails = files.filter((name) => /^thumbnail\.(png|jpe?g|webp)$/.test(name));
          if (thumbnails.length > 1)
            throw new Error(`thumbnail は1枚だけ指定できます: ${dir.name}`);
          if (
            frontmatter.status === "draft" &&
            !includeDrafts(import.meta.env.DEV ? "dev" : "build")
          )
            continue;
          selected.push(file);
          metadata.set(dir.name, {
            ...frontmatter,
            description: frontmatter.description ?? excerpt(content),
            ...resolveDates(frontmatter, history.get(dir.name)),
            thumbnail: thumbnails[0] ? `./${thumbnails[0]}` : undefined,
            thumbnailPath: thumbnails[0] ? resolve(base, dir.name, thumbnails[0]) : undefined,
          });
        }
        if (!selected.length) return;
        // Astro の MDX と相対画像処理を再利用し、下書きは glob に渡す前に除外する。
        await glob({
          pattern: selected,
          base,
          generateId: ({ entry }) => entry.split("/")[0],
        }).load({
          ...context,
          watcher: undefined,
          parseData: (options) =>
            context.parseData({
              ...options,
              data: { ...options.data, ...metadata.get(options.id) },
            }),
        });
      }
      await sync();
      if (context.watcher) {
        let queue = Promise.resolve();
        const reload = (path: string) => {
          if (!resolve(path).startsWith(`${base}/`)) return;
          queue = queue.then(sync).catch((error: unknown) => context.logger.error(String(error)));
        };
        context.watcher.add(base);
        context.watcher.on("add", reload).on("change", reload).on("unlink", reload);
      }
    },
  };
}
