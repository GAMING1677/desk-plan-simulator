import { useLayoutEditor } from "./hooks/use-layout-editor";
import { useLayoutFiles } from "./hooks/use-layout-files";
import { useDiagramInteraction } from "./hooks/use-diagram-interaction";
import { useBrowserTools } from "./hooks/use-browser-tools";
import { SimulatorHeader } from "./components/SimulatorHeader";
import { ItemSidebar } from "./components/ItemSidebar";
import { DiagramWorkspace } from "./components/DiagramWorkspace";
import { ItemInspector } from "./components/ItemInspector";
import { InventoryDialog } from "./components/InventoryDialog";
function useSimulatorController() {
  const editor = useLayoutEditor();
  const files = useLayoutFiles(editor);
  const interaction = useDiagramInteraction(editor);
  useBrowserTools(editor);
  return { ...editor, ...files, ...interaction };
}
export type SimulatorController = ReturnType<typeof useSimulatorController>;
export default function Simulator() {
  const controller = useSimulatorController();
  return (
    <main className="shell">
      <SimulatorHeader {...controller} />
      <div className="workspace">
        <ItemSidebar {...controller} />
        <DiagramWorkspace {...controller} />
        <ItemInspector {...controller} />
      </div>
      <InventoryDialog {...controller} />
    </main>
  );
}
