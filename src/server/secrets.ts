const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function sha256(text: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

/** 文字列を、一致するまでの長さで時間が変わらないように比べる。 */
export function sameText(a: string, b: string) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

/**
 * 削除キーやコメントのパスワードを、ソルト付きで保存できる形にする。
 * PBKDF2 のような重い関数にしないのは、Workers の無料枠の CPU 時間（1 回 10ms）に収めるため。
 * 守る対象は掲示板の書き込みの編集・削除なので、この強さで足りる。
 */
export async function hashSecret(secret: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `${salt}:${await sha256(`${salt}:${secret}`)}`;
}

export async function matchesSecret(secret: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return sameText(await sha256(`${salt}:${secret}`), hash);
}

async function hmac(key: string, message: string) {
  const imported = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", imported, encoder.encode(message)));
}

/** 期限つきの署名。鍵を変えると、それまでに出した署名はすべて通らなくなる。 */
export async function signUntil(key: string, expiresAt: number) {
  return `${expiresAt}.${await hmac(key, String(expiresAt))}`;
}

export async function verifySigned(key: string, token: string | undefined, now = Date.now()) {
  const [expiresAt, signature] = token?.split(".") ?? [];
  if (!expiresAt || !signature || Number(expiresAt) < now) return false;
  return sameText(await hmac(key, expiresAt), signature);
}
