import type { CalendarPost } from "../lib/archive";
import { posts } from "../lib/posts";

export async function GET() {
  return Response.json(
    (await posts()).map((post): CalendarPost => ({
      id: post.id,
      title: post.data.title,
      publishedAt: post.data.publishedAt.toISOString(),
    })),
  );
}
