import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { cn } from "./utils";
export const subject = "lib/utils.ts";
spec(
  "CLASS-01",
  "条件付きクラス",
  "文字列・配列・条件・空値を結合",
  "a b c、偽条件は含まない",
  () => {
    expect(cn("a", false, ["b"], { c: true, d: false }, null)).toBe("a b c");
  },
);
spec(
  "CLASS-02",
  "競合の解決",
  "p-2の後にp-4を指定",
  "p-4を保持しp-2を除く",
  () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  },
);
