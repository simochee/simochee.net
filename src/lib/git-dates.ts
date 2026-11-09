import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseDate, type Frontmatter } from "../content/schema";

export type History = { publishedAt?: Date; latestAt?: Date };
export const isCI = (env: NodeJS.ProcessEnv = process.env) =>
  env.CI !== undefined || env.WORKERS_CI !== undefined;
export function readHistory(root: string, postsPath: string, ci = isCI()): Map<string, History> {
  const git = (args: string[]) =>
    execFileSync("git", ["-C", resolve(root), ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  const shallow = git(["rev-parse", "--is-shallow-repository"]).trim() === "true";
  if (shallow) {
    const message =
      "投稿の日時には完全な git 履歴が必要です。git fetch --unshallow を実行してください。";
    if (ci) throw new Error(message);
    console.warn(message);
    return new Map();
  }
  const head = spawnSync("git", ["-C", resolve(root), "rev-parse", "--verify", "--quiet", "HEAD"]);
  if (head.status === 1) return new Map();
  if (head.status !== 0) throw new Error("git HEAD を読み取れません");
  const log = git([
    "-c",
    "core.quotePath=false",
    "log",
    "--first-parent",
    "--diff-merges=first-parent",
    "--reverse",
    "--format=%x00%ct",
    "--patch",
    "--unified=0",
    "--no-renames",
    "--",
    postsPath,
  ]);
  const history = new Map<string, History>();
  let date: Date | undefined;
  let entry: History | undefined;
  for (const line of log.split("\n")) {
    if (line.startsWith("\0")) {
      date = new Date(Number(line.slice(1)) * 1000);
      entry = undefined;
    } else if (line.startsWith("diff --git ")) {
      entry = undefined;
    } else if (line.startsWith("+++ b/")) {
      const path = line.slice(6);
      const prefix = `${postsPath.replace(/\/$/, "").replace(/^\.\//, "")}/`;
      const match =
        path.startsWith(prefix) &&
        path.slice(prefix.length).match(/^([a-z0-9]+(?:-[a-z0-9]+)*)\/index\.(md|mdx)$/);
      if (match && date) {
        entry = history.get(match[1]) ?? {};
        entry.latestAt = date;
        history.set(match[1], entry);
      }
    } else if (/^\+status:\s*published\s*$/.test(line) && entry && !entry.publishedAt)
      entry.publishedAt = date;
  }
  return history;
}
export function resolveDates(
  frontmatter: Frontmatter,
  history: History | undefined,
  options: { ci?: boolean; now?: Date; warn?: (message: string) => void } = {},
) {
  let publishedAt = frontmatter.date ? parseDate(frontmatter.date) : history?.publishedAt;
  if (!publishedAt) {
    if (frontmatter.status === "published") {
      const message = `公開日が git 履歴にありません: ${frontmatter.title}。status: published のコミットまたは date が必要です。`;
      if (options.ci ?? isCI()) throw new Error(message);
      (options.warn ?? console.warn)(message);
    }
    publishedAt = options.now ?? new Date();
  }
  const updatedAt = frontmatter.updated ? parseDate(frontmatter.updated) : history?.latestAt;
  return { publishedAt, updatedAt: updatedAt && updatedAt > publishedAt ? updatedAt : undefined };
}
