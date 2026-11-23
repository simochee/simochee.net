import { defineConfig } from "vite-plus";
import { resolveContentSource } from "./src/lib/content-source";
import { avatarPlugin } from "./src/lib/avatar-plugin";
import { siteContentPlugin } from "./src/lib/site-content-plugin";
const { postsDir } = resolveContentSource(process.cwd(), {});
export default defineConfig({
  plugins: [siteContentPlugin(postsDir), avatarPlugin(postsDir)],
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
