import { env } from "cloudflare:workers";
import { z } from "zod";
import { clap } from "../../server/claps";
import { database } from "../../server/db";
import { clientAddress, handler, json, readJson, throttle } from "../../server/http";
import { publishedPost } from "../../server/posts";

export const prerender = false;

export const POST = handler(async (context) => {
  const { slug } = await readJson(context.request, z.object({ slug: z.string() }));
  await publishedPost(slug, context.url.origin);
  await throttle(env.ACTION_LIMIT, `clap:${clientAddress(context)}`);
  return json({ count: await clap(await database(), slug) });
});
