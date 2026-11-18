import rss from "@astrojs/rss";
import { threads } from "../lib/comment-store";
import { commentAnchor, recentComments } from "../lib/comments";
import { posts } from "../lib/posts";
import { site } from "../site";

export async function GET() {
  const titles = new Map((await posts()).map((post) => [post.id, post.data.title]));
  return rss({
    title: `${site.name}（最新コメント）`,
    description: `${site.name}の記事に付いたコメント`,
    site: `https://${site.domain}`,
    customData: "<language>ja</language>",
    items: recentComments(await threads(), 30).map(({ slug, number, comment }) => ({
      title: `${comment.title} ― ${comment.name}（「${titles.get(slug)}」へのコメント）`,
      link: `/posts/${slug}/#${commentAnchor(number)}`,
      pubDate: comment.at,
      description: comment.body,
    })),
  });
}
