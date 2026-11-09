import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const source = process.cwd();
const ambientEnv = {
  ...process.env,
  SIMOCHEE_CONTENT_DIR: "",
  SIMOCHEE_INCLUDE_DRAFTS: "",
};
const prepare = process.argv[2] === "--prepare";
const resume = process.argv[2] === "--resume";
const temp = resume ? resolve(process.argv[3]) : mkdtempSync(join(tmpdir(), "simochee-deploy-"));
assert(
  resolve(temp).startsWith(resolve(tmpdir()) + "/") &&
    basename(temp).startsWith("simochee-deploy-"),
);
const content = join(temp, "content");
const site = join(temp, "site");
const shallow = join(temp, "shallow");
const git = (...args: string[]) =>
  execFileSync("git", ["-C", content, ...args], { encoding: "utf8" });
try {
  if (!resume) {
    mkdirSync(join(content, "posts/deploy-example"), { recursive: true });
    git("init", "-b", "main");
    git("config", "user.name", "Deploy Test");
    git("config", "user.email", "deploy@example.invalid");
    for (const [day, status, body] of [
      ["01", "draft", "initial"],
      ["03", "published", "publish"],
      ["05", "published", "edit"],
    ]) {
      writeFileSync(
        join(content, "posts/deploy-example/index.md"),
        `---\ntitle: 差し替え検証のダミー\nstatus: ${status}\ntype: tech\ntags: [deploy]\n---\n\n${body}\n`,
      );
      git("add", ".");
      execFileSync("git", ["-C", content, "commit", "-m", status + day], {
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: `2025-02-${day}T12:00:00+09:00`,
          GIT_COMMITTER_DATE: `2025-02-${day}T12:00:00+09:00`,
        },
      });
    }
    cpSync(source, site, {
      recursive: true,
      filter: (path) =>
        ![".git", ".orca", ".astro", ".wrangler", "dist", "node_modules", ".vite-plus"].some(
          (name) => path === join(source, name),
        ),
    });
  }
  if (prepare) console.log(temp);
  else {
    if (!resume)
      execFileSync("pnpm", ["install", "--frozen-lockfile", "--package-import-method=copy"], {
        cwd: site,
        stdio: "inherit",
        env: { ...ambientEnv, SIMOCHEE_CONTENT_DIR: "../content/posts" },
      });
    const build = (postsDir: string) =>
      spawnSync(join(site, "node_modules/.bin/vp"), ["run", "build"], {
        cwd: site,
        encoding: "utf8",
        env: { ...ambientEnv, CI: "1", SIMOCHEE_CONTENT_DIR: postsDir },
        maxBuffer: 16 * 1024 * 1024,
      });
    const result = build("../content/posts");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = readFileSync(join(site, "dist/posts/deploy-example/index.html"), "utf8");
    assert.match(html, /datetime="2025-02-03T03:00:00.000Z"/);
    assert.match(html, /datetime="2025-02-05T03:00:00.000Z"/);
    assert.deepEqual(readdirSync(join(site, "dist/posts")), ["deploy-example"]);
    console.log(
      "Deploy replacement: only deploy-example; published=2025-02-03T03:00:00.000Z, updated=2025-02-05T03:00:00.000Z (JST 12:00).",
    );
    execFileSync("git", ["clone", "--depth=1", `file://${content}`, shallow], { stdio: "pipe" });
    const rejected = build("../shallow/posts");
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout + rejected.stderr, /git fetch --unshallow/);
    console.log(
      `CI=1 shallow clone: rejected (exit ${rejected.status}), git fetch --unshallow diagnostic verified.`,
    );
  }
} finally {
  if (!prepare && existsSync(temp) && resolve(temp).startsWith(resolve(tmpdir())))
    rmSync(temp, { recursive: true, force: true });
}
