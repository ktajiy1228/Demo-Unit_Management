import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts"],
    // DB 結合テストはリモート Postgres(Neon) への往復があるため、既定の 5s では足りない。
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
