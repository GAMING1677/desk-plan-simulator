import { POSTER_PANEL_DEPTH, placementIssue, type Desk, type Item } from "./desk-model";

export const LAYOUT_FILE_NAME = "desk-plan.layout.json";
const FORMAT = "desk-plan-layout";
const VERSION = 1;
const KINDS = new Set<Item["kind"]>(["box", "monitor", "poster", "laptop"]);

type LayoutFile = { format: typeof FORMAT; version: typeof VERSION; desk: Desk; items: Item[] };
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function makeLayoutFile(desk: Desk, items: Item[]): LayoutFile {
  return { format: FORMAT, version: VERSION, desk: { ...desk }, items: items.map((item) => ({ ...item })) };
}

export function readLayoutFile(value: unknown): { desk: Desk; items: Item[] } {
  if (!record(value) || value.format !== FORMAT || value.version !== VERSION) throw new Error("対応していないレイアウトファイルです。");
  if (!record(value.desk) || ![value.desk.width, value.desk.depth, value.desk.height].every((size) => finite(size) && size > 0 && size <= 10000)) throw new Error("机の寸法が正しくありません。");
  const desk: Desk = { width: value.desk.width as number, depth: value.desk.depth as number, height: value.desk.height as number };
  if (!Array.isArray(value.items) || value.items.length > 1000) throw new Error("オブジェクトの一覧を読み込めません。");

  const items: Item[] = value.items.map((raw) => {
    if (!record(raw)
      || typeof raw.id !== "string" || !raw.id
      || typeof raw.name !== "string" || !raw.name.trim()
      || typeof raw.kind !== "string" || !KINDS.has(raw.kind as Item["kind"])
      || (raw.supportId !== null && typeof raw.supportId !== "string")
      || ![raw.x, raw.y, raw.z, raw.width, raw.depth, raw.height].every(finite)
      || (raw.z as number) < 0 || (raw.width as number) <= 0 || (raw.depth as number) <= 0 || (raw.height as number) <= 0
      || (raw.kind === "poster" && raw.depth !== POSTER_PANEL_DEPTH)) throw new Error("オブジェクトのデータが正しくありません。");
    return {
      id: raw.id as string, name: raw.name as string, kind: raw.kind as Item["kind"], supportId: raw.supportId as string | null,
      x: raw.x as number, y: raw.y as number, z: raw.z as number,
      width: raw.width as number, depth: raw.depth as number, height: raw.height as number,
    };
  });

  const byId = new Map(items.map((item) => [item.id, item]));
  if (byId.size !== items.length) throw new Error("オブジェクトIDが重複しています。");
  for (const item of items) {
    const seen = new Set<string>([item.id]);
    let supportId = item.supportId;
    while (supportId) {
      const support = byId.get(supportId);
      if (!support || support.kind === "poster" || seen.has(supportId)) throw new Error("載せ先の指定が正しくありません。");
      seen.add(supportId);
      supportId = support.supportId;
    }
  }
  const issue = placementIssue(items, new Set(items.map((item) => item.id)), desk);
  if (issue) throw new Error(issue);
  return { desk, items };
}
