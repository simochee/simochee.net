import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { findAvatar, pickAvatar } from "../src/lib/avatar";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
async function postsDir(...files: string[]) {
  const dir = await mkdtemp(join(tmpdir(), "simochee-avatar-"));
  dirs.push(dir);
  for (const file of files) await writeFile(join(dir, file), "");
  return dir;
}

test("アイコン画像がなければ何も返さない", async () => {
  expect(await findAvatar(await postsDir("_site.yaml"))).toBeUndefined();
});

test.each(["_avatar.png", "_avatar.jpg", "_avatar.jpeg", "_avatar.webp"])(
  "%s を記事ディレクトリ直下から見つける",
  async (name) => {
    const dir = await postsDir("_site.yaml", name);
    expect(await findAvatar(dir)).toBe(join(dir, name));
  },
);

test.each(["_avatar.gif", "avatar.png", "_avatar.png.bak", "thumbnail.png", "x_avatar.png"])(
  "対象外のファイル名 %s は無視する",
  (name) => {
    expect(pickAvatar([name], "/posts")).toBeUndefined();
  },
);

test("2枚以上あると重複しているファイルとディレクトリを示すエラーになる", async () => {
  const dir = await postsDir("_avatar.webp", "_avatar.png");
  await expect(findAvatar(dir)).rejects.toThrow(`_avatar.png、_avatar.webp（${dir}）`);
});
