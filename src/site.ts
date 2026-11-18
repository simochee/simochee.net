export const site = {
  name: "ちぃさな雑記帳",
  domain: "simochee.net",
  tagline: "日々のあれこれを気ままに綴るブログ",
  description: "小さなことから大きなものまで気軽にどんどん書いていきます。",
  author: {
    name: "しもちぃ",
    bio: "技術のことや日々のこと、写真などを書いています。",
  },
  links: [
    { label: "Zenn", href: "https://zenn.dev/lollipop_onl", note: "技術" },
    { label: "Qiita", href: "https://qiita.com/simochee", note: "技術" },
    { label: "しずかなインターネット", href: "https://sizu.me/simochee", note: "日記" },
  ],
  /** プロフィールページの文言。デザインに書かれていた仮の内容のまま。 */
  profile: {
    facts: [
      ["なまえ", "しもちぃ（simochee）"],
      ["すんでいるところ", "ひみつ"],
      ["おしごと", "会社員（Webのしごと）"],
      ["すきなもの", "技術のこと、写真（がんばりちゅう）"],
      ["ブログ開設", "2024年4月1日"],
      ["ひとこと", "気軽にどんどん書いていきます。"],
    ],
    greeting: [
      "はじめまして、しもちぃです。",
      "ふだんは Web のしごとをしています。",
      "このブログには、技術のこと、写真のこと、日々のことを、数行のメモからながめの解説まで書いていきます。",
      "コメントやリンクは大歓迎です。どうぞのんびりしていってください。",
    ],
    favorites: [
      ["飲みもの", "ブレンド（ミルクだけ入れる派）"],
      ["本", "ミステリーとエッセイ。文庫本が好き"],
      ["季節", "冬（こたつがあるから）"],
      ["マイブーム", "喫茶店のかためのプリンを食べ比べること"],
    ],
    notes: ["リンクはご自由にどうぞ。"],
  },
} as const;

export const categories = { tech: "技術", personal: "日々" } as const;
export type Category = keyof typeof categories;
