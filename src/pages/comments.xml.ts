import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { commentAnchor } from "../lib/comments";
import { site } from "../site";
import { recentComments } from "../server/comments";
import { database } from "../server/db";
import { publishedPosts } from "../server/posts";

// コメントは書かれたらすぐ配信したいので、ビルド時ではなく読まれたときに作る。
export const prerender = false;

export async function GET(context: APIContext) {
  const [db, posts] = await Promise.all([database(), publishedPosts(context.url.origin)]);
  const feed = await rss({
    title: `${site.name}（最新コメント）`,
    description: `${site.name}の記事に付いたコメント`,
    site: context.site!,
    customData: "<language>ja</language>",
    items: (await recentComments(db, posts.keys(), 30)).map(
      ({ slug, number, title, name, body, at }) => ({
        title: `${title} ― ${name}（「${posts.get(slug)!.title}」へのコメント）`,
        link: `/posts/${slug}/#${commentAnchor(number)}`,
        pubDate: new Date(at),
        description: body,
      }),
    ),
  });
  feed.headers.set("Cache-Control", "public, max-age=300");
  return feed;
}
