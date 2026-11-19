import { expect, test } from "vitest";
import {
  addComment,
  commentCounts,
  editComment,
  inboxComments,
  recentComments,
  removeComment,
  syncReplies,
  threadOf,
  type NewComment,
  type Reply,
} from "../src/server/comments";
import { migratedD1 } from "./support/d1";

const comment = (slug: string, name: string, extra: Partial<NewComment> = {}): NewComment => ({
  slug,
  name,
  title: "題名",
  body: "本文",
  private: false,
  ...extra,
});
const at = (time: string) => new Date(`2026-11-18T${time}:00+09:00`);

async function sample() {
  const db = await migratedD1();
  await addComment(db, comment("morning", "後"), at("21:00"));
  await addComment(db, comment("morning", "先"), at("10:00"));
  await addComment(db, comment("template", "中"), at("12:00"));
  await addComment(db, comment("draft", "下書き"), at("23:00"));
  await addComment(db, comment("morning", "ないしょ", { private: true }), at("22:00"));
  return db;
}
const published = ["morning", "template", "quiet"];

test("記事のコメント欄は書かれた順に並び、1 から通し番号が付く", async () => {
  const thread = await threadOf(await sample(), "morning");
  expect(thread.map((item) => [item.name, item.number])).toEqual([
    ["先", 1],
    ["後", 2],
  ]);
});

test("非公開コメントは、記事のコメント欄にも件数にも最新コメントにも出ない", async () => {
  const db = await sample();
  expect((await threadOf(db, "morning")).map((item) => item.name)).not.toContain("ないしょ");
  expect((await commentCounts(db, published)).morning).toBe(2);
  expect((await recentComments(db, published, 10)).map((item) => item.name)).not.toContain(
    "ないしょ",
  );
});

test("非公開コメントも、管理画面ではメールアドレスとともに読める", async () => {
  const db = await sample();
  await addComment(db, comment("morning", "メール", { email: "a@example.com" }), at("23:30"));
  const inbox = await inboxComments(db, 10);
  expect(inbox[0]).toMatchObject({ name: "メール", email: "a@example.com" });
  expect(inbox.find((item) => item.name === "ないしょ")?.private).toBe(true);
});

test("公開されていない記事のコメントは、件数にも最新コメントにも入らない", async () => {
  const db = await sample();
  expect(await commentCounts(db, published)).toEqual({ morning: 2, template: 1 });
  expect((await recentComments(db, published, 10)).map((item) => item.slug)).not.toContain("draft");
});

test("最新コメントは記事をまたいで新しい順に並び、その記事のコメント欄での番号を持つ", async () => {
  const recent = await recentComments(await sample(), published, 2);
  expect(recent.map((item) => [item.slug, item.name, item.number])).toEqual([
    ["morning", "後", 2],
    ["template", "中", 1],
  ]);
});

test("パスワードを付けて書いたコメントは、同じパスワードでだけ編集・削除できる", async () => {
  const db = await migratedD1();
  const id = await addComment(db, comment("morning", "書いた人", { password: "himitsu" }));
  expect((await threadOf(db, "morning"))[0]!.editable).toBe(true);
  await expect(
    editComment(db, id, { password: "chigau", title: "直した", body: "直した", admin: false }),
  ).rejects.toThrow("パスワードが違います");
  await editComment(db, id, {
    password: "himitsu",
    title: "直した",
    body: "直した本文",
    admin: false,
  });
  expect((await threadOf(db, "morning"))[0]).toMatchObject({ title: "直した", body: "直した本文" });
  await removeComment(db, id, { password: "himitsu", admin: false });
  expect(await threadOf(db, "morning")).toEqual([]);
});

test("パスワードなしで書いたコメントは、書いた人には直せず、管理人は消せる", async () => {
  const db = await migratedD1();
  const id = await addComment(db, comment("morning", "書いた人"));
  expect((await threadOf(db, "morning"))[0]!.editable).toBe(false);
  await expect(removeComment(db, id, { password: "", admin: false })).rejects.toThrow(
    "編集・削除できません",
  );
  await removeComment(db, id, { admin: true });
  expect(await threadOf(db, "morning")).toEqual([]);
});

const reply = (source: string, body = "返信"): Reply => ({
  source,
  name: "pochi",
  body,
  url: `https://bsky.app/${source}`,
  at: "2026-11-18T01:00:00.000Z",
});

test("Bluesky・Mastodon の返信は、取ってきた一覧に合わせて足し、書き直しを映し、消えたものを消す", async () => {
  const db = await migratedD1();
  await syncReplies(db, "morning", "bsky", [reply("a"), reply("b")], "Blueskyからの返信");
  await syncReplies(
    db,
    "morning",
    "bsky",
    [reply("a", "書き直した"), reply("c")],
    "Blueskyからの返信",
  );
  const thread = await threadOf(db, "morning");
  expect(thread.map((item) => [item.body, item.via, item.title])).toEqual([
    ["書き直した", "bsky", "Blueskyからの返信"],
    ["返信", "bsky", "Blueskyからの返信"],
  ]);
  expect(thread.every((item) => !item.editable)).toBe(true);
});

test("取り込んだ返信を管理人が消すと非公開になり、次の同期でも表に戻らない", async () => {
  const db = await migratedD1();
  await syncReplies(db, "morning", "mastodon", [reply("a")], "Mastodonからの返信");
  const [imported] = await threadOf(db, "morning");
  await removeComment(db, imported!.id, { admin: true });
  await syncReplies(db, "morning", "mastodon", [reply("a")], "Mastodonからの返信");
  expect(await threadOf(db, "morning")).toEqual([]);
  expect((await inboxComments(db, 10))[0]?.private).toBe(true);
});
