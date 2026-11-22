/** ブラウザとサーバーのあいだでやりとりする形。 */
import type { BbsInboxPost } from "../server/bbs";
import type { InboxComment, PlacedComment, PublicComment } from "../server/comments";
import type { PollResult } from "../server/poll";

export type { BbsPage, BbsPost } from "../server/bbs";
export type { PublicComment } from "../server/comments";

export interface Counts {
  claps: Record<string, number>;
  comments: Record<string, number>;
}

export interface SidebarData {
  popular: { slug: string; title: string }[];
  comments: (PlacedComment & { postTitle: string })[];
  board: { id: number; name: string; body: string; at: string }[];
  /** これまでの訪問数の累計。 */
  total: number;
  /** いま見ている人のおおよその数。Web Analytics を読めないあいだは null。 */
  viewers: number | null;
}

export interface CommentThread {
  comments: PublicComment[];
}

export interface PostedComment {
  id: number;
  private: boolean;
}

export interface PollResponse extends PollResult {
  poll: string;
}

export interface AdminInbox {
  comments: (InboxComment & { postTitle: string | null })[];
  bbs: BbsInboxPost[];
}
