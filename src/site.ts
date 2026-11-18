export const site = {
  name: "ちぃさな雑記帳",
  domain: "simochee.net",
  tagline: "日々のあれこれを気ままに綴るブログ",
  description: "小さなことから大きなものまで気軽にどんどん書いていきます。",
  author: {
    name: "しもちぃ",
    id: "simochee",
    message: "気軽にどんどん書いていきます。",
    bio: "技術のことや日々のこと、写真などを書いています。",
  },
  links: [
    { label: "Zenn", href: "https://zenn.dev/lollipop_onl", note: "技術" },
    { label: "Qiita", href: "https://qiita.com/simochee", note: "技術" },
    { label: "しずかなインターネット", href: "https://sizu.me/simochee", note: "日記" },
  ],
} as const;

export const categories = { tech: "技術", personal: "日々" } as const;
export type Category = keyof typeof categories;
