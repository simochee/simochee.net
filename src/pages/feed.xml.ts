import rss from "@astrojs/rss";
import { posts } from "../lib/posts";
import { site } from "../site";
export async function GET() {
  return rss({
    title: site.name,
    description: site.description,
    site: "https://simochee.net",
    customData: "<language>ja</language>",
    items: (await posts())
      .filter((post) => post.data.status === "published")
      .map((post) => ({
        title: post.data.title,
        link: `/posts/${post.id}/`,
        pubDate: post.data.publishedAt,
        description: post.data.description,
      })),
  });
}
