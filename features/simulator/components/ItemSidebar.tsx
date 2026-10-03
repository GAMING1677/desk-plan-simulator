import { AddItemForm } from "./AddItemForm";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cm, supportFor } from "@/lib/desk-model";
import type { SimulatorController } from "../simulator";
import { appearanceIcon } from "../item-appearance";
type Props = Pick<
  SimulatorController,
  | "desk"
  | "items"
  | "selectedId"
  | "setSelectedId"
  | "adding"
  | "setAdding"
  | "itemsCollapsed"
  | "setItemsCollapsed"
  | "invalidItemId"
  | "setInvalidItemId"
  | "presetId"
  | "setPresetId"
  | "draft"
  | "setDraft"
  | "invalidDesk"
  | "deskRef"
  | "draftFits"
  | "draftError"
  | "changeDesk"
  | "addItem"
  | "choosePreset"
  | "chooseDraftAppearance"
>;

export function ItemSidebar({
  desk,
  items,
  selectedId,
  setSelectedId,
  adding,
  setAdding,
  itemsCollapsed,
  setItemsCollapsed,
  invalidItemId,
  setInvalidItemId,
  presetId,
  setPresetId,
  draft,
  setDraft,
  invalidDesk,
  deskRef,
  draftFits,
  draftError,
  changeDesk,
  addItem,
  choosePreset,
  chooseDraftAppearance,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <strong>{"レイアウト"}</strong>
        <span>
          {items.length}
          {" アイテム"}
        </span>
      </div>

      <div className={`desk-summary ${invalidDesk ? "invalid" : ""}`}>
        <small>{"DESK SIZE"}</small>
        <strong>
          {"幅 "}
          {cm(desk.width)}
        </strong>
        <span>
          {"奥行き "}
          {cm(desk.depth)}
          {" · 高さ "}
          {cm(desk.height)}
        </span>
        <div className="desk-fields">
          {(
            [
              ["width", "幅"],
              ["depth", "奥行き"],
              ["height", "高さ"],
            ] as const
          ).map(([key, label]) => (
            <label key={`${key}-${desk[key]}`}>
              {label}
              <Input
                aria-label={`机の${label}`}
                type="number"
                min="0.1"
                max="10000"
                step="0.1"
                defaultValue={desk[key]}
                onBlur={(event) => {
                  if (!changeDesk(key, Number(event.currentTarget.value)))
                    event.currentTarget.value = String(deskRef.current[key]);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    event.currentTarget.value = String(deskRef.current[key]);
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>
          ))}
        </div>
      </div>

      <h2 className="section-title">
        <button
          className="items-toggle"
          aria-expanded={!itemsCollapsed}
          aria-controls="placed-items"
          onClick={() => setItemsCollapsed((value) => !value)}
        >
          {"置いているもの"}
          <ChevronDown
            size={16}
            style={{ transform: itemsCollapsed ? "rotate(-90deg)" : undefined }}
          />
        </button>
      </h2>

      <div id="placed-items" className="item-list" hidden={itemsCollapsed}>
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`item-row ${selectedId === item.id ? "active" : ""} ${invalidItemId === item.id ? "invalid" : ""}`}
            onClick={() => {
              setSelectedId(item.id);
              setInvalidItemId(null);
            }}
          >
            <span className="item-icon">{appearanceIcon(item.kind, 18)}</span>

            <span className="item-copy">
              <strong>{item.name}</strong>
              <small>
                {item.kind === "poster"
                  ? `幅 ${cm(item.width)} × 高さ ${cm(item.height)}`
                  : `${cm(item.width)} × ${cm(item.depth)} × ${cm(item.height)}`}
              </small>
              <em>
                {item.supportId
                  ? `${supportFor(items, item)?.name || "机"} の上`
                  : item.z > 0
                    ? `独立配置 · 高さ ${cm(item.z)}`
                    : "机の上"}
              </em>
            </span>

            <span className="item-number">
              {String(index + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>

      <Button className="add-button" onClick={() => setAdding(!adding)}>
        <Plus size={17} />
        {"オブジェクトを追加"}
      </Button>

      {adding && (
        <AddItemForm
          items={items}
          presetId={presetId}
          setPresetId={setPresetId}
          draft={draft}
          setDraft={setDraft}
          draftFits={draftFits}
          draftError={draftError}
          addItem={addItem}
          choosePreset={choosePreset}
          chooseDraftAppearance={chooseDraftAppearance}
        />
      )}
    </aside>
  );
}
