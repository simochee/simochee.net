import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const avatarName = /^_avatar\.(png|jpe?g|webp)$/;

export function isAvatarFile(name: string) {
  return avatarName.test(name);
}

export function pickAvatar(names: string[], dir: string) {
  const avatars = names.filter(isAvatarFile).sort();
  if (avatars.length > 1)
    throw new Error(`アイコン画像（_avatar.*）は1枚だけ置けます: ${avatars.join("、")}（${dir}）`);
  return avatars[0];
}

export async function findAvatar(dir: string) {
  const name = pickAvatar(await readdir(dir), dir);
  return name ? resolve(dir, name) : undefined;
}
