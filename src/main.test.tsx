import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
const { createRoot, render } = vi.hoisted(() => ({
  createRoot: vi.fn(),
  render: vi.fn(),
}));
vi.mock("react-dom/client", () => ({ createRoot }));
vi.mock("../app/simulator", () => ({ default: () => null }));
export const subject = "src/main.tsx";
spec(
  "BOOT-01",
  "マウント入口",
  "#rootを用意してmainを読込",
  "rootを1回作成しStrictModeで描画",
  async () => {
    document.body.innerHTML = '<div id="root"></div>';
    createRoot.mockReturnValue({ render });
    await import("./main");
    expect(createRoot).toHaveBeenCalledExactlyOnceWith(
      document.getElementById("root"),
    );
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0][0].type.toString()).toBe(
      "Symbol(react.strict_mode)",
    );
  },
);
