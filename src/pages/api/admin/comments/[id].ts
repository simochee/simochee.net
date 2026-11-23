import { requireAdmin } from "../../../../server/admin";
import { removeComment } from "../../../../server/comments";
import { database } from "../../../../server/db";
import { handler, json, parseId } from "../../../../server/http";

export const prerender = false;

export const DELETE = handler(async (context) => {
  await requireAdmin(context);
  await removeComment(await database(), parseId(context.params.id), { admin: true });
  return json({ ok: true });
});
