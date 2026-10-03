import { act, renderHook } from "@testing-library/react";
import { Blob as NodeBlob } from "node:buffer";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box, desk } from "@/tests/fixtures";
import { makeLayoutFile } from "@/lib/layout-file";
import { useLayoutEditor } from "./use-layout-editor";
import { useLayoutFiles } from "./use-layout-files";
vi.mock("../front-view-png", () => ({
  frontViewPng: vi
    .fn()
    .mockResolvedValue(new Blob(["png"], { type: "image/png" })),
}));
export const subject = "features/simulator/hooks/use-layout-files.ts";
function mount() {
  return renderHook(() => {
    const editor = useLayoutEditor();
    return { editor, ...useLayoutFiles(editor) };
  });
}
function file(value: unknown, size = 100, name = "room.layout.json") {
  return {
    size,
    name,
    text: async () =>
      typeof value === "string" ? value : JSON.stringify(value),
  } as File;
}
function picker(value: unknown) {
  vi.stubGlobal("showSaveFilePicker", value);
}
function clipboard(value: object) {
  vi.stubGlobal(
    "navigator",
    Object.assign(Object.create(navigator), { clipboard: value }),
  );
}
spec(
  "IO-01",
  "読込と状態整理",
  "正常JSONを読み込む",
  "机・物一致、先頭選択・名称更新・パネル閉・台下書き解除・loaded",
  async () => {
    const { result } = mount();
    act(() => {
      result.current.editor.setAdding(true);
      result.current.setSaveOpen(true);
      result.current.editor.setDraft((d) => ({ ...d, supportId: "old" }));
    });
    await act(() =>
      result.current.loadLayout(
        file(makeLayoutFile(desk, [box("first")], "Room")),
      ),
    );
    expect(result.current.editor.desk).toEqual(desk);
    expect(result.current.editor.items).toEqual([box("first")]);
    expect(result.current.editor.selectedId).toBe("first");
    expect(result.current.layoutName).toBe("Room");
    expect(result.current.editor.adding).toBe(false);
    expect(result.current.saveOpen).toBe(false);
    expect(result.current.editor.draft.supportId).toBeNull();
    expect(result.current.loadState).toBe("loaded");
    expect(result.current.savedSnapshot).toBeNull();
  },
);
spec(
  "IO-02",
  "読込失敗時の保持",
  "壊れたJSON・欠落台・5MB超を読み込む",
  "原因を表示し元の机と物の参照を保持",
  async () => {
    const { result } = mount();
    act(() => result.current.editor.setItems([box("old")]));
    const before = result.current.editor.items,
      beforeDesk = result.current.editor.desk;
    for (const bad of [
      file("{"),
      file(makeLayoutFile(desk, [box("bad", { supportId: "missing" })])),
      file({}, 5000001),
    ]) {
      await act(() => result.current.loadLayout(bad));
      expect(result.current.loadState).toBe("error");
      expect(result.current.loadError).not.toBe("");
      expect(result.current.editor.items).toBe(before);
      expect(result.current.editor.desk).toBe(beforeDesk);
    }
  },
);
spec(
  "IO-03",
  "ファイルサイズと名前境界",
  "5,000,000byteの空配置、名前なしJSONを選ぶ",
  "サイズでは拒否せず未選択、名前はファイルの拡張子を除く",
  async () => {
    const { result } = mount();
    await act(() =>
      result.current.loadLayout(
        file(makeLayoutFile(desk, []), 5000000, "example.layout.json"),
      ),
    );
    expect(result.current.loadState).toBe("loaded");
    expect(result.current.editor.selectedId).toBe("");
    expect(result.current.layoutName).toBe("example");
  },
);
spec(
  "IO-04",
  "保存先指定",
  "pickerを使い現在配置を保存",
  "write→close各1回、JSON一致、snapshot設定、saving解除",
  async () => {
    vi.stubGlobal("Blob", NodeBlob);
    const write = vi.fn().mockResolvedValue(undefined),
      close = vi.fn().mockResolvedValue(undefined);
    const choose = vi
      .fn()
      .mockResolvedValue({ createWritable: async () => ({ write, close }) });
    picker(choose);
    const { result } = mount();
    act(() => result.current.editor.setItems([box()]));
    await act(() => result.current.saveLayout("pick"));
    expect(write).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await write.mock.calls[0][0].text()).items).toEqual([
      box(),
    ]);
    expect(result.current.savedSnapshot).toBe(
      JSON.stringify({ desk: result.current.editor.desk, items: [box()] }),
    );
    expect(result.current.saving).toBe(false);
    expect(result.current.saveOpen).toBe(false);
  },
);
spec(
  "IO-05",
  "保存名・取消・失敗",
  "空白名、AbortError、通常保存エラー",
  "空白名はpicker0回、取消はエラーなし、通常失敗はエラー、常にsaving解除",
  async () => {
    const choose = vi.fn();
    picker(choose);
    const { result } = mount();
    act(() => result.current.setLayoutName(" "));
    await act(() => result.current.saveLayout("pick"));
    expect(choose).not.toHaveBeenCalled();
    expect(result.current.saveError).toBe(true);
    act(() => result.current.setLayoutName("Room"));
    choose.mockRejectedValueOnce(new DOMException("cancel", "AbortError"));
    await act(() => result.current.saveLayout("pick"));
    expect(result.current.saveError).toBe(false);
    choose.mockRejectedValueOnce(Error("disk"));
    await act(() => result.current.saveLayout("pick"));
    expect(result.current.saveError).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(result.current.savedSnapshot).toBeNull();
  },
);
spec(
  "IO-06",
  "ダウンロードと後始末",
  "picker非対応でpick保存し1秒経過",
  "リンククリック1回、DOMに残らずURLを1回解放",
  async () => {
    vi.useFakeTimers();
    picker(undefined);
    const revoke = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:file"),
      revokeObjectURL: revoke,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const { result } = mount();
    await act(() => result.current.saveLayout("pick"));
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:file");
  },
);
spec(
  "IO-07",
  "持ち物書出しとコピー",
  "A・Bをexportしclipboardへ書く",
  "最新番号付きリスト、dialog開、copyingからsuccess／error",
  async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard({ writeText });
    const { result } = mount();
    const dialog = document.createElement("dialog");
    act(() => {
      result.current.inventoryDialogRef.current = dialog;
      result.current.editor.setItems([box(), box("B", { x: 20 })]);
      result.current.exportInventory();
    });
    expect(dialog.open).toBe(true);
    expect(result.current.inventoryMarkdown).toBe("1. A\n2. B");
    await act(() => result.current.copyInventory());
    expect(writeText).toHaveBeenCalledWith("1. A\n2. B");
    expect(result.current.inventoryCopyState).toBe("success");
    writeText.mockRejectedValueOnce(Error("denied"));
    await act(() => result.current.copyInventory());
    expect(result.current.inventoryCopyState).toBe("error");
  },
);
spec(
  "IO-08",
  "画像コピー",
  "SVGなし・対応・書込拒否を試す",
  "SVGなしはerror、PNG1件成功はsuccess、拒否はerror",
  async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    clipboard({ write });
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(public data: unknown) {}
      },
    );
    const { result } = mount();
    await act(() => result.current.copyFrontView());
    expect(result.current.copyState).toBe("error");
    act(() => {
      result.current.frontSvgRef.current = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
    });
    await act(() => result.current.copyFrontView());
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.current.copyState).toBe("success");
    write.mockRejectedValueOnce(Error("denied"));
    await act(() => result.current.copyFrontView());
    expect(result.current.copyState).toBe("error");
  },
);
