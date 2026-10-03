import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { Input } from "./input";
export const subject = "components/ui/input.tsx";
spec(
  "INPUT-01",
  "値・属性・イベント",
  "数値inputに12.5を入力しblur",
  "value12.5、changeとblur各1回、refとariaとclass保持",
  () => {
    const ref = createRef<HTMLInputElement>(),
      change = vi.fn(),
      blur = vi.fn();
    render(
      <Input
        ref={ref}
        type="number"
        aria-label="幅"
        defaultValue={10}
        aria-invalid
        className="custom"
        onChange={change}
        onBlur={blur}
      />,
    );
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "12.5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(12.5);
    expect(change).toHaveBeenCalledTimes(1);
    expect(blur).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("custom");
  },
);
spec(
  "INPUT-02",
  "文字とdisabled",
  "制御値の日本語とdisabledを渡す",
  "日本語を保持、disabled属性を実inputへ反映",
  () => {
    render(<Input value="本" disabled aria-label="名前" readOnly />);
    expect(screen.getByRole("textbox")).toHaveValue("本");
    expect(screen.getByRole("textbox")).toBeDisabled();
  },
);
