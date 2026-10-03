import { act, renderHook } from "@testing-library/react";
import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box, stack } from "@/tests/fixtures";
import { useLayoutEditor } from "./use-layout-editor";
export const subject = "features/simulator/hooks/use-layout-editor.ts";
spec(
  "EDITOR-01",
  "初期状態",
  "編集フックを初期化",
  "物0件・未選択・下書き30×20×15・配置可能",
  () => {
    const { result } = renderHook(useLayoutEditor);
    expect(result.current.items).toEqual([]);
    expect(result.current.selectedId).toBe("");
    expect(result.current.draft).toMatchObject({
      width: 30,
      depth: 20,
      height: 15,
    });
    expect(result.current.draftFits).toBe(true);
  },
);
spec(
  "EDITOR-02",
  "追加と削除",
  "下書きを追加して選択物を削除",
  "件数0→1→0、追加物を選択しフォーム閉、最後は未選択",
  () => {
    const { result } = renderHook(useLayoutEditor);
    act(() => result.current.addItem());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.selectedId).toBe(result.current.items[0].id);
    expect(result.current.adding).toBe(false);
    act(() => result.current.removeSelected());
    expect(result.current.items).toEqual([]);
    expect(result.current.selectedId).toBe("");
  },
);
spec(
  "EDITOR-03",
  "不正下書き",
  "空白名・幅0・NaN・高さ負・欠落台",
  "draftFits=false、原因を表示、追加しても物0件",
  () => {
    const { result } = renderHook(useLayoutEditor);
    for (const patch of [
      { name: " " },
      { width: 0 },
      { depth: NaN },
      { z: -1 },
      { supportId: "missing" },
    ]) {
      act(() =>
        result.current.setDraft({
          name: "New",
          kind: "box",
          supportId: null,
          width: 10,
          depth: 10,
          height: 10,
          z: 0,
          ...patch,
        }),
      );
      expect(result.current.draftFits).toBe(false);
      expect(result.current.draftError).not.toBe("");
      act(() => result.current.addItem());
      expect(result.current.items).toEqual([]);
    }
  },
);
spec(
  "EDITOR-04",
  "名前確定",
  "前後空白と空白のみの名前を確定",
  "trimしたBook、空白のみは既存Bookを保ち入力も戻す",
  () => {
    const { result } = renderHook(useLayoutEditor);
    act(() => result.current.setItems([box()]));
    const input = document.createElement("input");
    input.value = "  Book  ";
    act(() => result.current.saveName("A", input));
    expect(result.current.items[0].name).toBe("Book");
    input.value = " ";
    act(() => result.current.saveName("A", input));
    expect(input.value).toBe("Book");
  },
);
spec(
  "EDITOR-05",
  "同期と連続更新",
  "同じact内でitems更新後に物を編集し机更新",
  "stateとrefが一致し直前の物を編集できる、setterは安定参照",
  () => {
    const { result, rerender } = renderHook(useLayoutEditor);
    const setter = result.current.setItems;
    act(() => {
      result.current.setItems([box()]);
      result.current.updateSelected("A", { x: 20 });
      result.current.setDesk({ width: 200, depth: 60, height: 73 });
    });
    expect(result.current.items[0].x).toBe(20);
    expect(result.current.itemsRef.current).toBe(result.current.items);
    expect(result.current.deskRef.current).toBe(result.current.desk);
    rerender();
    expect(result.current.setItems).toBe(setter);
  },
);
spec(
  "EDITOR-06",
  "机寸法の境界",
  "幅0・NaN・10000超と10000",
  "不正値は旧机を保持、10000を受理してエラー解除",
  () => {
    const { result } = renderHook(useLayoutEditor);
    for (const width of [0, NaN, 10001]) {
      act(() => {
        expect(result.current.changeDesk("width", width)).toBe(false);
      });
      expect(result.current.desk.width).toBe(180);
      expect(result.current.invalidDesk).toBe(true);
    }
    act(() => {
      expect(result.current.changeDesk("width", 10000)).toBe(true);
    });
    expect(result.current.invalidDesk).toBe(false);
  },
);
spec(
  "EDITOR-07",
  "無効更新と回復",
  "衝突する移動後に有効な移動",
  "拒否時はitems同参照・対象エラー、成功後に解除",
  () => {
    const { result } = renderHook(useLayoutEditor);
    const items = [box(), box("B", { x: 30 })];
    act(() => result.current.setItems(items));
    act(() => result.current.updateSelected("A", { x: 30 }));
    expect(result.current.items).toBe(items);
    expect(result.current.invalidItemId).toBe("A");
    expect(result.current.itemError).not.toBe("");
    act(() => result.current.updateSelected("A", { x: 15 }));
    expect(result.current.invalidItemId).toBeNull();
    expect(result.current.itemError).toBe("");
  },
);
spec(
  "EDITOR-08",
  "載せ先の失敗理由",
  "欠落・自分・子孫・posterを台として指定",
  "個別理由を表示し配置不変、同じ台の再指定は成功扱い",
  () => {
    const { result } = renderHook(useLayoutEditor);
    const items = [...stack(), box("P", { kind: "poster", x: 90, depth: 0.5 })];
    act(() => result.current.setItems(items));
    for (const [id, support, message] of [
      ["base", "missing", "見つかりません"],
      ["base", "base", "自分自身"],
      ["base", "grandchild", "子や孫"],
      ["child", "P", "ポスター"],
    ]) {
      act(() => result.current.changeSupport(id, support));
      expect(result.current.items).toBe(items);
      expect(result.current.itemError).toContain(message);
    }
    act(() => {
      expect(result.current.changeSupport("child", "base")).toBe(true);
    });
    expect(result.current.invalidItemId).toBeNull();
  },
);
spec(
  "EDITOR-09",
  "台削除と下書き",
  "baseを選び下書きもbase上にして削除",
  "下書き台null、子を選択し孫の関係を保持",
  () => {
    const { result } = renderHook(useLayoutEditor);
    act(() => {
      result.current.setItems(stack());
      result.current.setSelectedId("base");
      result.current.setDraft((d) => ({ ...d, supportId: "base" }));
    });
    act(() => result.current.removeSelected());
    expect(result.current.draft.supportId).toBeNull();
    expect(result.current.selectedId).toBe("child");
    expect(result.current.items[1].supportId).toBe("child");
  },
);
spec(
  "EDITOR-10",
  "種類とプリセット",
  "下書きA4とposter→box、選択物posterと縦横交換",
  "A4=21×29.7×0.5、boxへ戻すとdepth20、交換は幅と高さのみ",
  () => {
    const { result } = renderHook(useLayoutEditor);
    act(() => result.current.choosePreset("A4-portrait"));
    expect(result.current.draft).toMatchObject({
      kind: "poster",
      width: 21,
      height: 29.7,
      depth: 0.5,
    });
    act(() => result.current.chooseDraftAppearance("box"));
    expect(result.current.draft.depth).toBe(20);
    expect(result.current.presetId).toBe("custom");
    act(() => {
      result.current.setItems([box("A", { width: 20, height: 30 })]);
      result.current.setSelectedId("A");
    });
    act(() => result.current.chooseSelectedAppearance("poster"));
    act(() => result.current.swapPosterSize());
    expect(result.current.items[0]).toMatchObject({
      kind: "poster",
      width: 30,
      height: 20,
      depth: 0.5,
    });
  },
);
