import { defaultTheme, themes } from "./themes.ts";

type Theme = (typeof themes)[number];

// e: 縁と背表紙 / b: 表紙の下の帯 / t: ページの文字の行 / p: ページ / y: しおり
const grid = [
  "................",
  "................",
  "..eeeee..eeeee..",
  ".epppppeepppppe.",
  ".eptttpeeptttpe.",
  ".epppppeepppppe.",
  ".eptttpeepttppe.",
  ".epppppeepppppe.",
  ".epttppeeptttpe.",
  ".epppppeepppppe.",
  ".eptttpeepppppe.",
  ".epppppeepppppe.",
  ".ebbbbbeebbbbbe.",
  "..eeeeebbeeeee..",
  "........y.......",
  "........y.......",
];

const paper = "#ffffff";
const bookmark = "#fff0a8";

export const faviconSize = grid.length;

const colorOf = (theme: Theme): Record<string, string> => ({
  e: theme.inkStrong,
  b: theme.accent,
  t: theme.control,
  p: paper,
  y: bookmark,
});

export function faviconPixels(theme: Theme = defaultTheme) {
  const colors = colorOf(theme);
  return grid.flatMap((row, y) =>
    row.split("").flatMap((cell, x) => (cell === "." ? [] : [{ x, y, fill: colors[cell]! }])),
  );
}

export function faviconSvg(theme: Theme = defaultTheme) {
  const size = faviconSize;
  const rects = faviconPixels(theme)
    .map(({ x, y, fill }) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects}</svg>`;
}
