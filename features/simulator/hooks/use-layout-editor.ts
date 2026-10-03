import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_DESK,
  DEFAULT_ITEMS,
  POSTER_PANEL_DEPTH,
  descendantIds,
  findOpenPlacement,
  placeOn,
  placementIssue,
  removeItem,
  supportIssue,
  updateItem,
  type Desk,
  type Item,
} from "@/lib/desk-model";
import { SIZE_PRESETS } from "@/lib/size-presets";
import type { Draft } from "../types";
export function useLayoutEditor() {
  const [desk, setDeskState] = useState<Desk>({ ...DEFAULT_DESK });
  const [items, setItemsState] = useState<Item[]>(DEFAULT_ITEMS);
  const [selectedId, setSelectedId] = useState(DEFAULT_ITEMS[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [itemsCollapsed, setItemsCollapsed] = useState(false);
  const [measures, setMeasures] = useState(true);
  const [invalidItemId, setInvalidItemId] = useState<string | null>(null);
  const [itemError, setItemError] = useState("");
  const [presetId, setPresetId] = useState("custom");
  const [draft, setDraft] = useState<Draft>({
    name: "新しいアイテム",
    supportId: null,
    kind: "box",
    width: 30,
    depth: 20,
    height: 15,
    z: 0,
  });
  const [invalidDesk, setInvalidDesk] = useState(false);
  const deskRef = useRef(desk);
  const itemsRef = useRef(items);
  const selected = items.find((item) => item.id === selectedId);
  const draftSupportError = supportIssue(items, null, draft.supportId);
  const draftValid =
    Boolean(draft.name.trim()) &&
    !draftSupportError &&
    [draft.width, draft.depth, draft.height].every(
      (value) => Number.isFinite(value) && value > 0,
    ) &&
    Number.isFinite(draft.z) &&
    draft.z >= 0;
  const draftPrototype: Item = {
    id: "draft-preview",
    name: draft.name.trim(),
    kind: draft.kind,
    supportId: draft.supportId,
    x: 0,
    y: 0,
    z: draft.supportId ? 0 : draft.z,
    width: draft.width,
    depth: draft.kind === "poster" ? POSTER_PANEL_DEPTH : draft.depth,
    height: draft.height,
  };
  const suggestedPlacement = draftValid
    ? findOpenPlacement(items, draftPrototype, desk)
    : null;
  const draftFits = Boolean(suggestedPlacement);
  const draftError =
    draftSupportError ??
    (!draftValid
      ? "名前と正の寸法、0以上の高さを入力してください。"
      : !draftFits
        ? "載せ先と接し、ほかの物と重ならない位置が見つかりません。"
        : "");
  const excludedSupports = selected
    ? descendantIds(items, selected.id)
    : new Set<string>();
  const setItems = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItemsState(next);
  }, []);
  const setDesk = useCallback((next: Desk) => {
    deskRef.current = next;
    setDeskState(next);
  }, []);
  function applyCandidate(
    candidate: Item[],
    id: string,
    reason = "載せ先から離れるか、ほかの物と重なるため変更できません。",
  ) {
    if (candidate === itemsRef.current) {
      setInvalidItemId(id);
      setItemError(reason);
      return false;
    }
    setItems(candidate);
    setInvalidItemId(null);
    setItemError("");
    return true;
  }
  function updateSelected(id: string, change: Partial<Item>) {
    const current = itemsRef.current.find((item) => item.id === id);
    if (!current) {
      applyCandidate(
        itemsRef.current,
        id,
        "対象のオブジェクトが見つかりません。",
      );
      return;
    }
    const supportError = supportIssue(
      itemsRef.current,
      id,
      change.supportId === undefined ? current.supportId : change.supportId,
    );
    applyCandidate(
      updateItem(itemsRef.current, id, change, deskRef.current),
      id,
      supportError ?? undefined,
    );
  }
  function changeSupport(id: string, supportId: string | null) {
    const current = itemsRef.current.find((item) => item.id === id);
    const error = !current
      ? "対象のオブジェクトが見つかりません。"
      : supportIssue(itemsRef.current, id, supportId);
    if (error) return applyCandidate(itemsRef.current, id, error);
    if (current!.supportId === supportId) {
      setInvalidItemId(null);
      setItemError("");
      return true;
    }
    return applyCandidate(
      placeOn(itemsRef.current, id, supportId, deskRef.current),
      id,
    );
  }
  function saveName(id: string, input: HTMLInputElement) {
    const current = itemsRef.current.find((item) => item.id === id);
    if (!current) return;
    const name = input.value.trim() || current.name;
    input.value = name;
    if (name === current.name) return;
    const next = itemsRef.current.map((item) =>
      item.id === id ? { ...item, name } : item,
    );
    setItems(next);
  }
  function changeDesk(key: keyof Desk, value: number) {
    const next = { ...deskRef.current, [key]: value };
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 10000 ||
      placementIssue(
        itemsRef.current,
        new Set(itemsRef.current.map((item) => item.id)),
        next,
      )
    ) {
      setInvalidDesk(true);
      return false;
    }
    setDesk(next);
    setInvalidDesk(false);
    return true;
  }
  function addItem() {
    if (!draftValid) return;
    const item = findOpenPlacement(
      itemsRef.current,
      { ...draftPrototype, id: crypto.randomUUID() },
      deskRef.current,
    );
    if (!item) return;
    applyCandidate([...itemsRef.current, item], item.id);
    setSelectedId(item.id);
    setAdding(false);
  }
  function removeSelected() {
    if (!selected) return;
    const next = removeItem(itemsRef.current, selected.id, deskRef.current);
    if (!applyCandidate(next, selected.id)) return;
    setSelectedId(items.find((item) => item.id !== selected.id)?.id || "");
    setDraft((current) =>
      current.supportId === selected.id
        ? { ...current, supportId: null }
        : current,
    );
  }
  function choosePreset(id: string) {
    setPresetId(id);
    const preset = SIZE_PRESETS.find((entry) => entry.id === id);
    if (preset)
      setDraft((current) => ({
        ...current,
        name: preset.name,
        kind: preset.kind,
        width: preset.width,
        depth: preset.depth,
        height: preset.height,
      }));
  }
  function chooseDraftAppearance(kind: Item["kind"]) {
    setPresetId("custom");
    setDraft((current) => ({
      ...current,
      kind,
      depth:
        kind === "poster"
          ? POSTER_PANEL_DEPTH
          : current.kind === "poster"
            ? 20
            : current.depth,
    }));
  }
  function chooseSelectedAppearance(kind: Item["kind"]) {
    if (!selected) return;
    updateSelected(selected.id, {
      kind,
      depth:
        kind === "poster"
          ? POSTER_PANEL_DEPTH
          : selected.kind === "poster"
            ? 20
            : selected.depth,
    });
  }
  function swapPosterSize() {
    if (!selected || selected.kind !== "poster") return;
    updateSelected(selected.id, {
      width: selected.height,
      height: selected.width,
    });
  }
  return {
    desk,
    setDesk,
    items,
    setItems,
    selectedId,
    setSelectedId,
    adding,
    setAdding,
    itemsCollapsed,
    setItemsCollapsed,
    measures,
    setMeasures,
    invalidItemId,
    setInvalidItemId,
    itemError,
    draftError,
    changeSupport,
    presetId,
    setPresetId,
    draft,
    setDraft,
    invalidDesk,
    setInvalidDesk,
    deskRef,
    itemsRef,
    selected,
    draftValid,
    draftPrototype,
    suggestedPlacement,
    draftFits,
    excludedSupports,
    applyCandidate,
    updateSelected,
    saveName,
    changeDesk,
    addItem,
    removeSelected,
    choosePreset,
    chooseDraftAppearance,
    chooseSelectedAppearance,
    swapPosterSize,
  };
}
export type LayoutEditor = ReturnType<typeof useLayoutEditor>;
