import { act, renderHook } from "@testing-library/react";
import type { PointerEvent } from "react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import { projectFront, unprojectFront } from "@/lib/front-projection";
import { useLayoutEditor } from "./use-layout-editor";
import { useDiagramInteraction } from "./use-diagram-interaction";
export const subject = "features/simulator/hooks/use-diagram-interaction.ts";
function mount() {
  return renderHook(() => {
    const editor = useLayoutEditor();
    return { editor, ...useDiagramInteraction(editor) };
  });
}
function event(x = 0, y = 0, pointerId = 1) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  return {
    clientX: x,
    clientY: y,
    pointerId,
    button: 0,
    isPrimary: true,
    currentTarget: svg,
    target: svg,
    preventDefault: vi.fn(),
  } as unknown as PointerEvent<SVGSVGElement>;
}
function dragEvent(x = 0, y = 0) {
  const e = event(x, y),
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  e.currentTarget.appendChild(g);
  return { ...e, currentTarget: g } as unknown as PointerEvent<SVGGElement>;
}
spec(
  "DRAG-01",
  "上面移動と終了",
  "40px右20px下へ移動後up・追加move",
  "x+10,y+5、up後は座標不変",
  () => {
    const { result } = mount();
    act(() => result.current.editor.setItems([box()]));
    act(() =>
      result.current.beginDrag(
        dragEvent(),
        result.current.editor.items[0],
        "top",
      ),
    );
    act(() => result.current.moveDrag(dragEvent(40, 20)));
    expect(result.current.editor.items[0]).toMatchObject({ x: 10, y: 5 });
    act(() =>
      result.current
        .dragHandlers(result.current.editor.items[0], "top")
        .onPointerUp(),
    );
    act(() => result.current.moveDrag(dragEvent(80, 40)));
    expect(result.current.editor.items[0]).toMatchObject({ x: 10, y: 5 });
  },
);
spec(
  "DRAG-02",
  "側面と高さ",
  "側面40px右20px上、次に下へ移動",
  "y+10,z+5、下限z=0",
  () => {
    const { result } = mount();
    act(() => result.current.editor.setItems([box()]));
    act(() => result.current.beginDrag(dragEvent(), box(), "side"));
    act(() => result.current.moveDrag(dragEvent(40, -20)));
    expect(result.current.editor.items[0]).toMatchObject({ y: 10, z: 5 });
    act(() => result.current.moveDrag(dragEvent(0, 40)));
    expect(result.current.editor.items[0].z).toBe(0);
  },
);
spec(
  "DRAG-03",
  "積載物とcancel",
  "台上の子を側面上方へ移動してcancel",
  "zは0のまま、cancel後のmoveは更新しない",
  () => {
    const { result } = mount();
    const child = box("child", { supportId: "base" });
    act(() =>
      result.current.editor.setItems([
        box("base", { width: 40, depth: 30 }),
        child,
      ]),
    );
    act(() => result.current.beginDrag(dragEvent(), child, "side"));
    act(() => result.current.moveDrag(dragEvent(0, -40)));
    expect(result.current.editor.items[1].z).toBe(0);
    act(() => result.current.dragHandlers(child, "side").onPointerCancel());
    const before = result.current.editor.items;
    act(() => result.current.moveDrag(dragEvent(20, 0)));
    expect(result.current.editor.items).toBe(before);
  },
);
spec(
  "DRAG-04",
  "正面の投影移動",
  "倍率150で20px右10px上へ移動",
  "yを保持、逆投影のxとzを0.1cm丸めで反映",
  () => {
    const { result } = mount();
    act(() => {
      result.current.editor.setItems([box()]);
      result.current.setFrontZoom(150);
    });
    const desk = result.current.editor.desk,
      start = projectFront(desk, { x: 0, y: 10, z: 0 }, 150),
      next = unprojectFront(
        desk,
        { x: start.x + 20, y: start.y - 10 },
        10,
        150,
      );
    act(() => result.current.beginDrag(dragEvent(), box(), "front"));
    act(() => result.current.moveDrag(dragEvent(20, -10)));
    expect(result.current.editor.items[0].x).toBe(Math.round(next.x * 10) / 10);
    expect(result.current.editor.items[0].z).toBe(
      Math.round(Math.max(0, next.z) * 10) / 10,
    );
    expect(result.current.editor.items[0].y).toBe(0);
  },
);
spec(
  "PAN-01",
  "開始条件とpointer ID",
  "右ボタン・非主・draggableと別IDを使う",
  "不適切な開始・別ID移動は無視、正しいIDでoffset更新し終了",
  () => {
    const { result } = mount();
    for (const e of [
      { ...event(), button: 2 },
      { ...event(), isPrimary: false },
    ])
      act(() => result.current.beginFrontPan(e as PointerEvent<SVGSVGElement>));
    expect(result.current.frontPanning).toBe(false);
    const draggable = event();
    draggable.currentTarget.classList.add("draggable");
    act(() => result.current.beginFrontPan(draggable));
    expect(result.current.frontPanning).toBe(false);
    act(() => result.current.beginFrontPan(event(10, 10)));
    act(() => result.current.moveFrontPan(event(40, 50, 2)));
    expect(result.current.frontOffset).toEqual({ x: 0, y: 0 });
    act(() => result.current.moveFrontPan(event(40, 50)));
    expect(result.current.frontOffset).toEqual({ x: 30, y: 40 });
    act(() => result.current.endFrontPan(event(40, 50)));
    expect(result.current.frontPanning).toBe(false);
    expect(result.current.frontPan.current).toBeNull();
  },
);
