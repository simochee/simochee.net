import { defineConfig } from "vite-plus";
import { resolveContentSource } from "./src/lib/content-source";
import { siteContentPlugin } from "./src/lib/site-content-plugin";
export default defineConfig({
  plugins: [siteContentPlugin(resolveContentSource(process.cwd(), {}).postsDir)],
  lint: {
    ignorePatterns: ["dist/**", ".astro/**", ".orca/**", "**/.cloudflare/**"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: ["dist/**", ".astro/**", ".orca/**", "**/.cloudflare/**", "pnpm-lock.yaml"],
  },
  test: { include: ["tests/**/*.test.ts"] },
  run: { cache: false },
});
