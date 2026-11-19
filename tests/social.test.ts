import { expect, test } from "vitest";
import {
  announcement,
  blueskyPostUrl,
  httpUrl,
  linkFacets,
  mastodonText,
  parseMastodonAccount,
} from "../src/lib/social";
import { truncate } from "../src/lib/text";

test("Mastodon のアカウントは @user@server の形から、プロフィールの URL を作る", () => {
  expect(parseMastodonAccount("@simochee@Mastodon.Example")).toEqual({
    handle: "@simochee@mastodon.example",
    user: "simochee",
    origin: "https://mastodon.example",
    profile: "https://mastodon.example/@simochee",
  });
  expect(parseMastodonAccount("simochee@mastodon.example")?.handle).toBe(
    "@simochee@mastodon.example",
  );
  expect(parseMastodonAccount("")).toBeUndefined();
  expect(parseMastodonAccount("@simochee@（サーバー未定）")).toBeUndefined();
});

test("Bluesky の投稿の at:// URI は、ブラウザで開ける URL になる", () => {
  expect(blueskyPostUrl("at://did:plc:abc/app.bsky.feed.post/3k")).toBe(
    "https://bsky.app/profile/did:plc:abc/post/3k",
  );
});

test("新しい記事の知らせは、題名と URL を並べ、長い題名は切り詰める", () => {
  expect(announcement("喫茶店", "https://simochee.net/posts/a/")).toBe(
    "ブログを書きました：喫茶店\nhttps://simochee.net/posts/a/",
  );
  const long = announcement("あ".repeat(200), "https://simochee.net/posts/a/");
  expect(long.split("\n")[0]).toBe(`ブログを書きました：${"あ".repeat(119)}…`);
});

test("Bluesky の本文中のリンクは、UTF-8 のバイト位置で指す", () => {
  const url = "https://simochee.net/posts/a/";
  const text = announcement("喫茶店", url);
  const [facet] = linkFacets(text, url);
  const bytes = new TextEncoder().encode(text);
  expect(new TextDecoder().decode(bytes.slice(facet!.index.byteStart, facet!.index.byteEnd))).toBe(
    url,
  );
});

test("Mastodon の返信は、先頭の宛先を落としたふつうの文にする", () => {
  const html =
    '<p><span class="h-card"><a href="https://m.example/@simochee" class="u-url mention">@<span>simochee</span></a></span> モーニング &amp; プリン、いいですね</p><p>また行きたい<br />です</p>';
  expect(mastodonText(html)).toBe("モーニング & プリン、いいですね\n\nまた行きたい\nです");
  expect(mastodonText("<p>@simochee@m.example @friend こんにちは &#x1F600;</p>")).toBe(
    "こんにちは 😀",
  );
});

test("切り詰めは、絵文字や合成した文字を途中で割らない", () => {
  expect(truncate("👨‍👩‍👧あいう", 3)).toBe("👨‍👩‍👧あ…");
  expect(truncate("あいう", 3)).toBe("あいう");
});

test("文字にならない番号の文字参照は、例外にせず置き換え文字にする", () => {
  expect(mastodonText("<p>&#99999999; と &#x0; と &#65;</p>")).toBe("\ufffd と \ufffd と A");
});

test("外から来た URL は、http と https のものだけをリンクにする", () => {
  expect(httpUrl("https://m.example/@a/1")).toBe("https://m.example/@a/1");
  expect(httpUrl("javascript:alert(1)")).toBeUndefined();
  expect(httpUrl("not a url")).toBeUndefined();
  expect(httpUrl(null)).toBeUndefined();
});
