import type { Counts } from "../../lib/api";
import { clapCounts } from "../../server/claps";
import { commentCounts } from "../../server/comments";
import { database } from "../../server/db";
import { handler, json } from "../../server/http";
import { publishedPosts } from "../../server/posts";

export const prerender = false;

/** 一覧に並ぶ記事の拍手とコメントの数。ページごとに 1 回で全記事ぶんを返す。 */
export const GET = handler(async ({ url }) => {
  const [db, posts] = await Promise.all([database(), publishedPosts(url.origin)]);
  const slugs = [...posts.keys()];
  const [claps, comments] = await Promise.all([clapCounts(db, slugs), commentCounts(db, slugs)]);
  return json({ claps, comments } satisfies Counts);
});
