import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "simochee-net",
    compatibilityDate: "2026-11-09",
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
    },
    env: {
      COUNTER_DB: bindings.d1({
        name: "simochee-net-counter",
        // 本番のデータベースを作るまでの仮の ID。id を省くと、手元のエミュレータが cf d1 migrations で指定できない ID でデータベースを作る。
        id: "00000000-0000-4000-8000-000000000000",
      }),
      ANALYTICS_ACCOUNT_ID: bindings.secret(),
      ANALYTICS_SITE_TAG: bindings.secret(),
      ANALYTICS_API_TOKEN: bindings.secret(),
    },
  },
});
