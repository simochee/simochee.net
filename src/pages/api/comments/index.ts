import { env } from "cloudflare:workers";
import { z } from "zod";
import type { CommentThread, PostedComment } from "../../../lib/api";
import { limits } from "../../../lib/limits";
import { guardAuthorName } from "../../../server/admin";
import { addComment, threadOf } from "../../../server/comments";
import { database } from "../../../server/db";
import { fields, optional } from "../../../server/fields";
import { clientAddress, handler, json, readJson, throttle } from "../../../server/http";
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
  await guardAuthorName(context.cookies, input.name);
  await verifyHuman(input.turnstile, address);
  const id = await addComment(await database(), input);
  return json({ id, private: input.private } satisfies PostedComment, 201);
});
