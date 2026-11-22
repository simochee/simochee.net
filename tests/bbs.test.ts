import { expect, test } from "vitest";
import {
  addBbsPost,
  bbsPage,
  editBbsPost,
  latestBbsPosts,
  removeBbsPost,
  replyToBbsPost,
  type NewBbsPost,
} from "../src/server/bbs";
import { inkColorValue } from "../src/lib/bbs";
import { fields } from "../src/server/fields";
import { migratedD1 } from "./support/d1";

const post = (title: string, extra: Partial<NewBbsPost> = {}): NewBbsPost => ({
  title,
  name: "ことり",
  body: "本文",
  colorId: 1,
  ...extra,
});

test("書き込みは新しい順にページへ分かれ、範囲の外のページは最後のページになる", async () => {
  const db = await migratedD1();
  for (const title of ["1", "2", "3", "4", "5"]) await addBbsPost(db, post(title));
  const first = await bbsPage(db, 1, 2);
  expect(first).toMatchObject({ total: 5, page: 1, pages: 3 });
  expect(first.posts.map((item) => item.title)).toEqual(["5", "4"]);
  const beyond = await bbsPage(db, 99, 2);
  expect(beyond.page).toBe(3);
  expect(beyond.posts.map((item) => item.title)).toEqual(["1"]);
});

test("書き込みの件数は、書き込みと削除のたびに数えなおさずに合う", async () => {
  const db = await migratedD1();
  const first = await addBbsPost(db, post("1"));
  await addBbsPost(db, post("2"));
  await removeBbsPost(db, first, { admin: true });
  await expect(removeBbsPost(db, first, { admin: true })).rejects.toThrow("見つかりませんでした");
  expect((await bbsPage(db, 1, 10)).total).toBe(1);
});

test("書き込み番号は消しても詰めず、次の書き込みは続きの番号になる", async () => {
  const db = await migratedD1();
  await addBbsPost(db, post("1"));
  const second = await addBbsPost(db, post("2"));
  await removeBbsPost(db, second, { admin: true });
  expect(await addBbsPost(db, post("3"))).toBe(second + 1);
});

test("削除キーを入れた書き込みは、同じキーでだけ編集・削除できる", async () => {
  const db = await migratedD1();
  const id = await addBbsPost(db, post("元", { key: "abc123" }));
  const change = { title: "直した", body: "直した本文", colorId: 2 as const, admin: false };
  await expect(editBbsPost(db, id, { ...change, key: "zzz" })).rejects.toThrow(
    "削除キーが違います",
  );
  await editBbsPost(db, id, { ...change, key: "abc123" });
  expect((await bbsPage(db, 1, 10)).posts[0]).toMatchObject({ title: "直した", colorId: 2 });
  await removeBbsPost(db, id, { key: "abc123", admin: false });
  expect((await bbsPage(db, 1, 10)).total).toBe(0);
});

test("削除キーなしの書き込みは、書いた人には直せず、管理人は消せる", async () => {
  const db = await migratedD1();
  const id = await addBbsPost(db, post("元"));
  await expect(removeBbsPost(db, id, { key: "", admin: false })).rejects.toThrow(
    "編集・削除できません",
  );
  await removeBbsPost(db, id, { admin: true });
  expect((await bbsPage(db, 1, 10)).total).toBe(0);
});

test("管理人の返信は書き込みに付き、空にすると取り下げられる", async () => {
  const db = await migratedD1();
  const id = await addBbsPost(db, post("元"));
  await replyToBbsPost(db, id, "ありがとうございます！");
  expect((await bbsPage(db, 1, 10)).posts[0]!.reply).toBe("ありがとうございます！");
  await replyToBbsPost(db, id, undefined);
  expect((await bbsPage(db, 1, 10)).posts[0]!.reply).toBeNull();
  await expect(replyToBbsPost(db, id + 1, "ない")).rejects.toThrow("見つかりませんでした");
});

test("サイドバーには新しい書き込みから指定した件数だけを出す", async () => {
  const db = await migratedD1();
  for (const title of ["1", "2", "3"]) await addBbsPost(db, post(title, { body: `本文${title}` }));
  expect((await latestBbsPosts(db, 2)).map((item) => item.body)).toEqual(["本文3", "本文2"]);
});

test("文字色はフォームから番号で届き、表にない番号は受け付けない", () => {
  expect(fields.inkColor.parse("2")).toBe(2);
  expect(fields.inkColor.safeParse("7").success).toBe(false);
  expect(fields.inkColor.safeParse("#333333").success).toBe(false);
});

test("文字色の番号は色に引けて、やめた色の書き込みは黒で出る", () => {
  expect(inkColorValue(2)).toBe("#1f5fb8");
  expect(inkColorValue(99)).toBe("#333333");
});
