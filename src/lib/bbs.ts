/**
 * 掲示板の文字色。書き込みごとに選んでもらい、そのまま本文の色にする。
 * 黒のほかは嵐のメンバーカラー（大野・櫻井・相葉・二宮・松本の順）。
 * 黄は白地で読めないので、ほかの色と同じくらい読めるところまで暗くしてある。
 */
export const inkColors = [
  { label: "黒", value: "#333333" },
  { label: "青", value: "#1f5fb8" },
  { label: "赤", value: "#c4262e" },
  { label: "緑", value: "#2e7d32" },
  { label: "黄", value: "#8a6d00" },
  { label: "紫", value: "#7a3fa8" },
] as const;
export type InkColor = (typeof inkColors)[number]["value"];

export const bbsPageSize = 10;
