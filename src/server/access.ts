import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  jwksCache,
  type ExportedJWKSCache,
  type RemoteJWKSetOptions,
} from "jose";
import { HttpError } from "./http";

const caches = new Map<string, ExportedJWKSCache | Record<string, never>>();

export async function verifyAccess(
  request: Request,
  cookie: string | undefined,
  config: { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string },
  options: RemoteJWKSetOptions = {},
) {
  const domain = config.ACCESS_TEAM_DOMAIN?.trim();
  const audience = config.ACCESS_AUD?.trim();
  if (!domain || !audience) throw new HttpError(503, "Cloudflare Access の設定がありません。");
  if (!/^[a-zA-Z0-9-]+\.cloudflareaccess\.com$/.test(domain))
    throw new HttpError(503, "Cloudflare Access の設定が正しくありません。");
  const token = request.headers.get("Cf-Access-Jwt-Assertion") ?? cookie;
  if (!token) throw new HttpError(401, "Cloudflare Access でログインしてください。");
  const issuer = `https://${domain}`;
  // 検証に成功する前から共有する。成功時だけだと、でたらめなトークンを送るたびに certs を取りに行かせられる。
  // jose は取得に成功したときだけ書き込むので、失敗した取得が残ることはない。
  const cache = caches.get(domain) ?? {};
  caches.set(domain, cache);
  try {
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
  } catch (error) {
    if (isTokenRejection(error))
      throw new HttpError(401, "Cloudflare Access の認証を確認できませんでした。");
    console.error("Cloudflare Access のトークンを検証できませんでした。", error);
    throw new HttpError(503, "Cloudflare Access の認証を確認できませんでした。");
  }
}

function isTokenRejection(error: unknown) {
  return (
    error instanceof errors.JWTClaimValidationFailed ||
    error instanceof errors.JWTExpired ||
    error instanceof errors.JWSSignatureVerificationFailed ||
    error instanceof errors.JWSInvalid ||
    error instanceof errors.JWTInvalid ||
    error instanceof errors.JWKSNoMatchingKey ||
    error instanceof errors.JOSEAlgNotAllowed
  );
}
