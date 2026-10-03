import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FrontScene } from "@/components/front-scene";
import {
  FRONT_WIDTH,
  FRONT_HEIGHT,
  fitFrontView,
} from "@/lib/front-projection";
import type { SimulatorController } from "../simulator";
type Props = Pick<
  SimulatorController,
  | "desk"
  | "items"
  | "selectedId"
  | "measures"
  | "invalidItemId"
  | "copyState"
  | "frontSvgRef"
  | "copyFrontView"
  | "frontZoom"
  | "setFrontZoom"
  | "frontOffset"
  | "setFrontOffset"
  | "frontPanning"
  | "beginFrontPan"
  | "moveFrontPan"
  | "endFrontPan"
  | "dragHandlers"
>;

export function FrontView({
  desk,
  items,
  selectedId,
  measures,
  invalidItemId,
  copyState,
  frontSvgRef,
  copyFrontView,
  frontZoom,
  setFrontZoom,
  frontOffset,
  setFrontOffset,
  frontPanning,
  beginFrontPan,
  moveFrontPan,
  endFrontPan,
  dragHandlers,
}: Props) {
  return (
    <div className="view-card">
      <div className="view-heading">
        <span>{"02"}</span>
        <div>
          <strong>{"正面図"}</strong>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`front-copy-button ${copyState === "error" ? "copy-error" : ""}`}
          disabled={copyState === "copying"}
          onClick={copyFrontView}
          aria-live="polite"
        >
          <Copy size={15} />
          {copyState === "copying"
            ? "作成中…"
            : copyState === "success"
              ? "コピーしました"
              : copyState === "error"
                ? "コピー失敗・再試行"
                : "FHDでコピー"}
        </Button>
      </div>

      <label className="hint">
        {"拡大率 "}
        {frontZoom}
        {"% "}
        <input
          aria-label="正面図の拡大率"
          type="range"
          min="1"
          max="200"
          step="1"
          value={frontZoom}
          onChange={(event) => setFrontZoom(Number(event.target.value))}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const fit = fitFrontView(desk, items);
            setFrontZoom(fit.zoom);
            setFrontOffset(fit.offset);
          }}
        >
          {"全体を表示"}
        </Button>
      </label>

      <svg
        ref={frontSvgRef}
        className={`diagram elevation-diagram front-pannable ${frontPanning ? "is-panning" : ""}`}
        onPointerDown={beginFrontPan}
        onPointerMove={moveFrontPan}
        onPointerUp={endFrontPan}
        onPointerCancel={endFrontPan}
        onLostPointerCapture={endFrontPan}
        viewBox={`0 0 ${FRONT_WIDTH} ${FRONT_HEIGHT}`}
        role="img"
        aria-label={`床から150cm、机の手前3mの中央から拡大率${frontZoom}パーセントで3D表示した正面図`}
      >
        <FrontScene
          desk={desk}
          items={items}
          zoom={frontZoom}
          offset={frontOffset}
          selectedId={selectedId}
          invalidItemId={invalidItemId}
          measures={measures}
          handlers={(item) => dragHandlers(item, "front")}
        />
      </svg>
    </div>
  );
}
