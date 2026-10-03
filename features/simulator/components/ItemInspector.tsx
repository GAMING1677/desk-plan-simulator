import { ArrowLeftRight, Layers3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cm, worldPosition, type Item } from "@/lib/desk-model";
import type { SimulatorController } from "../simulator";
import {
  appearanceIcon,
  appearanceLabel,
  appearances,
} from "../item-appearance";
type Props = Pick<
  SimulatorController,
  | "items"
  | "invalidItemId"
  | "selected"
  | "excludedSupports"
  | "changeSupport"
  | "itemError"
  | "updateSelected"
  | "saveName"
  | "removeSelected"
  | "chooseSelectedAppearance"
  | "swapPosterSize"
>;

export function ItemInspector({
  items,
  invalidItemId,
  selected,
  excludedSupports,
  changeSupport,
  itemError,
  updateSelected,
  saveName,
  removeSelected,
  chooseSelectedAppearance,
  swapPosterSize,
}: Props) {
  return (
    <aside className="inspector">
      <div className="inspector-head">
        <strong>{"寸法と位置"}</strong>
        <small>{"選択中のオブジェクト"}</small>
      </div>

      {selected ? (
        <>
          <div
            className={`selected-item ${invalidItemId === selected.id ? "invalid" : ""}`}
          >
            <span className="item-icon">
              {appearanceIcon(selected.kind, 20)}
            </span>
            <div>
              <strong>{selected.name}</strong>
              <small>{appearanceLabel(selected.kind)}</small>
            </div>
          </div>

          <div className="field-section">
            <h2 className="section-title">{"名前"}</h2>
            <Input
              key={selected.id}
              aria-label="オブジェクト名"
              defaultValue={selected.name}
              onBlur={(event) => saveName(selected.id, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.currentTarget.value = selected.name;
                  event.currentTarget.blur();
                }
              }}
            />
          </div>

          <div className="field-section">
            <h2 className="section-title">{"見た目"}</h2>
            <NativeSelect
              className="appearance-select"
              value={selected.kind}
              onChange={(event) =>
                chooseSelectedAppearance(event.target.value as Item["kind"])
              }
            >
              {appearances.map((appearance) => (
                <NativeSelectOption
                  key={appearance.kind}
                  value={appearance.kind}
                >
                  {appearance.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="field-section">
            <h2 className="section-title">
              {"サイズ "}
              <span>{"cm"}</span>
            </h2>
            <div
              className={`field-grid ${selected.kind === "poster" ? "two" : ""}`}
            >
              {(selected.kind === "poster"
                ? ([
                    ["width", "幅"],
                    ["height", "高さ"],
                  ] as const)
                : ([
                    ["width", "幅"],
                    ["depth", "奥行き"],
                    ["height", "高さ"],
                  ] as const)
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={selected[key]}
                    onChange={(event) =>
                      updateSelected(selected.id, {
                        [key]: Number(event.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            {selected.kind === "poster" && (
              <Button
                variant="outline"
                size="sm"
                className="orientation-button"
                onClick={swapPosterSize}
              >
                <ArrowLeftRight size={15} />
                {"縦横を入れ替え"}
              </Button>
            )}
          </div>

          <div className="field-section">
            <h2 className="section-title">{"置く場所"}</h2>
            <label className="support-field">
              <Layers3 size={16} />
              <NativeSelect
                className="support-select"
                value={selected.supportId || "desk"}
                aria-label="選択物の載せ先"
                aria-invalid={invalidItemId === selected.id}
                onChange={(event) =>
                  changeSupport(
                    selected.id,
                    event.target.value === "desk" ? null : event.target.value,
                  )
                }
              >
                <NativeSelectOption value="desk">
                  {"独立配置（机基準）"}
                </NativeSelectOption>

                {items
                  .filter(
                    (item) =>
                      item.kind !== "poster" &&
                      item.id !== selected.id &&
                      !excludedSupports.has(item.id),
                  )
                  .map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name}
                      {" の上"}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </label>
            <p className="height-note">
              {"机の天板から "}
              {cm(worldPosition(items, selected).z)}
              {" の高さに設置"}
            </p>
            {invalidItemId === selected.id && itemError && (
              <p role="alert">{itemError}</p>
            )}
          </div>

          <div className="field-section">
            <h2 className="section-title">
              {"配置 "}
              <span>
                {selected.supportId ? "置いた物" : "机"}
                {"の左奥を起点"}
              </span>
            </h2>
            <div className="field-grid two">
              {(
                [
                  ["x", "左から"],
                  ["y", "奥から"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <Input
                    type="number"
                    step="0.1"
                    value={selected[key]}
                    onChange={(event) =>
                      updateSelected(selected.id, {
                        [key]: Number(event.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            {!selected.supportId && (
              <label className="height-field">
                {"天板からの高さ（cm）"}
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={selected.z}
                  onChange={(event) =>
                    updateSelected(selected.id, {
                      z: Number(event.target.value),
                    })
                  }
                />
              </label>
            )}
          </div>

          <p className="position-note">
            {selected.kind === "poster"
              ? "掲示面は台からはみ出せます。薄い板として重なりを判定します。"
              : selected.kind === "monitor"
                ? "画面は薄い板、支柱と足は小さな形として重なりを判定します。"
                : "上の物は台より大きくても配置できます。物同士が立体的に重なる移動はできません。"}
          </p>

          <Button
            variant="ghost"
            className="delete-button"
            onClick={removeSelected}
          >
            <Trash2 size={16} />
            {"このオブジェクトを削除"}
          </Button>
        </>
      ) : (
        <p className="empty-state">
          {"図または一覧からオブジェクトを選択してください。"}
        </p>
      )}
    </aside>
  );
}
