import { env } from "cloudflare:workers";
import { services } from "../../lib/comments";
import { accounts } from "../../lib/accounts";
import { syncReplies } from "../comments";
import { database } from "../db";
import { publishedPosts } from "../posts";
import { bluesky } from "./bluesky";
import { mastodon } from "./mastodon";
import type { SocialService } from "./service";
import {
  announcedSlugs,
  claim,
  complete,
  isFresh,
  markChecked,
  release,
  watchList,
} from "./syndications";

export interface SyncReport {
  /** 知らせた記事。`bsky:slug` の形。 */
  announced: string[];
  /** 返信を取り込んだ記事の数。 */
  watched: number;
  errors: string[];
}

/** 鍵が登録されているサービスだけを使う。 */
function configured(origin: string): SocialService[] {
  const found: SocialService[] = [];
  if (env.BLUESKY_APP_PASSWORD)
    found.push(bluesky(accounts.bluesky.handle, env.BLUESKY_APP_PASSWORD, origin));
  if (accounts.mastodon && env.MASTODON_ACCESS_TOKEN)
    found.push(mastodon(accounts.mastodon, env.MASTODON_ACCESS_TOKEN));
  return found;
}

/** 新しい記事を Bluesky・Mastodon に知らせ、知らせた投稿への返信をコメントとして取り込む。 */
export async function syncSocial(origin: string, now = new Date()): Promise<SyncReport> {
  const [db, posts] = await Promise.all([database(), publishedPosts(origin)]);
  const report: SyncReport = { announced: [], watched: 0, errors: [] };
  const failed = (what: string, error: unknown) => {
    console.error(what, error);
    report.errors.push(`${what}: ${error instanceof Error ? error.message : String(error)}`);
  };

  for (const service of configured(origin)) {
    const done = await announcedSlugs(db, service.via);
    for (const post of posts.values()) {
      if (done.has(post.id) || !isFresh(post, now) || !(await claim(db, post.id, service.via, now)))
        continue;
      let remote: Awaited<ReturnType<SocialService["publish"]>>;
      try {
        remote = await service.publish(
          post,
          new URL(`/posts/${post.id}/`, import.meta.env.SITE).href,
        );
      } catch (error) {
        await release(db, post.id, service.via);
        failed(`${services[service.via]}への投稿（${post.id}）`, error);
        continue;
      }
      // 投稿はできている。ここで失敗しても権利は手放さない（手放すと次の回でもう一度知らせてしまう）。
      await complete(db, post.id, service.via, remote).catch((error: unknown) =>
        failed(`${services[service.via]}への投稿の記録（${post.id}）`, error),
      );
      report.announced.push(`${service.via}:${post.id}`);
    }
    for (const { slug, remoteId } of await watchList(db, service.via, now)) {
      await markChecked(db, slug, service.via, now);
      if (!posts.has(slug)) continue;
      try {
        const replies = await service.replies(remoteId);
        await syncReplies(db, slug, service.via, replies, `${services[service.via]}からの返信`);
        report.watched++;
      } catch (error) {
        failed(`${services[service.via]}の返信の取り込み（${slug}）`, error);
      }
    }
  }
  return report;
}
