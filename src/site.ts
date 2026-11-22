import content from "virtual:site-content";

export const site = {
  name: "ちぃさな雑記帳",
  domain: "simochee.net",
  tagline: "日々のあれこれを気ままに綴るブログ",
  description: "小さなことから大きなものまで気軽にどんどん書いていきます。",
  ...content,
  author: { name: "しもちぃ", ...content.author },
} as const;
