import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SimulatorController } from "../simulator";
type Props = Pick<
  SimulatorController,
  | "inventoryMarkdown"
  | "inventoryCopyState"
  | "inventoryDialogRef"
  | "copyInventory"
>;

export function InventoryDialog({
  inventoryMarkdown,
  inventoryCopyState,
  inventoryDialogRef,
  copyInventory,
}: Props) {
  return (
    <dialog
      ref={inventoryDialogRef}
      className="inventory-dialog"
      aria-labelledby="inventory-title"
    >
      <h2 id="inventory-title">{"持ち物を書き出す"}</h2>

      <p>{"Discordに貼り付けると、そのまま番号付き箇条書きになります。"}</p>

      <textarea
        aria-label="持ち物のMarkdown"
        readOnly
        value={inventoryMarkdown}
        placeholder="持ち物がありません"
        onFocus={(event) => event.currentTarget.select()}
      />

      <p role="status">
        {inventoryCopyState === "success"
          ? "コピーしました"
          : inventoryCopyState === "error"
            ? "コピーできませんでした。内容を選択してコピーしてください。"
            : ""}
      </p>

      <div className="inventory-actions">
        <Button
          variant="outline"
          onClick={() => inventoryDialogRef.current?.close()}
        >
          {"閉じる"}
        </Button>
        <Button
          disabled={!inventoryMarkdown || inventoryCopyState === "copying"}
          onClick={() => void copyInventory()}
        >
          <Copy size={15} />
          {inventoryCopyState === "copying"
            ? "コピー中…"
            : "クリップボードにコピー"}
        </Button>
      </div>
    </dialog>
  );
}
