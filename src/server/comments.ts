import type { D1Database } from "@cloudflare/workers-types/index.ts";
import type { Service } from "../lib/comments";
import { HttpError } from "./http";
import { hashSecret, matchesSecret } from "./secrets";

/** 記事のコメント欄に出す 1 件。number はその記事の公開コメントの中での、古い順の通し番号。 */
export interface PublicComment {
  id: number;
  number: number;
  title: string;
  name: string;
  body: string;
  at: string;
  via: Service | null;
  url: string | null;
  editable: boolean;
}

export interface PlacedComment {
  slug: string;
  number: number;
  title: string;
  name: string;
  body: string;
  at: string;
  via: Service | null;
}

/** 管理画面で見る 1 件。非公開のものやメールアドレスも含む。 */
export interface InboxComment {
  id: number;
  slug: string;
  title: string;
  name: string;
  body: string;
  email: string | null;
  url: string | null;
  private: boolean;
  via: Service | null;
  at: string;
}

export interface NewComment {
  slug: string;
  title: string;
  name: string;
  body: string;
  email?: string;
  url?: string;
  password?: string;
  private: boolean;
}

/** Bluesky・Mastodon の返信。source はそのサービスでの投稿の識別子。 */
export interface Reply {
  source: string;
  name: string;
  body: string;
  url: string;
  at: string;
}

const numbered = `
  SELECT *, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS number
  FROM comments WHERE private = 0`;
/** 公開中の記事の slug を JSON の配列 1 つで渡す。D1 は 1 文に縛れる値の数が少なく、記事ごとに ? を並べられない。 */
const publishedOnly = "slug IN (SELECT value FROM json_each(?))";

interface Row {
  id: number;
  slug: string;
  title: string;
  name: string;
  body: string;
  email: string | null;
  url: string | null;
  password_hash: string | null;
  private: number;
  via: Service | null;
  created_at: string;
  number: number;
}

export async function threadOf(db: D1Database, slug: string): Promise<PublicComment[]> {
  const { results } = await db
    .prepare(`SELECT * FROM (${numbered}) WHERE slug = ? ORDER BY number`)
    .bind(slug)
    .all<Row>();
  return results.map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    name: row.name,
    body: row.body,
    at: row.created_at,
    via: row.via,
    url: row.url,
    editable: row.password_hash !== null,
  }));
}

export async function commentCounts(db: D1Database, published: Iterable<string>) {
  const { results } = await db
    .prepare(
      `SELECT slug, COUNT(*) AS count FROM comments WHERE private = 0 AND ${publishedOnly} GROUP BY slug`,
    )
    .bind(JSON.stringify([...published]))
    .all<{ slug: string; count: number }>();
  return Object.fromEntries(results.map((row) => [row.slug, row.count]));
}

export async function recentComments(
  db: D1Database,
  published: Iterable<string>,
  limit: number,
): Promise<PlacedComment[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM (${numbered}) WHERE ${publishedOnly} ORDER BY created_at DESC, slug LIMIT ?`,
    )
    .bind(JSON.stringify([...published]), limit)
    .all<Row>();
  return results.map((row) => ({
    slug: row.slug,
    number: row.number,
    title: row.title,
    name: row.name,
    body: row.body,
    at: row.created_at,
    via: row.via,
  }));
}

export async function inboxComments(db: D1Database, limit: number): Promise<InboxComment[]> {
  const { results } = await db
    .prepare("SELECT * FROM comments ORDER BY created_at DESC, id DESC LIMIT ?")
    .bind(limit)
    .all<Row>();
  return results.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    name: row.name,
    body: row.body,
    email: row.email,
    url: row.url,
    private: row.private === 1,
    via: row.via,
    at: row.created_at,
  }));
}

export async function addComment(db: D1Database, comment: NewComment, now = new Date()) {
  const row = await db
    .prepare(
      `INSERT INTO comments (slug, title, name, body, email, url, password_hash, private, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      comment.slug,
      comment.title,
      comment.name,
      comment.body,
      comment.email ?? null,
      comment.url ?? null,
      comment.password ? await hashSecret(comment.password) : null,
      comment.private ? 1 : 0,
      now.toISOString(),
    )
    .first<{ id: number }>();
  return row!.id;
}

/** 書いた人のパスワードか、管理人なら通す。 */
async function authorize(db: D1Database, id: number, password: string | undefined, admin: boolean) {
  const row = await db
    .prepare("SELECT password_hash FROM comments WHERE id = ?")
    .bind(id)
    .first<{ password_hash: string | null }>();
  if (!row) throw new HttpError(404, "コメントが見つかりませんでした。");
  if (admin) return;
  if (!row.password_hash)
    throw new HttpError(403, "パスワードを入れずに書かれたコメントは、編集・削除できません。");
  if (!password || !(await matchesSecret(password, row.password_hash)))
    throw new HttpError(403, "パスワードが違います。");
}

export async function editComment(
  db: D1Database,
  id: number,
  change: { password?: string; title: string; body: string; admin: boolean },
  now = new Date(),
) {
  await authorize(db, id, change.password, change.admin);
  await db
    .prepare("UPDATE comments SET title = ?, body = ?, updated_at = ? WHERE id = ?")
    .bind(change.title, change.body, now.toISOString(), id)
    .run();
}

export async function removeComment(
  db: D1Database,
  id: number,
  { password, admin }: { password?: string; admin: boolean },
) {
  await authorize(db, id, password, admin);
  // Bluesky・Mastodon から取り込んだ返信は、消しても次の同期で向こうから戻ってくる。行を残して非公開にする。
  await db.batch([
    db.prepare("DELETE FROM comments WHERE id = ? AND source IS NULL").bind(id),
    db.prepare("UPDATE comments SET private = 1 WHERE id = ? AND source IS NOT NULL").bind(id),
  ]);
}

export async function slugOfComment(db: D1Database, id: number) {
  const row = await db
    .prepare("SELECT slug FROM comments WHERE id = ?")
    .bind(id)
    .first<{ slug: string }>();
  return row?.slug;
}

/**
 * ある記事への、あるサービスでの返信を、取ってきた一覧とそろえる。
 * 向こうで消された返信はこちらからも消し、書き直されたものは本文を差し替える。
 */
export async function syncReplies(
  db: D1Database,
  slug: string,
  via: Service,
  replies: Reply[],
  title: string,
) {
  const { results } = await db
    .prepare("SELECT source FROM comments WHERE slug = ? AND via = ?")
    .bind(slug, via)
    .all<{ source: string }>();
  const current = new Set(replies.map((reply) => reply.source));
  const gone = results.map((row) => row.source).filter((source) => !current.has(source));
  const statements = [
    ...replies.map((reply) =>
      db
        .prepare(
          `INSERT INTO comments (slug, title, name, body, url, via, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (source) DO UPDATE SET name = excluded.name, body = excluded.body, url = excluded.url`,
        )
        .bind(slug, title, reply.name, reply.body, reply.url, via, reply.source, reply.at),
    ),
    ...gone.map((source) => db.prepare("DELETE FROM comments WHERE source = ?").bind(source)),
  ];
  if (statements.length > 0) await db.batch(statements);
}
