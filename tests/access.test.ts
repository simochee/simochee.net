import { beforeAll, expect, test } from "vitest";
import { customFetch, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { verifyAccess } from "../src/server/access";

const config = { ACCESS_TEAM_DOMAIN: "test.cloudflareaccess.com", ACCESS_AUD: "admin-app" };
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let wrongKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let jwk: Awaited<ReturnType<typeof exportJWK>>;
beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  wrongKeys = await generateKeyPair("RS256");
  jwk = await exportJWK(keys.publicKey);
});
const options = {
  [customFetch]: async (url: string | URL) => {
    expect(String(url)).toBe("https://test.cloudflareaccess.com/cdn-cgi/access/certs");
    return Response.json({ keys: [{ ...jwk, kid: "access", alg: "RS256" }] });
  },
};
async function token(claims: JWTPayload = {}, signing = keys) {
  return new SignJWT({
    iss: "https://test.cloudflareaccess.com",
    aud: ["other", "admin-app"],
    exp: Math.floor(Date.now() / 1000) + 60,
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "access" })
    .sign(signing.privateKey);
}
const request = (jwt?: string) =>
  new Request("https://simochee.net/api/admin/inbox/", {
    headers: jwt === undefined ? {} : { "Cf-Access-Jwt-Assertion": jwt },
  });

test("正しい署名と対象のトークンをヘッダーで受け取れば通る", async () => {
  await expect(
    verifyAccess(request(await token()), undefined, config, options),
  ).resolves.toBeUndefined();
});
test("ヘッダーがなければ認証 cookie のトークンを検証する", async () => {
  await expect(verifyAccess(request(), await token(), config, options)).resolves.toBeUndefined();
});
test("不正なヘッダーがあると、正しい cookie でも通らない", async () => {
  await expect(
    verifyAccess(request("invalid"), await token(), config, options),
  ).rejects.toMatchObject({ status: 401 });
});
test.each([
  ["対象が違う", { aud: "another-app" }],
  ["期限が切れた", { exp: 1 }],
  ["まだ有効でない", { nbf: Math.floor(Date.now() / 1000) + 3600 }],
  ["発行元が違う", { iss: "https://elsewhere.cloudflareaccess.com" }],
  ["期限がない", { exp: undefined }],
])("%sトークンは拒否する", async (_, claims) => {
  await expect(
    verifyAccess(request(await token(claims)), undefined, config, options),
  ).rejects.toMatchObject({ status: 401 });
});
test("署名の鍵が違うトークンは拒否する", async () => {
  await expect(
    verifyAccess(request(await token({}, wrongKeys)), undefined, config, options),
  ).rejects.toMatchObject({ status: 401 });
});
test("トークンがなければ拒否する", async () => {
  await expect(verifyAccess(request(), undefined, config, options)).rejects.toMatchObject({
    status: 401,
  });
});
test.each([
  {},
  { ACCESS_TEAM_DOMAIN: config.ACCESS_TEAM_DOMAIN },
  { ACCESS_AUD: config.ACCESS_AUD },
  { ...config, ACCESS_AUD: " " },
])("設定が足りなければ認証せず利用不可にする", async (settings) => {
  await expect(
    verifyAccess(request(await token()), undefined, settings, options),
  ).rejects.toMatchObject({ status: 503 });
});
