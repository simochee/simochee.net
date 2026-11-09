import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";
import { resolveContentSource } from "../src/lib/content-source";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function temp() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "simochee-source-")));
  dirs.push(dir);
  return dir;
}
function gitRepoWithPosts() {
  const repo = temp();
  execFileSync("git", ["-C", repo, "init", "-b", "main"], { stdio: "pipe" });
  mkdirSync(join(repo, "posts"));
  return repo;
}
const site = "/site";

test("環境変数がなければダミー記事のディレクトリを使う", () => {
  expect(resolveContentSource(site, {})).toEqual({
    postsDir: "/site/content/posts",
    git: { root: "/site", path: "content/posts" },
  });
});

test("空文字の SIMOCHEE_CONTENT_DIR は未設定と同じ扱いになる", () => {
  expect(resolveContentSource(site, { SIMOCHEE_CONTENT_DIR: "" })).toEqual(
    resolveContentSource(site, {}),
  );
});

test("絶対パスの記事ディレクトリを選べる", () => {
  const repo = gitRepoWithPosts();
  expect(resolveContentSource(site, { SIMOCHEE_CONTENT_DIR: join(repo, "posts") }).postsDir).toBe(
    join(repo, "posts"),
  );
});

test("相対パスの記事ディレクトリはサイトのルートから解決する", () => {
  const root = temp();
  mkdirSync(join(root, "articles"));
  expect(resolveContentSource(root, { SIMOCHEE_CONTENT_DIR: "articles" }).postsDir).toBe(
    resolve(root, "articles"),
  );
});

test("存在しない記事ディレクトリは変数名と戻し方を示してエラーにする", () => {
  expect(() => resolveContentSource(site, { SIMOCHEE_CONTENT_DIR: "/nonexistent" })).toThrow(
    /SIMOCHEE_CONTENT_DIR.*\n.*SIMOCHEE_CONTENT_DIR= pnpm exec vp run dev/,
  );
});

test("記事ディレクトリから git ルートと相対パスを導出する", () => {
  const repo = gitRepoWithPosts();
  expect(resolveContentSource(site, { SIMOCHEE_CONTENT_DIR: join(repo, "posts") }).git).toEqual({
    root: repo,
    path: "posts",
  });
});

test("git リポジトリの直下を記事ディレクトリにできる", () => {
  const repo = gitRepoWithPosts();
  expect(resolveContentSource(site, { SIMOCHEE_CONTENT_DIR: repo }).git).toEqual({
    root: repo,
    path: ".",
  });
});

test("明示した git 環境変数は導出より優先する", () => {
  const repo = gitRepoWithPosts();
  expect(
    resolveContentSource(site, {
      SIMOCHEE_CONTENT_DIR: join(repo, "posts"),
      SIMOCHEE_CONTENT_GIT_ROOT: "/explicit",
      SIMOCHEE_CONTENT_GIT_PATH: "explicit-posts",
    }).git,
  ).toEqual({ root: "/explicit", path: "explicit-posts" });
});

test("記事ディレクトリが git の外にあれば履歴なしとして扱う", () => {
  const outside = temp();
  expect(resolveContentSource(site, { SIMOCHEE_CONTENT_DIR: outside }).git).toBeUndefined();
});
