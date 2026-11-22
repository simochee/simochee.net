import type { PublishedPost } from "../server/posts";
import { posts } from "../lib/posts";

/** サーバー側のルートが記事を知るための一覧。記事の本文を Worker に抱えさせないよう、静的ファイルとして渡す。 */
export async function GET() {
  return Response.json(
    (await posts())
      .filter((post) => post.data.status === "published")
      .map((post): PublishedPost => ({ id: post.id, title: post.data.title })),
  );
}
