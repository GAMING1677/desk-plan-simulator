export type Item = {
  id: string;
  name: string;
  kind: "monitor" | "poster" | "box" | "laptop";
  supportId: string | null;
  /** Position measured from the support's left back corner, in centimeters. */
  x: number;
  y: number;
  /** Height above the desktop, or zero when linked to a support. */
  z: number;
  width: number;
  depth: number;
  height: number;
};

export type WorldPosition = { x: number; y: number; z: number };

export type Desk = { width: number; depth: number; height: number };
export const DEFAULT_DESK: Desk = { width: 180, depth: 50, height: 73 };
export const POSTER_PANEL_DEPTH = 0.5;
export const MONITOR_SCREEN_FRACTION = 0.78;

/** Simplified screen, center support and compact foot within the entered outer dimensions. */
export function monitorShape(item: Item) {
  const panelDepth = Math.min(1.5, item.depth);
  const panelStart = item.depth - panelDepth;
  const footWidth = Math.min(12, item.width);
  const footDepth = Math.min(8, item.depth);
  const footStart = item.depth - footDepth;
  const footHeight = Math.min(1.5, item.height * 0.1);
  const stemWidth = Math.min(1.5, item.width);
  const stemDepth = Math.min(1.5, footDepth);
  const stemY = item.depth - panelDepth / 2;
  const screenBottom = item.height * (1 - MONITOR_SCREEN_FRACTION);
  return { panelDepth, panelStart, footWidth, footDepth, footStart, footHeight, stemWidth, stemDepth, stemY, screenBottom };
}

export const DEFAULT_ITEMS: Item[] = [
  { id: "monitor-1", name: "27インチ モニター 1", kind: "monitor", supportId: null, x: 22, y: 7, z: 0, width: 59.8, depth: 20, height: 43 },
  { id: "monitor-2", name: "27インチ モニター 2", kind: "monitor", supportId: null, x: 98, y: 7, z: 0, width: 59.8, depth: 20, height: 43 },
];

export const rounded = (n: number) => Math.round(n * 10) / 10;
export const cm = (n: number) => `${rounded(n)} cm`;
const EPSILON = 0.000001;
export const itemDepth = (item: Item) => item.kind === "poster" ? POSTER_PANEL_DEPTH : item.depth;
export const itemTop = (item: Item) => item.height;

export function supportFor(items: Item[], item: Item): Item | undefined {
  return items.find((candidate) => candidate.id === item.supportId);
}

export function supportSize(items: Item[], supportId: string | null, desk: Desk) {
  const support = items.find((item) => item.id === supportId);
  return support ? { width: support.width, depth: support.depth } : desk;
}

export function worldPosition(items: Item[], item: Item, visited = new Set<string>()): WorldPosition {
  if (!item.supportId || visited.has(item.id)) return { x: item.x, y: item.y, z: item.z };
  const support = supportFor(items, item);
  if (!support) return { x: item.x, y: item.y, z: item.z };
  const nextVisited = new Set(visited);
  nextVisited.add(item.id);
  const parent = worldPosition(items, support, nextVisited);
  return { x: rounded(parent.x + item.x), y: rounded(parent.y + item.y), z: rounded(parent.z + itemTop(support) + item.z) };
}

export function descendantIds(items: Item[], id: string): Set<string> {
  const found = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.supportId === id || (item.supportId && found.has(item.supportId))) {
        if (!found.has(item.id)) { found.add(item.id); changed = true; }
      }
    }
  }
  return found;
}

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 - EPSILON && b0 < a1 - EPSILON;
}

function footprintsOverlap(a: WorldPosition, aWidth: number, aDepth: number, b: WorldPosition, bWidth: number, bDepth: number) {
  return intervalsOverlap(a.x, a.x + aWidth, b.x, b.x + bWidth)
    && intervalsOverlap(a.y, a.y + aDepth, b.y, b.y + bDepth);
}

type Volume = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

function itemVolumes(items: Item[], item: Item): Volume[] {
  const position = worldPosition(items, item);
  if (item.kind === "monitor") {
    const shape = monitorShape(item);
    const centerX = position.x + item.width / 2;
    const volumes: Volume[] = [
      { x0: position.x, x1: position.x + item.width, y0: position.y + shape.panelStart, y1: position.y + item.depth, z0: position.z + shape.screenBottom, z1: position.z + item.height },
      { x0: centerX - shape.footWidth / 2, x1: centerX + shape.footWidth / 2, y0: position.y + shape.footStart, y1: position.y + item.depth, z0: position.z, z1: position.z + shape.footHeight },
    ];
    if (shape.screenBottom > shape.footHeight) volumes.push({
      x0: centerX - shape.stemWidth / 2, x1: centerX + shape.stemWidth / 2,
      y0: position.y + shape.stemY - shape.stemDepth / 2, y1: position.y + shape.stemY + shape.stemDepth / 2,
      z0: position.z + shape.footHeight, z1: position.z + shape.screenBottom,
    });
    return volumes;
  }
  if (item.kind !== "poster") return [{ x0: position.x, x1: position.x + item.width, y0: position.y, y1: position.y + item.depth, z0: position.z, z1: position.z + item.height }];
  return [
    { x0: position.x, x1: position.x + item.width, y0: position.y, y1: position.y + POSTER_PANEL_DEPTH, z0: position.z, z1: position.z + item.height },
  ];
}

