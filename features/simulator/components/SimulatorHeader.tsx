import { Download, List, Monitor, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_DESK, DEFAULT_ITEMS, cm } from "@/lib/desk-model";
import { layoutFileName } from "@/lib/layout-file";
import type { SimulatorController } from "../simulator";
type Props = Pick<
  SimulatorController,
  | "desk"
  | "setDesk"
  | "items"
  | "setItems"
  | "setSelectedId"
  | "setInvalidItemId"
  | "setDraft"
  | "setInvalidDesk"
  | "savedSnapshot"
  | "setSavedSnapshot"
  | "layoutName"
  | "setLayoutName"
  | "saveOpen"
  | "setSaveOpen"
  | "saving"
  | "saveError"
  | "setSaveError"
  | "loadState"
  | "setLoadState"
  | "loadError"
  | "layoutInputRef"
  | "exportInventory"
  | "saveLayout"
  | "loadLayout"
>;

export function SimulatorHeader({
  desk,
  setDesk,
  items,
  setItems,
  setSelectedId,
  setInvalidItemId,
  setDraft,
  setInvalidDesk,
  savedSnapshot,
  setSavedSnapshot,
  layoutName,
  setLayoutName,
  saveOpen,
  setSaveOpen,
  saving,
  saveError,
  setSaveError,
  loadState,
  setLoadState,
  loadError,
  layoutInputRef,
  exportInventory,
  saveLayout,
  loadLayout,
}: Props) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-icon">
          <Monitor size={20} />
        </span>
        <span>
          {"DESK PLAN"}
          <small>{"机上レイアウト"}</small>
        </span>
      </div>

      <div className="header-actions">
        <span>{"単位 cm"}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={exportInventory}
          title="全オブジェクトをMarkdown形式で書き出す"
          aria-label="持ち物リストを書き出す"
        >
          <List size={15} />
          {"持ち物を書き出す"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSaveOpen((open) => !open);
            setSaveError(false);
          }}
        >
          <Download size={15} />
          {savedSnapshot !== null &&
          savedSnapshot === JSON.stringify({ desk, items })
            ? "保存しました"
            : "配置を保存"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={loadState === "error" ? "layout-load-error" : ""}
          onClick={() => layoutInputRef.current?.click()}
          title={loadState === "error" ? loadError : ".layout.json を読み込む"}
        >
          <Upload size={15} />
          {loadState === "loaded"
            ? "読み込みました"
            : loadState === "error"
              ? "読み込み失敗"
              : "配置を読み込む"}
        </Button>
        <input
          ref={layoutInputRef}
          className="layout-file-input"
          type="file"
          accept=".layout.json,application/json"
          aria-label=".layout.jsonファイルを選択"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void loadLayout(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDesk({ ...DEFAULT_DESK });
            setItems(DEFAULT_ITEMS);
            setSelectedId(DEFAULT_ITEMS[0]?.id ?? "");
            setDraft((current) => ({ ...current, supportId: null }));
            setInvalidItemId(null);
            setInvalidDesk(false);
            setSavedSnapshot(null);
            setSaveOpen(false);
            setLoadState("idle");
          }}
        >
          <RotateCcw size={15} />
          {"初期配置に戻す"}
        </Button>

        {saveOpen && (
          <div
            className={`save-panel ${saveError ? "invalid" : ""}`}
            role="dialog"
            aria-label="配置を保存"
          >
            <label>
              {"レイアウト名"}
              <Input
                autoFocus
                aria-label="レイアウト名"
                value={layoutName}
                onChange={(event) => {
                  setLayoutName(event.target.value);
                  setSaveError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveLayout("download");
                }}
              />
            </label>
            <small>{layoutFileName(layoutName)}</small>
            <p>
              {
                "保存先の選択に対応していないブラウザでは、通常のダウンロードになります。"
              }
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveOpen(false)}
              >
                {"キャンセル"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => void saveLayout("download")}
              >
                {"ダウンロード"}
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => void saveLayout("pick")}
              >
                {saving ? "保存中…" : "保存先を選ぶ"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
