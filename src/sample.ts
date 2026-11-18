/**
 * デザインに書かれていた見本のデータ。
 * コメントや拍手はまだ保存先がないので、見た目を確かめるためにどの記事にも同じ内容を出している。
 * 実データにつなぐときに、このファイルごと置き換える。
 */
export const sampleClaps = 12;
export const sampleComments = [
  {
    title: "厚切りトースト",
    text: "厚切りトースト、いいなあ。どこのお店か今度こっそり教えてください！",
    at: "2026/11/18(水) 10:12:34",
    name: "みかん",
  },
  {
    title: "Blueskyからの返信",
    text: "ゆで卵つきのモーニング、うれしくなりますよね。",
    at: "2026/11/18(水) 10:40:02",
    name: "pochi",
    via: "bsky",
  },
  {
    title: "Mastodonからの返信",
    text: "午前休の喫茶店、最高の使い方ですね。",
    at: "2026/11/18(水) 12:05:47",
    name: "ゆず",
    via: "mastodon",
  },
  {
    title: "Re: 厚切りトースト",
    text: "みかんさん > 駅前の角のお店です。ナポリタンもおすすめらしいです！",
    at: "2026/11/18(水) 21:30:15",
    name: "しもちぃ",
  },
  {
    title: "Blueskyからの返信",
    text: "窓ぎわの席、写真だけで落ち着きます。",
    at: "2026/11/18(水) 22:02:31",
    name: "kotori",
    via: "bsky",
  },
] as const;
export const services = { bsky: "Bluesky", mastodon: "Mastodon" } as const;
