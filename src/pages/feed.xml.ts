import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { postPath } from "../lib/archive";
import { posts } from "../lib/posts";
import { site } from "../site";
export async function GET(context: APIContext) {
  return rss({
    title: site.name,
    description: site.description,
    site: context.site!,
    customData: "<language>ja</language>",
    items: (await posts())
      .filter((post) => post.data.status === "published")
      .map((post) => ({
        title: post.data.title,
        link: postPath(post.id),
        pubDate: post.data.publishedAt,
        description: post.data.description,
      })),
  });
}
