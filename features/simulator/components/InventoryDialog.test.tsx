import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { InventoryDialog } from "./InventoryDialog";
export const subject = "features/simulator/components/InventoryDialog.tsx";
spec(
  "DIALOG-01",
  "持ち物と操作",
  "2件を表示してfocus・コピー・閉じる",
  "全文選択、コピー1回、閉じるとopen解除、名前付きdialog",
  () => {
    const ref = createRef<HTMLDialogElement>(),
      copy = vi.fn();
    render(
      <InventoryDialog
        inventoryDialogRef={ref}
        inventoryMarkdown={"1. A\n2. B"}
        inventoryCopyState="idle"
        copyInventory={copy}
      />,
    );
    ref.current!.showModal();
    const textarea = screen.getByRole("textbox");
    fireEvent.focus(textarea);
    expect((textarea as HTMLTextAreaElement).selectionEnd).toBe(9);
    expect(
      screen.getByRole("dialog", { name: "持ち物を書き出す" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "クリップボードにコピー" }),
    );
    expect(copy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(ref.current!.open).toBe(false);
  },
);
spec(
  "DIALOG-02",
  "コピー進行・空・失敗",
  "空リスト・copying・success・errorを描画",
  "空と処理中disabled、成功通知と手動コピー案内",
  () => {
    const ref = createRef<HTMLDialogElement>(),
      copy = vi.fn();
    const view = render(
      <InventoryDialog
        inventoryDialogRef={ref}
        inventoryMarkdown=""
        inventoryCopyState="idle"
        copyInventory={copy}
      />,
    );
    expect(view.container.querySelector("button:last-child")).toBeDisabled();
    for (const state of ["copying", "success", "error"] as const) {
      view.rerender(
        <InventoryDialog
          inventoryDialogRef={ref}
          inventoryMarkdown="1. A"
          inventoryCopyState={state}
          copyInventory={copy}
        />,
      );
      if (state === "copying")
        expect(
          view.container.querySelector("button:last-child"),
        ).toBeDisabled();
      else
        expect(
          view.container.querySelector('[role="status"]'),
        ).toHaveTextContent(
          state === "success" ? "コピーしました" : "コピーできませんでした",
        );
    }
  },
);
