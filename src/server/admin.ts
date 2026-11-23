import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { verifyAccess } from "./access";

export async function requireAdmin({ request, cookies }: Pick<APIContext, "request" | "cookies">) {
  if (import.meta.env.DEV && (!env.ACCESS_TEAM_DOMAIN?.trim() || !env.ACCESS_AUD?.trim())) {
    // 手元には Access の入口がないため、設定していない dev でだけ認証を省く。
    return;
  }
  await verifyAccess(request, cookies.get("CF_Authorization")?.value, env);
}
