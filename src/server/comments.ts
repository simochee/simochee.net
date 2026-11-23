import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { HttpError } from "./http";
import { hashSecret, matchesSecret } from "./secrets";

/** 記事のコメント欄に出す 1 件。number はその記事の公開コメントの中での、古い順の通し番号。 */
export interface PublicComment {
  id: number;
  number: number;
  title: string;
  name: string;
  admin: boolean;
  body: string;
  at: string;
  url: string | null;
  /** 削除パスワードを付けて書かれたか。付いていれば、書いた人が削除できる。 */
  deletable: boolean;
}

export interface PlacedComment {
  slug: string;
  number: number;
  title: string;
  name: string;
  admin: boolean;
  body: string;
  at: string;
}

/** 管理画面で見る 1 件。非公開のものも含む。 */
export interface InboxComment {
  id: number;
  slug: string;
  title: string;
  name: string;
  admin: boolean;
  body: string;
  url: string | null;
  private: boolean;
  at: string;
}

export interface NewComment {
  slug: string;
  title: string;
  name: string;
  admin?: boolean;
  body: string;
  url?: string;
  password?: string;
  private: boolean;
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
  admin: number;
  body: string;
  url: string | null;
  password_hash: string | null;
  private: number;
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
    admin: row.admin === 1,
    body: row.body,
    at: row.created_at,
    url: row.url,
    deletable: row.password_hash !== null,
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

/**
 * 全記事をまたいだ新しいコメント。新しい順の索引から少し多めに読み、公開中の記事のものだけを残す。
 * 番号はそのコメントより前に同じ記事へ付いた数で出す。全コメントに番号を振ってから選ぶと、コメントの総数だけ行を読む。
 */
export async function recentComments(
  db: D1Database,
  published: Iterable<string>,
  limit: number,
): Promise<PlacedComment[]> {
  const { results } = await db
    .prepare(
      `SELECT c.*, (
         SELECT COUNT(*) FROM comments p
         WHERE p.slug = c.slug AND p.private = 0
           AND (p.created_at < c.created_at OR (p.created_at = c.created_at AND p.id <= c.id))
       ) AS number
       FROM comments c WHERE c.private = 0 ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
    )
    .bind(limit * 4)
    .all<Row>();
  const shown = new Set(published);
  return results
    .filter((row) => shown.has(row.slug))
    .slice(0, limit)
    .map((row) => ({
      slug: row.slug,
      number: row.number,
      title: row.title,
      name: row.name,
      admin: row.admin === 1,
      body: row.body,
      at: row.created_at,
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
    admin: row.admin === 1,
    body: row.body,
    url: row.url,
    private: row.private === 1,
    at: row.created_at,
  }));
}

export async function addComment(db: D1Database, comment: NewComment, now = new Date()) {
  const row = await db
    .prepare(
      `INSERT INTO comments (slug, title, name, body, url, password_hash, private, created_at, admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      comment.slug,
      comment.title,
      comment.name,
      comment.body,
      comment.url ?? null,
      comment.password ? await hashSecret(comment.password) : null,
      comment.private ? 1 : 0,
      now.toISOString(),
      comment.admin ? 1 : 0,
    )
    .first<{ id: number }>();
  return row!.id;
}

/** 書いた人が削除パスワードで消すか、管理人が消す。 */
export async function removeComment(
  db: D1Database,
  id: number,
  { password, admin }: { password?: string; admin: boolean },
) {
  const row = await db
    .prepare("SELECT password_hash FROM comments WHERE id = ?")
    .bind(id)
    .first<{ password_hash: string | null }>();
  if (!row) throw new HttpError(404, "コメントが見つかりませんでした。");
  if (!admin) {
    if (!row.password_hash)
      throw new HttpError(403, "削除パスワードを入れずに書かれたコメントは、削除できません。");
    if (!password || !(await matchesSecret(password, row.password_hash)))
      throw new HttpError(403, "削除パスワードが違います。");
  }
  await db.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
}
