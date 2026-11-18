import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  // サイト本体は Astro が先にビルドしておく。ここではその出力を配信するファイルとして指すだけ。
  assetsDirectory: "../dist",
});
