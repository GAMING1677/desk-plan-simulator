import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box, stack } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { ItemInspector } from "./ItemInspector";
export const subject = "features/simulator/components/ItemInspector.tsx";
spec(
  "INSPECT-01",
  "空状態と名前",
  "未選択と選択物で名前をblur・Escape",
  "未選択案内、trim名確定、Escapeは旧名へ戻る",
  () => {
    const view = render(<Harness Component={ItemInspector} />);
    expect(
      screen.getByText("図または一覧からオブジェクトを選択してください。"),
    ).toBeInTheDocument();
    view.unmount();
    render(
      <Harness Component={ItemInspector} items={[box()]} selectedId="A" />,
    );
    const input = screen.getByLabelText("オブジェクト名");
    fireEvent.change(input, { target: { value: "  Book  " } });
    fireEvent.blur(input);
    expect(input).toHaveValue("Book");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("Book");
  },
);
spec(
  "INSPECT-02",
  "台候補の除外",
  "3段積載と別台・posterでbaseを選ぶ",
  "自分・子・孫・posterは候補に含めず別台と独立配置だけ",
  () => {
    render(
      <Harness
        Component={ItemInspector}
        items={[
          ...stack(),
          box("other", { x: 80 }),
          box("P", { kind: "poster", x: 120 }),
        ]}
        selectedId="base"
      />,
    );
    const select = screen.getByLabelText("選択物の載せ先");
    expect(within(select).getAllByRole("option")).toHaveLength(2);
    expect(
      within(select).getByRole("option", { name: "other の上" }),
    ).toBeInTheDocument();
  },
);
spec(
  "INSPECT-03",
  "台変更の衝突拒否",
  "base上に既存物がいる状態でAをbaseに載せる",
  "載せ先nullを維持し理由とaria-invalidを表示",
  () => {
    render(
      <Harness
        Component={ItemInspector}
        items={[
          box("base", { width: 10, depth: 10 }),
          box("existing", { supportId: "base" }),
          box("A", { x: 50 }),
        ]}
        selectedId="A"
      />,
    );
    const select = screen.getByLabelText("選択物の載せ先");
    fireEvent.change(select, { target: { value: "base" } });
    expect(select).toHaveValue("desk");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("重なる");
  },
);
spec(
  "INSPECT-04",
  "種類・位置・削除",
  "boxをposterに変更、縦横交換し削除",
  "厚み欄なし、寸法交換、削除後未選択案内",
  () => {
    const view = render(
      <Harness
        Component={ItemInspector}
        items={[box("A", { width: 20, height: 30 })]}
        selectedId="A"
      />,
    );
    fireEvent.change(view.container.querySelector(".appearance-select")!, {
      target: { value: "poster" },
    });
    expect(screen.queryByLabelText("奥行き")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "縦横を入れ替え" }));
    expect(screen.getByLabelText("幅")).toHaveValue(30);
    expect(screen.getByLabelText("高さ")).toHaveValue(20);
    fireEvent.click(
      screen.getByRole("button", { name: "このオブジェクトを削除" }),
    );
    expect(
      screen.getByText("図または一覧からオブジェクトを選択してください。"),
    ).toBeInTheDocument();
  },
);
