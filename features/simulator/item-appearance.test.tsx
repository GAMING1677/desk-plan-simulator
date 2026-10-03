import { render } from "@testing-library/react";
import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import {
  appearanceIcon,
  appearanceLabel,
  cleanName,
  itemColor,
} from "./item-appearance";
export const subject = "features/simulator/item-appearance.tsx";
spec(
  "APPEAR-01",
  "名前とアイコン",
  "4種類を表示し名前を省略",
  "ラベルとSVGsize=18が対応、通常名保持",
  () => {
    const kinds = ["box", "monitor", "poster", "laptop"] as const;
    expect(kinds.map(appearanceLabel)).toEqual([
      "直方体",
      "モニター",
      "ポスター・コルクボード",
      "ノートPC",
    ]);
    for (const k of kinds) {
      const view = render(appearanceIcon(k, 18));
      expect(view.container.querySelector("svg")).toHaveAttribute(
        "width",
        "18",
      );
      view.unmount();
    }
    expect(cleanName("27インチ モニター")).toBe("モニター");
    expect(cleanName("A4 ポスター・コルクボード")).toBe("A4");
    expect(cleanName("Book")).toBe("Book");
  },
);
spec(
  "APPEAR-02",
  "色の優先度",
  "通常・積載・poster・選択・不正状態",
  "選択色を優先し不正時は輪郭のみ赤",
  () => {
    expect(itemColor(box(), false, false)).toEqual({
      fill: "#e2eaf0",
      stroke: "#8095a4",
    });
    expect(itemColor(box("A", { supportId: "B" }), false, false)).toEqual({
      fill: "#ebe8fa",
      stroke: "#8375b9",
    });
    expect(itemColor(box("P", { kind: "poster" }), false, false)).toEqual({
      fill: "#e5c79d",
      stroke: "#a77742",
    });
    expect(itemColor(box(), true, true)).toEqual({
      fill: "#d7edf2",
      stroke: "#d5403b",
    });
  },
);
