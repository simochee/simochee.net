import { expect, test } from "vitest";
import {
  addBbsPost,
  bbsInbox,
  bbsPage,
  editBbsPost,
  latestBbsPosts,
  removeBbsPost,
  replyToBbsPost,
  type NewBbsPost,
} from "../src/server/bbs";
import { migratedD1 } from "./support/d1";

const post = (title: string, extra: Partial<NewBbsPost> = {}): NewBbsPost => ({
  title,
  name: "ことり",
  body: "本文",
  color: "#333333",
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

test("書き込み番号は消しても詰めず、次の書き込みは続きの番号になる", async () => {
  const db = await migratedD1();
  await addBbsPost(db, post("1"));
  const second = await addBbsPost(db, post("2"));
  await removeBbsPost(db, second, { admin: true });
  expect(await addBbsPost(db, post("3"))).toBe(second + 1);
});

test("メールアドレスは掲示板には出さず、管理画面でだけ見える", async () => {
  const db = await migratedD1();
  await addBbsPost(db, post("1", { email: "kotori@example.com" }));
  expect((await bbsPage(db, 1, 10)).posts[0]).not.toHaveProperty("email");
  expect((await bbsInbox(db, 10))[0]!.email).toBe("kotori@example.com");
});

test("削除キーを入れた書き込みは、同じキーでだけ編集・削除できる", async () => {
  const db = await migratedD1();
  const id = await addBbsPost(db, post("元", { key: "abc123" }));
  const change = { title: "直した", body: "直した本文", color: "#1f3f8f" as const, admin: false };
  await expect(editBbsPost(db, id, { ...change, key: "zzz" })).rejects.toThrow(
    "削除キーが違います",
  );
  await editBbsPost(db, id, { ...change, key: "abc123" });
  expect((await bbsPage(db, 1, 10)).posts[0]).toMatchObject({ title: "直した", color: "#1f3f8f" });
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
