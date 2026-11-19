import { env } from "cloudflare:workers";
import { z } from "zod";
import { isAdmin } from "../../../server/admin";
import { editComment, removeComment } from "../../../server/comments";
import { database } from "../../../server/db";
import { fields } from "../../../server/fields";
import { clientAddress, handler, json, parseId, readJson, throttle } from "../../../server/http";

export const prerender = false;

const password = z.string().optional();

export const PATCH = handler(async (context) => {
  const id = parseId(context.params.id);
  const change = await readJson(
    context.request,
    z.object({ password, title: fields.title, body: fields.body }),
  );
  await throttle(env.ACTION_LIMIT, `comment-edit:${clientAddress(context)}`);
  await editComment(await database(), id, { ...change, admin: await isAdmin(context.cookies) });
  return json({ ok: true });
});

export const DELETE = handler(async (context) => {
  const id = parseId(context.params.id);
  const { password: given } = await readJson(context.request, z.object({ password }));
  await throttle(env.ACTION_LIMIT, `comment-edit:${clientAddress(context)}`);
  await removeComment(await database(), id, {
    password: given,
    admin: await isAdmin(context.cookies),
  });
  return json({ ok: true });
});
