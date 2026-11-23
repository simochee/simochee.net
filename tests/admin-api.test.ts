import type { APIContext } from "astro";
import { beforeEach, expect, test, vi } from "vitest";
import { migratedD1 } from "./support/d1";
import { threadOf, inboxComments, recentComments } from "../src/server/comments";
import { bbsInbox, bbsPage, latestBbsPosts } from "../src/server/bbs";
import { site } from "../src/site";

const state = vi.hoisted(() => ({
  db: undefined as unknown,
  env: {
    ACCESS_TEAM_DOMAIN: "",
    ACCESS_AUD: "",
    ACTION_LIMIT: { limit: async () => ({ success: true }) },
    POST_LIMIT: { limit: async () => ({ success: true }) },
  },
}));
vi.mock("cloudflare:workers", () => ({ env: state.env }));
vi.mock("../src/server/db", () => ({ database: async () => state.db }));
vi.mock("../src/server/posts", () => ({
  publishedPosts: async () => new Map([["published", { id: "published", title: "公開記事" }]]),
  publishedPost: async (slug: string) => {
    if (slug !== "published") {
      const { HttpError } = await import("../src/server/http");
      throw new HttpError(404, "記事が見つかりませんでした。");
    }
    return { id: slug, title: "公開記事" };
  },
}));
import { POST as postComment } from "../src/pages/api/admin/comments/index";
import { POST as postBbs } from "../src/pages/api/admin/bbs/index";
import { DELETE as deleteComment } from "../src/pages/api/comments/[id]";
import { DELETE as deleteBbs, PATCH as patchBbs } from "../src/pages/api/bbs/[id]/index";
import { requireAdmin } from "../src/server/admin";
import { POST as publicComment } from "../src/pages/api/comments/index";
import { POST as publicBbs } from "../src/pages/api/bbs/index";
import { DELETE as adminDeleteComment } from "../src/pages/api/admin/comments/[id]";
import { DELETE as adminDeleteBbs } from "../src/pages/api/admin/bbs/[id]/index";
import { PUT as adminReply } from "../src/pages/api/admin/bbs/[id]/reply";
import { GET as inbox } from "../src/pages/api/admin/inbox";

beforeEach(async () => {
  state.db = await migratedD1();
  state.env.ACCESS_TEAM_DOMAIN = "";
  state.env.ACCESS_AUD = "";
  vi.stubEnv("DEV", true);
});
const db = () => state.db as Awaited<ReturnType<typeof migratedD1>>;
const context = (body: unknown = {}, method = "POST", id?: number) =>
  ({
    request: new Request("https://simochee.net/api/admin/", {
      method,
      headers: { "Content-Type": "application/json", Cookie: "CF_Authorization=fake" },
      body: method === "GET" ? undefined : JSON.stringify(body),
    }),
    url: new URL("https://simochee.net/api/admin/"),
    cookies: { get: () => ({ value: "fake" }) },
    params: { id: String(id) },
  }) as unknown as APIContext;

