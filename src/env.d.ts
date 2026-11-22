// Workers の型を大域に読み込むと、ブラウザ側のスクリプトが使う DOM の型（Request や Response）とぶつかる。
// 使う型だけを import() で取り出し、サーバー側から見える env をここで宣言する。
interface Env {
  DB: import("@cloudflare/workers-types/index.ts").D1Database;
  ASSETS: import("@cloudflare/workers-types/index.ts").Fetcher;
  POST_LIMIT: import("@cloudflare/workers-types/index.ts").RateLimit;
  ACTION_LIMIT: import("@cloudflare/workers-types/index.ts").RateLimit;
  // 秘密の値は Cloudflare に登録するまで空なので、無いときの振る舞いを呼ぶ側で決める。
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_PASSWORD?: string;
  ANALYTICS_ACCOUNT_ID?: string;
  ANALYTICS_SITE_TAG?: string;
  ANALYTICS_API_TOKEN?: string;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
