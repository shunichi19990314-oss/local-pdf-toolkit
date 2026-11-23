import { defineConfig } from "vite";

// Relative base keeps the build portable: GitHub Pages project site, Render,
// or any sub-path hosting.
export default defineConfig({
  base: "./",
  build: { sourcemap: true, target: "es2022" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
