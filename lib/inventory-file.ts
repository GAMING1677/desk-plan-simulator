import { type Item } from "./desk-model";

function listText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/([`*_\[\]<>])/g, "\\$1")
    .replace(/\r\n|\r|\n/g, " ");
}

export function makeInventoryMarkdown(items: Item[]) {
  return items.map((item, index) => `${index + 1}. ${listText(item.name)}`).join("\n");
}
