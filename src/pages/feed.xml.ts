import rss from "@astrojs/rss";
import { posts } from "../lib/posts";
export async function GET() {
  return rss({
    title: "simochee.net",
    description: "技術と日々の記録",
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
