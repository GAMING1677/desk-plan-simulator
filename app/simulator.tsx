"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowLeftRight, Box, Copy, Download, Laptop, Layers3, Monitor, Move, Presentation, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import {
  DEFAULT_DESK, DEFAULT_ITEMS, MONITOR_SCREEN_FRACTION, POSTER_PANEL_DEPTH, cm, descendantIds, findOpenPlacement, itemDepth, itemTop, monitorShape, placeOn, placementIssue, removeItem,
  rounded, supportFor, updateItem, worldPosition, type Desk, type Item,
} from "@/lib/desk-model";
import { FrontScene } from "@/components/front-scene";
import { FRONT_WIDTH, FRONT_HEIGHT, frontScale } from "@/lib/front-projection";
import { SIZE_PRESETS } from "@/lib/size-presets";
import { layoutFileName, makeLayoutFile, readLayoutFile } from "@/lib/layout-file";

type View = "top" | "front" | "side";
type BrowserTool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: unknown) => unknown | Promise<unknown> };
type ModelContext = { registerTool: (tool: BrowserTool, options: { signal: AbortSignal }) => void | Promise<void> };
type Draft = { name: string; supportId: string | null; kind: Item["kind"]; width: number; depth: number; height: number; z: number };
type DragState = { id: string; view: View; pointerX: number; pointerY: number; itemX: number; itemY: number; itemZ: number; linked: boolean };
type SaveFileHandle = { createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type SavePickerWindow = Window & { showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<SaveFileHandle> };

const S = 4;
const LEFT = 96;
const TOP = 72;
const SIDE_LEFT = 80;
const FHD_WIDTH = 1920;
const FHD_HEIGHT = 1080;
const cleanName = (name: string) => name.replace("27インチ ", "").replace(" ポスタースタンド", "").replace(" ポスター・コルクボード", "");
const appearances: { kind: Item["kind"]; label: string }[] = [
  { kind: "box", label: "直方体" },
  { kind: "monitor", label: "モニター" },
  { kind: "poster", label: "ポスター・コルクボード" },
  { kind: "laptop", label: "ノートPC" },
];
const appearanceLabel = (kind: Item["kind"]) => appearances.find((appearance) => appearance.kind === kind)?.label ?? "直方体";
function appearanceIcon(kind: Item["kind"], size: number) {
  return kind === "monitor" ? <Monitor size={size}/> : kind === "poster" ? <Presentation size={size}/> : kind === "laptop" ? <Laptop size={size}/> : <Box size={size}/>;
}

function itemColor(item: Item, selected: boolean, invalid: boolean) {
  const color = selected ? { fill: "#d7edf2", stroke: "#137e96" }
    : item.kind === "poster" ? { fill: "#e5c79d", stroke: "#a77742" }
    : item.supportId ? { fill: "#ebe8fa", stroke: "#8375b9" }
      : { fill: "#e2eaf0", stroke: "#8095a4" };
  return invalid ? { ...color, stroke: "#d5403b" } : color;
}

function frontViewPng(source: SVGSVGElement): Promise<Blob> {
  const svg = source.cloneNode(true) as SVGSVGElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(FHD_WIDTH));
  svg.setAttribute("height", String(FHD_HEIGHT));
  const styles = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styles.textContent = `svg{font-family:Arial,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif}
    .measure-line{stroke:#7b9cad;stroke-width:1}.desk-dimension{fill:#376473;font-size:13px;font-weight:700}
    .object-dimension{fill:#147d95;font-size:12px;font-weight:700;paint-order:stroke;stroke:white;stroke-width:3px}
    .item-label{fill:#284f5e;font-size:13px;font-weight:700}.screen-label{fill:#d4e5ea;font-size:12px}`;
  svg.insertBefore(styles, svg.firstChild);
  const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(svgUrl);
      const canvas = document.createElement("canvas");
      canvas.width = FHD_WIDTH;
      canvas.height = FHD_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("画像を作成できません。")); return; }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, FHD_WIDTH, FHD_HEIGHT);
      context.drawImage(image, 0, 0, FHD_WIDTH, FHD_HEIGHT);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("画像を作成できません。")), "image/png");
    };
    image.onerror = () => { URL.revokeObjectURL(svgUrl); reject(new Error("正面図を読み込めません。")); };
    image.src = svgUrl;
  });
}

