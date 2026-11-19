import { env } from "cloudflare:workers";
import { HttpError } from "./http";

/** Turnstile（迷惑書き込みよけの自動チェック）を通ったか確かめる。 */
export async function verifyHuman(token: string | undefined, address: string) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // 手元では鍵を登録しなくても投稿を試せるようにする。本番で鍵がないときは受け付けない。
    if (import.meta.env.DEV) return;
    throw new HttpError(503, "いまは書き込みを受け付けていません。");
  }
  if (!token) throw new HttpError(400, "迷惑書き込みよけの確認が終わってから送信してください。");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: address }),
  });
  const outcome = (await response.json()) as { success?: boolean };
  if (!outcome.success)
    throw new HttpError(
      400,
      "迷惑書き込みよけの確認ができませんでした。もう一度送信してください。",
    );
}
