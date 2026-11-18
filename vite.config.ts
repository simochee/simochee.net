import { defineConfig } from "vite-plus";
export default defineConfig({
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
