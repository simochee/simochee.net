import type { Counts } from "../../lib/api";
import { clapCounts } from "../../server/claps";
import { commentCounts } from "../../server/comments";
import { database } from "../../server/db";
import { handler, json } from "../../server/http";
import { publishedPosts } from "../../server/posts";

export const prerender = false;

/** 全記事一覧に一度に並ぶ数より多めにしておく。 */
const maxSlugs = 200;

/**
 * `?slugs=a,b` で頼まれた記事の拍手とコメントの数。
 * 全記事ぶんを返すと、記事とコメントが増えるほど 1 ページごとに読む行が増えるので、ページに出ている記事だけを数える。
 */
export const GET = handler(async ({ url }) => {
  const [db, posts] = await Promise.all([database(), publishedPosts(url.origin)]);
  const slugs = (url.searchParams.get("slugs") ?? "")
    .split(",")
    .filter((slug) => posts.has(slug))
    .slice(0, maxSlugs);
  if (slugs.length === 0) return json({ claps: {}, comments: {} } satisfies Counts);
  const [claps, comments] = await Promise.all([clapCounts(db, slugs), commentCounts(db, slugs)]);
  return json({ claps, comments } satisfies Counts);
});
