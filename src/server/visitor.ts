import type { AstroCookies } from "astro";

const name = "visitor";

/**
 * 訪問者を見分ける乱数。投票の重複と閲覧者数に使い、個人を特定する情報は持たない。
 * まだ持っていなければここで渡す。
 */
export function visitorOf(cookies: AstroCookies) {
  const current = cookies.get(name)?.value;
  if (current && /^[0-9a-f-]{36}$/.test(current)) return current;
  const id = crypto.randomUUID();
  cookies.set(name, id, {
    path: "/api/",
    httpOnly: true,
    // dev を手元の別の端末から http で開いても cookie が保存されるよう、Secure は本番だけにする。
    secure: !import.meta.env.DEV,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}
