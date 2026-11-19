import { env } from "cloudflare:workers";
import { z } from "zod";
import type { BbsPage } from "../../../lib/api";
import { bbsPageSize } from "../../../lib/bbs";
import { site } from "../../../site";
import { isAdmin } from "../../../server/admin";
import { addBbsPost, bbsPage } from "../../../server/bbs";
import { database } from "../../../server/db";
import { fields } from "../../../server/fields";
import { clientAddress, handler, HttpError, json, readJson, throttle } from "../../../server/http";
import { verifyHuman } from "../../../server/turnstile";

export const prerender = false;

export const GET = handler(async ({ url }) => {
  const page = Number(url.searchParams.get("page") ?? 1);
  return json(
    (await bbsPage(
      await database(),
      Number.isSafeInteger(page) ? page : 1,
      bbsPageSize,
    )) satisfies BbsPage,
  );
});

const schema = z.object({
  name: fields.name,
  email: fields.email,
  url: fields.url,
  title: fields.title,
  body: fields.body,
  color: fields.inkColor,
  key: fields.deleteKey,
  turnstile: fields.turnstile,
});

export const POST = handler(async (context) => {
  const input = await readJson(context.request, schema);
  const address = clientAddress(context);
  await throttle(env.POST_LIMIT, `bbs:${address}`);
  if (input.name === site.author.name && !(await isAdmin(context.cookies)))
    throw new HttpError(403, `「${site.author.name}」は管理人の名前なので使えません。`);
  await verifyHuman(input.turnstile, address);
  return json({ id: await addBbsPost(await database(), input) }, 201);
});
