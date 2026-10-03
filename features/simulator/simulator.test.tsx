import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import Simulator from "./simulator";
vi.mock("@/components/front-scene", () => ({
  FrontScene: () => <text>Scene</text>,
}));
export const subject = "features/simulator/simulator.tsx";
spec(
  "SIM-01",
  "追加・編集・一覧と図の同期",
  "物を追加し名前と幅を編集する",
  "一覧・図・編集パネルに同じ名称と寸法",
  () => {
    const { container } = render(<Simulator />);
    fireEvent.click(screen.getByRole("button", { name: "オブジェクトを追加" }));
    fireEvent.change(screen.getByLabelText("名前"), {
      target: { value: "Book" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ここに置く" }));
    expect(container.querySelector(".item-row.active")).toHaveTextContent(
      "Book",
    );
    fireEvent.change(screen.getByLabelText("オブジェクト名"), {
      target: { value: "Edited" },
    });
    fireEvent.blur(screen.getByLabelText("オブジェクト名"));
    fireEvent.change(screen.getByRole("spinbutton", { name: "幅" }), {
      target: { value: "40" },
    });
    expect(container.querySelector(".item-row")).toHaveTextContent("Edited");
    expect(container.querySelector(".item-row")).toHaveTextContent("40 cm");
    expect(
      container.querySelector("g.draggable .item-label"),
    ).toHaveTextContent("Edited");
  },
);
spec(
  "SIM-02",
  "削除と初期化",
  "物を追加して削除、机変更後に初期化",
  "削除後0件・案内、初期化で幅180",
  () => {
    const { container } = render(<Simulator />);
    fireEvent.click(screen.getByRole("button", { name: "オブジェクトを追加" }));
    fireEvent.click(screen.getByRole("button", { name: "ここに置く" }));
    fireEvent.click(
      screen.getByRole("button", { name: "このオブジェクトを削除" }),
    );
    expect(container.querySelectorAll(".item-row")).toHaveLength(0);
    expect(
      screen.getByText("図または一覧からオブジェクトを選択してください。"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("机の幅"), {
      target: { value: "200" },
    });
    fireEvent.blur(screen.getByLabelText("机の幅"));
    fireEvent.click(screen.getByRole("button", { name: "初期配置に戻す" }));
    expect(screen.getByLabelText("机の幅")).toHaveValue(180);
  },
);
