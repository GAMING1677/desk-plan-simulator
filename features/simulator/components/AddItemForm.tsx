import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { supportIssue, type Item } from "@/lib/desk-model";
import { SIZE_PRESETS } from "@/lib/size-presets";
import { appearances } from "../item-appearance";
import type { SimulatorController } from "../simulator";
type Props = Pick<
  SimulatorController,
  | "items"
  | "presetId"
  | "setPresetId"
  | "draft"
  | "setDraft"
  | "draftFits"
  | "draftError"
  | "addItem"
  | "choosePreset"
  | "chooseDraftAppearance"
>;

export function AddItemForm({
  items,
  presetId,
  setPresetId,
  draft,
  setDraft,
  draftFits,
  draftError,
  addItem,
  choosePreset,
  chooseDraftAppearance,
}: Props) {
  return (
    <div className={`add-panel ${!draftFits ? "invalid" : ""}`}>
      <label>
        {"見た目"}
        <NativeSelect
          className="appearance-select"
          value={draft.kind}
          onChange={(event) =>
            chooseDraftAppearance(event.target.value as Item["kind"])
          }
        >
          {appearances.map((appearance) => (
            <NativeSelectOption key={appearance.kind} value={appearance.kind}>
              {appearance.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

      <label>
        {"定型サイズ"}
        <NativeSelect
          className="preset-select"
          value={presetId}
          onChange={(event) => choosePreset(event.target.value)}
        >
          <NativeSelectOption value="custom">{"自由入力"}</NativeSelectOption>

          <NativeSelectOptGroup label="A判 ポスター・コルクボード">
            {SIZE_PRESETS.filter((preset) => preset.category === "paper-a").map(
              (preset) => (
                <NativeSelectOption key={preset.id} value={preset.id}>
                  {preset.label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelectOptGroup>

          <NativeSelectOptGroup label="JIS B判 ポスター・コルクボード">
            {SIZE_PRESETS.filter((preset) => preset.category === "paper-b").map(
              (preset) => (
                <NativeSelectOption key={preset.id} value={preset.id}>
                  {preset.label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelectOptGroup>

          <NativeSelectOptGroup label="16:9 モニター">
            {SIZE_PRESETS.filter((preset) => preset.category === "monitor").map(
              (preset) => (
                <NativeSelectOption key={preset.id} value={preset.id}>
                  {preset.label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelectOptGroup>

          <NativeSelectOptGroup label="ノートPC · 幅 × 奥行き × 開いた高さ">
            {SIZE_PRESETS.filter((preset) => preset.category === "laptop").map(
              (preset) => (
                <NativeSelectOption key={preset.id} value={preset.id}>
                  {preset.label}
                </NativeSelectOption>
              ),
            )}
          </NativeSelectOptGroup>
        </NativeSelect>
      </label>

      <label>
        {"名前"}
        <Input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>

      <label>
        {"置く場所"}
        <NativeSelect
          aria-label="追加する物の載せ先"
          aria-invalid={Boolean(supportIssue(items, null, draft.supportId))}
          className="support-select"
          value={draft.supportId || "desk"}
          onChange={(event) =>
            setDraft({
              ...draft,
              supportId:
                event.target.value === "desk" ? null : event.target.value,
              z: event.target.value === "desk" ? draft.z : 0,
            })
          }
        >
          <NativeSelectOption value="desk">
            {"独立配置（机基準）"}
          </NativeSelectOption>

          {items
            .filter((item) => item.kind !== "poster")
            .map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
                {" の上"}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </label>

      <div className={`add-fields ${draft.kind === "poster" ? "two" : ""}`}>
        {(draft.kind === "poster"
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
              value={draft[key]}
              onChange={(event) => {
                setPresetId("custom");
                setDraft({ ...draft, [key]: Number(event.target.value) });
              }}
            />
          </label>
        ))}
      </div>

      {draft.kind === "poster" && (
        <Button
          variant="outline"
          size="sm"
          className="orientation-button"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              width: current.height,
              height: current.width,
            }))
          }
        >
          <ArrowLeftRight size={15} />
          {"縦横を入れ替え"}
        </Button>
      )}

      {!draft.supportId && (
        <label>
          {"天板からの高さ（cm）"}
          <Input
            type="number"
            min="0"
            step="0.1"
            value={draft.z}
            onChange={(event) =>
              setDraft({ ...draft, z: Number(event.target.value) })
            }
          />
        </label>
      )}

      <Button onClick={addItem} disabled={!draftFits}>
        {"ここに置く"}
      </Button>
      {draftError && <p role="alert">{draftError}</p>}
    </div>
  );
}
