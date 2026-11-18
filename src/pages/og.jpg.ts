import type { APIRoute } from "astro";
import { ogImage } from "../lib/og";
import { site } from "../site";
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await ogImage(site.name)), {
    headers: { "Content-Type": "image/jpeg" },
  });
