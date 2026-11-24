import type { APIRoute } from "astro";
import { formatDay } from "../../lib/dates";
import { posts } from "../../lib/posts";
import { ogImage } from "../../lib/og";
export async function getStaticPaths() {
  return (await posts()).map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      date: formatDay(post.data.publishedAt),
      thumbnail: post.data.thumbnailPath,
    },
  }));
}
export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogImage(props)), {
    headers: { "Content-Type": "image/jpeg" },
  });
