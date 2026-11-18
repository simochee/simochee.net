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
        id: "88b21b19-fe1c-40a1-b13c-103303fbe721",
      }),
      ANALYTICS_ACCOUNT_ID: bindings.secret(),
      ANALYTICS_SITE_TAG: bindings.secret(),
      ANALYTICS_API_TOKEN: bindings.secret(),
    },
  },
});
