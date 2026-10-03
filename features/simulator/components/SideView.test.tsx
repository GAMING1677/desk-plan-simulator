import { render } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box, stack } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { SideView } from "./SideView";
export const subject = "features/simulator/components/SideView.tsx";
spec(
  "SIDE-01",
  "世界座標と形状",
  "積載・monitor・laptop・posterを描画",
  "子の側面x152、monitor支柱線とlaptopの多角形、6物表示",
  () => {
    const { container } = render(
      <Harness
        Component={SideView}
        items={[
          ...stack(),
          box("monitor", { kind: "monitor", x: 80 }),
          box("laptop", { kind: "laptop", x: 100 }),
          box("poster", { kind: "poster", x: 120 }),
        ]}
      />,
    );
    const groups = container.querySelectorAll("g.draggable");
    expect(groups).toHaveLength(6);
    const child = [...groups].find(
      (g) => g.querySelector(".side-item-label")?.textContent === "child",
    )!;
    expect(child.querySelector("rect")).toHaveAttribute("x", "152");
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(
      [...groups]
        .find((g) => g.textContent?.includes("monitor"))!
        .querySelector("line"),
    ).not.toBeNull();
  },
);
spec(
  "SIDE-02",
  "高い物と状態",
  "500cm高い選択物と寸法非表示",
  "上端はviewBox内、選択輪郭、寸法0件、sideハンドラー",
  () => {
    const drag = vi.fn().mockReturnValue({}),
      { container } = render(
        <Harness
          Component={SideView}
          items={[box("A", { height: 500, y: -20 })]}
          selectedId="A"
          override={{ measures: false, dragHandlers: drag }}
        />,
      );
    const rect = container.querySelector("g.draggable rect")!;
    expect(Number(rect.getAttribute("y"))).toBeGreaterThanOrEqual(0);
    expect(rect).toHaveAttribute("stroke", "#137e96");
    expect(
      container.querySelectorAll(".object-dimension,.desk-dimension"),
    ).toHaveLength(0);
    expect(drag).toHaveBeenCalledWith(
      expect.objectContaining({ id: "A" }),
      "side",
    );
  },
);
