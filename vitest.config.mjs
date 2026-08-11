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
    // Default to node for the pure-logic suite. Component/hook tests opt into a
    // DOM per-file with a `// @vitest-environment jsdom` docblock, so jsdom only
    // loads for the files that need it. Modules that contain JSX are named
    // `.jsx` so the default transform parses them without extra plugins.
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
