import { requireAdmin } from "../../../server/admin";
import { handler, json } from "../../../server/http";
import { syncSocial } from "../../../server/social/sync";

export const prerender = false;

/** 定期実行（10 分おき）を待たずに、Bluesky・Mastodon への投稿と返信の取り込みを走らせる。 */
export const POST = handler(async ({ cookies, url }) => {
  await requireAdmin(cookies);
  return json(await syncSocial(url.origin));
});
