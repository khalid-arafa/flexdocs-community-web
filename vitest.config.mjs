import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors jsconfig.json's "@/*" -> "./src/*" so tests can import
    // modules the same way app code does.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Pure-logic suite only (no component rendering yet) — the default
    // "node" environment is enough and keeps jsdom out of the dependency
    // tree until a test actually needs a DOM.
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
