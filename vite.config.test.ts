// @vitest-environment node
import { expect } from "vitest";
import { spec } from "./tests/spec";
import config from "./vite.config";
export const subject = "vite.config.ts";
spec(
  "BUILD-01",
  "Vite設定",
  "設定のaliasとReactプラグインを読む",
  "@がプロジェクトルートを指しReactプラグインを含む",
  () => {
    expect(typeof config).toBe("object");
    const c = config as {
      resolve: { alias: { "@": string } };
      plugins: unknown[];
    };
    expect(c.resolve.alias["@"].replaceAll("\\", "/")).toContain(
      "desk-plan-simulator",
    );
    expect(c.plugins.length).toBeGreaterThan(0);
  },
);
