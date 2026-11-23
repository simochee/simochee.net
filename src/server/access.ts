import {
  createRemoteJWKSet,
  jwtVerify,
  jwksCache,
  type ExportedJWKSCache,
  type RemoteJWKSetOptions,
} from "jose";
import { HttpError } from "./http";

const caches = new Map<string, ExportedJWKSCache>();

export async function verifyAccess(
  request: Request,
  cookie: string | undefined,
  config: { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string },
  options: RemoteJWKSetOptions = {},
) {
  const domain = config.ACCESS_TEAM_DOMAIN?.trim();
  const audience = config.ACCESS_AUD?.trim();
  if (!domain || !audience) throw new HttpError(503, "Cloudflare Access の設定がありません。");
  const token = request.headers.get("Cf-Access-Jwt-Assertion") ?? cookie;
  if (!token) throw new HttpError(401, "Cloudflare Access でログインしてください。");
  try {
    if (!/^[a-zA-Z0-9-]+\.cloudflareaccess\.com$/.test(domain)) throw new Error("Access domain");
    const issuer = `https://${domain}`;
    const cache = caches.get(domain) ?? {};
    const keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
      ...options,
      [jwksCache]: cache,
    });
    await jwtVerify(token, keys, {
      algorithms: ["RS256"],
      issuer,
      audience,
      requiredClaims: ["exp"],
    });
    // Workers は別リクエストで作った Promise を待てないので、取得済みの鍵だけを共有する。
    if ("jwks" in cache && "uat" in cache) caches.set(domain, cache as ExportedJWKSCache);
  } catch {
    throw new HttpError(401, "Cloudflare Access の認証を確認できませんでした。");
  }
}
