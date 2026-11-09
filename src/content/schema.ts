import { z } from "zod";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const datePattern =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/;
export const dateValue = z
  .string()
  .regex(datePattern)
  .refine((value) => {
    if (dateOnly.test(value)) {
      const parsed = new Date(`${value}T00:00:00+09:00`);
      return (
        Number.isFinite(parsed.getTime()) &&
        new Date(parsed.getTime() + 9 * 3600000).toISOString().slice(0, 10) === value
      );
    }
    return (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      Number.isFinite(Date.parse(value))
    );
  }, "YYYY-MM-DD またはオフセット付き ISO 8601 を指定してください");

export const frontmatterSchema = z.strictObject({
  title: z.string().trim().min(1),
  status: z.enum(["draft", "published"]),
  type: z.enum(["tech", "personal"]),
  tags: z
    .array(z.string().trim().min(1))
    .default([])
    .refine((tags) => new Set(tags).size === tags.length, "タグは重複できません"),
  description: z.string().optional(),
  date: dateValue.optional(),
  updated: dateValue.optional(),
});
export type Frontmatter = z.infer<typeof frontmatterSchema>;
export function parseDate(value: string): Date {
  return new Date(dateOnly.test(value) ? `${value}T00:00:00+09:00` : value);
}
export function frontmatterJSONSchema() {
  const schema = z.toJSONSchema(frontmatterSchema, { target: "draft-2020-12", io: "input" });
  const tags = schema.properties?.tags;
  if (tags && typeof tags === "object") tags.uniqueItems = true;
  return schema;
}
