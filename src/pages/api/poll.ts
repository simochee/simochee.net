import { env } from "cloudflare:workers";
import type { AstroCookies } from "astro";
import { z } from "zod";
import type { PollResponse } from "../../lib/api";
import { site } from "../../site";
import { database } from "../../server/db";
import { clientAddress, handler, HttpError, json, readJson, throttle } from "../../server/http";
import { pollResult, vote } from "../../server/poll";
import { visitorOf } from "../../server/visitor";

export const prerender = false;

const { poll } = site;

async function result(cookies: AstroCookies) {
  const counted = await pollResult(
    await database(),
    poll.id,
    poll.options.length,
    visitorOf(cookies),
  );
  return json({ poll: poll.id, ...counted } satisfies PollResponse);
}

export const GET = handler(async ({ cookies }) => result(cookies));

export const POST = handler(async (context) => {
  const { poll: id, choice } = await readJson(
    context.request,
    z.object({
      poll: z.string(),
      choice: z
        .number()
        .int()
        .min(0)
        .max(poll.options.length - 1),
    }),
  );
  if (id !== poll.id)
    throw new HttpError(409, "アンケートが新しくなりました。ページを読み込みなおしてください。");
  await throttle(env.ACTION_LIMIT, `poll:${clientAddress(context)}`);
  await vote(await database(), poll.id, visitorOf(context.cookies), choice);
  return result(context.cookies);
});
