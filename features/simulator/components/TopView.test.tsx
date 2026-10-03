import { fireEvent, render } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box, stack } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { TopView } from "./TopView";
export const subject = "features/simulator/components/TopView.tsx";
spec(
  "TOP-01",
  "形状と座標・描画順",
  "4種類と3段積載を描画",
  "種類に応じた形状、子はx184,y144、低い物が先、元配列不変",
  () => {
    const items = [
        ...stack(),
        box("monitor", { kind: "monitor", x: 80 }),
        box("poster", { kind: "poster", x: -20 }),
        box("laptop", { kind: "laptop", x: 120 }),
      ],
      ids = items.map((i) => i.id);
    const { container } = render(<Harness Component={TopView} items={items} />);
    const groups = container.querySelectorAll("g.draggable");
    expect(groups).toHaveLength(6);
    const child = [...groups].find((g) => g.textContent?.includes("child"))!;
    expect(child.querySelector("rect")).toHaveAttribute("x", "184");
    expect(child.querySelector("rect")).toHaveAttribute("y", "144");
    expect(
      [...groups].findIndex((g) => g.textContent?.includes("base")),
    ).toBeLessThan(
      [...groups].findIndex((g) => g.textContent?.includes("grandchild")),
    );
    expect(items.map((i) => i.id)).toEqual(ids);
  },
);
spec(
  "TOP-02",
  "状態とポインター",
  "無効で選択されたAの図を操作、寸法表示を解除",
  "赤輪郭、down/move/up/cancelを各1回、寸法0件",
  () => {
    const handlers = {
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
        onPointerCancel: vi.fn(),
      },
      drag = vi.fn().mockReturnValue(handlers);
    const view = render(
      <Harness
        Component={TopView}
        items={[box()]}
        selectedId="A"
        override={{ invalidItemId: "A", dragHandlers: drag }}
      />,
    );
    const g = view.container.querySelector("g.draggable")!;
    expect(g.querySelector("rect")).toHaveAttribute("stroke", "#d5403b");
    fireEvent.pointerDown(g);
    fireEvent.pointerMove(g);
    fireEvent.pointerUp(g);
    fireEvent.pointerCancel(g);
    for (const fn of Object.values(handlers))
      expect(fn).toHaveBeenCalledTimes(1);
    expect(drag).toHaveBeenCalledWith(
      expect.objectContaining({ id: "A" }),
      "top",
    );
    view.rerender(
      <Harness
        Component={TopView}
        items={[box()]}
        override={{ measures: false }}
      />,
    );
    expect(
      view.container.querySelectorAll(".object-dimension,.desk-dimension"),
    ).toHaveLength(0);
  },
);
spec(
  "TOP-03",
  "はみ出し表示",
  "x=-100,y=-50の物を描画",
  "viewBoxの左上が物の原点より外側に広がる",
  () => {
    const { container } = render(
      <Harness
        Component={TopView}
        items={[box("outside", { x: -100, y: -50 })]}
      />,
    );
    const bounds = container
      .querySelector("svg")!
      .getAttribute("viewBox")!
      .split(" ")
      .map(Number);
    expect(bounds[0]).toBeLessThan(96 - 100 * 4);
    expect(bounds[1]).toBeLessThan(72 - 50 * 4);
  },
);
