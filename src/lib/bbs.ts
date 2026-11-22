/** 掲示板の文字色。書き込みごとに選んでもらい、そのまま本文の色にする。 */
export const inkColors = [
  { label: "黒", value: "#333333" },
  { label: "紺", value: "#1f3f8f" },
  { label: "緑", value: "#2e6b2e" },
  { label: "茶", value: "#7a4a1e" },
  { label: "桃", value: "#b0306a" },
  { label: "紫", value: "#6b3fa0" },
] as const;
export type InkColor = (typeof inkColors)[number]["value"];

export const bbsPageSize = 10;