test("管理画面のコメントは表示名と管理人の印を保存し、公開の取得結果にも出す", async () => {
  const response = await postComment(
    context({
      slug: "published",
      title: "返事",
      body: "本文",
      name: "偽物",
      private: true,
      password: "secret",
    }),
  );
  expect(response.status).toBe(201);
  const { id } = await response.json();
  expect(await threadOf(db(), "published")).toEqual([
    expect.objectContaining({ id, name: site.author.name, admin: true, deletable: false }),
  ]);
  expect(await recentComments(db(), ["published"], 10)).toEqual([
    expect.objectContaining({ admin: true }),
  ]);
  expect(await inboxComments(db(), 10)).toEqual([
    expect.objectContaining({ admin: true, private: false }),
  ]);
  expect(
    await db().prepare("SELECT admin, password_hash FROM comments WHERE id = ?").bind(id).first(),
  ).toEqual({ admin: 1, password_hash: null });
  expect((await deleteComment(context({}, "DELETE", id))).status).toBe(403);
});
test("公開されていない記事には管理人もコメントできない", async () => {
  expect((await postComment(context({ slug: "draft", title: "返事", body: "本文" }))).status).toBe(
    404,
  );
  expect(await inboxComments(db(), 10)).toEqual([]);
});
test("管理画面の掲示板投稿は管理人の印を保存し、公開の取得結果にも出す", async () => {
  const response = await postBbs(
    context({ title: "お知らせ", body: "本文", colorId: 2, key: "secret", name: "偽物" }),
  );
  expect(response.status).toBe(201);
  const { id } = await response.json();
  expect((await bbsPage(db(), 1, 10)).posts).toEqual([
    expect.objectContaining({ id, name: site.author.name, admin: true, editable: false }),
  ]);
  expect(await latestBbsPosts(db(), 10)).toEqual([expect.objectContaining({ admin: true })]);
  expect(await bbsInbox(db(), 10)).toEqual([expect.objectContaining({ admin: true })]);
  expect(
    await db().prepare("SELECT admin, key_hash FROM bbs_posts WHERE id = ?").bind(id).first(),
  ).toEqual({ admin: 1, key_hash: null });
  expect((await deleteBbs(context({}, "DELETE", id))).status).toBe(403);
  expect(
    (await patchBbs(context({ title: "改変", body: "本文", colorId: 2 }, "PATCH", id)))
      .status,
  ).toBe(403);
});
test("本番では設定が空なら管理人 API を利用できない", async () => {
  vi.stubEnv("DEV", false);
  expect((await postBbs(context({ title: "題", body: "本文", colorId: 2 }))).status).toBe(
    503,
  );
  expect(
    (await postComment(context({ slug: "published", title: "題", body: "本文" }))).status,
  ).toBe(503);
});
test("dev でも Access を設定したら認証を省かない", async () => {
  state.env.ACCESS_TEAM_DOMAIN = "test.cloudflareaccess.com";
  state.env.ACCESS_AUD = "app";
  await expect(requireAdmin(context())).rejects.toMatchObject({ status: 401 });
});

test("公開フォームで管理人の名前と印を送っても管理人の投稿にはならない", async () => {
  expect(
    (
      await publicComment(
        context({
          slug: "published",
          title: "題",
          body: "本文",
          name: site.author.name,
          admin: true,
        }),
      )
    ).status,
  ).toBe(201);
  expect(
    (
      await publicBbs(
        context({
          title: "題",
          body: "本文",
          colorId: 2,
          name: site.author.name,
          admin: true,
        }),
      )
    ).status,
  ).toBe(201);
  expect(await threadOf(db(), "published")).toEqual([
    expect.objectContaining({ name: site.author.name, admin: false }),
  ]);
  expect((await bbsPage(db(), 1, 10)).posts).toEqual([
    expect.objectContaining({ name: site.author.name, admin: false }),
  ]);
});

test("すべての管理人 API は本番の未設定と不正なトークンを拒否する", async () => {
  vi.stubEnv("DEV", false);
  for (const route of [
    postComment,
    postBbs,
    adminDeleteComment,
    adminDeleteBbs,
    adminReply,
    inbox,
  ]) {
    expect((await route(context({}, "POST", 1))).status).toBe(503);
  }
  state.env.ACCESS_TEAM_DOMAIN = "test.cloudflareaccess.com";
  state.env.ACCESS_AUD = "app";
  for (const route of [
    postComment,
    postBbs,
    adminDeleteComment,
    adminDeleteBbs,
    adminReply,
    inbox,
  ]) {
    expect((await route(context({}, "POST", 1))).status).toBe(401);
  }
});

test("管理人の専用 API は非公開コメントを削除し、掲示板の返信と削除ができる", async () => {
  const comment = await publicComment(
    context({ slug: "published", title: "題", body: "非公開", name: "読者", private: true }),
  );
  const { id: commentId } = await comment.json();
  const post = await postBbs(context({ title: "題", body: "本文", colorId: 2 }));
  const { id: postId } = await post.json();
  const data = await (await inbox(context({}, "GET"))).json();
  expect(data.posts).toEqual([{ slug: "published", title: "公開記事" }]);
  expect(data.comments).toEqual([expect.objectContaining({ private: true })]);
  expect((await adminReply(context({ reply: "管理人の返信" }, "PUT", postId))).status).toBe(200);
  expect((await bbsPage(db(), 1, 10)).posts[0]?.reply).toBe("管理人の返信");
  expect((await adminDeleteComment(context({}, "DELETE", commentId))).status).toBe(200);
  expect((await adminDeleteBbs(context({}, "DELETE", postId))).status).toBe(200);
  expect(await inboxComments(db(), 10)).toEqual([]);
  expect((await bbsPage(db(), 1, 10)).total).toBe(0);
});
