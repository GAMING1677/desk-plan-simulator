import {
  findOpenPlacement,
  itemDepth,
  placeOn,
  rounded,
  supportFor,
  supportIssue,
  updateItem,
  worldPosition,
  type Desk,
  type Item,
} from "@/lib/desk-model";
import type { BrowserTool } from "../types";

export interface LayoutToolDependencies {
  getDesk: () => Desk;
  getItems: () => Item[];
  setItems: (items: Item[]) => void;
  selectItem: (id: string) => void;
  createId: () => string;
  afterUpdate: () => Promise<void>;
}

/** Creates tool handlers without React or browser globals, so execution can be tested directly. */
export function createLayoutTools({
  getDesk,
  getItems,
  setItems,
  selectItem,
  createId,
  afterUpdate,
}: LayoutToolDependencies): BrowserTool[] {
  return [
    {
      name: "read_desk_layout",
      title: "机上レイアウトを読む",
      description:
        "机と三面図に表示されている物の寸法、置き場所、位置、高さを取得します。",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        desk: getDesk(),
        items: getItems().map((item) => ({
          ...item,
          depth: itemDepth(item),
          world: worldPosition(getItems(), item),
        })),
      }),
    },
    {
      name: "add_desk_object",
      title: "物を追加",
      description:
        "寸法を指定して机または別の物の上に置きます。supportIdを省略すると机の上になります。",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          width: { type: "number" },
          depth: { type: "number" },
          height: { type: "number" },
          supportId: { type: ["string", "null"] },
        },
        required: ["name", "width", "depth", "height"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        if (typeof input !== "object" || input === null || Array.isArray(input))
          throw new Error("入力をオブジェクトで指定してください。");
        const data = input as Partial<Item>;
        const supportId = data.supportId === undefined ? null : data.supportId;
        const supportError = supportIssue(getItems(), null, supportId);
        if (supportError) throw new Error(supportError);
        if (
          typeof data.name !== "string" ||
          !data.name.trim() ||
          typeof data.width !== "number" ||
          typeof data.depth !== "number" ||
          typeof data.height !== "number" ||
          !Number.isFinite(data.width) ||
          !Number.isFinite(data.depth) ||
          !Number.isFinite(data.height) ||
          data.width <= 0 ||
          data.depth <= 0 ||
          data.height <= 0
        )
          throw new Error("名前と正の寸法を指定してください。");
        const prototype: Item = {
          id: createId(),
          name: data.name.trim(),
          kind: "box",
          supportId,
          x: 0,
          y: 0,
          z: 0,
          width: data.width,
          depth: data.depth,
          height: data.height,
        };
        const item = findOpenPlacement(getItems(), prototype, getDesk());
        if (!item)
          throw new Error(
            "置く場所と接し、ほかの物と重ならない位置が見つかりません。",
          );
        setItems([...getItems(), item]);
        selectItem(item.id);
        await afterUpdate();
        return { item };
      },
    },
    {
      name: "move_desk_object",
      title: "物を移動",
      description:
        "オブジェクトIDと机の左奥からの位置をセンチメートルで指定して移動します。",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
        },
        required: ["id", "x", "y"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        if (typeof input !== "object" || input === null || Array.isArray(input))
          throw new Error("入力をオブジェクトで指定してください。");
        const data = input as {
          id?: unknown;
          x?: unknown;
          y?: unknown;
        };
        const item = getItems().find((candidate) => candidate.id === data.id);
        if (
          !item ||
          typeof data.x !== "number" ||
          typeof data.y !== "number" ||
          !Number.isFinite(data.x) ||
          !Number.isFinite(data.y)
        )
          throw new Error("有効なIDと位置を指定してください。");
        const support = supportFor(getItems(), item);
        const origin = support
          ? worldPosition(getItems(), support)
          : { x: 0, y: 0 };
        const localX = rounded(data.x - origin.x),
          localY = rounded(data.y - origin.y);
        const next = updateItem(
          getItems(),
          item.id,
          { x: localX, y: localY },
          getDesk(),
        );
        if (next === getItems())
          throw new Error(
            "置く場所から離れるか、ほかの物と立体的に重なります。",
          );
        setItems(next);
        selectItem(item.id);
        await afterUpdate();
        return { id: item.id, x: data.x, y: data.y };
      },
    },
    {
      name: "place_desk_object_on",
      title: "物を上に乗せる",
      description:
        "既存の物を机または別の物の上に移します。supportIdをnullにすると机の上になります。",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          supportId: { type: ["string", "null"] },
        },
        required: ["id", "supportId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        if (typeof input !== "object" || input === null || Array.isArray(input))
          throw new Error("入力をオブジェクトで指定してください。");
        const data = input as {
          id?: unknown;
          supportId?: unknown;
        };
        const item = getItems().find((candidate) => candidate.id === data.id);
        if (!item) throw new Error("対象のオブジェクトが見つかりません。");
        if (data.supportId !== null && typeof data.supportId !== "string")
          throw new Error("載せ先を正しく指定してください。");
        const supportId = data.supportId as string | null;
        const supportError = supportIssue(getItems(), item.id, supportId);
        if (supportError) throw new Error(supportError);
        if (item.supportId === supportId) return { id: item.id, supportId };
        const next = placeOn(getItems(), item.id, supportId, getDesk());
        if (next === getItems())
          throw new Error(
            "上下関係が循環するか、ほかの物と立体的に重なります。",
          );
        setItems(next);
        selectItem(item.id);
        await afterUpdate();
        return { id: item.id, supportId };
      },
    },
  ];
}
