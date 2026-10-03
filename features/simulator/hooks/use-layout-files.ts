import { useRef, useState } from "react";
import { makeInventoryMarkdown } from "@/lib/inventory-file";
import {
  layoutFileName,
  makeLayoutFile,
  readLayoutFile,
} from "@/lib/layout-file";
import type { SavePickerWindow } from "../types";
import type { LayoutEditor } from "./use-layout-editor";
import { frontViewPng } from "../front-view-png";
export function useLayoutFiles(
  editor: Pick<
    LayoutEditor,
    | "desk"
    | "setDesk"
    | "items"
    | "setItems"
    | "setSelectedId"
    | "setAdding"
    | "setInvalidItemId"
    | "setDraft"
    | "setInvalidDesk"
    | "deskRef"
    | "itemsRef"
  >,
) {
  const {
    desk,
    setDesk,
    items,
    setItems,
    setSelectedId,
    setAdding,
    setInvalidItemId,
    setDraft,
    setInvalidDesk,
    deskRef,
    itemsRef,
  } = editor;
  const [inventoryMarkdown, setInventoryMarkdown] = useState("");
  const [inventoryCopyState, setInventoryCopyState] = useState<
    "idle" | "copying" | "success" | "error"
  >("idle");
  const inventoryDialogRef = useRef<HTMLDialogElement>(null);
  const [copyState, setCopyState] = useState<
    "idle" | "copying" | "success" | "error"
  >("idle");
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("desk-plan");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loaded" | "error">(
    "idle",
  );
  const [loadError, setLoadError] = useState("");
  const frontSvgRef = useRef<SVGSVGElement>(null);
  const layoutInputRef = useRef<HTMLInputElement>(null);
  async function copyFrontView() {
    const svg = frontSvgRef.current;
    if (
      !svg ||
      !navigator.clipboard?.write ||
      typeof ClipboardItem === "undefined"
    ) {
      setCopyState("error");
      return;
    }
    setCopyState("copying");
    try {
      const png = frontViewPng(svg);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }
  function exportInventory() {
    setInventoryMarkdown(makeInventoryMarkdown(itemsRef.current));
    setInventoryCopyState("idle");
    inventoryDialogRef.current?.showModal();
  }
  async function copyInventory() {
    setInventoryCopyState("copying");
    try {
      await navigator.clipboard.writeText(inventoryMarkdown);
      setInventoryCopyState("success");
    } catch {
      setInventoryCopyState("error");
    }
  }
  async function saveLayout(mode: "download" | "pick") {
    if (!layoutName.trim()) {
      setSaveError(true);
      return;
    }
    setSaving(true);
    setSaveError(false);
    const snapshot = JSON.stringify({
      desk: deskRef.current,
      items: itemsRef.current,
    });
    const filename = layoutFileName(layoutName);
    const blob = new Blob(
      [
        `${JSON.stringify(makeLayoutFile(deskRef.current, itemsRef.current, layoutName.trim()), null, 2)}\n`,
      ],
      { type: "application/json" },
    );
    try {
      const pickerWindow = window as SavePickerWindow;
      if (mode === "pick" && pickerWindow.showSaveFilePicker) {
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "レイアウト JSON",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writer = await handle.createWritable();
        await writer.write(blob);
        await writer.close();
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setSavedSnapshot(snapshot);
      setSaveOpen(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setSaveError(true);
    } finally {
      setSaving(false);
    }
  }
  async function loadLayout(file: File) {
    try {
      if (file.size > 5000000) throw new Error("ファイルが大きすぎます。");
      const imported = readLayoutFile(JSON.parse(await file.text()));
      setDesk(imported.desk);
      setItems(imported.items);
      setSelectedId(imported.items[0]?.id ?? "");
      setLayoutName(imported.name ?? file.name.replace(/\.layout\.json$/i, ""));
      setSaveOpen(false);
      setAdding(false);
      setDraft((current) => ({ ...current, supportId: null }));
      setInvalidItemId(null);
      setInvalidDesk(false);
      setCopyState("idle");
      setLoadError("");
      setLoadState("loaded");
      setSavedSnapshot(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "ファイルを読み込めません。",
      );
      setLoadState("error");
    }
  }
  return {
    inventoryMarkdown,
    setInventoryMarkdown,
    inventoryCopyState,
    setInventoryCopyState,
    inventoryDialogRef,
    copyState,
    setCopyState,
    savedSnapshot,
    setSavedSnapshot,
    layoutName,
    setLayoutName,
    saveOpen,
    setSaveOpen,
    saving,
    setSaving,
    saveError,
    setSaveError,
    loadState,
    setLoadState,
    loadError,
    setLoadError,
    frontSvgRef,
    layoutInputRef,
    copyFrontView,
    exportInventory,
    copyInventory,
    saveLayout,
    loadLayout,
  };
}
