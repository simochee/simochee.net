import type { APIRoute } from "astro";
import { ogImage } from "../lib/og";
import { site } from "../site";
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await ogImage({ title: site.tagline })), {
    headers: { "Content-Type": "image/jpeg" },
  });
