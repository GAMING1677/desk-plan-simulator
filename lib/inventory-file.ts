import { cm, itemDepth, supportFor, type Item } from "./desk-model";
import { layoutFileName } from "./layout-file";

const kindLabels: Record<Item["kind"], string> = {
  box: "直方体", monitor: "モニター", poster: "ポスター・コルクボード", laptop: "ノートPC",
};
// Escape user text so pipes, line breaks and markup cannot break the table.
function tableText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\\/g, "&#92;").replace(/\|/g, "&#124;").replace(/`/g, "&#96;")
    .replace(/\*/g, "&#42;").replace(/_/g, "&#95;").replace(/~/g, "&#126;")
    .replace(/\[/g, "&#91;").replace(/\]/g, "&#93;").replace(/\r\n|\r|\n/g, "<br>");
}
export function inventoryFileName(name: string) {
  return layoutFileName(name).replace(/\.layout\.json$/, ".inventory.md");
}
export function makeInventoryMarkdown(items: Item[]) {
  const lines = ["# 持ち物リスト", "", `合計：${items.length}点`, "",
    "| No. | 名前 | 種類 | 幅 | 奥行き | 高さ | 置き場所 |",
    "| --- | --- | --- | --- | --- | --- | --- |"];
  items.forEach((item, index) => {
    const support = supportFor(items, item);
    const location = support ? `${support.name} の上` : item.z > 0 ? `独立配置（天板から ${cm(item.z)}）` : "机の上";
    lines.push(`| ${index + 1} | ${tableText(item.name)} | ${kindLabels[item.kind]} | ${cm(item.width)} | ${cm(itemDepth(item))} | ${cm(item.height)} | ${tableText(location)} |`);
  });
  return `${lines.join("\n")}\n`;
}
