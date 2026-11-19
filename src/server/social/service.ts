import type { Service } from "../../lib/comments";
import type { Reply } from "../comments";
import type { PublishedPost } from "../posts";

/** 記事を知らせ、そこへ付いた返信を読みにいく先。 */
export interface SocialService {
  via: Service;
  /** 記事を知らせる投稿をして、その投稿の識別子と URL を返す。 */
  publish(post: PublishedPost, url: string): Promise<{ remoteId: string; url: string }>;
  replies(remoteId: string): Promise<Reply[]>;
}

export async function ok(response: Response, what: string) {
  if (!response.ok) throw new Error(`${what}: ${response.status} ${await response.text()}`);
  return response;
}
