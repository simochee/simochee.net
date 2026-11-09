import type { APIRoute } from "astro";
import { posts } from "../../lib/posts";
import { ogImage } from "../../lib/og";
export async function getStaticPaths() {
  return (await posts()).map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title, thumbnail: post.data.thumbnailPath },
  }));
}
export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogImage(props.title, props.thumbnail)), {
    headers: { "Content-Type": "image/jpeg" },
  });
