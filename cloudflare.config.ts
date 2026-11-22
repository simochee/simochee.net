import { bindings, defineConfig, triggers } from "cf/config";

export default defineConfig({
  worker: {
    name: "simochee-net",
    compatibilityDate: "2026-11-09",
    entrypoint: "./src/worker.ts",
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
    },
    // Web Analytics の集計が間引かれる前に、記事ごとの閲覧数と訪問数を D1 へ取り込む。
    triggers: [triggers.scheduled({ schedule: "0 * * * *" })],
    env: {
      DB: bindings.d1({ name: "simochee-net" }),
      // namespace はアカウントの中で重ならない整数なら何でもよい。
      POST_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 5, period: 60 } }),
      ACTION_LIMIT: bindings.rateLimit({ namespace: "1002", simple: { limit: 30, period: 60 } }),
      TURNSTILE_SECRET_KEY: bindings.secret(),
      ADMIN_PASSWORD: bindings.secret(),
      ANALYTICS_ACCOUNT_ID: bindings.secret(),
      ANALYTICS_SITE_TAG: bindings.secret(),
      ANALYTICS_API_TOKEN: bindings.secret(),
    },
  },
});
