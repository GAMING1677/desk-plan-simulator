import { expect, vi } from "vitest";
import { spec } from "@/tests/spec";
import { box, desk, stack } from "@/tests/fixtures";
import { createLayoutTools } from "./create-layout-tools";
export const subject =
  "features/simulator/browser-tools/create-layout-tools.ts";
function setup(initial = [box("A")]) {
  let items = initial;
  const set = vi.fn((next: typeof items) => {
      items = next;
    }),
    select = vi.fn(),
    after = vi.fn().mockResolvedValue(undefined);
  const tools = createLayoutTools({
    getDesk: () => desk,
    getItems: () => items,
    setItems: set,
    selectItem: select,
    createId: () => "new",
    afterUpdate: after,
  });
  return {
    tools,
    set,
    select,
    after,
    run: (name: string, input: unknown) =>
      tools.find((t) => t.name === name)!.execute(input),
  };
}
spec(
  "TOOLS-01",
  "公開契約",
  "ツール定義を読む",
  "4名一意、readだけreadOnly、placeの必須キーid/supportId",
  () => {
    const { tools } = setup();
    expect(tools.map((t) => t.name)).toEqual([
      "read_desk_layout",
      "add_desk_object",
      "move_desk_object",
      "place_desk_object_on",
    ]);
    expect(tools.map((t) => t.annotations.readOnlyHint)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(tools[3].inputSchema).toMatchObject({
      required: ["id", "supportId"],
    });
  },
);
spec(
  "TOOLS-02",
  "型不正の入力",
  "null・配列・文字列を各書込ツールへ渡す",
  "入力の型を説明してreject、変更0回",
  async () => {
    const state = setup();
    for (const name of [
      "add_desk_object",
      "move_desk_object",
      "place_desk_object_on",
    ])
      for (const input of [null, [], "bad"])
        await expect(state.run(name, input)).rejects.toThrow(
          "入力をオブジェクト",
        );
    expect(state.set).not.toHaveBeenCalled();
  },
);
spec(
  "TOOLS-03",
  "不正な載せ先",
  "欠落・自分・子孫・poster・空ID・数値",
  "原因を区別してreject、元の配置と選択を保持",
  async () => {
    const state = setup([...stack(), box("P", { kind: "poster", x: 80 })]);
    for (const [supportId, message] of [
      ["missing", "見つかりません"],
      ["base", "自分自身"],
      ["child", "子や孫"],
      ["P", "ポスター"],
      ["", "正しく"],
      [1, "正しく"],
    ])
      await expect(
        state.run("place_desk_object_on", { id: "base", supportId }),
      ).rejects.toThrow(String(message));
    expect(state.set).not.toHaveBeenCalled();
    expect(state.select).not.toHaveBeenCalled();
  },
);
spec(
  "TOOLS-04",
  "追加の載せ先型",
  "supportId=0または空文字・posterで追加",
  "机への暗黙変換をせず拒否",
  async () => {
    const state = setup([box("P", { kind: "poster" })]);
    for (const supportId of [0, "", "P"])
      await expect(
        state.run("add_desk_object", {
          name: "Book",
          width: 10,
          depth: 10,
          height: 10,
          supportId,
        }),
      ).rejects.toThrow();
    expect(state.set).not.toHaveBeenCalled();
  },
);
spec(
  "TOOLS-05",
  "同じ載せ先の再指定",
  "既にbase上のchildへbaseを再指定",
  "成功結果を返し不要なデータ更新と描画待ちをしない",
  async () => {
    const state = setup(stack());
    await expect(
      state.run("place_desk_object_on", { id: "child", supportId: "base" }),
    ).resolves.toEqual({ id: "child", supportId: "base" });
    expect(state.set).not.toHaveBeenCalled();
    expect(state.after).not.toHaveBeenCalled();
  },
);
spec(
  "TOOLS-06",
  "独立配置へ解除",
  "台上のchildをnullへ解除",
  "元world(22,18,10)を保持し選択と更新完了待ち1回",
  async () => {
    const state = setup(stack());
    await state.run("place_desk_object_on", { id: "child", supportId: null });
    expect(state.set.mock.calls[0][0][1]).toMatchObject({
      supportId: null,
      x: 22,
      y: 18,
      z: 10,
    });
    expect(state.select).toHaveBeenCalledWith("child");
    expect(state.after).toHaveBeenCalledTimes(1);
  },
);
