import { getCollection } from "astro:content";
import { visibleThreads, type Threads } from "./comments";
import { posts } from "./posts";

let cached: Promise<Threads> | undefined;

/** 公開されている記事に付いたコメント。1 回のビルドのあいだは読み込みを使い回す。 */
export function threads(): Promise<Threads> {
  cached ??= (async () => {
    const [entries, published] = await Promise.all([getCollection("comments"), posts()]);
    return visibleThreads(
      new Map(entries.map((entry) => [entry.id, entry.data.comments])),
      published.filter((post) => post.data.status === "published").map((post) => post.id),
    );
  })();
  return cached;
}
