import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { randomToken, sha256 } from "./secrets";

/**
 * 管理人のログイン。cookie には乱数だけを渡し、データベースにはそのハッシュを置く。
 * パスワードから作った署名を cookie に入れると、cookie が漏れたときにパスワードを手元で総当たりされる。
 */
export async function openSession(db: D1Database, lifetimeSeconds: number, now = Date.now()) {
  const token = randomToken();
  await db.batch([
    db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now),
    db
      .prepare("INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)")
      .bind(await sha256(token), now + lifetimeSeconds * 1000),
  ]);
  return token;
}

export async function hasSession(db: D1Database, token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const row = await db
    .prepare("SELECT 1 AS found FROM admin_sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(await sha256(token), now)
    .first();
  return row !== null;
}

export async function closeSession(db: D1Database, token: string | undefined) {
  if (!token) return;
  await db
    .prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}
