import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "dist/**", ".npm-cache/**", ".cache/**"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
