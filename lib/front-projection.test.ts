import { expect } from "vitest";
import { spec } from "@/tests/spec";
import { box, desk, stack } from "@/tests/fixtures";
import {
  createFrontCamera,
  fitFrontView,
  projectFront,
  unprojectFront,
  FRONT_WIDTH,
  FRONT_HEIGHT,
} from "./front-projection";
export const subject = "lib/front-projection.ts";
spec(
  "CAMERA-01",
  "固定視点",
  "幅180・奥行き50・高さ73、倍率150",
  "camera位置(90,77,350)、zoom=1.5",
  () => {
    const c = createFrontCamera({ width: 180, depth: 50, height: 73 }, 150);
    expect(c.position.toArray()).toEqual([90, 77, 350]);
    expect(c.zoom).toBe(1.5);
  },
);
spec(
  "CAMERA-02",
  "投影の往復",
  "点(30,20,15)を倍率1・100・200で投影と逆投影",
  "各座標の誤差1e−6cm以下",
  () => {
    const p = { x: 30, y: 20, z: 15 };
    for (const zoom of [1, 100, 200]) {
      const result = unprojectFront(
        desk,
        projectFront(desk, p, zoom),
        p.y,
        zoom,
      );
      for (const k of ["x", "y", "z"] as const)
        expect(result[k]).toBeCloseTo(p[k], 6);
    }
  },
);
spec(
  "CAMERA-03",
  "倍率とパン",
  "同じ世界変位を倍率100・150で投影、パン(+10,+20)",
  "画面変位1.5倍、camera視点は変わらない",
  () => {
    const a = { x: 20, y: 20, z: 10 },
      b = { ...a, x: 30 };
    const delta = (zoom: number) =>
      projectFront(desk, b, zoom).x - projectFront(desk, a, zoom).x;
    expect(delta(150) / delta(100)).toBeCloseTo(1.5);
    expect(createFrontCamera(desk, 100, { x: 10, y: 20 }).position).toEqual(
      createFrontCamera(desk, 100).position,
    );
  },
);
spec(
  "CAMERA-04",
  "全体表示",
  "積載と机からはみ出した物を表示",
  "可視頂点は画面内に余白60px、倍率1〜200",
  () => {
    const items = [
      ...stack(),
      box("extra", { x: -30, y: 0, width: 20, height: 70 }),
    ];
    const fit = fitFrontView(desk, items);
    expect(fit.zoom).toBeGreaterThanOrEqual(1);
    expect(fit.zoom).toBeLessThanOrEqual(200);
    for (const item of items) {
      const world = item.supportId ? { x: 22, y: 18, z: 10 } : item;
      for (const x of [world.x, world.x + item.width])
        for (const z of [world.z, world.z + item.height]) {
          const p = projectFront(desk, { x, y: world.y, z }, fit.zoom);
          expect(p.x + fit.offset.x).toBeGreaterThanOrEqual(59);
          expect(p.x + fit.offset.x).toBeLessThanOrEqual(FRONT_WIDTH - 59);
          expect(p.y + fit.offset.y).toBeGreaterThanOrEqual(59);
          expect(p.y + fit.offset.y).toBeLessThanOrEqual(FRONT_HEIGHT - 59);
        }
    }
  },
);
spec(
  "CAMERA-05",
  "空配置と近傍",
  "空配置・高い物・カメラより手前の物をfit",
  "倍率とoffsetが有限でNaNなし",
  () => {
    for (const items of [
      [],
      [box("tall", { height: 500 })],
      [box("near", { y: 360 })],
    ]) {
      const fit = fitFrontView(desk, items);
      expect(
        [fit.zoom, fit.offset.x, fit.offset.y].every(Number.isFinite),
      ).toBe(true);
    }
  },
);
