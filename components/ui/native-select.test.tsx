import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "./native-select";
export const subject = "components/ui/native-select.tsx";
spec(
  "SELECT-01",
  "選択と属性",
  "グループ内Bを選ぶ",
  "value=B、change1回、ref/select属性/装飾アイコン保持",
  async () => {
    const ref = createRef<HTMLSelectElement>(),
      change = vi.fn(),
      user = userEvent.setup();
    const view = render(
      <NativeSelect
        ref={ref}
        size="sm"
        aria-label="選択"
        className="custom"
        onChange={change}
      >
        <NativeSelectOptGroup label="Group">
          <NativeSelectOption value="A">A</NativeSelectOption>
          <NativeSelectOption value="B">B</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "B");
    expect(select).toHaveValue("B");
    expect(change).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(select);
    expect(select).toHaveAttribute("data-size", "sm");
    expect(select).toHaveClass("custom");
    expect(screen.getByRole("group")).toHaveAttribute("label", "Group");
    expect(view.container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  },
);
spec(
  "SELECT-02",
  "無効な選択",
  "disabled状態でBを選ぼうとする",
  "value=A、change0回",
  async () => {
    const change = vi.fn();
    render(
      <NativeSelect disabled defaultValue="A" onChange={change}>
        <NativeSelectOption value="A">A</NativeSelectOption>
        <NativeSelectOption value="B">B</NativeSelectOption>
      </NativeSelect>,
    );
    await userEvent.setup().selectOptions(screen.getByRole("combobox"), "B");
    expect(screen.getByRole("combobox")).toHaveValue("A");
    expect(change).not.toHaveBeenCalled();
  },
);
