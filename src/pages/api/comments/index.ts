import { env } from "cloudflare:workers";
import { z } from "zod";
import type { CommentThread, PostedComment } from "../../../lib/api";
import { limits } from "../../../lib/limits";
import { site } from "../../../site";
import { isAdmin } from "../../../server/admin";
import { addComment, threadOf } from "../../../server/comments";
import { database } from "../../../server/db";
import { fields, optional } from "../../../server/fields";
import { clientAddress, handler, HttpError, json, readJson, throttle } from "../../../server/http";
import { publishedPost } from "../../../server/posts";
import { verifyHuman } from "../../../server/turnstile";

export const prerender = false;

export const GET = handler(async ({ url }) => {
  const slug = url.searchParams.get("slug") ?? "";
  await publishedPost(slug, url.origin);
  return json({ comments: await threadOf(await database(), slug) } satisfies CommentThread);
});

const schema = z.object({
  slug: z.string(),
  name: fields.name,
  title: fields.title,
  email: fields.email,
  url: fields.url,
  body: fields.body,
  password: optional(
    z.string().max(limits.password, `パスワードは ${limits.password} 文字までにしてください。`),
  ),
  private: z.boolean().default(false),
  turnstile: fields.turnstile,
});

export const POST = handler(async (context) => {
  const input = await readJson(context.request, schema);
  await publishedPost(input.slug, context.url.origin);
  const address = clientAddress(context);
  await throttle(env.POST_LIMIT, `comment:${address}`);
  // 管理人の名前で書けるのは、管理画面でログインしている管理人だけにする。なりすましの返信を防ぐ。
  if (input.name === site.author.name && !(await isAdmin(context.cookies)))
    throw new HttpError(403, `「${site.author.name}」は管理人の名前なので使えません。`);
  await verifyHuman(input.turnstile, address);
  const id = await addComment(await database(), input);
  return json({ id, private: input.private } satisfies PostedComment, 201);
});
