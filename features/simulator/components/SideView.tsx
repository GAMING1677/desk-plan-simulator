import { useMemo } from "react";
import {
  MONITOR_SCREEN_FRACTION,
  cm,
  itemDepth,
  itemTop,
  monitorShape,
  worldPosition,
} from "@/lib/desk-model";
import type { SimulatorController } from "../simulator";
import {
  DIAGRAM_SCALE,
  TOP_VIEW_ORIGIN_X,
  TOP_VIEW_ORIGIN_Y,
  SIDE_VIEW_ORIGIN_X,
} from "../constants";
import { cleanName, itemColor } from "../item-appearance";
type Props = Pick<
  SimulatorController,
  | "desk"
  | "items"
  | "selectedId"
  | "measures"
  | "invalidItemId"
  | "dragHandlers"
>;

export function SideView({
  desk,
  items,
  selectedId,
  measures,
  invalidItemId,
  dragHandlers,
}: Props) {
  const sideItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const first = worldPosition(items, a),
          second = worldPosition(items, b);
        return first.x + a.width - second.x - b.width;
      }),
    [items],
  );
  const positions = items.map((item) => ({
    item,
    world: worldPosition(items, item),
  }));

  const minY = Math.min(0, ...positions.map(({ world }) => world.y));
  const maxY = Math.max(
    desk.depth,
    ...positions.map(({ item, world }) => world.y + itemDepth(item)),
  );

  const sideViewX = Math.min(0, SIDE_VIEW_ORIGIN_X + minY * DIAGRAM_SCALE - 50);
  const sideViewRight = Math.max(
    360,
    SIDE_VIEW_ORIGIN_X + maxY * DIAGRAM_SCALE + 80,
  );

  const tallest = Math.max(
    43,
    ...items.map((item) => {
      const position = worldPosition(items, item);
      return position.z + itemTop(item);
    }),
  );
  const baseline = Math.max(280, tallest * DIAGRAM_SCALE + 55);
  const elevationViewHeight = baseline + 72;
  return (
    <div className="view-card">
      <div className="view-heading">
        <span>{"03"}</span>
        <div>
          <strong>{"側面図"}</strong>
        </div>
      </div>

      <svg
        className="diagram elevation-diagram side-diagram"
        viewBox={`${sideViewX} 0 ${sideViewRight - sideViewX} ${elevationViewHeight}`}
        role="img"
        aria-label="机とオブジェクトの側面図"
      >
        <rect
          x={SIDE_VIEW_ORIGIN_X}
          y={baseline}
          width={desk.depth * DIAGRAM_SCALE}
          height="15"
          fill="#b3c5cf"
          stroke="#7a92a1"
        />

        <text x={SIDE_VIEW_ORIGIN_X} y={baseline + 28} className="edge-note">
          {"奥"}
        </text>
        <text
          x={SIDE_VIEW_ORIGIN_X + desk.depth * DIAGRAM_SCALE - 20}
          y={baseline + 28}
          className="edge-note"
        >
          {"手前"}
        </text>

        {sideItems.map((item) => {
          const world = worldPosition(items, item),
            x = SIDE_VIEW_ORIGIN_X + world.y * DIAGRAM_SCALE,
            w = itemDepth(item) * DIAGRAM_SCALE,
            h = item.height * DIAGRAM_SCALE,
            y = baseline - (world.z + itemTop(item)) * DIAGRAM_SCALE,
            bottom = baseline - world.z * DIAGRAM_SCALE,
            monitor = monitorShape(item),
            active = item.id === selectedId,
            color = itemColor(item, active, item.id === invalidItemId);
          return (
            <g
              key={item.id}
              className="draggable"
              {...dragHandlers(item, "side")}
            >
              {item.kind === "monitor" ? (
                <>
                  <rect
                    x={x + monitor.panelStart * DIAGRAM_SCALE - 5}
                    y={y}
                    width={Math.max(
                      monitor.panelDepth * DIAGRAM_SCALE + 10,
                      14,
                    )}
                    height={h * MONITOR_SCREEN_FRACTION}
                    fill="transparent"
                  />
                  <line
                    x1={x + monitor.stemY * DIAGRAM_SCALE}
                    y1={y + h * MONITOR_SCREEN_FRACTION}
                    x2={x + monitor.stemY * DIAGRAM_SCALE}
                    y2={bottom - monitor.footHeight * DIAGRAM_SCALE}
                    stroke="#8299a7"
                    strokeWidth={monitor.stemDepth * DIAGRAM_SCALE}
                  />
                  <rect
                    x={x + monitor.footStart * DIAGRAM_SCALE}
                    y={bottom - monitor.footHeight * DIAGRAM_SCALE}
                    width={monitor.footDepth * DIAGRAM_SCALE}
                    height={monitor.footHeight * DIAGRAM_SCALE}
                    rx="2"
                    fill="#8299a7"
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                  <rect
                    x={x + monitor.panelStart * DIAGRAM_SCALE}
                    y={y}
                    width={monitor.panelDepth * DIAGRAM_SCALE}
                    height={h * MONITOR_SCREEN_FRACTION}
                    rx="2"
                    fill="#193243"
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                </>
              ) : item.kind === "poster" ? (
                <>
                  <rect
                    x={x - 7}
                    y={y}
                    width="16"
                    height={h}
                    fill="transparent"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(w, 3)}
                    height={h}
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                </>
              ) : item.kind === "laptop" ? (
                <>
                  <rect x={x} y={y} width={w} height={h} fill="transparent" />
                  <polygon
                    points={`${x + w * 0.08},${y + h * 0.82} ${x + w * 0.34},${y} ${x + w * 0.42},${y} ${x + w * 0.2},${y + h * 0.82}`}
                    fill="#314958"
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                  <rect
                    x={x}
                    y={bottom - h * 0.12}
                    width={w}
                    height={h * 0.12}
                    rx="2"
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                </>
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx="4"
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              )}

              <text
                x={
                  item.kind === "poster" || item.kind === "monitor"
                    ? x + w + 10
                    : x + w / 2
                }
                y={
                  item.kind === "monitor"
                    ? y + h * 0.48
                    : item.kind === "poster"
                      ? y + h * 0.25 + 5
                      : y + h / 2 + 5
                }
                textAnchor={
                  item.kind === "poster" || item.kind === "monitor"
                    ? "start"
                    : "middle"
                }
                className="side-item-label"
              >
                {cleanName(item.name)}
              </text>

              {measures && (
                <>
                  {item.kind !== "poster" && (
                    <text
                      x={x + w / 2}
                      y={y - 8}
                      textAnchor="middle"
                      className="object-dimension"
                    >
                      {cm(item.depth)}
                    </text>
                  )}
                  <text
                    x={x + w + 6}
                    y={y + h / 2 + 4}
                    className="object-dimension"
                  >
                    {cm(item.height)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {measures && (
          <>
            <line
              x1={SIDE_VIEW_ORIGIN_X}
              y1={baseline + 38}
              x2={SIDE_VIEW_ORIGIN_X + desk.depth * DIAGRAM_SCALE}
              y2={baseline + 38}
              className="measure-line"
            />
            <text
              x={SIDE_VIEW_ORIGIN_X + (desk.depth * DIAGRAM_SCALE) / 2}
              y={baseline + 59}
              textAnchor="middle"
              className="desk-dimension"
            >
              {"奥行き "}
              {cm(desk.depth)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
