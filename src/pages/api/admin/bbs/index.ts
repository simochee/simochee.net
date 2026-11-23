import { z } from "zod";
import { site } from "../../../../site";
import { requireAdmin } from "../../../../server/admin";
import { addBbsPost } from "../../../../server/bbs";
import { database } from "../../../../server/db";
import { fields } from "../../../../server/fields";
import { handler, json, readJson } from "../../../../server/http";

export const prerender = false;

export const POST = handler(async (context) => {
  await requireAdmin(context);
  const input = await readJson(
    context.request,
    z.object({
      title: fields.title,
      body: fields.body,
      colorId: fields.inkColor,
      url: fields.url,
    }),
  );
  return json(
    {
      id: await addBbsPost(await database(), {
        ...input,
        name: site.author.name,
        admin: true,
      }),
    },
    201,
  );
});
