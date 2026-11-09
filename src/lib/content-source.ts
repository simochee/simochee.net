import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";

export type ContentSource = {
  postsDir: string;
  git?: { root: string; path: string };
};

const defaultPostsPath = "content/posts";

function gitToplevel(dir: string) {
  const result = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

export function resolveContentSource(
  siteRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): ContentSource {
  const external = env.SIMOCHEE_CONTENT_DIR
    ? resolve(siteRoot, env.SIMOCHEE_CONTENT_DIR)
    : undefined;
  if (external && !existsSync(external))
    throw new Error(
      `SIMOCHEE_CONTENT_DIR が存在しません: ${external}\n` +
        "ダミー記事に戻すには SIMOCHEE_CONTENT_DIR= vp run dev のように空にして実行してください。",
    );
  const postsDir = external ?? resolve(siteRoot, defaultPostsPath);
  const gitRoot = env.SIMOCHEE_CONTENT_GIT_ROOT ?? (external ? gitToplevel(external) : siteRoot);
  if (!gitRoot) return { postsDir };
  const gitPath =
    env.SIMOCHEE_CONTENT_GIT_PATH ??
    (external ? relative(realpathSync(gitRoot), realpathSync(external)) : defaultPostsPath);
  return { postsDir, git: { root: gitRoot, path: gitPath || "." } };
}
