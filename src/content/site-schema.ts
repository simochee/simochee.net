import { z } from "zod";

const text = z
  .string({
    error: (issue) =>
      typeof issue.input === "number" || typeof issue.input === "boolean"
        ? "文字列で書いてください（数値や真偽値に見える値は引用符で囲んでください）"
        : undefined,
  })
  .min(1);
const entries = z.array(z.tuple([text, text]), { error: "マップで書いてください" });
const optionalEntries = entries.nullish().transform((value) => value ?? []);

export const siteContentSchema = z.strictObject({
  author: z.strictObject({ bio: text }),
  links: z.array(z.strictObject({ label: text, href: z.url(), note: text })),
  poll: z.strictObject({ question: text, options: z.array(text).min(2) }),
  profile: z.strictObject({
    facts: entries.min(1, "マップで 1 件以上書いてください"),
    greeting: z.array(text).min(1),
    favorites: optionalEntries,
    notes: z
      .array(text)
      .nullish()
      .transform((value) => value ?? []),
    history: optionalEntries,
  }),
});

export type SiteContent = z.output<typeof siteContentSchema> & {
  poll: z.output<typeof siteContentSchema>["poll"] & { id: string };
};