export default function Simulator() {
  const [desk, setDesk] = useState<Desk>({ ...DEFAULT_DESK });
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [selectedId, setSelectedId] = useState(DEFAULT_ITEMS[0].id);
  const [adding, setAdding] = useState(false);
  const [measures, setMeasures] = useState(true);
  const [frontZoom, setFrontZoom] = useState(100);
  const [invalidItemId, setInvalidItemId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState("custom");
  const [draft, setDraft] = useState<Draft>({ name: "新しいアイテム", supportId: null, kind: "box", width: 30, depth: 20, height: 15, z: 0 });
  const [copyState, setCopyState] = useState<"idle" | "copying" | "success" | "error">("idle");
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("desk-plan");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loaded" | "error">("idle");
  const [loadError, setLoadError] = useState("");
  const [invalidDesk, setInvalidDesk] = useState(false);
  const dragging = useRef<DragState | null>(null);
  const deskRef = useRef(desk);
  const itemsRef = useRef(items);
  const frontSvgRef = useRef<SVGSVGElement>(null);
  const layoutInputRef = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => item.id === selectedId);
  const topItems = useMemo(() => [...items].sort((a, b) => {
    const first = worldPosition(items, a), second = worldPosition(items, b);
    return first.z + itemTop(a) - second.z - itemTop(b);
  }), [items]);
  const sideItems = useMemo(() => [...items].sort((a, b) => {
    const first = worldPosition(items, a), second = worldPosition(items, b);
    return first.x + a.width - second.x - b.width;
  }), [items]);
  const positions = items.map((item) => ({ item, world: worldPosition(items, item) }));
  const minX = Math.min(0, ...positions.map(({ world }) => world.x));
  const maxX = Math.max(desk.width, ...positions.map(({ item, world }) => world.x + item.width));
  const minY = Math.min(0, ...positions.map(({ world }) => world.y));
  const maxY = Math.max(desk.depth, ...positions.map(({ item, world }) => world.y + itemDepth(item)));
  const frontViewX = Math.min(0, LEFT + minX*S - 50);
  const frontViewRight = Math.max(920, LEFT + maxX*S + 80);
  const sideViewX = Math.min(0, SIDE_LEFT + minY*S - 50);
  const sideViewRight = Math.max(360, SIDE_LEFT + maxY*S + 80);
  const topViewY = Math.min(0, TOP + minY*S - 50);
  const topViewBottom = Math.max(350, TOP + maxY*S + 70);
  const topViewBox = `${frontViewX} ${topViewY} ${frontViewRight-frontViewX} ${topViewBottom-topViewY}`;
  const tallest = Math.max(43, ...items.map((item) => { const position = worldPosition(items, item); return position.z + itemTop(item); }));
  const baseline = Math.max(280, tallest * S + 55);
  const elevationViewHeight = baseline + 72;
  const draftValid = Boolean(draft.name.trim()) && (!draft.supportId || items.some((item) => item.id === draft.supportId)) && [draft.width, draft.depth, draft.height].every((value) => Number.isFinite(value) && value > 0) && Number.isFinite(draft.z) && draft.z >= 0;
  const draftPrototype: Item = { id: "draft-preview", name: draft.name.trim(), kind: draft.kind, supportId: draft.supportId, x: 0, y: 0, z: draft.supportId ? 0 : draft.z, width: draft.width, depth: draft.kind === "poster" ? POSTER_PANEL_DEPTH : draft.depth, height: draft.height };
  const suggestedPlacement = draftValid ? findOpenPlacement(items, draftPrototype, desk) : null;
  const draftFits = Boolean(suggestedPlacement);
  const excludedSupports = selected ? descendantIds(items, selected.id) : new Set<string>();

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { deskRef.current = desk; }, [desk]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tools: BrowserTool[] = [
      {
        name: "read_desk_layout", title: "机上レイアウトを読む", description: "机と三面図に表示されている物の寸法、置き場所、位置、高さを取得します。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true },
        execute: () => ({ desk: deskRef.current, items: itemsRef.current.map((item) => ({ ...item, depth: itemDepth(item), world: worldPosition(itemsRef.current, item) })) }),
      },
      {
        name: "add_desk_object", title: "物を追加", description: "寸法を指定して机または別の物の上に置きます。supportIdを省略すると机の上になります。",
        inputSchema: { type: "object", properties: { name: { type: "string" }, width: { type: "number" }, depth: { type: "number" }, height: { type: "number" }, supportId: { type: ["string", "null"] } }, required: ["name", "width", "depth", "height"], additionalProperties: false },
        annotations: { readOnlyHint: false }, execute: async (input) => {
          const data = input as Partial<Item>;
          const supportId = data.supportId || null;
          if (supportId && !itemsRef.current.some((item) => item.id === supportId)) throw new Error("置き場所が見つかりません。");
          if (typeof data.name !== "string" || !data.name.trim() || typeof data.width !== "number" || typeof data.depth !== "number" || typeof data.height !== "number" || !Number.isFinite(data.width) || !Number.isFinite(data.depth) || !Number.isFinite(data.height) || data.width <= 0 || data.depth <= 0 || data.height <= 0) throw new Error("名前と正の寸法を指定してください。");
          const prototype: Item = { id: crypto.randomUUID(), name: data.name.trim(), kind: "box", supportId, x: 0, y: 0, z: 0, width: data.width, depth: data.depth, height: data.height };
          const item = findOpenPlacement(itemsRef.current, prototype, deskRef.current);
          if (!item) throw new Error("置く場所と接し、ほかの物と重ならない位置が見つかりません。");
          itemsRef.current = [...itemsRef.current, item]; setItems(itemsRef.current); setSelectedId(item.id);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return { item };
        },
      },
      {
        name: "move_desk_object", title: "物を移動", description: "オブジェクトIDと机の左奥からの位置をセンチメートルで指定して移動します。",
        inputSchema: { type: "object", properties: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, required: ["id", "x", "y"], additionalProperties: false }, annotations: { readOnlyHint: false },
        execute: async (input) => {
          const data = input as { id?: unknown; x?: unknown; y?: unknown };
          const item = itemsRef.current.find((candidate) => candidate.id === data.id);
          if (!item || typeof data.x !== "number" || typeof data.y !== "number" || !Number.isFinite(data.x) || !Number.isFinite(data.y)) throw new Error("有効なIDと位置を指定してください。");
          const support = supportFor(itemsRef.current, item);
          const origin = support ? worldPosition(itemsRef.current, support) : { x: 0, y: 0 };
          const localX = rounded(data.x - origin.x), localY = rounded(data.y - origin.y);
          const next = updateItem(itemsRef.current, item.id, { x: localX, y: localY }, deskRef.current);
          if (next === itemsRef.current) throw new Error("置く場所から離れるか、ほかの物と立体的に重なります。");
          itemsRef.current = next; setItems(next); setSelectedId(item.id);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return { id: item.id, x: data.x, y: data.y };
        },
      },
      {
        name: "place_desk_object_on", title: "物を上に乗せる", description: "既存の物を机または別の物の上に移します。supportIdをnullにすると机の上になります。",
        inputSchema: { type: "object", properties: { id: { type: "string" }, supportId: { type: ["string", "null"] } }, required: ["id", "supportId"], additionalProperties: false }, annotations: { readOnlyHint: false },
        execute: async (input) => {
          const data = input as { id?: unknown; supportId?: unknown };
          const item = itemsRef.current.find((candidate) => candidate.id === data.id);
          const supportId = typeof data.supportId === "string" ? data.supportId : null;
          if (!item || (data.supportId !== null && typeof data.supportId !== "string") || (supportId && !itemsRef.current.some((candidate) => candidate.id === supportId))) throw new Error("物または置き場所が見つかりません。");
          const next = placeOn(itemsRef.current, item.id, supportId, deskRef.current);
          if (next === itemsRef.current) throw new Error("上下関係が循環するか、ほかの物と立体的に重なります。");
          itemsRef.current = next; setItems(next); setSelectedId(item.id);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return { id: item.id, supportId };
        },
      },
    ];
    for (const tool of tools) {
      try { void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {}); } catch { /* Unsupported browser. */ }
    }
    return () => controller.abort();
  }, []);

  function point(event: PointerEvent<SVGGElement>) {
    const svg = event.currentTarget.ownerSVGElement!;
    const p = svg.createSVGPoint();
    p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  }
  function beginDrag(event: PointerEvent<SVGGElement>, item: Item, view: View) {
    const p = point(event);
    dragging.current = { id: item.id, view, pointerX: p.x, pointerY: p.y, itemX: item.x, itemY: item.y, itemZ: item.z, linked: Boolean(item.supportId) };
    setSelectedId(item.id);
    setInvalidItemId(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function applyCandidate(candidate: Item[], id: string) {
    if (candidate === itemsRef.current) { setInvalidItemId(id); return false; }
    itemsRef.current = candidate;
    setItems(candidate);
    setInvalidItemId(null);
    return true;
  }
  function updateSelected(id: string, change: Partial<Item>) {
    applyCandidate(updateItem(itemsRef.current, id, change, deskRef.current), id);
  }
  function saveName(id: string, input: HTMLInputElement) {
    const current = itemsRef.current.find((item) => item.id === id);
    if (!current) return;
    const name = input.value.trim() || current.name;
    input.value = name;
    if (name === current.name) return;
    const next = itemsRef.current.map((item) => item.id === id ? { ...item, name } : item);
    itemsRef.current = next;
    setItems(next);
  }
  async function copyFrontView() {
    const svg = frontSvgRef.current;
    if (!svg || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") { setCopyState("error"); return; }
    setCopyState("copying");
    try {
      const png = frontViewPng(svg);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }
  async function saveLayout(mode: "download" | "pick") {
    if (!layoutName.trim()) { setSaveError(true); return; }
    setSaving(true);
    setSaveError(false);
    const snapshot = JSON.stringify({ desk: deskRef.current, items: itemsRef.current });
    const filename = layoutFileName(layoutName);
    const blob = new Blob([`${JSON.stringify(makeLayoutFile(deskRef.current, itemsRef.current, layoutName.trim()), null, 2)}\n`], { type: "application/json" });
    try {
      const pickerWindow = window as SavePickerWindow;
      if (mode === "pick" && pickerWindow.showSaveFilePicker) {
        const handle = await pickerWindow.showSaveFilePicker({ suggestedName: filename, types: [{ description: "レイアウト JSON", accept: { "application/json": [".json"] } }] });
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
      if (!(error instanceof DOMException && error.name === "AbortError")) setSaveError(true);
    } finally {
      setSaving(false);
    }
  }
  async function loadLayout(file: File) {
    try {
      if (file.size > 5_000_000) throw new Error("ファイルが大きすぎます。");
      const imported = readLayoutFile(JSON.parse(await file.text()));
      deskRef.current = imported.desk;
      setDesk(imported.desk);
      itemsRef.current = imported.items;
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
      setLoadError(error instanceof Error ? error.message : "ファイルを読み込めません。");
      setLoadState("error");
    }
  }
  function changeDesk(key: keyof Desk, value: number) {
    const next = { ...deskRef.current, [key]: value };
    if (!Number.isFinite(value) || value <= 0 || value > 10000 || placementIssue(itemsRef.current, new Set(itemsRef.current.map((item) => item.id)), next)) {
      setInvalidDesk(true);
      return false;
    }
    deskRef.current = next;
    setDesk(next);
    setInvalidDesk(false);
    return true;
  }
  function moveDrag(event: PointerEvent<SVGGElement>) {
    const active = dragging.current;
    if (!active) return;
    const p = point(event);
    const draggedItem = itemsRef.current.find((item) => item.id === active.id);
    const scale = active.view === "front" && draggedItem
      ? frontScale(deskRef.current, draggedItem, worldPosition(itemsRef.current, draggedItem), frontZoom) : 1;
    const dx = (p.x - active.pointerX) / (S * scale);
    const dy = (p.y - active.pointerY) / S;
    const change = active.view === "front" ? { x: rounded(active.itemX + dx) }
      : active.view === "side" ? { y: rounded(active.itemY + dx), ...(active.linked ? {} : { z: rounded(Math.max(0, active.itemZ - dy)) }) }
      : { x: rounded(active.itemX + dx), y: rounded(active.itemY + dy) };
    applyCandidate(updateItem(itemsRef.current, active.id, change, deskRef.current), active.id);
  }
  function addItem() {
    if (!draftValid) return;
    const item = findOpenPlacement(itemsRef.current, { ...draftPrototype, id: crypto.randomUUID() }, deskRef.current);
    if (!item) return;
    applyCandidate([...itemsRef.current, item], item.id);
    setSelectedId(item.id); setAdding(false);
  }
  function removeSelected() {
    if (!selected) return;
    const next = removeItem(itemsRef.current, selected.id, deskRef.current);
    if (!applyCandidate(next, selected.id)) return;
    setSelectedId(items.find((item) => item.id !== selected.id)?.id || "");
    setDraft((current) => current.supportId === selected.id ? { ...current, supportId: null } : current);
  }
  function dragHandlers(item: Item, view: View) {
    return { onPointerDown: (event: PointerEvent<SVGGElement>) => beginDrag(event, item, view), onPointerMove: moveDrag, onPointerUp: () => { dragging.current = null; }, onPointerCancel: () => { dragging.current = null; } };
  }
  function choosePreset(id: string) {
    setPresetId(id);
    const preset = SIZE_PRESETS.find((entry) => entry.id === id);
    if (preset) setDraft((current) => ({ ...current, name: preset.name, kind: preset.kind, width: preset.width, depth: preset.depth, height: preset.height }));
  }
  function chooseDraftAppearance(kind: Item["kind"]) {
    setPresetId("custom");
    setDraft((current) => ({ ...current, kind, depth: kind === "poster" ? POSTER_PANEL_DEPTH : current.kind === "poster" ? 20 : current.depth }));
  }
  function chooseSelectedAppearance(kind: Item["kind"]) {
    if (!selected) return;
    updateSelected(selected.id, { kind, depth: kind === "poster" ? POSTER_PANEL_DEPTH : selected.kind === "poster" ? 20 : selected.depth });
  }
  function swapPosterSize() {
    if (!selected || selected.kind !== "poster") return;
    updateSelected(selected.id, { width: selected.height, height: selected.width });
  }

  return <main className="shell">
    <header className="header">
      <div className="brand"><span className="brand-icon"><Monitor size={20}/></span><span>DESK PLAN<small>机上レイアウト</small></span></div>
      <div className="header-actions"><span>単位 cm</span><Button variant="outline" size="sm" onClick={() => { setSaveOpen((open) => !open); setSaveError(false); }}><Download size={15}/>{savedSnapshot !== null && savedSnapshot === JSON.stringify({ desk, items }) ? "保存しました" : "配置を保存"}</Button><Button variant="outline" size="sm" className={loadState === "error" ? "layout-load-error" : ""} onClick={() => layoutInputRef.current?.click()} title={loadState === "error" ? loadError : ".layout.json を読み込む"}><Upload size={15}/>{loadState === "loaded" ? "読み込みました" : loadState === "error" ? "読み込み失敗" : "配置を読み込む"}</Button><input ref={layoutInputRef} className="layout-file-input" type="file" accept=".layout.json,application/json" aria-label=".layout.jsonファイルを選択" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void loadLayout(file); }}/><Button variant="outline" size="sm" onClick={() => { deskRef.current = { ...DEFAULT_DESK }; setDesk(deskRef.current); itemsRef.current = DEFAULT_ITEMS; setItems(DEFAULT_ITEMS); setSelectedId(DEFAULT_ITEMS[0].id); setDraft((current) => ({ ...current, supportId: null })); setInvalidItemId(null); setInvalidDesk(false); setSavedSnapshot(null); setSaveOpen(false); setLoadState("idle"); }}><RotateCcw size={15}/>初期配置に戻す</Button>
        {saveOpen && <div className={`save-panel ${saveError ? "invalid" : ""}`} role="dialog" aria-label="配置を保存"><label>レイアウト名<Input autoFocus aria-label="レイアウト名" value={layoutName} onChange={(event) => { setLayoutName(event.target.value); setSaveError(false); }} onKeyDown={(event) => { if (event.key === "Enter") void saveLayout("download"); }}/></label><small>{layoutFileName(layoutName)}</small><p>保存先の選択に対応していないブラウザでは、通常のダウンロードになります。</p><div><Button variant="outline" size="sm" onClick={() => setSaveOpen(false)}>キャンセル</Button><Button variant="outline" size="sm" disabled={saving} onClick={() => void saveLayout("download")}>ダウンロード</Button><Button size="sm" disabled={saving} onClick={() => void saveLayout("pick")}>{saving ? "保存中…" : "保存先を選ぶ"}</Button></div></div>}
      </div>
    </header>
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-head"><strong>レイアウト</strong><span>{items.length} アイテム</span></div>
        <div className={`desk-summary ${invalidDesk ? "invalid" : ""}`}><small>DESK SIZE</small><strong>幅 {cm(desk.width)}</strong><span>奥行き {cm(desk.depth)} · 高さ {cm(desk.height)}</span><div className="desk-fields">{([ ["width", "幅"], ["depth", "奥行き"], ["height", "高さ"] ] as const).map(([key, label]) => <label key={`${key}-${desk[key]}`}>{label}<Input aria-label={`机の${label}`} type="number" min="0.1" max="10000" step="0.1" defaultValue={desk[key]} onBlur={(event) => { if (!changeDesk(key, Number(event.currentTarget.value))) event.currentTarget.value = String(deskRef.current[key]); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { event.currentTarget.value = String(deskRef.current[key]); event.currentTarget.blur(); } }}/></label>)}</div></div>
        <h2 className="section-title">置いているもの</h2>
        <div className="item-list">{items.map((item, index) => <button key={item.id} className={`item-row ${selectedId === item.id ? "active" : ""} ${invalidItemId === item.id ? "invalid" : ""}`} onClick={() => { setSelectedId(item.id); setInvalidItemId(null); }}>
          <span className="item-icon">{appearanceIcon(item.kind, 18)}</span>
          <span className="item-copy"><strong>{item.name}</strong><small>{item.kind === "poster" ? `幅 ${cm(item.width)} × 高さ ${cm(item.height)}` : `${cm(item.width)} × ${cm(item.depth)} × ${cm(item.height)}`}</small><em>{item.supportId ? `${supportFor(items, item)?.name || "机"} の上` : item.z > 0 ? `独立配置 · 高さ ${cm(item.z)}` : "机の上"}</em></span>
          <span className="item-number">{String(index + 1).padStart(2, "0")}</span>
        </button>)}</div>
        <Button className="add-button" onClick={() => setAdding(!adding)}><Plus size={17}/>オブジェクトを追加</Button>
        {adding && <div className={`add-panel ${!draftFits ? "invalid" : ""}`}>
          <label>見た目<NativeSelect className="appearance-select" value={draft.kind} onChange={(event) => chooseDraftAppearance(event.target.value as Item["kind"])}>
            {appearances.map((appearance) => <NativeSelectOption key={appearance.kind} value={appearance.kind}>{appearance.label}</NativeSelectOption>)}
          </NativeSelect></label>
          <label>定型サイズ<NativeSelect className="preset-select" value={presetId} onChange={(event) => choosePreset(event.target.value)}>
            <NativeSelectOption value="custom">自由入力</NativeSelectOption>
            <NativeSelectOptGroup label="A判 ポスター・コルクボード">
              {SIZE_PRESETS.filter((preset) => preset.category === "paper-a").map((preset) => <NativeSelectOption key={preset.id} value={preset.id}>{preset.label}</NativeSelectOption>)}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="JIS B判 ポスター・コルクボード">
              {SIZE_PRESETS.filter((preset) => preset.category === "paper-b").map((preset) => <NativeSelectOption key={preset.id} value={preset.id}>{preset.label}</NativeSelectOption>)}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="16:9 モニター">
              {SIZE_PRESETS.filter((preset) => preset.category === "monitor").map((preset) => <NativeSelectOption key={preset.id} value={preset.id}>{preset.label}</NativeSelectOption>)}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="ノートPC · 幅 × 奥行き × 開いた高さ">
              {SIZE_PRESETS.filter((preset) => preset.category === "laptop").map((preset) => <NativeSelectOption key={preset.id} value={preset.id}>{preset.label}</NativeSelectOption>)}
            </NativeSelectOptGroup>
          </NativeSelect></label>
          <label>名前<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
          <label>置く場所<NativeSelect className="support-select" value={draft.supportId || "desk"} onChange={(event) => setDraft({ ...draft, supportId: event.target.value === "desk" ? null : event.target.value, z: event.target.value === "desk" ? draft.z : 0 })}>
            <NativeSelectOption value="desk">独立配置（机基準）</NativeSelectOption>
            {items.filter((item) => item.kind !== "poster").map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name} の上</NativeSelectOption>)}
          </NativeSelect></label>
          <div className={`add-fields ${draft.kind === "poster" ? "two" : ""}`}>{(draft.kind === "poster" ? [ ["width", "幅"], ["height", "高さ"] ] as const : [ ["width", "幅"], ["depth", "奥行き"], ["height", "高さ"] ] as const).map(([key, label]) => <label key={key}>{label}<Input type="number" min="0.1" step="0.1" value={draft[key]} onChange={(event) => { setPresetId("custom"); setDraft({ ...draft, [key]: Number(event.target.value) }); }}/></label>)}</div>
          {draft.kind === "poster" && <Button variant="outline" size="sm" className="orientation-button" onClick={() => setDraft((current) => ({ ...current, width: current.height, height: current.width }))}><ArrowLeftRight size={15}/>縦横を入れ替え</Button>}
          {!draft.supportId && <label>天板からの高さ（cm）<Input type="number" min="0" step="0.1" value={draft.z} onChange={(event) => setDraft({ ...draft, z: Number(event.target.value) })}/></label>}
          <Button onClick={addItem} disabled={!draftFits}>ここに置く</Button>
        </div>}
      </aside>

      <section className="canvas-area" aria-label="机の三面図">
        <div className="canvas-header"><div><small>WORKSPACE / 01</small><h1>机上レイアウト</h1></div><label className="measure-toggle"><input type="checkbox" checked={measures} onChange={(event) => setMeasures(event.target.checked)}/>寸法を表示</label></div>
        <p className="hint"><Move size={16}/>上面図で左右と奥行き、正面図で左右、側面図で奥行きと高さを調整できます。物の上に載せた場合は高さが連動します。</p>
        <div className="views">
          <div className="view-card"><div className="view-heading"><span>01</span><div><strong>上面図</strong><small>上から見た配置 · 幅 × 奥行き</small></div></div>
            <svg className="diagram" viewBox={topViewBox} role="img" aria-label="机とオブジェクトの上面図">
              <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#dce6ec" strokeWidth="1"/></pattern></defs>
              <rect x={LEFT} y={TOP} width={desk.width*S} height={desk.depth*S} rx="3" fill="#f1f7fa" stroke="#9bafbc" strokeWidth="2"/>
              <rect x={LEFT} y={TOP} width={desk.width*S} height={desk.depth*S} fill="url(#grid)"/>
              <text x={LEFT+8} y={TOP+18} className="edge-note">奥</text><text x={LEFT+8} y={TOP+desk.depth*S-10} className="edge-note">手前</text>
              {topItems.map((item) => { const world=worldPosition(items,item), x=LEFT+world.x*S, y=TOP+world.y*S, w=item.width*S, h=itemDepth(item)*S, monitor=monitorShape(item), active=item.id===selectedId, color=itemColor(item,active,item.id===invalidItemId); return <g key={item.id} className="draggable" {...dragHandlers(item,"top")}>
                {item.kind === "poster" ? <><rect x={x} y={y-6} width={w} height="14" fill="transparent"/><rect x={x} y={y} width={w} height={Math.max(h,2)} rx="1" fill={color.fill} stroke={color.stroke} strokeWidth={active?2.5:1.5}/></> : item.kind === "monitor" ? <><rect x={x} y={y+monitor.panelStart*S-5} width={w} height={Math.max(monitor.panelDepth*S+10,14)} fill="transparent"/><rect x={x+(item.width-monitor.footWidth)*S/2} y={y+monitor.footStart*S} width={monitor.footWidth*S} height={monitor.footDepth*S} rx="2" fill="#8299a7" stroke={color.stroke} strokeWidth={active?2.5:1.5}/><rect x={x} y={y+monitor.panelStart*S} width={w} height={monitor.panelDepth*S} rx="2" fill="#193243" stroke={color.stroke} strokeWidth={active?2.5:1.5}/></> : <rect x={x} y={y} width={w} height={h} rx="5" fill={color.fill} stroke={color.stroke} strokeWidth={active?2.5:1.5}/>}
                {item.kind === "laptop" && <><rect x={x+w*.06} y={y+h*.08} width={w*.88} height={Math.max(h*.1,2)} rx="2" fill="#314958"/><rect x={x+w*.1} y={y+h*.27} width={w*.8} height={h*.42} rx="2" fill="#90a8b5" opacity=".65"/><rect x={x+w*.32} y={y+h*.77} width={w*.36} height={h*.14} rx="2" fill="#a2b5c0"/></>}
                <text x={x+w/2} y={item.kind === "poster" ? y+20 : y+h/2+5} textAnchor="middle" className="item-label">{cleanName(item.name)}</text>
                {item.supportId && <text x={x+w/2} y={item.kind === "poster" ? y+34 : y+h/2+21} textAnchor="middle" className="stack-label">+{cm(world.z)}</text>}
                {measures && <><text x={x+w/2} y={y-9} textAnchor="middle" className="object-dimension">{cm(item.width)}</text>{item.kind !== "poster" && <text x={x+w+7} y={y+h/2+4} className="object-dimension">{cm(item.depth)}</text>}</>}
              </g>; })}
              {measures && <><line x1={LEFT} y1={TOP+desk.depth*S+30} x2={LEFT+desk.width*S} y2={TOP+desk.depth*S+30} className="measure-line"/><text x={LEFT+desk.width*S/2} y={TOP+desk.depth*S+51} textAnchor="middle" className="desk-dimension">幅 {cm(desk.width)}</text><line x1="59" y1={TOP} x2="59" y2={TOP+desk.depth*S} className="measure-line"/><text x="47" y={TOP+desk.depth*S/2} textAnchor="middle" transform={`rotate(-90 47 ${TOP+desk.depth*S/2})`} className="desk-dimension">奥行き {cm(desk.depth)}</text></>}
            </svg>
          </div>
          <div className="lower-views">
            <div className="view-card"><div className="view-heading"><span>02</span><div><strong>正面図</strong><small>中央・手前1m・天板の高さ · 奥行き補正は弱め</small></div><Button variant="outline" size="sm" className={`front-copy-button ${copyState === "error" ? "copy-error" : ""}`} disabled={copyState === "copying"} onClick={copyFrontView} aria-live="polite"><Copy size={15}/>{copyState === "copying" ? "作成中…" : copyState === "success" ? "コピーしました" : copyState === "error" ? "コピー失敗・再試行" : "FHDでコピー"}</Button></div>
              <label className="hint">拡大率 {frontZoom}% <input aria-label="正面図の拡大率" type="range" min="50" max="200" step="5" value={frontZoom} onChange={(event) => setFrontZoom(Number(event.target.value))}/><span>100%：標準サイズ</span></label>
              <svg ref={frontSvgRef} className="diagram elevation-diagram" viewBox={`0 0 ${FRONT_WIDTH} ${FRONT_HEIGHT}`} role="img" aria-label={`机の手前1mの中央から拡大率${frontZoom}パーセントで個別投影した正面図`}>
                <FrontScene desk={desk} items={items} zoom={frontZoom} selectedId={selectedId} invalidItemId={invalidItemId} measures={measures} handlers={(item) => dragHandlers(item,"front")}/>
                {measures && <text x={FRONT_WIDTH/2} y={FRONT_HEIGHT-20} textAnchor="middle" className="desk-dimension">机の幅 {cm(desk.width)} · 視点距離 100 cm · 拡大率 {frontZoom}%</text>}
              </svg>
            </div>
            <div className="view-card"><div className="view-heading"><span>03</span><div><strong>側面図</strong><small>右から見た配置 · 奥行き × 高さ</small></div></div>
              <svg className="diagram elevation-diagram side-diagram" viewBox={`${sideViewX} 0 ${sideViewRight-sideViewX} ${elevationViewHeight}`} role="img" aria-label="机とオブジェクトの側面図">
                <rect x={SIDE_LEFT} y={baseline} width={desk.depth*S} height="15" fill="#b3c5cf" stroke="#7a92a1"/>
                <text x={SIDE_LEFT} y={baseline+28} className="edge-note">奥</text><text x={SIDE_LEFT+desk.depth*S-20} y={baseline+28} className="edge-note">手前</text>
                {sideItems.map((item) => { const world=worldPosition(items,item), x=SIDE_LEFT+world.y*S, w=itemDepth(item)*S, h=item.height*S, y=baseline-(world.z+itemTop(item))*S, bottom=baseline-world.z*S, monitor=monitorShape(item), active=item.id===selectedId, color=itemColor(item,active,item.id===invalidItemId); return <g key={item.id} className="draggable" {...dragHandlers(item,"side")}>
                  {item.kind === "monitor" ? <><rect x={x+monitor.panelStart*S-5} y={y} width={Math.max(monitor.panelDepth*S+10,14)} height={h*MONITOR_SCREEN_FRACTION} fill="transparent"/><line x1={x+monitor.stemY*S} y1={y+h*MONITOR_SCREEN_FRACTION} x2={x+monitor.stemY*S} y2={bottom-monitor.footHeight*S} stroke="#8299a7" strokeWidth={monitor.stemDepth*S}/><rect x={x+monitor.footStart*S} y={bottom-monitor.footHeight*S} width={monitor.footDepth*S} height={monitor.footHeight*S} rx="2" fill="#8299a7" stroke={color.stroke} strokeWidth={active?2.5:1.5}/><rect x={x+monitor.panelStart*S} y={y} width={monitor.panelDepth*S} height={h*MONITOR_SCREEN_FRACTION} rx="2" fill="#193243" stroke={color.stroke} strokeWidth={active?2.5:1.5}/></> : item.kind === "poster" ? <><rect x={x-7} y={y} width="16" height={h} fill="transparent"/><rect x={x} y={y} width={Math.max(w,3)} height={h} fill={color.fill} stroke={color.stroke} strokeWidth={active?2.5:1.5}/></> : item.kind === "laptop" ? <><rect x={x} y={y} width={w} height={h} fill="transparent"/><polygon points={`${x+w*.08},${y+h*.82} ${x+w*.34},${y} ${x+w*.42},${y} ${x+w*.2},${y+h*.82}`} fill="#314958" stroke={color.stroke} strokeWidth={active?2.5:1.5}/><rect x={x} y={bottom-h*.12} width={w} height={h*.12} rx="2" fill={color.fill} stroke={color.stroke} strokeWidth={active?2.5:1.5}/></> : <rect x={x} y={y} width={w} height={h} rx="4" fill={color.fill} stroke={color.stroke} strokeWidth={active?2.5:1.5}/>}
                  <text x={item.kind === "poster" || item.kind === "monitor" ? x+w+10 : x+w/2} y={item.kind==="monitor"?y+h*.48:item.kind === "poster" ? y+h*.25+5 : y+h/2+5} textAnchor={item.kind === "poster" || item.kind === "monitor" ? "start" : "middle"} className="side-item-label">{cleanName(item.name)}</text>
                  {measures && <>{item.kind !== "poster" && <text x={x+w/2} y={y-8} textAnchor="middle" className="object-dimension">{cm(item.depth)}</text>}<text x={x+w+6} y={y+h/2+4} className="object-dimension">{cm(item.height)}</text></>}
                </g>; })}
                {measures && <><line x1={SIDE_LEFT} y1={baseline+38} x2={SIDE_LEFT+desk.depth*S} y2={baseline+38} className="measure-line"/><text x={SIDE_LEFT+desk.depth*S/2} y={baseline+59} textAnchor="middle" className="desk-dimension">奥行き {cm(desk.depth)}</text></>}
              </svg>
            </div>
          </div>
        </div>
      </section>

      <aside className="inspector"><div className="inspector-head"><strong>寸法と位置</strong><small>選択中のオブジェクト</small></div>
        {selected ? <>
          <div className={`selected-item ${invalidItemId === selected.id ? "invalid" : ""}`}><span className="item-icon">{appearanceIcon(selected.kind, 20)}</span><div><strong>{selected.name}</strong><small>{appearanceLabel(selected.kind)}</small></div></div>
          <div className="field-section"><h2 className="section-title">名前</h2><Input key={selected.id} aria-label="オブジェクト名" defaultValue={selected.name} onBlur={(event) => saveName(selected.id, event.currentTarget)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { event.currentTarget.value = selected.name; event.currentTarget.blur(); } }}/></div>
          <div className="field-section"><h2 className="section-title">見た目</h2><NativeSelect className="appearance-select" value={selected.kind} onChange={(event) => chooseSelectedAppearance(event.target.value as Item["kind"])}>
            {appearances.map((appearance) => <NativeSelectOption key={appearance.kind} value={appearance.kind}>{appearance.label}</NativeSelectOption>)}
          </NativeSelect></div>
          <div className="field-section"><h2 className="section-title">サイズ <span>cm</span></h2><div className={`field-grid ${selected.kind === "poster" ? "two" : ""}`}>{(selected.kind === "poster" ? [ ["width", "幅"], ["height", "高さ"] ] as const : [ ["width", "幅"], ["depth", "奥行き"], ["height", "高さ"] ] as const).map(([key,label]) => <label key={key}>{label}<Input type="number" min="0.1" step="0.1" value={selected[key]} onChange={(event) => updateSelected(selected.id, { [key]: Number(event.target.value) })}/></label>)}</div>{selected.kind === "poster" && <Button variant="outline" size="sm" className="orientation-button" onClick={swapPosterSize}><ArrowLeftRight size={15}/>縦横を入れ替え</Button>}</div>
          <div className="field-section"><h2 className="section-title">置く場所</h2><label className="support-field"><Layers3 size={16}/><NativeSelect className="support-select" value={selected.supportId || "desk"} onChange={(event) => applyCandidate(placeOn(itemsRef.current, selected.id, event.target.value === "desk" ? null : event.target.value, deskRef.current), selected.id) }>
            <NativeSelectOption value="desk">独立配置（机基準）</NativeSelectOption>
            {items.filter((item) => item.kind !== "poster" && item.id !== selected.id && !excludedSupports.has(item.id)).map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name} の上</NativeSelectOption>)}
          </NativeSelect></label><p className="height-note">机の天板から {cm(worldPosition(items, selected).z)} の高さに設置</p></div>
          <div className="field-section"><h2 className="section-title">配置 <span>{selected.supportId ? "置いた物" : "机"}の左奥を起点</span></h2><div className="field-grid two">{([ ["x", "左から"], ["y", "奥から"] ] as const).map(([key,label]) => <label key={key}>{label}<Input type="number" step="0.1" value={selected[key]} onChange={(event) => updateSelected(selected.id, { [key]: Number(event.target.value) })}/></label>)}</div>{!selected.supportId && <label className="height-field">天板からの高さ（cm）<Input type="number" min="0" step="0.1" value={selected.z} onChange={(event) => updateSelected(selected.id, { z: Number(event.target.value) })}/></label>}</div>
          <p className="position-note">{selected.kind === "poster" ? "掲示面は台からはみ出せます。薄い板として重なりを判定します。" : selected.kind === "monitor" ? "画面は薄い板、支柱と足は小さな形として重なりを判定します。" : "上の物は台より大きくても配置できます。物同士が立体的に重なる移動はできません。"}</p>
          <Button variant="ghost" className="delete-button" onClick={removeSelected}><Trash2 size={16}/>このオブジェクトを削除</Button>
        </> : <p className="empty-state">図または一覧からオブジェクトを選択してください。</p>}
      </aside>
    </div>
  </main>;
}
