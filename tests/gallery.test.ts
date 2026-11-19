import { expect, test } from "vitest";
import { photos } from "../src/lib/gallery";

const post = (id: string, iso: string, images: [string, string][]) => ({
  id,
  data: {
    title: `${id}の記事`,
    publishedAt: new Date(iso),
    images: images.map(([src, alt]) => ({ src, alt })),
  },
});

test("写真は記事の新しい順で、同じ記事の中では本文に出てくる順に並ぶ", () => {
  const list = photos([
    post("old", "2026-10-01T00:00:00Z", [["old.png", "古い"]]),
    post("new", "2026-11-01T00:00:00Z", [
      ["a.png", "一枚目"],
      ["b.png", "二枚目"],
    ]),
  ]);
  expect(list.map((photo) => photo.src)).toEqual(["a.png", "b.png", "old.png"]);
});
test("説明のない写真は記事のタイトルを題にする", () => {
  const [photo] = photos([post("new", "2026-11-01T00:00:00Z", [["a.png", "  "]])]);
  expect(photo).toMatchObject({ caption: "newの記事", postId: "new", postTitle: "newの記事" });
});
test("画像のない記事は写真に出ない", () => {
  expect(photos([post("none", "2026-11-01T00:00:00Z", [])])).toEqual([]);
});
