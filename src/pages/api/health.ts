import type { APIRoute } from "astro";

// このサイトは基本すべて事前生成する。サーバーで動かすルートだけが、こうして個別に外れる。
export const prerender = false;

/** サーバー側のルートが Worker に届いていることを確かめるための口。 */
export const GET: APIRoute = () =>
  Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
