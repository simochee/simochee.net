import { announcement, httpUrl, mastodonText, type MastodonAccount } from "../../lib/social";
import type { Reply } from "../comments";
import { ok, type SocialService } from "./service";

interface Status {
  id: string;
  uri: string;
  url: string | null;
  content: string;
  created_at: string;
  visibility: "public" | "unlisted" | "private" | "direct";
  account: { acct: string; display_name: string };
}

export function mastodon(account: MastodonAccount, token: string): SocialService {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    via: "mastodon",
    async publish(post, url) {
      const response = await fetch(`${account.origin}/api/v1/statuses`, {
        method: "POST",
        // 同じ記事を二重に知らせないよう、記事ごとに決まった鍵を付ける。サーバーは同じ鍵の再送を 1 時間まとめる。
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Idempotency-Key": `post-${post.id}`,
        },
        body: JSON.stringify({
          status: announcement(post.title, url),
          visibility: "public",
          language: "ja",
        }),
      });
      const status = (await (await ok(response, "Mastodon への投稿")).json()) as Status;
      return { remoteId: status.id, url: status.url ?? status.uri };
    },
    async replies(id) {
      const response = await fetch(`${account.origin}/api/v1/statuses/${id}/context`, { headers });
      const { descendants } = (await (await ok(response, "Mastodon の返信の取得")).json()) as {
        descendants: Status[];
      };
      return descendants
        .filter((status) => status.visibility === "public" || status.visibility === "unlisted")
        .map((status): Reply => ({
          source: status.uri,
          name: status.account.display_name || status.account.acct,
          body: mastodonText(status.content),
          url: httpUrl(status.url) ?? httpUrl(status.uri) ?? "",
          at: new Date(status.created_at).toISOString(),
        }));
    },
  };
}
