import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { Harness } from "@/tests/controller-fixture";
import { fitFrontView } from "@/lib/front-projection";
import { FrontView } from "./FrontView";
vi.mock("@/components/front-scene", () => ({
  FrontScene: () => <text>Scene</text>,
}));
export const subject = "features/simulator/components/FrontView.tsx";
spec(
  "FRONT-01",
  "倍率と全体表示",
  "range150と全体表示ボタンを操作",
  "倍率表示150、全体表示でfitのzoomとoffsetへ更新",
  () => {
    let state: any;
    render(<Harness Component={FrontView} inspect={(s) => (state = s)} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "150" } });
    expect(screen.getByRole("slider")).toHaveValue("150");
    const fit = fitFrontView(state.desk, state.items);
    fireEvent.click(screen.getByRole("button", { name: "全体を表示" }));
    expect(state.frontZoom).toBe(fit.zoom);
    expect(state.frontOffset).toEqual(fit.offset);
  },
);
spec(
  "FRONT-02",
  "コピーの状態",
  "copying→success→errorの表示条件",
  "処理中disabled、成功通知、失敗後の再試行が1回",
  () => {
    const copy = vi.fn();
    const view = render(
      <Harness
        Component={FrontView}
        override={{ copyState: "copying", copyFrontView: copy }}
      />,
    );
    expect(screen.getByRole("button", { name: "作成中…" })).toBeDisabled();
    view.rerender(
      <Harness
        Component={FrontView}
        override={{ copyState: "success", copyFrontView: copy }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "コピーしました" }),
    ).toBeEnabled();
    view.rerender(
      <Harness
        Component={FrontView}
        override={{ copyState: "error", copyFrontView: copy }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "コピー失敗・再試行" }));
    expect(copy).toHaveBeenCalledTimes(1);
  },
);
spec(
  "FRONT-03",
  "パンイベント",
  "SVGのdown/move/up/cancel",
  "各イベントが渡り終了経路を2回呼ぶ",
  () => {
    const down = vi.fn(),
      move = vi.fn(),
      end = vi.fn();
    const { container } = render(
      <Harness
        Component={FrontView}
        override={{
          beginFrontPan: down,
          moveFrontPan: move,
          endFrontPan: end,
          frontPanning: true,
        }}
      />,
    );
    const svg = container.querySelector("svg.front-pannable")!;
    expect(svg).toHaveClass("is-panning");
    fireEvent.pointerDown(svg);
    fireEvent.pointerMove(svg);
    fireEvent.pointerUp(svg);
    fireEvent.pointerCancel(svg);
    expect(down).toHaveBeenCalledTimes(1);
    expect(move).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(2);
  },
);
