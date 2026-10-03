import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box } from "@/tests/fixtures";
import { makeInventoryMarkdown } from "./inventory-file";
export const subject = "lib/inventory-file.ts";
spec(
  "INVENTORY-01",
  "順序と空リスト",
  "A・Bの一覧と空一覧",
  "1. A改行2. B、空一覧は空文字",
  () => {
    expect(makeInventoryMarkdown([box("A"), box("B")])).toBe("1. A\n2. B");
    expect(makeInventoryMarkdown([])).toBe("");
  },
);
spec(
  "INVENTORY-02",
  "記号と改行",
  "日本語・Markdown記号・改行・バックスラッシュを含む名前",
  "記号をエスケープして1物1行、入力を保持",
  () => {
    const item = box("A", { name: "本*[]\r\n\\" });
    expect(makeInventoryMarkdown([item])).toBe("1. 本\\*\\[\\] \\\\");
    expect(item.name).toBe("本*[]\r\n\\");
  },
);
