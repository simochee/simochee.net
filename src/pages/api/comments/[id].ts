import { env } from "cloudflare:workers";
import { z } from "zod";
import { limits } from "../../../lib/limits";
import { removeComment } from "../../../server/comments";
import { database } from "../../../server/db";
import { clientAddress, handler, json, parseId, readJson, throttle } from "../../../server/http";

export const prerender = false;

export const DELETE = handler(async (context) => {
  const id = parseId(context.params.id);
  const { password } = await readJson(
    context.request,
    z.object({ password: z.string().max(limits.password).optional() }),
  );
  await throttle(env.ACTION_LIMIT, `comment-delete:${clientAddress(context)}`);
  await removeComment(await database(), id, { password, admin: false });
  return json({ ok: true });
});
