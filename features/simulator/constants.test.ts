import { expect } from "vitest";
import { spec } from "@/tests/spec";
import * as c from "./constants";
export const subject = "features/simulator/constants.ts";
spec(
  "CONST-01",
  "描画と出力定数",
  "倍率・原点・画像サイズを読む",
  "倍率4、上面原点96,72、側面80、FHD1920×1080",
  () => {
    expect(c).toMatchObject({
      DIAGRAM_SCALE: 4,
      TOP_VIEW_ORIGIN_X: 96,
      TOP_VIEW_ORIGIN_Y: 72,
      SIDE_VIEW_ORIGIN_X: 80,
      FHD_WIDTH: 1920,
      FHD_HEIGHT: 1080,
    });
  },
);
