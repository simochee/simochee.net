import { z } from "zod";
import { site } from "../../../../site";
import { requireAdmin } from "../../../../server/admin";
import { addComment } from "../../../../server/comments";
import { database } from "../../../../server/db";
import { fields } from "../../../../server/fields";
import { handler, json, readJson } from "../../../../server/http";
import { publishedPost } from "../../../../server/posts";

export const prerender = false;

export const POST = handler(async (context) => {
  await requireAdmin(context);
  const input = await readJson(
    context.request,
    z.object({
      slug: z.string(),
      title: fields.title,
      body: fields.body,
    }),
  );
  await publishedPost(input.slug, context.url.origin);
  const id = await addComment(await database(), {
    ...input,
    name: site.author.name,
    private: false,
    admin: true,
  });
  return json({ id, private: false }, 201);
});
