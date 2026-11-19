import type { D1Database } from "@cloudflare/workers-types/index.ts";
import type { Service } from "../../lib/comments";
import type { PublishedPost } from "../posts";

const hour = 60 * 60 * 1000;
/** 公開からこの時間のうちに見つけた記事だけを知らせる。初めて動かしたときに過去の記事をまとめて流さないため。 */
export const announceWithin = 24 * hour;
/** 公開からこの日数のあいだ、返信を取り込みつづける。 */
export const watchWithin = 30 * 24 * hour;

const age = (post: PublishedPost, now: Date) => now.getTime() - Date.parse(post.publishedAt);

export const isFresh = (post: PublishedPost, now: Date) =>
  age(post, now) >= 0 && age(post, now) <= announceWithin;
export const isWatched = (post: PublishedPost, now: Date) => age(post, now) <= watchWithin;

/**
 * 記事を知らせる権利を取る。取れたときだけ投稿する。
 * 定期実行と管理画面からの実行が重なっても、同じ記事を二重に知らせない。
 */
export async function claim(db: D1Database, slug: string, via: Service, now = new Date()) {
  const { meta } = await db
    .prepare(
      "INSERT INTO syndications (slug, service, remote_id, url, created_at) VALUES (?, ?, '', '', ?) ON CONFLICT DO NOTHING",
    )
    .bind(slug, via, now.toISOString())
    .run();
  return meta.changes === 1;
}

export async function complete(
  db: D1Database,
  slug: string,
  via: Service,
  remote: { remoteId: string; url: string },
) {
  await db
    .prepare("UPDATE syndications SET remote_id = ?, url = ? WHERE slug = ? AND service = ?")
    .bind(remote.remoteId, remote.url, slug, via)
    .run();
}

/** 投稿に失敗したときは権利を手放し、次の回でやりなおす。 */
export async function release(db: D1Database, slug: string, via: Service) {
  await db
    .prepare("DELETE FROM syndications WHERE slug = ? AND service = ? AND remote_id = ''")
    .bind(slug, via)
    .run();
}

export async function announced(db: D1Database, via: Service) {
  const { results } = await db
    .prepare("SELECT slug, remote_id FROM syndications WHERE service = ? AND remote_id != ''")
    .bind(via)
    .all<{ slug: string; remote_id: string }>();
  return results.map((row) => ({ slug: row.slug, remoteId: row.remote_id }));
}

export async function announcedSlugs(db: D1Database, via: Service) {
  const { results } = await db
    .prepare("SELECT slug FROM syndications WHERE service = ?")
    .bind(via)
    .all<{ slug: string }>();
  return new Set(results.map((row) => row.slug));
}
