import { requireAdmin } from "../../../../../server/admin";
import { removeBbsPost } from "../../../../../server/bbs";
import { database } from "../../../../../server/db";
import { handler, json, parseId } from "../../../../../server/http";

export const prerender = false;

export const DELETE = handler(async (context) => {
  await requireAdmin(context);
  await removeBbsPost(await database(), parseId(context.params.id), { admin: true });
  return json({ ok: true });
});
