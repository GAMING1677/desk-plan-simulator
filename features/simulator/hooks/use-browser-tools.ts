import { useEffect } from "react";
import { createLayoutTools } from "../browser-tools/create-layout-tools";
import type { ModelContext } from "../types";
import type { LayoutEditor } from "./use-layout-editor";

type BrowserToolsEditor = Pick<
  LayoutEditor,
  "setItems" | "setSelectedId" | "deskRef" | "itemsRef"
>;

export function useBrowserTools({
  setItems,
  setSelectedId,
  deskRef,
  itemsRef,
}: BrowserToolsEditor) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;

    const controller = new AbortController();
    const tools = createLayoutTools({
      getDesk: () => deskRef.current,
      getItems: () => itemsRef.current,
      setItems,
      selectItem: setSelectedId,
      createId: () => crypto.randomUUID(),
      afterUpdate: () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    });

    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported browser. */
      }
    }
    return () => controller.abort();
  }, [deskRef, itemsRef, setItems, setSelectedId]);
}
