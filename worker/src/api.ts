import { health } from "./routes/health";

/** cloudflare.config.ts の env と対応させる。D1 などを足すときは、設定とここの両方に書く。 */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}
export type Handler = (request: Request, env: Env) => Response | Promise<Response>;

/** パスとメソッドから処理への対応。サーバーが要る機能は、ここに 1 行ずつ足していく。 */
const routes: Record<string, Partial<Record<string, Handler>>> = {
  "/api/health": { GET: health },
};

export function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  // 静的なページと違い、答えはリクエストごとに変わる。途中のキャッシュに残さない。
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const methods = routes[new URL(request.url).pathname];
  if (!methods) return json({ error: "not_found" }, { status: 404 });
  const handler = methods[request.method];
  if (!handler)
    return json(
      { error: "method_not_allowed" },
      { status: 405, headers: { Allow: Object.keys(methods).join(", ") } },
    );
  return handler(request, env);
}
