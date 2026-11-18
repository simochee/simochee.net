import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "simochee-net",
    compatibilityDate: "2026-11-09",
    entrypoint: "./src/index.ts",
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
      // 既定では、ファイルに一致するリクエストは Worker を通らずに配信される（Worker の実行回数にも数えられない）。
      // /api/ だけは、同じパスにファイルができても必ず Worker が受ける。
      runWorkerFirst: ["/api/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  },
});
