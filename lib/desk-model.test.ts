import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box, desk, stack } from "@/tests/fixtures";
import {
  canAddItem,
  cm,
  DEFAULT_DESK,
  DEFAULT_ITEMS,
  descendantIds,
  findOpenPlacement,
  itemDepth,
  itemsCollide,
  itemTop,
  monitorShape,
  placeOn,
  placementIssue,
  removeItem,
  rounded,
  supportFor,
  supportIssue,
  supportSize,
  updateItem,
  worldPosition,
} from "./desk-model";
export const subject = "lib/desk-model.ts";

spec("MODEL-01", "初期状態", "初期定数を読む", "机180×50×73cm、物0件", () => {
  expect(DEFAULT_DESK).toEqual({ width: 180, depth: 50, height: 73 });
  expect(DEFAULT_ITEMS).toEqual([]);
});
spec(
  "MODEL-02",
  "積載の世界座標",
  "台・子・孫を重ねる",
  "子(22,18,10)、孫(23,19,15)、子孫集合は2件",
  () => {
    const items = stack();
    expect(worldPosition(items, items[1])).toEqual({ x: 22, y: 18, z: 10 });
    expect(worldPosition(items, items[2])).toEqual({ x: 23, y: 19, z: 15 });
    expect(descendantIds(items, "base")).toEqual(
      new Set(["child", "grandchild"]),
    );
    expect(supportFor(items, items[1])).toBe(items[0]);
    expect(supportSize(items, "base", desk)).toEqual({ width: 40, depth: 30 });
    expect(supportSize(items, null, desk)).toBe(desk);
  },
);
spec(
  "MODEL-03",
  "接触と衝突",
  "10cm角の物をx=10／9.9に置く",
  "面の接触はfalse、0.1cmの重なりはtrue",
  () => {
    const a = box();
    expect(itemsCollide([a, box("B", { x: 10 })], a, box("B", { x: 10 }))).toBe(
      false,
    );
    expect(
      itemsCollide([a, box("B", { x: 9.9 })], a, box("B", { x: 9.9 })),
    ).toBe(true);
  },
);
spec(
  "MODEL-04",
  "高さによる非衝突",
  "同じ平面位置でz=10に10cm角を置く",
  "上下の面接触は衝突しない",
  () => {
    const a = box(),
      b = box("B", { z: 10 });
    expect(itemsCollide([a, b], a, b)).toBe(false);
  },
);
spec(
  "MODEL-05",
  "モニターの空隙",
  "画面と支柱と足のない空間に小物を置く",
  "外形の箱の中でも実部品と重ならなければ衝突しない",
  () => {
    const a = box("M", { kind: "monitor", width: 60, depth: 20, height: 40 }),
      b = box("B", { x: 0, y: 0, width: 5, depth: 5, height: 5 });
    expect(itemsCollide([a, b], a, b)).toBe(false);
    expect(monitorShape(a).footWidth).toBe(12);
  },
);
spec(
  "MODEL-06",
  "ポスターの厚み",
  "奥行き指定が異なるposterを計算する",
  "衝突と描画の厚みは0.5cm、高さは元の高さ",
  () => {
    const p = box("P", { kind: "poster", depth: 20 });
    expect(itemDepth(p)).toBe(0.5);
    expect(itemTop(p)).toBe(10);
  },
);
spec(
  "MODEL-07",
  "台へのはみ出し",
  "x=-5の10cm角とx=-10の10cm角を置く",
  "台と面積が重なれば受理、面積ゼロなら拒否",
  () => {
    expect(canAddItem([], box("A", { x: -5 }), desk)).toBeNull();
    expect(canAddItem([], box("A", { x: -10 }), desk)).not.toBeNull();
  },
);
spec(
  "MODEL-08",
  "ポスターのはみ出し",
  "机と接しない位置にposterを置く",
  "机との平面接触を要求しない",
  () => {
    expect(
      canAddItem([], box("P", { kind: "poster", x: -100 }), desk),
    ).toBeNull();
  },
);
spec(
  "MODEL-09",
  "空き位置",
  "空机に10cm角を追加する",
  "中央x=45,y=25に配置し原型と一覧を変えない",
  () => {
    const a = box(),
      items: (typeof a)[] = [];
    expect(findOpenPlacement(items, a, desk)).toEqual({ ...a, x: 45, y: 25 });
    expect(a.x).toBe(0);
    expect(items).toEqual([]);
  },
);
spec(
  "MODEL-10",
  "空きなし",
  "机全面100×60を同じ高さの物で埋める",
  "新しい物の配置候補はnull",
  () => {
    expect(
      findOpenPlacement([box("full", { width: 100, depth: 60 })], box(), desk),
    ).toBeNull();
  },
);
spec(
  "MODEL-11",
  "不正な寸法",
  "幅0・NaN・高さInfinity・負のzを指定する",
  "追加を拒否し、編集は元のitems参照を返す",
  () => {
    for (const patch of [
      { width: 0 },
      { width: NaN },
      { height: Infinity },
      { z: -1 },
    ]) {
      const items = [box()];
      expect(canAddItem([], box("A", patch), desk)).not.toBeNull();
      expect(updateItem(items, "A", patch, desk)).toBe(items);
    }
  },
);
spec(
  "MODEL-12",
  "存在しない対象",
  "存在しないIDを編集・積載変更する",
  "元のitemsを返し変更しない",
  () => {
    const items = [box()];
    expect(updateItem(items, "missing", { x: 5 }, desk)).toBe(items);
    expect(placeOn(items, "missing", null, desk)).toBe(items);
  },
);
spec(
  "MODEL-13",
  "載せ先欠落",
  "存在しない台を指定する",
  "載せ先が見つからない理由を返し追加・変更とも拒否",
  () => {
    const items = [box()];
    expect(supportIssue(items, "A", "missing")).toBe(
      "載せ先が見つかりません。",
    );
    expect(placeOn(items, "A", "missing", desk)).toBe(items);
    expect(
      findOpenPlacement(items, box("B", { supportId: "missing" }), desk),
    ).toBeNull();
  },
);
spec(
  "MODEL-14",
  "自分・子孫への積載",
  "base自身またはgrandchildをbaseの載せ先に指定",
  "自分／子孫に対応する理由を返し元の配置を保つ",
  () => {
    const items = stack();
    expect(supportIssue(items, "base", "base")).toContain("自分自身");
    expect(supportIssue(items, "base", "grandchild")).toContain("子や孫");
    expect(placeOn(items, "base", "grandchild", desk)).toBe(items);
  },
);
spec(
  "MODEL-15",
  "ポスターへの積載",
  "posterを載せ先に指定する",
  "ポスターの上には置けない理由を返す",
  () => {
    const items = [box("P", { kind: "poster" })];
    expect(supportIssue(items, "A", "P")).toBe("ポスターの上には置けません。");
  },
);
spec(
  "MODEL-16",
  "載せ先の型",
  "空文字と数値を台IDに指定する",
  "載せ先を正しく指定してください、nullは有効",
  () => {
    expect(supportIssue([], null, "")).toContain("正しく");
    expect(supportIssue([], null, 12 as unknown as string)).toContain("正しく");
    expect(supportIssue([], null, null)).toBeNull();
  },
);
spec(
  "MODEL-17",
  "祖先の循環・欠落",
  "A→B→Aの台または祖先の欠落を指定する",
  "循環／欠落を拒否し座標再帰が停止する",
  () => {
    const items = [box("A", { supportId: "B" }), box("B", { supportId: "A" })];
    expect(supportIssue(items, "new", "A")).toContain("循環");
    expect(Number.isFinite(worldPosition(items, items[0]).x)).toBe(true);
    expect(
      supportIssue([box("A", { supportId: "missing" })], "new", "A"),
    ).toContain("見つかりません");
  },
);
spec(
  "MODEL-18",
  "積載の高さ",
  "台上の子のzを1にする",
  "台に接する高さにしてくださいと拒否",
  () => {
    const items = stack();
    items[1].z = 1;
    expect(placementIssue(items, new Set(["child"]), desk)).toContain(
      "台に接する高さ",
    );
  },
);
spec(
  "MODEL-19",
  "台の移動で子が衝突",
  "baseを移動し台上の子を同じ高さの物に重ねる",
  "台自身が衝突しなくても子の衝突で変更を拒否",
  () => {
    const items = stack().slice(0, 2);
    items.push(
      box("obstacle", { x: 72, y: 18, z: 10, width: 5, depth: 5, height: 5 }),
    );
    expect(updateItem(items, "base", { x: 70 }, desk)).toBe(items);
  },
);
spec(
  "MODEL-20",
  "載せ先変更と解除",
  "子をbaseへ乗せた後nullへ解除する",
  "乗せると中央・z=0、解除前後の世界座標を保持",
  () => {
    let items = [
      box("base", { x: 20, y: 15, width: 40, depth: 30 }),
      box("child", { x: 70 }),
    ];
    items = placeOn(items, "child", "base", desk);
    expect(items[1]).toMatchObject({ supportId: "base", x: 15, y: 10, z: 0 });
    const before = worldPosition(items, items[1]);
    items = placeOn(items, "child", null, desk);
    expect(items[1].supportId).toBeNull();
    expect(worldPosition(items, items[1])).toEqual(before);
  },
);
spec(
  "MODEL-21",
  "台削除",
  "3段積載からbaseを削除",
  "子は独立配置・孫は子を載せ先として世界座標を保持",
  () => {
    const items = stack(),
      before = items.map((i) => worldPosition(items, i));
    const next = removeItem(items, "base", desk);
    expect(next).toHaveLength(2);
    expect(next[0].supportId).toBeNull();
    expect(next[1].supportId).toBe("child");
    expect(next.map((i) => worldPosition(next, i))).toEqual(before.slice(1));
    expect(items).toHaveLength(3);
  },
);
spec(
  "MODEL-22",
  "変更対象外の旧衝突",
  "Aを更新し、別の2物は既に重なっている",
  "Aに影響しない旧衝突で編集を拒否しない",
  () => {
    const items = [box("A"), box("B", { x: 40 }), box("C", { x: 40 })];
    expect(updateItem(items, "A", { x: 15 }, desk)).not.toBe(items);
  },
);
spec(
  "MODEL-23",
  "数値表示",
  "1.26cmを丸めて表示する",
  "rounded=1.3、表示は1.3 cm",
  () => {
    expect(rounded(1.26)).toBe(1.3);
    expect(cm(1.26)).toBe("1.3 cm");
  },
);
