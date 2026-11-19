import type { AstroCookies } from "astro";
import { env } from "cloudflare:workers";
import { HttpError } from "./http";
import { sameText, signUntil, verifySigned } from "./secrets";

const name = "admin";
const lifetime = 60 * 60 * 24 * 30;

/** 管理人のパスワードを確かめ、ログインの cookie を渡す。署名の鍵はパスワードなので、変えれば全員ログアウトする。 */
export async function logIn(cookies: AstroCookies, password: string) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) throw new HttpError(503, "管理人のパスワードが登録されていません。");
  if (!sameText(password, expected)) throw new HttpError(401, "パスワードが違います。");
  const expiresAt = Date.now() + lifetime * 1000;
  cookies.set(name, await signUntil(expected, expiresAt), {
    path: "/api/",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: lifetime,
  });
}

export function logOut(cookies: AstroCookies) {
  cookies.delete(name, { path: "/api/" });
}

export async function isAdmin(cookies: AstroCookies) {
  const key = env.ADMIN_PASSWORD;
  return key ? verifySigned(key, cookies.get(name)?.value) : false;
}

export async function requireAdmin(cookies: AstroCookies) {
  if (!(await isAdmin(cookies))) throw new HttpError(401, "管理人としてログインしてください。");
}
