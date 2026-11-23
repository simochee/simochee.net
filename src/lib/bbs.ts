/**
 * 掲示板の文字色。書き込みごとに選んでもらい、そのまま本文の色にする。
 * 黒のほかは嵐のメンバーカラー（大野・櫻井・相葉・二宮・松本の順）。
 * 黄は白地で読めないので、ほかの色と同じくらい読めるところまで暗くしてある。
 *
 * 書き込みには id だけを残す。並べ替えても id は振りなおさず、色をやめるときも id を使いまわさない。
 */
export const inkColors = [
  { id: 1, label: "黒", value: "#333333" },
  { id: 2, label: "青", value: "#1f5fb8" },
  { id: 3, label: "赤", value: "#c4262e" },
  { id: 4, label: "緑", value: "#2e7d32" },
  { id: 5, label: "黄", value: "#8a6d00" },
  { id: 6, label: "紫", value: "#7a3fa8" },
] as const;
export type InkColorId = (typeof inkColors)[number]["id"];

/** やめた色の書き込みは、消さずに黒で出す。 */
export const inkColorValue = (id: number) =>
  (inkColors.find((ink) => ink.id === id) ?? inkColors[0]).value;

export const bbsPageSize = 20;
