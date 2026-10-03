import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import type { ModelContext } from "../types";
import { useLayoutEditor } from "./use-layout-editor";
import { useBrowserTools } from "./use-browser-tools";
export const subject = "features/simulator/hooks/use-browser-tools.ts";
const doc = document as Document & { modelContext?: ModelContext };
afterEach(() => {
  delete doc.modelContext;
});
function mount() {
  return renderHook(() => {
    const editor = useLayoutEditor();
    useBrowserTools(editor);
    return editor;
  });
}
spec(
  "REGISTER-01",
  "非対応環境",
  "modelContextのないdocumentで起動",
  "例外なしで描画できる",
  () => {
    expect(() => mount()).not.toThrow();
  },
);
spec(
  "REGISTER-02",
  "登録と解除",
  "対応環境でmount・再描画・unmount",
  "4名を同一signalで各1回、再描画で増えずunmountでabort",
  () => {
    const register = vi.fn();
    doc.modelContext = { registerTool: register };
    const hook = mount();
    expect(register).toHaveBeenCalledTimes(4);
    const signals = register.mock.calls.map((c) => c[1].signal);
    expect(new Set(signals).size).toBe(1);
    expect(signals[0].aborted).toBe(false);
    hook.rerender();
    expect(register).toHaveBeenCalledTimes(4);
    hook.unmount();
    expect(signals[0].aborted).toBe(true);
  },
);
spec(
  "REGISTER-03",
  "StrictMode",
  "StrictModeで登録フックをmount",
  "旧4件のsignalはabort、新4件は有効、最後に全件abort",
  () => {
    const register = vi.fn();
    doc.modelContext = { registerTool: register };
    const hook = renderHook(
      () => {
        const e = useLayoutEditor();
        useBrowserTools(e);
      },
      { wrapper: StrictMode },
    );
    expect(register).toHaveBeenCalledTimes(8);
    expect(register.mock.calls[0][1].signal.aborted).toBe(true);
    expect(register.mock.calls[4][1].signal.aborted).toBe(false);
    hook.unmount();
    expect(register.mock.calls[4][1].signal.aborted).toBe(true);
  },
);
spec(
  "REGISTER-04",
  "登録失敗",
  "同期throwとPromise拒否が発生",
  "残りの登録を試み、未処理拒否を発生させない",
  async () => {
    const register = vi
      .fn()
      .mockImplementationOnce(() => {
        throw Error("unsupported");
      })
      .mockRejectedValueOnce(Error("denied"));
    doc.modelContext = { registerTool: register };
    mount();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(4));
  },
);
spec(
  "REGISTER-05",
  "登録後の最新状態",
  "登録後にitemsを置き換えreadを呼ぶ",
  "再登録せず最新の物が返る",
  () => {
    const register = vi.fn();
    doc.modelContext = { registerTool: register };
    const { result } = mount();
    act(() => result.current.setItems([box("new")]));
    const read = register.mock.calls[0][0];
    expect(read.execute({}).items[0].id).toBe("new");
    expect(register).toHaveBeenCalledTimes(4);
  },
);
