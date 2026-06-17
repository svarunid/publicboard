import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: true,
  },
});
