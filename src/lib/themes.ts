export const themes = [
  {
    id: "shiro",
    name: "しろ",
    color: "#ffffff",
    accent: "#e8e8e8",
    control: "#8c8c8c",
    inkStrong: "#333333",
  },
  {
    id: "aka",
    name: "あか",
    color: "#b33a3a",
    accent: "#b33a3a",
    control: "#a57d79",
    inkStrong: "#6a1f1f",
  },
  {
    id: "sakura",
    name: "さくら",
    color: "#bf4d78",
    accent: "#bf4d78",
    control: "#a87a8d",
    inkStrong: "#6b2141",
  },
  {
    id: "wakakusa",
    name: "わかくさ",
    color: "#4f7833",
    accent: "#4f7833",
    control: "#778e66",
    inkStrong: "#283f17",
  },
  {
    id: "mizuiro",
    name: "みずいろ",
    color: "#3a6a99",
    accent: "#3a6a99",
    control: "#7a8fa3",
    inkStrong: "#1f3f60",
  },
] as const;

export const defaultTheme = themes.find((theme) => theme.id === "aka")!;
