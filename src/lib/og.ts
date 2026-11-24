import { readFile } from "node:fs/promises";
import satori from "satori";
import sharp from "sharp";
import { site } from "../site";

// satori は WOFF2 を読めないので、src/assets/fonts の東雲フォントを TTF に戻したものを同梱している。
const fontFile = (name: string) => readFile(new URL(`fonts/${name}`, `file://${process.cwd()}/`));
const fonts = Promise.all([
  fontFile("shinonome14-regular.ttf").then((data) => ({
    name: "Shinonome14",
    data,
    weight: 400 as const,
  })),
  fontFile("shinonome14-bold.ttf").then((data) => ({
    name: "Shinonome14",
    data,
    weight: 700 as const,
  })),
]);

const width = 1200;
const height = 630;
const margin = 28;
const border = 4;
const padding = { x: 52, y: 40 };
// satori 0.63.2 は width と height を padding と border の外側に足し、さらに文字の折り返し幅から親の右 padding を引かない。
// 枠の中身と文字の幅を px で固定しておかないと、タイトルが右の余白や枠の外へはみ出す。
const innerWidth = width - 2 * (margin + border + padding.x);
const innerHeight = height - 2 * (margin + border + padding.y);

type Style = Record<string, string | number>;
const box = (style: Style, ...children: unknown[]) => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

export async function ogImage({
  title,
  date,
  thumbnail,
}: {
  title: string;
  date?: string;
  thumbnail?: string;
}) {
  if (thumbnail)
    return sharp(thumbnail)
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 88 })
      .toBuffer();
  const svg = await satori(
    box(
      // 着せかえは閲覧者ごとの設定なので、共有される画像は既定の赤テーマで描く。
      {
        width,
        height,
        padding: `${margin}px`,
        background: "#b33a3a",
        color: "#ffffff",
        fontFamily: "Shinonome14",
      },
      box(
        {
          flexDirection: "column",
          width: innerWidth,
          height: innerHeight,
          padding: `${padding.y}px ${padding.x}px`,
          border: `${border}px solid #ffffff`,
        },
        box(
          { alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700 },
          box({ width: 24, height: 24, background: "#ffffff" }),
          box({}, site.name),
        ),
        box(
          { flexGrow: 1, alignItems: "center" },
          box(
            {
              display: "block",
              width: innerWidth,
              fontSize: 70,
              lineHeight: 1.4,
              fontWeight: 700,
              lineClamp: 3,
            },
            title,
          ),
        ),
        box(
          {
            width: innerWidth,
            justifyContent: "space-between",
            paddingTop: 18,
            borderTop: `${border}px dotted #ffffff`,
            fontSize: 28,
          },
          box({}, date ?? ""),
          box({}, site.domain),
        ),
      ),
    ) as Parameters<typeof satori>[0],
    { width, height, fonts: await fonts },
  );
  // 白い文字と赤の境目は、既定の 4:2:0 だと色がにじんでドットの輪郭が崩れる。
  return sharp(Buffer.from(svg)).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer();
}
