export const themes = [
  { id: "shiro", name: "しろ", color: "#ffffff" },
  { id: "aka", name: "あか", color: "#b33a3a" },
  { id: "sakura", name: "さくら", color: "#bf4d78" },
  { id: "wakakusa", name: "わかくさ", color: "#4f7833" },
  { id: "mizuiro", name: "みずいろ", color: "#3a6a99" },
] as const;

export const defaultTheme = themes.find((theme) => theme.id === "mizuiro")!;
