import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box, desk, stack } from "@/tests/fixtures";
import type { Item } from "@/lib/desk-model";
import { BufferGeometry, Material, Mesh, Scene } from "three";
import { FrontScene } from "./front-scene";
const controls = vi.hoisted(() => ({
  fail: false,
  hitId: "A",
  render: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("three", async (original) => {
  const actual = await original<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      constructor() {
        if (controls.fail) throw Error("no WebGL");
      }
      setPixelRatio = vi.fn();
      setSize = vi.fn();
      setClearColor = vi.fn();
      render = controls.render;
      dispose = controls.dispose;
    },
    Raycaster: class {
      setFromCamera = vi.fn();
      intersectObjects(objects: Mesh[]) {
        const object = objects.find(
          (m) => m.userData.itemId === controls.hitId,
        );
        return object ? [{ object }] : [];
      }
    },
  };
});
export const subject = "components/front-scene.tsx";
beforeEach(() => {
  controls.fail = false;
  controls.hitId = "A";
});
function scene(
  items: Item[] = [box()],
  handlers = vi
    .fn()
    .mockReturnValue({
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerCancel: vi.fn(),
    }),
  measures = true,
) {
  return (
    <svg>
      <FrontScene
        desk={desk}
        items={items}
        zoom={100}
        offset={{ x: 0, y: 0 }}
        selectedId="A"
        invalidItemId={null}
        measures={measures}
        handlers={handlers}
      />
    </svg>
  );
}
spec(
  "SCENE-01",
  "4種類の3D形状",
  "box・monitor・poster・laptopを描画",
  "机を含む8mesh、各物のIDが部品に付き寸法ラベル4件",
  () => {
    const { container } = render(
      scene([
        box(),
        box("M", { kind: "monitor", x: 20 }),
        box("P", { kind: "poster", x: 40 }),
        box("L", { kind: "laptop", x: 60 }),
      ]),
    );
    const rendered = controls.render.mock.calls.at(-1)![0] as Scene;
    const meshes = rendered.children.filter((c) => c instanceof Mesh);
    expect(meshes).toHaveLength(8);
    expect(meshes.filter((m) => m.userData.itemId === "M")).toHaveLength(3);
    expect(meshes.filter((m) => m.userData.itemId === "L")).toHaveLength(2);
    expect(container.querySelectorAll(".object-dimension")).toHaveLength(4);
  },
);
spec(
  "SCENE-02",
  "資源の後始末",
  "積載物を再描画してunmount",
  "古いgeometry/materialをdisposeし最終rendererを1回dispose",
  () => {
    const geometry = vi.spyOn(BufferGeometry.prototype, "dispose"),
      material = vi.spyOn(Material.prototype, "dispose");
    const view = render(scene(stack()));
    expect(controls.render).toHaveBeenCalledTimes(1);
    view.rerender(scene([box("changed")]));
    expect(controls.render).toHaveBeenCalledTimes(2);
    expect(geometry.mock.calls.length).toBeGreaterThan(0);
    expect(material.mock.calls.length).toBeGreaterThan(0);
    view.unmount();
    expect(controls.dispose).toHaveBeenCalledTimes(1);
  },
);
spec(
  "SCENE-03",
  "ヒットとポインター終了",
  "Aをhitしてmove/up、空白とcancelも試す",
  "hitした物だけ操作、終了後moveを無視、空白はdown0回",
  () => {
    const h = {
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
        onPointerCancel: vi.fn(),
      },
      handlers = vi.fn().mockReturnValue(h);
    render(scene([box()], handlers));
    const canvas = screen.getByLabelText("固定カメラによる机と持ち物の3D表示");
    fireEvent.pointerDown(canvas, { button: 0, isPrimary: true });
    fireEvent.pointerMove(canvas);
    fireEvent.pointerUp(canvas);
    fireEvent.pointerMove(canvas);
    expect(h.onPointerDown).toHaveBeenCalledTimes(1);
    expect(h.onPointerMove).toHaveBeenCalledTimes(1);
    expect(h.onPointerUp).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(canvas, { button: 0, isPrimary: true });
    fireEvent.pointerCancel(canvas);
    expect(h.onPointerCancel).toHaveBeenCalledTimes(1);
    controls.hitId = "missing";
    fireEvent.pointerDown(canvas, { button: 0, isPrimary: true });
    expect(h.onPointerDown).toHaveBeenCalledTimes(2);
  },
);
spec(
  "SCENE-04",
  "WebGL失敗とラベル非表示",
  "renderer生成失敗・寸法非表示",
  "案内を表示し例外を漏らさず寸法0件",
  () => {
    controls.fail = true;
    const { container } = render(scene([box()], undefined, false));
    expect(screen.getByText(/3D表示を開始できません/)).toBeInTheDocument();
    expect(container.querySelectorAll(".object-dimension")).toHaveLength(0);
  },
);
