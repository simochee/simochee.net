import sharp from "sharp";
import { faviconPixels, faviconSize } from "../src/lib/favicon.ts";

// SVG に対応しないブラウザとホーム画面向けの予備なので、テーマに関わらず既定の赤で書き出す。
const touchIconBackground = "#f4e6e5";

function draw(canvas: number, scale: number) {
  const offset = (canvas - faviconSize * scale) / 2;
  const rects = faviconPixels()
    .map(
      ({ x, y, fill }) =>
        `<rect x="${offset + x * scale}" y="${offset + y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`,
    )
    .join("");
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" shape-rendering="crispEdges">${rects}</svg>`,
    ),
  );
}

await draw(32, 2).png().toFile("public/favicon-32.png");
await draw(180, 9)
  .flatten({ background: touchIconBackground })
  .ensureAlpha()
  .png()
  .toFile("public/apple-touch-icon.png");
