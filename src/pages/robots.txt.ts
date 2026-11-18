import type { APIRoute } from "astro";
import { SIMOCHEE_NOINDEX } from "astro:env/server";

// noindex でも Disallow にはしない。クローラーがページを読めないと noindex の meta に気づけず、外部リンクから URL だけが索引に載る。
export const GET: APIRoute = ({ site }) => {
  const sitemap = SIMOCHEE_NOINDEX ? "" : `Sitemap: ${new URL("/sitemap-index.xml", site)}\n`;
  return new Response(`User-agent: *\nAllow: /\n${sitemap}`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
