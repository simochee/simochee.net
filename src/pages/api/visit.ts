import { env } from "cloudflare:workers";
import { z } from "zod";
import { database } from "../../server/db";
import { clientAddress, handler, json, readJson, throttle } from "../../server/http";
import { publishedPosts } from "../../server/posts";
import { recordVisit } from "../../server/stats";
import { visitorOf } from "../../server/visitor";

export const prerender = false;

const schema = z.object({ slug: z.string().optional(), first: z.boolean().default(false) });

/** ページを開いたことの知らせ。アクセスカウンター・閲覧者数・人気記事をまとめて数え、いまの値を返す。 */
export const POST = handler(async (context) => {
  const { slug, first } = await readJson(context.request, schema);
  // 1 回で数行を書き込むので、続けて送られると D1 の書き込みの枠を使い切り、閲覧者数や人気記事も水増しされる。
  await throttle(env.ACTION_LIMIT, `visit:${clientAddress(context)}`);
  const [db, posts] = await Promise.all([database(), publishedPosts(context.url.origin)]);
  const result = await recordVisit(db, {
    visitor: visitorOf(context.cookies),
    slug: slug && posts.has(slug) ? slug : undefined,
    first,
  });
  return json(result);
});
