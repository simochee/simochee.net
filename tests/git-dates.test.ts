import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, expect, test, vi } from "vitest";
import { readHistory, resolveDates } from "../src/lib/git-dates";
import { frontmatterSchema } from "../src/content/schema";
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});
function repo() {
  const dir = mkdtempSync(join(tmpdir(), "simochee-history-"));
  dirs.push(dir);
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.invalid");
  mkdirSync(join(dir, "posts/example"), { recursive: true });
  const commit = (status: string, day: number, body = "") => {
    writeFileSync(
      join(dir, "posts/example/index.md"),
      `---\ntitle: test\nstatus: ${status}\ntype: tech\n---\n${body}`,
    );
    git("add", ".");
    execFileSync("git", ["-C", dir, "commit", "-m", `day ${day}`], {
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: `2025-01-${String(day).padStart(2, "0")}T12:00:00+09:00`,
        GIT_COMMITTER_DATE: `2025-01-${String(day).padStart(2, "0")}T12:00:00+09:00`,
      },
    });
  };
  return { dir, git, commit };
}
const fm = frontmatterSchema.parse({ title: "test", status: "published", type: "tech" });
test("初めて published を追加したコミッター日時を公開日にする", () => {
  const r = repo();
  r.commit("draft", 1);
  r.commit("published", 3);
  expect(
    resolveDates(fm, readHistory(r.dir, "posts").get("example")).publishedAt.toISOString(),
  ).toBe("2025-01-03T03:00:00.000Z");
});
test("下書き中の編集は更新日に数えない", () => {
  const r = repo();
  r.commit("draft", 1);
  r.commit("draft", 2, "edit");
  r.commit("published", 3, "edit");
  expect(resolveDates(fm, readHistory(r.dir, "posts").get("example")).updatedAt).toBeUndefined();
});
test("再公開しても最初の公開日を維持する", () => {
  const r = repo();
  r.commit("published", 1);
  r.commit("draft", 2);
  r.commit("published", 3);
  expect(readHistory(r.dir, "posts").get("example")?.publishedAt?.toISOString()).toBe(
    "2025-01-01T03:00:00.000Z",
  );
});
test("公開後の編集を更新日にする", () => {
  const r = repo();
  r.commit("published", 1);
  r.commit("published", 4, "edit");
  expect(
    resolveDates(fm, readHistory(r.dir, "posts").get("example")).updatedAt?.toISOString(),
  ).toBe("2025-01-04T03:00:00.000Z");
});
test("frontmatter の日時が git より優先され日付のみは JST になる", () => {
  const result = resolveDates(
    { ...fm, date: "2024-12-01", updated: "2024-12-02T12:00:00+09:00" },
    { publishedAt: new Date("2025-01-01"), latestAt: new Date("2025-01-02") },
  );
  expect(result.publishedAt.toISOString()).toBe("2024-11-30T15:00:00.000Z");
  expect(result.updatedAt?.toISOString()).toBe("2024-12-02T03:00:00.000Z");
});
test("ブランチ上の公開は first-parent のマージ日時になる", () => {
  const r = repo();
  r.commit("draft", 1);
  r.git("checkout", "-b", "article");
  r.commit("published", 2);
  r.git("checkout", "main");
  execFileSync("git", ["-C", r.dir, "merge", "--no-ff", "article", "-m", "land"], {
    env: { ...process.env, GIT_COMMITTER_DATE: "2025-01-05T12:00:00+09:00" },
  });
  expect(readHistory(r.dir, "posts").get("example")?.publishedAt?.toISOString()).toBe(
    "2025-01-05T03:00:00.000Z",
  );
});
test("浅い clone は CI で明確なエラーにする", () => {
  const r = repo();
  r.commit("draft", 1);
  r.commit("published", 2);
  const clone = mkdtempSync(join(tmpdir(), "simochee-shallow-"));
  dirs.push(clone);
  execFileSync("git", ["clone", "--depth=1", `file://${r.dir}`, clone]);
  expect(() => readHistory(clone, "posts", true)).toThrow("git fetch --unshallow");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(readHistory(clone, "posts", false).size).toBe(0);
});
test("未コミットの公開記事は CI で失敗しローカルでは警告と現在日時を使う", () => {
  expect(() => resolveDates(fm, undefined, { ci: true })).toThrow("公開日が git 履歴にありません");
  const warn = vi.fn();
  const now = new Date("2025-02-01T00:00:00Z");
  expect(resolveDates(fm, undefined, { ci: false, now, warn }).publishedAt).toEqual(now);
  expect(warn).toHaveBeenCalledOnce();
});
test("コミットがまだないリポジトリには日時を割り当てない", () => {
  const r = repo();
  expect(readHistory(r.dir, "posts").size).toBe(0);
});
