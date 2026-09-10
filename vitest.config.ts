import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
    setupFiles: ["tests/setup.js"],
  },
  define: {
    __BLAMEFLIX_VERSION__: JSON.stringify("0.0.0-test"),
  },
});