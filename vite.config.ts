import { defineConfig } from "vite-plus";
export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**", ".astro/**", ".orca/**"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: { ignorePatterns: ["dist/**", ".astro/**", ".orca/**", "pnpm-lock.yaml"] },
  test: { include: ["tests/**/*.test.ts"] },
  run: { cache: false },
});
