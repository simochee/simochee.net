import type { SidebarData } from "../../lib/api";
import { latestBbsPosts } from "../../server/bbs";
import { recentComments } from "../../server/comments";
import { database } from "../../server/db";
import { handler, json } from "../../server/http";
import { publishedPosts } from "../../server/posts";
import { analyticsSource } from "../../server/analytics-source";
import { currentViewers, dailyVisits, popularPosts, visitorTotal } from "../../server/stats";

export const prerender = false;

/** サイドバーの、書き込みや閲覧で変わる区画。サイドバーはページ遷移で残るので、読むのは最初の 1 回だけ。 */
export const GET = handler(async ({ url }) => {
  const [db, posts] = await Promise.all([database(), publishedPosts(url.origin)]);
  const slugs = [...posts.keys()];
  const [popular, comments, board, total, visits, viewers] = await Promise.all([
    popularPosts(db, slugs, 5),
    recentComments(db, slugs, 5),
    latestBbsPosts(db, 2),
    visitorTotal(db),
    dailyVisits(db),
    // Web Analytics に問い合わせられなくても、ほかの区画は出す。
    currentViewers(db, analyticsSource()).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
  ]);
  const titleOf = (slug: string) => posts.get(slug)!.title;
  return json({
    popular: popular.map(({ slug }) => ({ slug, title: titleOf(slug) })),
    comments: comments.map((comment) => ({ ...comment, postTitle: titleOf(comment.slug) })),
    board,
    total,
    dailyVisits: visits,
    viewers,
  } satisfies SidebarData);
});
