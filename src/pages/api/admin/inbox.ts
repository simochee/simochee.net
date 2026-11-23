import type { AdminInbox } from "../../../lib/api";
import { requireAdmin } from "../../../server/admin";
import { bbsInbox } from "../../../server/bbs";
import { inboxComments } from "../../../server/comments";
import { database } from "../../../server/db";
import { handler, json } from "../../../server/http";
import { publishedPosts } from "../../../server/posts";

export const prerender = false;

/** 管理画面で見る、新しいコメントと掲示板の書き込み。非公開のものも含む。 */
export const GET = handler(async (context) => {
  await requireAdmin(context);
  const [db, posts] = await Promise.all([database(), publishedPosts(context.url.origin)]);
  const [comments, bbs] = await Promise.all([inboxComments(db, 50), bbsInbox(db, 50)]);
  return json({
    comments: comments.map((comment) => ({
      ...comment,
      postTitle: posts.get(comment.slug)?.title ?? null,
    })),
    bbs,
    posts: [...posts.values()].map(({ id, title }) => ({ slug: id, title })),
  } satisfies AdminInbox);
});
