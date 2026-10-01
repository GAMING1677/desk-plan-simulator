import { itemDepth, type Desk, type Item, type WorldPosition } from "./desk-model";
export const FRONT_VIEW_DISTANCE = 100;
export const FRONT_WIDTH = 920;
export const FRONT_HEIGHT = 720;
export type Vertex = { x: number; y: number; z: number };
// Artistic depth correction: half strength, with a separate uniform zoom.
export const FRONT_DEPTH_STRENGTH = 0.5;
const BASE_PIXELS_PER_CM = 4;
export const eyeDepth = (desk: Desk) => desk.depth + FRONT_VIEW_DISTANCE / FRONT_DEPTH_STRENGTH;
function pixelsPerCm(desk: Desk, depth: number, zoom: number) {
  const distance = FRONT_VIEW_DISTANCE + (desk.depth - depth) * FRONT_DEPTH_STRENGTH;
  return BASE_PIXELS_PER_CM * (zoom / 100) * FRONT_VIEW_DISTANCE / Math.max(1, distance);
}
export function frontScale(desk: Desk, item: Item, world: WorldPosition, zoom = 100) {
  return pixelsPerCm(desk, world.y + itemDepth(item), zoom) / BASE_PIXELS_PER_CM;
}
export function projectFront(desk: Desk, point: Vertex, zoom: number) {
  const scale = pixelsPerCm(desk, point.y, zoom);
  return { x: FRONT_WIDTH / 2 + (point.x - desk.width / 2) * scale, y: FRONT_HEIGHT / 2 - point.z * scale };
}
/** Clip where the softened projection denominator reaches 1cm. */
export function clipFront(desk: Desk, points: Vertex[]) {
  const limit = eyeDepth(desk) - 1 / FRONT_DEPTH_STRENGTH;
  const result: Vertex[] = [];
  points.forEach((b, index) => {
    const a = points[(index + points.length - 1) % points.length];
    if ((a.y <= limit) !== (b.y <= limit)) {
      const t = (limit - a.y) / (b.y - a.y);
      result.push({ x: a.x + (b.x-a.x)*t, y: limit, z: a.z+(b.z-a.z)*t });
    }
    if (b.y <= limit) result.push(b);
  });
  return result;
}
