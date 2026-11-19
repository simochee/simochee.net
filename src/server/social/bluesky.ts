import { announcement, blueskyPostUrl, linkFacets } from "../../lib/social";
import type { Reply } from "../comments";
import { fetchAsset, type PublishedPost } from "../posts";
import { ok, type SocialService } from "./service";

const entryway = "https://bsky.social";
/** 返信の読み出しは認証の要らない公開の AppView を使う。 */
const appView = "https://public.api.bsky.app";

interface Session {
  accessJwt: string;
  did: string;
  didDoc?: { service?: { id: string; serviceEndpoint: string }[] };
}

interface ThreadPost {
  uri: string;
  author: { handle: string; displayName?: string };
  record: { text: string; createdAt: string };
}
interface Thread {
  $type: string;
  post?: ThreadPost;
  replies?: Thread[];
}

function flatten(thread: Thread): ThreadPost[] {
  return (thread.replies ?? [])
    .filter((reply) => reply.$type === "app.bsky.feed.defs#threadViewPost" && reply.post)
    .flatMap((reply) => [reply.post!, ...flatten(reply)]);
}

export function bluesky(handle: string, password: string, origin: string): SocialService {
  let session: Promise<{ token: string; did: string; pds: string }> | undefined;
  const signIn = () =>
    (session ??= (async () => {
      const response = await fetch(`${entryway}/xrpc/com.atproto.server.createSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: handle, password }),
      });
      const created = (await (await ok(response, "Bluesky のログイン")).json()) as Session;
      const pds = created.didDoc?.service?.find((service) => service.id === "#atproto_pds");
      return { token: created.accessJwt, did: created.did, pds: pds?.serviceEndpoint ?? entryway };
    })());

  async function thumbnail(post: PublishedPost, pds: string, token: string) {
    const image = await fetchAsset(`/og/${post.id}.jpg`, origin);
    if (!image.ok) return undefined;
    const response = await fetch(`${pds}/xrpc/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
      body: await image.arrayBuffer(),
    });
    return ((await (await ok(response, "Bluesky への画像の送信")).json()) as { blob: unknown })
      .blob;
  }

  return {
    via: "bsky",
    async publish(post, url) {
      const { token, did, pds } = await signIn();
      const text = announcement(post.title, url);
      const thumb = await thumbnail(post, pds, token);
      const response = await fetch(`${pds}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text,
            facets: linkFacets(text, url),
            langs: ["ja"],
            createdAt: new Date().toISOString(),
            embed: {
              $type: "app.bsky.embed.external",
              external: {
                uri: url,
                title: post.title,
                description: post.description,
                ...(thumb ? { thumb } : {}),
              },
            },
          },
        }),
      });
      const { uri } = (await (await ok(response, "Bluesky への投稿")).json()) as { uri: string };
      return { remoteId: uri, url: blueskyPostUrl(uri)! };
    },
    async replies(uri) {
      const query = new URLSearchParams({ uri, depth: "10", parentHeight: "0" });
      const response = await fetch(`${appView}/xrpc/app.bsky.feed.getPostThread?${query}`);
      const { thread } = (await (await ok(response, "Bluesky の返信の取得")).json()) as {
        thread: Thread;
      };
      return flatten(thread).map((post): Reply => ({
        source: post.uri,
        name: post.author.displayName || post.author.handle,
        body: post.record.text,
        url: blueskyPostUrl(post.uri)!,
        at: new Date(post.record.createdAt).toISOString(),
      }));
    },
  };
}
