import type { APIContext, APIRoute } from "astro";
import type { RateLimit } from "@cloudflare/workers-types/index.ts";
import { z } from "zod";

/** 利用者にそのまま見せてよい失敗。message は画面に出す日本語で書く。 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** 例外を、画面に出せる `{ error }` の応答に変える。 */
export function handler(run: (context: APIContext) => Promise<Response>): APIRoute {
  return async (context) => {
    try {
      return await run(context);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error(error);
      return json(
        { error: "うまく処理できませんでした。時間をおいてもう一度お試しください。" },
        500,
      );
    }
  };
}

/**
 * JSON の本文を読んで検証する。
 * フォームの形式を受け付けないのは、別のサイトに置かれたフォームから cookie 付きで送らせないため。
 * JSON はブラウザが事前確認を挟むので、ほかのオリジンからは送れない。
 */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new HttpError(415, "送信の形式が正しくありません。");
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) throw new HttpError(400, firstIssue(parsed.error));
  return parsed.data;
}

/** スキーマに日本語で書いた案内だけを画面に出す。Zod の既定の英語の文は利用者向けではない。 */
function firstIssue(error: z.ZodError) {
  const message = error.issues[0]?.message ?? "";
  return /[ぁ-んァ-ヶ一-龠]/.test(message)
    ? message
    : "入力に誤りがあります。内容を確かめてください。";
}

export const clientAddress = (context: APIContext) =>
  context.request.headers.get("CF-Connecting-IP") ?? context.clientAddress ?? "unknown";

export async function throttle(limiter: RateLimit, key: string) {
  const { success } = await limiter.limit({ key });
  if (!success)
    throw new HttpError(
      429,
      "短いあいだに続けて送られています。少し待ってからもう一度お試しください。",
    );
}

export function parseId(value: string | undefined) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(404, "見つかりませんでした。");
  return id;
}
