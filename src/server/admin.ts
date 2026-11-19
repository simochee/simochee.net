import type { AstroCookies } from "astro";
import { env } from "cloudflare:workers";
import { database } from "./db";
import { isAuthorName } from "../lib/names";
import { site } from "../site";
import { HttpError } from "./http";
import { sameText } from "./secrets";
import { closeSession, hasSession, openSession } from "./sessions";

const name = "admin";
const lifetime = 60 * 60 * 24 * 30;

export async function logIn(cookies: AstroCookies, password: string) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) throw new HttpError(503, "管理人のパスワードが登録されていません。");
  if (!sameText(password, expected)) throw new HttpError(401, "パスワードが違います。");
  cookies.set(name, await openSession(await database(), lifetime), {
    path: "/api/",
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: "strict",
    maxAge: lifetime,
  });
}

export async function logOut(cookies: AstroCookies) {
  await closeSession(await database(), cookies.get(name)?.value);
  cookies.delete(name, { path: "/api/" });
}

/** パスワードの登録を消すと、ログイン中の人も含めて管理人として扱わなくなる。 */
export async function isAdmin(cookies: AstroCookies) {
  const token = cookies.get(name)?.value;
  if (!env.ADMIN_PASSWORD || !token) return false;
  return hasSession(await database(), token);
}

export async function requireAdmin(cookies: AstroCookies) {
  if (!(await isAdmin(cookies))) throw new HttpError(401, "管理人としてログインしてください。");
}

/** 管理人の名前で書けるのは、ログインしている管理人だけ。なりすましの返信を防ぐ。 */
export async function guardAuthorName(cookies: AstroCookies, name: string) {
  if (isAuthorName(name) && !(await isAdmin(cookies)))
    throw new HttpError(403, `「${site.author.name}」は管理人の名前なので使えません。`);
}
