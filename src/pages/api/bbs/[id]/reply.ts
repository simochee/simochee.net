import { z } from "zod";
import { limits } from "../../../../lib/limits";
import { requireAdmin } from "../../../../server/admin";
import { replyToBbsPost } from "../../../../server/bbs";
import { database } from "../../../../server/db";
import { optional } from "../../../../server/fields";
import { handler, json, parseId, readJson } from "../../../../server/http";

export const prerender = false;

const schema = z.object({
  reply: optional(
    z.string().trim().max(limits.body, `返信は ${limits.body} 文字までにしてください。`),
  ),
});

/** 管理人の返信。空で送ると返信を取り下げる。 */
export const PUT = handler(async (context) => {
  const id = parseId(context.params.id);
  await requireAdmin(context.cookies);
  const { reply } = await readJson(context.request, schema);
  await replyToBbsPost(await database(), id, reply);
  return json({ ok: true });
});
