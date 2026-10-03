// @vitest-environment node
import { readdirSync, existsSync } from "node:fs";
import { expect } from "vitest";
import { spec } from "./spec";
export const subject = "テスト対象一覧";
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(`${directory}/${entry.name}`)
      : [`${directory}/${entry.name}`],
  );
}
spec(
  "COVER-01",
  "実行ファイルのテスト漏れ",
  "全アプリTS/TSXと設定・実行スクリプトを棚卸し",
  "型定義とテスト自体以外の全対象に対応するテストファイルが存在",
  () => {
    const sources = [
      ...["app", "components", "features", "lib", "src"]
        .flatMap(files)
        .filter(
          (p) =>
            /\.tsx?$/.test(p) &&
            !p.includes(".test.") &&
            !p.endsWith("/types.ts"),
        ),
      "vite.config.ts",
      "postcss.config.mjs",
      "scripts/render-spec.mjs",
      "scripts/run-tests.mjs",
    ];
    const missing = sources.filter(
      (source) =>
        !["ts", "tsx", "mjs"].some((extension) =>
          existsSync(source.replace(/\.(tsx?|mjs)$/, `.test.${extension}`)),
        ),
    );
    expect(missing).toEqual([]);
    expect(sources.length).toBeGreaterThan(0);
  },
);
