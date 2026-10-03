import { fireEvent, render, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import { Harness } from "@/tests/controller-fixture";
import { SimulatorHeader } from "./SimulatorHeader";
export const subject = "features/simulator/components/SimulatorHeader.tsx";
spec(
  "HEADER-01",
  "保存パネル",
  "保存を開いて名前入力・Enter・取消",
  "downloadモード1回、取消でパネル閉、追加保存なし",
  () => {
    const save = vi.fn();
    render(
      <Harness Component={SimulatorHeader} override={{ saveLayout: save }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "配置を保存" }));
    const input = screen.getByLabelText("レイアウト名");
    fireEvent.change(input, { target: { value: "Room" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(save).toHaveBeenCalledExactlyOnceWith("download");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  },
);
spec(
  "HEADER-02",
  "保存中と保存済み",
  "snapshot一致と不一致、saving状態",
  "一致時保存しました、不一致時配置を保存、処理中は保存disabled",
  () => {
    let state: any;
    const view = render(
      <Harness Component={SimulatorHeader} inspect={(s) => (state = s)} />,
    );
    const snapshot = JSON.stringify({ desk: state.desk, items: state.items });
    view.rerender(
      <Harness
        Component={SimulatorHeader}
        override={{ savedSnapshot: snapshot }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "保存しました" }),
    ).toBeInTheDocument();
    view.rerender(
      <Harness
        Component={SimulatorHeader}
        override={{ savedSnapshot: "old", saveOpen: true, saving: true }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "配置を保存" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ダウンロード" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
  },
);
spec(
  "HEADER-03",
  "ファイル再選択と状態",
  "同じファイルのchangeを2回、読込失敗表示",
  "読込2回、input値は空、失敗理由titleへ反映",
  () => {
    const load = vi.fn();
    const view = render(
      <Harness
        Component={SimulatorHeader}
        override={{
          loadLayout: load,
          loadState: "error",
          loadError: "不正な配置",
        }}
      />,
    );
    const input = screen.getByLabelText(".layout.jsonファイルを選択"),
      file = new File(["{}"], "room.layout.json");
    for (let i = 0; i < 2; i++)
      fireEvent.change(input, { target: { files: [file] } });
    expect(load).toHaveBeenCalledTimes(2);
    expect(input).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "読み込み失敗" }),
    ).toHaveAttribute("title", "不正な配置");
  },
);
spec(
  "HEADER-04",
  "書出しと初期化",
  "持ち物を書出し、変更済み机・物を初期化",
  "export1回、初期配置は180×50×73・0件・未選択",
  () => {
    let state: any;
    const exportInventory = vi.fn();
    render(
      <Harness
        Component={SimulatorHeader}
        items={[box()]}
        selectedId="A"
        inspect={(s) => (state = s)}
        override={{ exportInventory }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "持ち物リストを書き出す" }),
    );
    expect(exportInventory).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "初期配置に戻す" }));
    expect(state.items).toEqual([]);
    expect(state.desk).toEqual({ width: 180, depth: 50, height: 73 });
    expect(state.selectedId).toBe("");
  },
);
