import { z } from "zod";

export const services = { bsky: "Bluesky", mastodon: "Mastodon" } as const;
export type Service = keyof typeof services;

export const commentSchema = z.strictObject({
  title: z.string().trim().min(1),
  name: z.string().trim().min(1),
  // YAML は引用符のない日時を Date として読むので、文字列と両方を受ける。
  at: z.union([z.date(), z.iso.datetime({ offset: true }).transform((value) => new Date(value))]),
  body: z.string().trim().min(1),
  via: z.enum(Object.keys(services) as [Service, ...Service[]]).optional(),
  url: z.url({ protocol: /^https?$/ }).optional(),
});
export const threadSchema = z.strictObject({ comments: z.array(commentSchema) });
export type Comment = z.infer<typeof commentSchema>;
