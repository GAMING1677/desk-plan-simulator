import type { Desk, Item } from "@/lib/desk-model";

export const desk: Desk = { width: 100, depth: 60, height: 73 };
export function box(id = "A", change: Partial<Item> = {}): Item {
  return {
    id,
    name: id,
    kind: "box",
    supportId: null,
    x: 0,
    y: 0,
    z: 0,
    width: 10,
    depth: 10,
    height: 10,
    ...change,
  };
}
export function stack() {
  return [
    box("base", { x: 20, y: 15, width: 40, depth: 30 }),
    box("child", {
      supportId: "base",
      x: 2,
      y: 3,
      width: 5,
      depth: 5,
      height: 5,
    }),
    box("grandchild", {
      supportId: "child",
      x: 1,
      y: 1,
      width: 2,
      depth: 2,
      height: 2,
    }),
  ];
}
