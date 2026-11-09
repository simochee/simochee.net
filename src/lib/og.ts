import { readFile } from "node:fs/promises";
import satori from "satori";
import sharp from "sharp";
const font = readFile(new URL("fonts/MPLUS1p-Regular.ttf", `file://${process.cwd()}/`));
export async function ogImage(title: string, thumbnail?: string) {
  if (thumbnail)
    return sharp(thumbnail).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#f5f5f0",
          color: "#182521",
          padding: "72px",
          fontFamily: "M PLUS 1p",
        },
        children: [
          {
            type: "div",
            props: {
              style: { fontSize: 56, lineHeight: 1.5, wordBreak: "break-all" },
              children: title,
            },
          },
          {
            type: "div",
            props: { style: { fontSize: 28, marginTop: 40 }, children: "simochee.net" },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "M PLUS 1p", data: await font, weight: 400, style: "normal" }],
    },
  );
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}
