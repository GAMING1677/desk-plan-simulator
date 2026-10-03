import { Box, Laptop, Monitor, Presentation } from "lucide-react";
import type { Item } from "@/lib/desk-model";
export const cleanName = (name: string) =>
  name
    .replace("27インチ ", "")
    .replace(" ポスタースタンド", "")
    .replace(" ポスター・コルクボード", "");

export const appearances: {
  kind: Item["kind"];
  label: string;
}[] = [
  { kind: "box", label: "直方体" },
  { kind: "monitor", label: "モニター" },
  { kind: "poster", label: "ポスター・コルクボード" },
  { kind: "laptop", label: "ノートPC" },
];

export const appearanceLabel = (kind: Item["kind"]) =>
  appearances.find((appearance) => appearance.kind === kind)?.label ?? "直方体";

export function appearanceIcon(kind: Item["kind"], size: number) {
  return kind === "monitor" ? (
    <Monitor size={size} />
  ) : kind === "poster" ? (
    <Presentation size={size} />
  ) : kind === "laptop" ? (
    <Laptop size={size} />
  ) : (
    <Box size={size} />
  );
}

export function itemColor(item: Item, selected: boolean, invalid: boolean) {
  const color = selected
    ? { fill: "#d7edf2", stroke: "#137e96" }
    : item.kind === "poster"
      ? { fill: "#e5c79d", stroke: "#a77742" }
      : item.supportId
        ? { fill: "#ebe8fa", stroke: "#8375b9" }
        : { fill: "#e2eaf0", stroke: "#8095a4" };
  return invalid ? { ...color, stroke: "#d5403b" } : color;
}