/** Touching faces are allowed; sharing any positive 3D volume is not. */
export function itemsCollide(items: Item[], a: Item, b: Item) {
  return itemVolumes(items, a).some((first) => itemVolumes(items, b).some((second) =>
    intervalsOverlap(first.x0, first.x1, second.x0, second.x1)
      && intervalsOverlap(first.y0, first.y1, second.y0, second.y1)
      && intervalsOverlap(first.z0, first.z1, second.z0, second.z1)));
}

/** Check only objects affected by the edit, so old layouts remain editable. */
export function placementIssue(items: Item[], affectedIds: Set<string>, desk: Desk): string | null {
  for (const item of items) {
    if (!affectedIds.has(item.id)) continue;
    const position = worldPosition(items, item);
    const support = supportFor(items, item);
    if (item.supportId && !support) return "置く場所が見つかりません。";
    if (item.supportId && item.z !== 0) return "上に乗せる物は台に接する高さにしてください。";
    if (support?.kind === "poster") return "ポスターの上には置けません。";
    if (item.kind === "poster") continue;
    const base = support ? worldPosition(items, support) : { x: 0, y: 0, z: 0 };
    const width = support?.width ?? desk.width;
    const depth = support?.depth ?? desk.depth;
    if (!footprintsOverlap(position, item.width, item.depth, base, width, depth)) return "置く場所と接する位置にしてください。";
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if ((affectedIds.has(items[i].id) || affectedIds.has(items[j].id)) && itemsCollide(items, items[i], items[j])) {
        return `「${items[i].name}」と「${items[j].name}」が立体的に重なります。`;
      }
    }
  }
  return null;
}

export function canAddItem(items: Item[], item: Item, desk: Desk) {
  if (![item.width, item.depth, item.height, item.z].every(Number.isFinite) || item.width <= 0 || item.depth <= 0 || item.height <= 0 || item.z < 0) return "正の寸法と高さを入力してください。";
  if (item.supportId && !items.some((candidate) => candidate.id === item.supportId && candidate.kind !== "poster")) return "置く場所が見つかりません。";
  return placementIssue([...items, item], new Set([item.id]), desk);
}

/** Find a free starting spot, trying nearby box edges before farther offsets. */
export function findOpenPlacement(items: Item[], item: Item, desk: Desk): Item | null {
  const bounds = supportSize(items, item.supportId, desk);
  const support = supportFor(items, item);
  const origin = support ? worldPosition(items, support) : { x: 0, y: 0 };
  const centerX = rounded((bounds.width - item.width) / 2);
  const depth = itemDepth(item);
  const centerY = rounded((bounds.depth - depth) / 2);
  const xs = new Set([centerX, 0, rounded(bounds.width - item.width), rounded(bounds.width - 0.1), rounded(0.1 - item.width)]);
  const ys = new Set([centerY, 0, rounded(bounds.depth - depth), rounded(bounds.depth - 0.1), rounded(0.1 - depth)]);
  for (const other of items) {
    const position = worldPosition(items, other);
    xs.add(rounded(position.x + other.width - origin.x));
    xs.add(rounded(position.x - item.width - origin.x));
    ys.add(rounded(position.y + itemDepth(other) - origin.y));
    ys.add(rounded(position.y - depth - origin.y));
  }
  const sortedX = [...xs].sort((a, b) => Math.abs(a - centerX) - Math.abs(b - centerX));
  const sortedY = [...ys].sort((a, b) => Math.abs(a - centerY) - Math.abs(b - centerY));
  for (const y of sortedY) for (const x of sortedX) {
    const candidate = { ...item, x, y };
    if (!canAddItem(items, candidate, desk)) return candidate;
  }
  return null;
}

export function updateItem(items: Item[], id: string, change: Partial<Item>, desk: Desk): Item[] {
  const current = items.find((item) => item.id === id);
  if (!current) return items;
  const next = { ...current, ...change };
  if (![next.x, next.y, next.z, next.width, next.depth, next.height].every(Number.isFinite) || next.z < 0 || next.width <= 0 || next.depth <= 0 || next.height <= 0) return items;
  const candidate = items.map((item) => item.id === id ? next : item);
  const affected = descendantIds(candidate, id);
  affected.add(id);
  return placementIssue(candidate, affected, desk) ? items : candidate;
}

export function placeOn(items: Item[], id: string, supportId: string | null, desk: Desk): Item[] {
  const item = items.find((candidate) => candidate.id === id);
  if (!item || supportId === id || descendantIds(items, id).has(supportId || "") || items.some((candidate) => candidate.id === supportId && candidate.kind === "poster")) return items;
  if (supportId === item.supportId) return items;
  if (!supportId) {
    const position = worldPosition(items, item);
    return updateItem(items, id, { supportId: null, x: position.x, y: position.y, z: position.z }, desk);
  }
  const bounds = supportSize(items, supportId, desk);
  return updateItem(items, id, { supportId, x: rounded((bounds.width - item.width) / 2), y: rounded((bounds.depth - itemDepth(item)) / 2), z: 0 }, desk);
}

export function removeItem(items: Item[], id: string, desk: Desk): Item[] {
  const affected = new Set(items.filter((item) => item.supportId === id).map((item) => item.id));
  for (const childId of [...affected]) for (const descendantId of descendantIds(items, childId)) affected.add(descendantId);
  const candidate = items.filter((item) => item.id !== id).map((item) => {
    if (item.supportId !== id) return item;
    const position = worldPosition(items, item);
    return { ...item, supportId: null, x: position.x, y: position.y, z: position.z };
  });
  return placementIssue(candidate, affected, desk) ? items : candidate;
}
