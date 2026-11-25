/** ブラウザとサーバーのあいだでやりとりする形。 */
import type { DailyVisits } from "./counter";
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
  board: { id: number; name: string; admin: boolean; body: string; at: string }[];
  /** これまでの訪問数の累計。 */
  total: number;
  /** 今日を含む直近 7 日の訪問数。古い順。 */
  dailyVisits: DailyVisits[];
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
  posts: { slug: string; title: string }[];
  comments: (InboxComment & { postTitle: string | null })[];
  bbs: BbsInboxPost[];
}
