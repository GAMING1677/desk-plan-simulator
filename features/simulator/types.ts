import type { Item } from "@/lib/desk-model";
export type View = "top" | "front" | "side";

export type BrowserTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: {
    readOnlyHint: boolean;
  };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

export type ModelContext = {
  registerTool: (
    tool: BrowserTool,
    options: {
      signal: AbortSignal;
    },
  ) => void | Promise<void>;
};

export type Draft = {
  name: string;
  supportId: string | null;
  kind: Item["kind"];
  width: number;
  depth: number;
  height: number;
  z: number;
};

export type DragState = {
  id: string;
  view: View;
  pointerX: number;
  pointerY: number;
  itemX: number;
  itemY: number;
  itemZ: number;
  linked: boolean;
};

export type SaveFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: {
      description: string;
      accept: Record<string, string[]>;
    }[];
  }) => Promise<SaveFileHandle>;
};
