import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box, desk, stack } from "@/tests/fixtures";
import { layoutFileName, makeLayoutFile, readLayoutFile } from "./layout-file";
export const subject = "lib/layout-file.ts";
spec(
  "FILE-01",
  "保存と読込の往復",
  "3段積載をJSON化して読み込む",
  "机・物・名前が同値、保存生成物は入力と別参照",
  () => {
    const items = stack();
    const file = makeLayoutFile(desk, items, "Room");
    expect(readLayoutFile(JSON.parse(JSON.stringify(file)))).toEqual({
      desk,
      items,
      name: "Room",
    });
    expect(file.desk).not.toBe(desk);
    expect(file.items[0]).not.toBe(items[0]);
  },
);
spec(
  "FILE-02",
  "ファイル名",
  "空名・禁則文字・拡張子付き・長い名前",
  "desk-plan.layout.json／a_b.layout.json／room.layout.json、幹80文字まで",
  () => {
    expect(layoutFileName(" ")).toBe("desk-plan.layout.json");
    expect(layoutFileName("a/b")).toBe("a_b.layout.json");
    expect(layoutFileName(" room.layout.json ")).toBe("room.layout.json");
    expect(layoutFileName("x".repeat(100)).length).toBe(80 + 12);
  },
);
spec(
  "FILE-03",
  "形式と机の境界",
  "不正形式、机幅0・10000超・NaN、幅10000",
  "不正データはthrow、幅10000は受理",
  () => {
    for (const value of [null, [], {}, { format: "wrong", version: 1 }])
      expect(() => readLayoutFile(value)).toThrow();
    for (const width of [0, 10001, NaN, Infinity])
      expect(() =>
        readLayoutFile(makeLayoutFile({ ...desk, width }, [])),
      ).toThrow("机の寸法");
    expect(
      readLayoutFile(makeLayoutFile({ ...desk, width: 10000 }, [])).desk.width,
    ).toBe(10000);
  },
);
spec(
  "FILE-04",
  "名前と物の検証",
  "空白名・不明kind・非正寸法・不正poster厚み",
  "読込を拒否し結果を返さない",
  () => {
    for (const patch of [
      { name: " " },
      { kind: "unknown" },
      { width: 0 },
      { z: -1 },
      { kind: "poster", depth: 1 },
    ])
      expect(() =>
        readLayoutFile(
          makeLayoutFile(desk, [
            { ...box(), ...patch } as ReturnType<typeof box>,
          ]),
        ),
      ).toThrow();
    expect(() =>
      readLayoutFile({ ...makeLayoutFile(desk, []), name: " " }),
    ).toThrow("レイアウト名");
  },
);
spec(
  "FILE-05",
  "IDと載せ先の検証",
  "ID重複・欠落台・循環・poster積載",
  "各不正な関係をthrowで拒否",
  () => {
    for (const items of [
      [box(), box()],
      [box("A", { supportId: "missing" })],
      [box("A", { supportId: "B" }), box("B", { supportId: "A" })],
      [box("P", { kind: "poster", depth: 0.5 }), box("A", { supportId: "P" })],
    ])
      expect(() => readLayoutFile(makeLayoutFile(desk, items))).toThrow();
  },
);
spec(
  "FILE-06",
  "件数上限",
  "1000／1001件の重ならない物",
  "1000件は受理、1001件は一覧エラー",
  () => {
    const items = Array.from({ length: 1000 }, (_, i) =>
      box(String(i), { z: i * 10 }),
    );
    expect(readLayoutFile(makeLayoutFile(desk, items)).items).toHaveLength(
      1000,
    );
    expect(() =>
      readLayoutFile(makeLayoutFile(desk, [...items, box("extra")])),
    ).toThrow("一覧");
  },
);
spec(
  "FILE-07",
  "衝突と面接触",
  "2物を同じ位置／面接触で読み込む",
  "体積衝突は拒否、面接触は受理",
  () => {
    expect(() =>
      readLayoutFile(makeLayoutFile(desk, [box(), box("B")])),
    ).toThrow("立体的に重なります");
    expect(
      readLayoutFile(makeLayoutFile(desk, [box(), box("B", { x: 10 })])).items,
    ).toHaveLength(2);
  },
);
