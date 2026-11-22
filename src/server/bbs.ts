import type { D1Database } from "@cloudflare/workers-types/index.ts";
import type { InkColorId } from "../lib/bbs";
import { HttpError } from "./http";
import { hashSecret, matchesSecret } from "./secrets";

/** 掲示板の 1 件。id がそのまま「[128]」のような書き込み番号になる。 */
export interface BbsPost {
  id: number;
  title: string;
  name: string;
  url: string | null;
  body: string;
  colorId: InkColorId;
  reply: string | null;
  at: string;
  editable: boolean;
}

export type BbsInboxPost = Omit<BbsPost, "editable">;

export interface BbsPage {
  posts: BbsPost[];
  total: number;
  page: number;
  pages: number;
}

export interface NewBbsPost {
  title: string;
  name: string;
  url?: string;
  body: string;
  colorId: InkColorId;
  key?: string;
}

interface Row {
  id: number;
  title: string;
  name: string;
  url: string | null;
  body: string;
  color_id: InkColorId;
  key_hash: string | null;
  reply: string | null;
  created_at: string;
}

const publicPost = (row: Row): BbsPost => ({
  id: row.id,
  title: row.title,
  name: row.name,
  url: row.url,
  body: row.body,
  colorId: row.color_id,
  reply: row.reply,
  at: row.created_at,
  editable: row.key_hash !== null,
});

/** 新しい順の page ページ目。範囲の外を頼まれたら、いちばん近いページを返す。 */
export async function bbsPage(db: D1Database, page: number, size: number): Promise<BbsPage> {
  // 書き込みの数は書き込みと削除のたびに数えてある。COUNT(*) は書き込みの総数だけ行を読む。
  const total =
    (await db
      .prepare("SELECT value FROM counters WHERE name = 'bbs_posts'")
      .first<number>("value")) ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const shown = Math.min(Math.max(1, page), pages);
  const { results } = await db
    .prepare("SELECT * FROM bbs_posts ORDER BY id DESC LIMIT ? OFFSET ?")
    .bind(size, (shown - 1) * size)
    .all<Row>();
  return { posts: results.map(publicPost), total, page: shown, pages };
}

export async function latestBbsPosts(db: D1Database, limit: number) {
  const { results } = await db
    .prepare("SELECT id, name, body, created_at FROM bbs_posts ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<Pick<Row, "id" | "name" | "body" | "created_at">>();
  return results.map((row) => ({ id: row.id, name: row.name, body: row.body, at: row.created_at }));
}

export async function bbsInbox(db: D1Database, limit: number): Promise<BbsInboxPost[]> {
  const { results } = await db
    .prepare("SELECT * FROM bbs_posts ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<Row>();
  return results.map((row) => {
    const { editable: _, ...post } = publicPost(row);
    return post;
  });
}

export async function addBbsPost(db: D1Database, post: NewBbsPost, now = new Date()) {
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT INTO bbs_posts (title, name, url, body, color_id, key_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(
        post.title,
        post.name,
        post.url ?? null,
        post.body,
        post.colorId,
        post.key ? await hashSecret(post.key) : null,
        now.toISOString(),
      ),
    db.prepare(
      `INSERT INTO counters (name, value) VALUES ('bbs_posts', 1)
       ON CONFLICT (name) DO UPDATE SET value = value + 1`,
    ),
  ]);
  return (inserted!.results[0] as { id: number }).id;
}

/** 書いた人の削除キーか、管理人なら通す。 */
async function authorize(db: D1Database, id: number, key: string | undefined, admin: boolean) {
  const row = await db
    .prepare("SELECT key_hash FROM bbs_posts WHERE id = ?")
    .bind(id)
    .first<{ key_hash: string | null }>();
  if (!row) throw new HttpError(404, "書き込みが見つかりませんでした。");
  if (admin) return;
  if (!row.key_hash)
    throw new HttpError(403, "削除キーを入れずに書き込まれたので、編集・削除できません。");
  if (!key || !(await matchesSecret(key, row.key_hash)))
    throw new HttpError(403, "削除キーが違います。");
}

export async function editBbsPost(
  db: D1Database,
  id: number,
  change: { key?: string; title: string; body: string; colorId: InkColorId; admin: boolean },
  now = new Date(),
) {
  await authorize(db, id, change.key, change.admin);
  await db
    .prepare("UPDATE bbs_posts SET title = ?, body = ?, color_id = ?, updated_at = ? WHERE id = ?")
    .bind(change.title, change.body, change.colorId, now.toISOString(), id)
    .run();
}

export async function removeBbsPost(
  db: D1Database,
  id: number,
  { key, admin }: { key?: string; admin: boolean },
) {
  await authorize(db, id, key, admin);
  await db.batch([
    db.prepare("DELETE FROM bbs_posts WHERE id = ?").bind(id),
    db.prepare("UPDATE counters SET value = value - 1 WHERE name = 'bbs_posts' AND changes() = 1"),
  ]);
}

/** 管理人の返信。空にすると返信を取り下げる。 */
export async function replyToBbsPost(db: D1Database, id: number, reply: string | undefined) {
  const { meta } = await db
    .prepare("UPDATE bbs_posts SET reply = ? WHERE id = ?")
    .bind(reply ?? null, id)
    .run();
  if (meta.changes === 0) throw new HttpError(404, "書き込みが見つかりませんでした。");
}
