import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { Button } from "./button";
export const subject = "components/ui/button.tsx";
spec(
  "BUTTON-01",
  "属性・ref・disabled",
  "outline/sm/aria属性のbuttonを操作",
  "属性とrefを保持、通常click1回、disabled後0回",
  () => {
    const ref = createRef<HTMLButtonElement>(),
      click = vi.fn();
    const view = render(
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className="custom"
        aria-label="Save"
        onClick={click}
      >
        Save
      </Button>,
    );
    const b = screen.getByRole("button", { name: "Save" });
    expect(ref.current).toBe(b);
    expect(b).toHaveAttribute("data-variant", "outline");
    expect(b).toHaveAttribute("data-size", "sm");
    expect(b).toHaveClass("custom");
    fireEvent.click(b);
    expect(click).toHaveBeenCalledTimes(1);
    view.rerender(
      <Button disabled onClick={click}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(click).toHaveBeenCalledTimes(1);
  },
);
spec(
  "BUTTON-02",
  "asChild",
  "リンクを子として描画",
  "余分なbuttonなし、リンクへ属性とイベントを渡す",
  () => {
    const click = vi.fn();
    render(
      <Button asChild onClick={click}>
        <a href="#target">Open</a>
      </Button>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.click(screen.getByRole("link"));
    expect(click).toHaveBeenCalledTimes(1);
  },
);
spec(
  "BUTTON-03",
  "キーボード",
  "Tab後EnterとSpaceで操作",
  "focusがbuttonへ移り各キーで1回実行",
  async () => {
    const user = userEvent.setup(),
      click = vi.fn();
    render(<Button onClick={click}>Run</Button>);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter} ");
    expect(click).toHaveBeenCalledTimes(2);
  },
);
