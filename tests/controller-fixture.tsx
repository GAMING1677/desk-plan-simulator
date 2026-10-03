import { useEffect, type ComponentType } from "react";
import { useLayoutEditor } from "@/features/simulator/hooks/use-layout-editor";
import { useLayoutFiles } from "@/features/simulator/hooks/use-layout-files";
import { useDiagramInteraction } from "@/features/simulator/hooks/use-diagram-interaction";
import type { SimulatorController } from "@/features/simulator/simulator";
import type { Item } from "@/lib/desk-model";

// Stateful integration fixture; isolated presentational tests can override only the props they need.
export function Harness({
  Component,
  items = [],
  selectedId = "",
  override = {},
  inspect,
}: {
  Component: ComponentType<SimulatorController>;
  items?: Item[];
  selectedId?: string;
  override?: Partial<SimulatorController>;
  inspect?: (state: SimulatorController) => void;
}) {
  const editor = useLayoutEditor();
  const controller = {
    ...editor,
    ...useLayoutFiles(editor),
    ...useDiagramInteraction(editor),
  };
  useEffect(() => {
    editor.setItems(items);
    editor.setSelectedId(selectedId);
  }, []);
  const props = { ...controller, ...override };
  inspect?.(props);
  return <Component {...props} />;
}
