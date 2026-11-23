import { z } from "zod";

export const linkURLSchema = z.url().refine((value) => /^https?:\/\//i.test(value));
export const linkEntrySchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("ok"),
    title: z.string().min(1),
    description: z.string().optional(),
    siteName: z.string().optional(),
    fetchedAt: z.iso.datetime(),
  }),
  z.strictObject({
    status: z.literal("error"),
    reason: z.string().min(1),
    fetchedAt: z.iso.datetime(),
  }),
]);
export const linksSchema = z.strictObject({
  version: z.literal(1),
  entries: z.record(linkURLSchema, linkEntrySchema),
});
export type LinkEntry = z.infer<typeof linkEntrySchema>;
export type Links = z.infer<typeof linksSchema>;
