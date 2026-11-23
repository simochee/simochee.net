import { bindings, defineConfig, triggers } from "cf/config";

const compatibilityDate = "2026-11-09";
const assets = {
  htmlHandling: "auto-trailing-slash",
  notFoundHandling: "404-page",
} as const;

export default defineConfig(({ mode }) =>
  mode === "preview"
    ? {
        worker: {
          name: "simochee-net-preview",
          compatibilityDate,
          assets,
          // 下書きは Access で守ったドメインでだけ見せる。workers.dev や Preview URL は Access を通らない。
          workersDev: false,
          previewUrls: false,
        },
      }
    : {
        worker: {
          name: "simochee-net",
          compatibilityDate,
          entrypoint: "./src/worker.ts",
          assets,
          // Web Analytics の集計が間引かれる前に、記事ごとの閲覧数と訪問数を D1 へ取り込む。
          triggers: [triggers.scheduled({ schedule: "0 * * * *" })],
          env: {
            DB: bindings.d1({ name: "simochee-net" }),
            // namespace はアカウントの中で重ならない整数なら何でもよい。
            POST_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 5, period: 60 } }),
            ACTION_LIMIT: bindings.rateLimit({
              namespace: "1002",
              simple: { limit: 30, period: 60 },
            }),
            TURNSTILE_SECRET_KEY: bindings.secret(),
            ACCESS_TEAM_DOMAIN: bindings.secret(),
            ACCESS_AUD: bindings.secret(),
            ANALYTICS_ACCOUNT_ID: bindings.secret(),
            ANALYTICS_SITE_TAG: bindings.secret(),
            ANALYTICS_API_TOKEN: bindings.secret(),
          },
        },
      },
);
