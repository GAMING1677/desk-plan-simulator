// @vitest-environment node
import { expect } from "vitest";
import { readFileSync } from "node:fs";
import { spec } from "./tests/spec";
export const subject = "postcss.config.mjs";
spec(
  "BUILD-02",
  "PostCSS設定",
  "postcss設定を読み込む",
  "Tailwindプラグインを有効にし本番ビルドへ渡す",
  async () => {
    const path = "./postcss.config.mjs";
    const config = await import(path);
    expect(config.default.plugins).toHaveProperty("@tailwindcss/postcss");
    expect(readFileSync("app/globals.css", "utf8")).toContain("tailwindcss");
  },
);
