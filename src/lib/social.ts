import { truncate } from "./text";

export interface MastodonAccount {
  /** `@simochee@example.social` の形。検索窓に入れるとフォローできる。 */
  handle: string;
  user: string;
  origin: string;
  profile: string;
}

/** `@user@server` を読み解く。先頭の @ は省いてもよい。 */
export function parseMastodonAccount(account: string): MastodonAccount | undefined {
  const match = /^@?([A-Za-z0-9_]+)@([a-z0-9.-]+\.[a-z]{2,})$/i.exec(account.trim());
  if (!match) return undefined;
  const user = match[1]!;
  const server = match[2]!.toLowerCase();
  const origin = `https://${server}`;
  return { handle: `@${user}@${server}`, user, origin, profile: `${origin}/@${user}` };
}

export const blueskyProfile = (handle: string) => `https://bsky.app/profile/${handle}`;

/** Bluesky の投稿の at:// URI を、ブラウザで開ける URL にする。 */
export function blueskyPostUrl(uri: string) {
  const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/.exec(uri);
  return match ? `https://bsky.app/profile/${match[1]}/post/${match[2]}` : undefined;
}

/** 新しい記事を知らせる投稿の文。Bluesky の上限（300 字）に収まるよう、長い題名は切り詰める。 */
export function announcement(title: string, url: string) {
  return `ブログを書きました：${truncate(title, 120)}\n${url}`;
}

/** Bluesky の本文中の URL をリンクにする指定。位置は UTF-8 のバイト数で数える。 */
export function linkFacets(text: string, url: string) {
  const start = text.indexOf(url);
  if (start < 0) return [];
  const bytes = (part: string) => new TextEncoder().encode(part).length;
  const byteStart = bytes(text.slice(0, start));
  return [
    {
      index: { byteStart, byteEnd: byteStart + bytes(url) },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
    },
  ];
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith("#")) {
      const code = /^#x/i.test(entity) ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      // 文字にならない番号は、例外にせず置き換え文字にする。返信 1 件のせいで取り込み全体を止めないため。
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
    }
    return entities[entity.toLowerCase()] ?? whole;
  });
}

/**
 * Mastodon の投稿（HTML）をコメント欄に出す文にする。
 * 返信の先頭に付く宛先（@simochee など）は、記事への返信であることが自明なので落とす。
 */
export function mastodonText(html: string) {
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<[^>]*>/g, ""),
  );
  return text.replace(/^(?:\s*@[A-Za-z0-9_]+(?:@[A-Za-z0-9.-]+)?)+\s*/, "").trim();
}

/** 外から来た URL のうち、リンクにしてよい http と https だけを通す。 */
export function httpUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
