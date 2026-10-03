import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { SIZE_PRESETS } from "./size-presets";
export const subject = "lib/size-presets.ts";
spec(
  "PRESET-01",
  "全件の整合",
  "全定型サイズを読む",
  "31件、ID一意、4カテゴリ、全寸法が正かつ有限",
  () => {
    expect(SIZE_PRESETS).toHaveLength(31);
    expect(new Set(SIZE_PRESETS.map((p) => p.id)).size).toBe(31);
    expect(new Set(SIZE_PRESETS.map((p) => p.category)).size).toBe(4);
    for (const p of SIZE_PRESETS)
      for (const n of [p.width, p.depth, p.height])
        expect(Number.isFinite(n) && n > 0).toBe(true);
  },
);
spec(
  "PRESET-02",
  "紙サイズ",
  "A4・B4を選ぶ",
  "A4=21×29.7、B4=25.7×36.4、紙厚み0.5cm",
  () => {
    expect(SIZE_PRESETS.find((p) => p.id === "A4-portrait")).toMatchObject({
      width: 21,
      height: 29.7,
      depth: 0.5,
      kind: "poster",
    });
    expect(SIZE_PRESETS.find((p) => p.id === "B4-portrait")).toMatchObject({
      width: 25.7,
      height: 36.4,
    });
  },
);
spec(
  "PRESET-03",
  "モニターとノートPC",
  "27インチと13.3インチを選ぶ",
  "モニター59.8×20×43.1、PC30.5×21.5×21cm",
  () => {
    expect(SIZE_PRESETS.find((p) => p.id === "monitor-27")).toMatchObject({
      width: 59.8,
      depth: 20,
      height: 43.1,
      kind: "monitor",
    });
    expect(SIZE_PRESETS.find((p) => p.id === "laptop-13.3")).toMatchObject({
      width: 30.5,
      depth: 21.5,
      height: 21,
      kind: "laptop",
    });
  },
);
