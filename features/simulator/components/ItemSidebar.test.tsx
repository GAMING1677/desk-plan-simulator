import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { ItemSidebar } from "./ItemSidebar";
export const subject = "features/simulator/components/ItemSidebar.tsx";
spec(
  "SIDEBAR-01",
  "寸法確定・取消・拒否",
  "幅を200にblur、0にblur、210にEscape",
  "200を確定、不正0とEscapeは200へ戻す",
  () => {
    render(<Harness Component={ItemSidebar} />);
    let input = screen.getByLabelText("机の幅");
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.blur(input);
    input = screen.getByLabelText("机の幅");
    expect(input).toHaveValue(200);
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(200);
    fireEvent.change(input, { target: { value: "210" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue(200);
  },
);
spec(
  "SIDEBAR-02",
  "一覧と折り畳み",
  "2物からBを選び一覧を閉じて再展開",
  "Bだけactive、aria-expandedとhiddenが同期",
  () => {
    const view = render(
      <Harness Component={ItemSidebar} items={[box(), box("B", { x: 20 })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /B.*02/ }));
    expect(view.container.querySelectorAll(".item-row.active")).toHaveLength(1);
    expect(view.container.querySelector(".item-row.active")).toHaveTextContent(
      "B",
    );
    const toggle = screen.getByRole("button", { name: "置いているもの" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(view.container.querySelector("#placed-items")).toHaveAttribute(
      "hidden",
    );
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  },
);
spec(
  "SIDEBAR-03",
  "追加パネル",
  "追加ボタンを2回押す",
  "フォーム開閉、一覧の物は変化しない",
  () => {
    render(<Harness Component={ItemSidebar} />);
    fireEvent.click(screen.getByRole("button", { name: "オブジェクトを追加" }));
    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "オブジェクトを追加" }));
    expect(screen.queryByLabelText("名前")).toBeNull();
  },
);
