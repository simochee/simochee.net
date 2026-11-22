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
    // 閲覧者数と人気記事のために数えた古い記録を捨てる。
    triggers: [triggers.scheduled({ schedule: "0 * * * *" })],
    env: {
      DB: bindings.d1({ name: "simochee-net" }),
      // namespace はアカウントの中で重ならない整数なら何でもよい。
      POST_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 5, period: 60 } }),
      ACTION_LIMIT: bindings.rateLimit({ namespace: "1002", simple: { limit: 30, period: 60 } }),
      TURNSTILE_SECRET_KEY: bindings.secret(),
      ADMIN_PASSWORD: bindings.secret(),
    },
  },
});
