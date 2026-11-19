import { env } from "cloudflare:workers";
import { z } from "zod";
import { isAdmin } from "../../../../server/admin";
import { editBbsPost, removeBbsPost } from "../../../../server/bbs";
import { database } from "../../../../server/db";
import { fields } from "../../../../server/fields";
import { clientAddress, handler, json, parseId, readJson, throttle } from "../../../../server/http";

export const prerender = false;

const key = z.string().optional();

export const PATCH = handler(async (context) => {
  const id = parseId(context.params.id);
  const change = await readJson(
    context.request,
    z.object({ key, title: fields.title, body: fields.body, color: fields.inkColor }),
  );
  await throttle(env.ACTION_LIMIT, `bbs-edit:${clientAddress(context)}`);
  await editBbsPost(await database(), id, { ...change, admin: await isAdmin(context.cookies) });
  return json({ ok: true });
});

export const DELETE = handler(async (context) => {
  const id = parseId(context.params.id);
  const { key: given } = await readJson(context.request, z.object({ key }));
  await throttle(env.ACTION_LIMIT, `bbs-edit:${clientAddress(context)}`);
  await removeBbsPost(await database(), id, { key: given, admin: await isAdmin(context.cookies) });
  return json({ ok: true });
});
