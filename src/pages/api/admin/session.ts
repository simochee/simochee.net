import { env } from "cloudflare:workers";
import { z } from "zod";
import { isAdmin, logIn, logOut } from "../../../server/admin";
import { clientAddress, handler, json, readJson, throttle } from "../../../server/http";

export const prerender = false;

export const GET = handler(async ({ cookies }) => json({ admin: await isAdmin(cookies) }));

export const POST = handler(async (context) => {
  const { password } = await readJson(context.request, z.object({ password: z.string() }));
  await throttle(env.POST_LIMIT, `login:${clientAddress(context)}`);
  await logIn(context.cookies, password);
  return json({ admin: true });
});

export const DELETE = handler(async ({ cookies }) => {
  logOut(cookies);
  return json({ admin: false });
});
