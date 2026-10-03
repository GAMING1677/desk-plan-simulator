import { useMemo } from "react";
import {
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

export function TopView({
  desk,
  items,
  selectedId,
  measures,
  invalidItemId,
  dragHandlers,
}: Props) {
  const topItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const first = worldPosition(items, a),
          second = worldPosition(items, b);
        return first.z + itemTop(a) - second.z - itemTop(b);
      }),
    [items],
  );

  const positions = items.map((item) => ({
    item,
    world: worldPosition(items, item),
  }));
  const minX = Math.min(0, ...positions.map(({ world }) => world.x));
  const maxX = Math.max(
    desk.width,
    ...positions.map(({ item, world }) => world.x + item.width),
  );
  const minY = Math.min(0, ...positions.map(({ world }) => world.y));
  const maxY = Math.max(
    desk.depth,
    ...positions.map(({ item, world }) => world.y + itemDepth(item)),
  );
  const frontViewX = Math.min(0, TOP_VIEW_ORIGIN_X + minX * DIAGRAM_SCALE - 50);
  const frontViewRight = Math.max(
    920,
    TOP_VIEW_ORIGIN_X + maxX * DIAGRAM_SCALE + 80,
  );

  const topViewY = Math.min(0, TOP_VIEW_ORIGIN_Y + minY * DIAGRAM_SCALE - 50);
  const topViewBottom = Math.max(
    350,
    TOP_VIEW_ORIGIN_Y + maxY * DIAGRAM_SCALE + 70,
  );
  const topViewBox = `${frontViewX} ${topViewY} ${frontViewRight - frontViewX} ${topViewBottom - topViewY}`;

  return (
    <div className="view-card">
      <div className="view-heading">
        <span>{"01"}</span>
        <div>
          <strong>{"上面図"}</strong>
        </div>
      </div>

      <svg
        className="diagram"
        viewBox={topViewBox}
        role="img"
        aria-label="机とオブジェクトの上面図"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M40 0H0V40" fill="none" stroke="#dce6ec" strokeWidth="1" />
          </pattern>
        </defs>

        <rect
          x={TOP_VIEW_ORIGIN_X}
          y={TOP_VIEW_ORIGIN_Y}
          width={desk.width * DIAGRAM_SCALE}
          height={desk.depth * DIAGRAM_SCALE}
          rx="3"
          fill="#f1f7fa"
          stroke="#9bafbc"
          strokeWidth="2"
        />

        <rect
          x={TOP_VIEW_ORIGIN_X}
          y={TOP_VIEW_ORIGIN_Y}
          width={desk.width * DIAGRAM_SCALE}
          height={desk.depth * DIAGRAM_SCALE}
          fill="url(#grid)"
        />

        <text
          x={TOP_VIEW_ORIGIN_X + 8}
          y={TOP_VIEW_ORIGIN_Y + 18}
          className="edge-note"
        >
          {"奥"}
        </text>
        <text
          x={TOP_VIEW_ORIGIN_X + 8}
          y={TOP_VIEW_ORIGIN_Y + desk.depth * DIAGRAM_SCALE - 10}
          className="edge-note"
        >
          {"手前"}
        </text>

        {topItems.map((item) => {
          const world = worldPosition(items, item),
            x = TOP_VIEW_ORIGIN_X + world.x * DIAGRAM_SCALE,
            y = TOP_VIEW_ORIGIN_Y + world.y * DIAGRAM_SCALE,
            w = item.width * DIAGRAM_SCALE,
            h = itemDepth(item) * DIAGRAM_SCALE,
            monitor = monitorShape(item),
            active = item.id === selectedId,
            color = itemColor(item, active, item.id === invalidItemId);
          return (
            <g
              key={item.id}
              className="draggable"
              {...dragHandlers(item, "top")}
            >
              {item.kind === "poster" ? (
                <>
                  <rect
                    x={x}
                    y={y - 6}
                    width={w}
                    height="14"
                    fill="transparent"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={Math.max(h, 2)}
                    rx="1"
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                </>
              ) : item.kind === "monitor" ? (
                <>
                  <rect
                    x={x}
                    y={y + monitor.panelStart * DIAGRAM_SCALE - 5}
                    width={w}
                    height={Math.max(
                      monitor.panelDepth * DIAGRAM_SCALE + 10,
                      14,
                    )}
                    fill="transparent"
                  />
                  <rect
                    x={
                      x + ((item.width - monitor.footWidth) * DIAGRAM_SCALE) / 2
                    }
                    y={y + monitor.footStart * DIAGRAM_SCALE}
                    width={monitor.footWidth * DIAGRAM_SCALE}
                    height={monitor.footDepth * DIAGRAM_SCALE}
                    rx="2"
                    fill="#8299a7"
                    stroke={color.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                  <rect
                    x={x}
                    y={y + monitor.panelStart * DIAGRAM_SCALE}
                    width={w}
                    height={monitor.panelDepth * DIAGRAM_SCALE}
                    rx="2"
                    fill="#193243"
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
                  rx="5"
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              )}

              {item.kind === "laptop" && (
                <>
                  <rect
                    x={x + w * 0.06}
                    y={y + h * 0.08}
                    width={w * 0.88}
                    height={Math.max(h * 0.1, 2)}
                    rx="2"
                    fill="#314958"
                  />
                  <rect
                    x={x + w * 0.1}
                    y={y + h * 0.27}
                    width={w * 0.8}
                    height={h * 0.42}
                    rx="2"
                    fill="#90a8b5"
                    opacity=".65"
                  />
                  <rect
                    x={x + w * 0.32}
                    y={y + h * 0.77}
                    width={w * 0.36}
                    height={h * 0.14}
                    rx="2"
                    fill="#a2b5c0"
                  />
                </>
              )}

              <text
                x={x + w / 2}
                y={item.kind === "poster" ? y + 20 : y + h / 2 + 5}
                textAnchor="middle"
                className="item-label"
              >
                {cleanName(item.name)}
              </text>

              {item.supportId && (
                <text
                  x={x + w / 2}
                  y={item.kind === "poster" ? y + 34 : y + h / 2 + 21}
                  textAnchor="middle"
                  className="stack-label"
                >
                  {"+"}
                  {cm(world.z)}
                </text>
              )}

              {measures && (
                <>
                  <text
                    x={x + w / 2}
                    y={y - 9}
                    textAnchor="middle"
                    className="object-dimension"
                  >
                    {cm(item.width)}
                  </text>
                  {item.kind !== "poster" && (
                    <text
                      x={x + w + 7}
                      y={y + h / 2 + 4}
                      className="object-dimension"
                    >
                      {cm(item.depth)}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {measures && (
          <>
            <line
              x1={TOP_VIEW_ORIGIN_X}
              y1={TOP_VIEW_ORIGIN_Y + desk.depth * DIAGRAM_SCALE + 30}
              x2={TOP_VIEW_ORIGIN_X + desk.width * DIAGRAM_SCALE}
              y2={TOP_VIEW_ORIGIN_Y + desk.depth * DIAGRAM_SCALE + 30}
              className="measure-line"
            />
            <text
              x={TOP_VIEW_ORIGIN_X + (desk.width * DIAGRAM_SCALE) / 2}
              y={TOP_VIEW_ORIGIN_Y + desk.depth * DIAGRAM_SCALE + 51}
              textAnchor="middle"
              className="desk-dimension"
            >
              {"幅 "}
              {cm(desk.width)}
            </text>
            <line
              x1="59"
              y1={TOP_VIEW_ORIGIN_Y}
              x2="59"
              y2={TOP_VIEW_ORIGIN_Y + desk.depth * DIAGRAM_SCALE}
              className="measure-line"
            />
            <text
              x="47"
              y={TOP_VIEW_ORIGIN_Y + (desk.depth * DIAGRAM_SCALE) / 2}
              textAnchor="middle"
              transform={`rotate(-90 47 ${TOP_VIEW_ORIGIN_Y + (desk.depth * DIAGRAM_SCALE) / 2})`}
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
