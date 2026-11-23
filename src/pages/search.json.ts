import { posts } from "../lib/posts";
import { plainText } from "../lib/posts-loader";
import type { SearchEntry } from "../lib/search";

export async function GET() {
  const entries: SearchEntry[] = (await posts()).map((post) => ({
    id: post.id,
    title: post.data.title,
    type: post.data.type,
    publishedAt: post.data.publishedAt.toISOString(),
    text: plainText(post.body ?? "", post.filePath?.endsWith(".mdx") ?? false),
  }));
  return Response.json(entries);
}
