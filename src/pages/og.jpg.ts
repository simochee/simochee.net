import type { APIRoute } from "astro";
import { ogImage } from "../lib/og";
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await ogImage("simochee.net — 技術と日々の記録")), {
    headers: { "Content-Type": "image/jpeg" },
  });
