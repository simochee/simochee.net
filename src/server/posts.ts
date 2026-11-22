import { env } from "cloudflare:workers";
import { HttpError } from "./http";

export interface PublishedPost {
  id: string;
  title: string;
}

// Workers は、あるリクエストで作った Promise を別のリクエストで待つことを許さない。読み終えた値だけを覚える。
let cached: Map<string, PublishedPost> | undefined;

/**
 * 公開中の記事。静的ファイルはデプロイごとに Worker と組で入れ替わるので、isolate のあいだは使い回す。
 * dev では記事の編集がすぐ反映されるよう毎回読む。
 *
 * 本番の ASSETS は URL のパスしか見ないが、dev では URL へそのまま取りにいくので、
 * 手元の dev サーバーを指すリクエストの origin を渡す。
 */
export async function publishedPosts(origin: string): Promise<Map<string, PublishedPost>> {
  if (cached) return cached;
  const response = await env.ASSETS.fetch(new URL("/posts.json", origin));
  if (!response.ok) throw new Error(`/posts.json: ${response.status}`);
  const posts = new Map(
    ((await response.json()) as PublishedPost[]).map((post) => [post.id, post]),
  );
  if (!import.meta.env.DEV) cached = posts;
  return posts;
}

export async function publishedPost(slug: string, origin: string) {
  const post = (await publishedPosts(origin)).get(slug);
  if (!post) throw new HttpError(404, "記事が見つかりませんでした。");
  return post;
}
