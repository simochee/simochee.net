import { z } from "zod";
import { inkColors, type InkColor } from "../lib/bbs";
import { deleteKeyPattern, limits } from "../lib/limits";

const blank = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
/** フォームの空欄（空文字）を「書かれていない」として扱う。 */
export const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blank, schema.optional());

const tooLong = (label: string, max: number) => `${label}は ${max} 文字までにしてください。`;

export const fields = {
  name: z
    .string()
    .trim()
    .min(1, "名前を入れてください。")
    .max(limits.name, tooLong("名前", limits.name)),
  title: z
    .string()
    .trim()
    .max(limits.title, tooLong("タイトル", limits.title))
    .transform((title) => title || "無題"),
  url: optional(
    z
      .url({ protocol: /^https?$/, error: "URL は http:// か https:// から書いてください。" })
      .max(limits.url, tooLong("URL", limits.url)),
  ),
  body: z
    .string()
    .trim()
    .min(1, "本文を入れてください。")
    .max(limits.body, tooLong("本文", limits.body)),
  turnstile: z.string().optional(),
  inkColor: z.enum(inkColors.map((ink) => ink.value) as [InkColor, ...InkColor[]], {
    error: "文字色を選んでください。",
  }),
  deleteKey: optional(
    z
      .string()
      .regex(new RegExp(`^${deleteKeyPattern}$`), "削除キーは英数字 8 文字までにしてください。"),
  ),
};
