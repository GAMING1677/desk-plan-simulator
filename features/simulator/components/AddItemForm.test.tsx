import { fireEvent, render, screen } from "@testing-library/react";
import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { AddItemForm } from "./AddItemForm";
export const subject = "features/simulator/components/AddItemForm.tsx";
spec(
  "ADD-01",
  "種類・プリセット・自由入力",
  "A4を選び寸法を手入力し縦横交換",
  "poster/21/29.7、奥行き欄なし、手入力後自由入力、交換反映",
  () => {
    render(<Harness Component={AddItemForm} />);
    fireEvent.change(screen.getByLabelText("定型サイズ"), {
      target: { value: "A4-portrait" },
    });
    expect(screen.getByLabelText("幅")).toHaveValue(21);
    expect(screen.getByLabelText("高さ")).toHaveValue(29.7);
    expect(screen.queryByLabelText("奥行き")).toBeNull();
    fireEvent.change(screen.getByLabelText("幅"), { target: { value: "30" } });
    expect(screen.getByLabelText("定型サイズ")).toHaveValue("custom");
    fireEvent.click(screen.getByRole("button", { name: "縦横を入れ替え" }));
    expect(screen.getByLabelText("幅")).toHaveValue(29.7);
    expect(screen.getByLabelText("高さ")).toHaveValue(30);
  },
);
spec(
  "ADD-02",
  "載せ先と入力エラー",
  "台を選択後、名前を空白にする",
  "台の候補にposterなし、高さ欄非表示、追加disabledと理由表示",
  () => {
    render(
      <Harness
        Component={AddItemForm}
        items={[
          box("base", { width: 50, depth: 40 }),
          box("poster", { kind: "poster", x: 100 }),
        ]}
      />,
    );
    expect(screen.queryByRole("option", { name: "poster の上" })).toBeNull();
    fireEvent.change(screen.getByLabelText("追加する物の載せ先"), {
      target: { value: "base" },
    });
    expect(screen.queryByLabelText("天板からの高さ（cm）")).toBeNull();
    fireEvent.change(screen.getByLabelText("名前"), { target: { value: " " } });
    expect(screen.getByRole("button", { name: "ここに置く" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("名前と正の寸法");
  },
);
spec(
  "ADD-03",
  "消えた載せ先",
  "下書きの載せ先が存在しない状態",
  "追加を無効にし載せ先が見つからない理由を表示",
  () => {
    render(
      <Harness
        Component={AddItemForm}
        override={{
          draft: {
            name: "New",
            kind: "box",
            supportId: "missing",
            width: 10,
            depth: 10,
            height: 10,
            z: 0,
          },
          draftFits: false,
          draftError: "載せ先が見つかりません。",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "載せ先が見つかりません",
    );
    expect(screen.getByRole("button", { name: "ここに置く" })).toBeDisabled();
  },
);
