import type { Comment } from "../content/comment-schema";

/** 記事の slug から、その記事に付いたコメントへの対応。 */
export type Threads = Map<string, Comment[]>;
export interface PlacedComment {
  slug: string;
  /** その記事のコメント欄での、古い順の通し番号。 */
  number: number;
  comment: Comment;
}

const byTime = (a: Comment, b: Comment) => a.at.getTime() - b.at.getTime();

/** 公開されている記事のコメントだけを残し、記事ごとに古い順へ並べる。 */
export function visibleThreads(threads: Threads, publishedSlugs: Iterable<string>): Threads {
  const published = new Set(publishedSlugs);
  return new Map(
    [...threads]
      .filter(([slug, comments]) => published.has(slug) && comments.length > 0)
      .map(([slug, comments]) => [slug, [...comments].sort(byTime)]),
  );
}
export const commentCount = (threads: Threads, slug: string) => threads.get(slug)?.length ?? 0;
export const totalComments = (threads: Threads) =>
  [...threads.values()].reduce((sum, comments) => sum + comments.length, 0);

/** 全記事のコメントを新しい順に並べる。 */
export function recentComments(threads: Threads, limit = Infinity): PlacedComment[] {
  return [...threads]
    .flatMap(([slug, comments]) =>
      [...comments].sort(byTime).map((comment, index) => ({ slug, number: index + 1, comment })),
    )
    .sort((a, b) => byTime(b.comment, a.comment) || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}
export const commentAnchor = (number: number) => `comment-${number}`;
